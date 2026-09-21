const express = require("express");
const router = express.Router();
const db = require("../../db");
const config = require("../../config");
const authMiddleware = require("../middlewares/authMiddleware");
const { limitesGeracao, limitesCorrecao } = require("../middlewares/limites");
const { receberMaterial } = require("../middlewares/upload");
const {
  gerarJSON,
  enviarArquivoTemporario,
  removerArquivoTemporario,
  ErroIA,
} = require("../../core/gemini");
const prompts = require("../../services/prompts");
const {
  normalizarQuestoesIA,
  inserirQuestoes,
  buscarQuestoesPublicas,
  carregarQuestoes,
  paraAluno,
  paraCorrecao,
  criarSimulado,
} = require("../../services/questoes");
const { corrigirSimulado } = require("../../services/correcao");
const v = require("../../services/validacao");

const MATERIAS_ESCOLARES = [
  "Matemática",
  "Português",
  "História",
  "Geografia",
  "Física",
  "Química",
  "Biologia",
  "Filosofia",
  "Sociologia",
  "Inglês",
  "Espanhol",
];

const ANOS_POR_NIVEL = {
  fundamental: ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano"],
  medio: ["1º Ano EM", "2º Ano EM", "3º Ano EM", "Pré-Vestibular/ENEM"],
  superior: ["Ensino Superior"],
};

const DIFICULDADES = [
  "Iniciante",
  "Intermediário (Padrão)",
  "Avançado / Vestibular",
  "Iniciante (Conceitual / Básico)",
  "Intermediário (Padrão de Prova)",
  "Avançado (Exames / ENADE / OAB)",
  "Avançado (Exames / Padrão Universitário)",
];

const TIPOS = ["Fechada", "Aberta", "Mesclada"];

// Arquivos .txt/.md vão como texto no prompt; o limite evita estourar a janela de contexto.
const MAX_CARACTERES_ARQUIVO_TEXTO = 300_000;

const dataHoje = () => new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Em multipart os parâmetros chegam no campo `dados` (JSON); em JSON, direto no corpo. */
function lerDados(req) {
  if (typeof req.body?.dados === "string") {
    try {
      return JSON.parse(req.body.dados);
    } catch {
      throw new v.ErroRequisicao(400, "Dados do simulado inválidos.");
    }
  }
  return req.body && typeof req.body === "object" ? req.body : {};
}

function lerParametrosComuns(dados) {
  return {
    quantidade: v.inteiroEntre(dados.quantidade, 1, config.limites.questoesPorSimulado, 5),
    tipo: v.umDe(dados.tipo_questao, TIPOS, "Fechada", "tipo_questao"),
    dificuldade: DIFICULDADES.includes(dados.dificuldade) ? dados.dificuldade : "Intermediário (Padrão)",
    nivel: v.umDe(dados.nivel, Object.keys(ANOS_POR_NIVEL), "medio", "nivel"),
  };
}

function exigirQuestoes(questoes) {
  if (questoes.length === 0) {
    throw new ErroIA("A IA não retornou questões válidas. Tente gerar novamente.", { status: 502 });
  }
  return questoes;
}

// ---------------------------------------------------------------------------
// Geração a partir do material do aluno (PDF / TXT / MD / anotações)
// ---------------------------------------------------------------------------
async function gerarComMaterial(uid, dados, arquivos, comuns) {
  const { quantidade, tipo, dificuldade, nivel } = comuns;
  const anotacoes = v.texto(dados.material_texto, config.limites.caracteresAnotacoes);
  if (arquivos.length === 0 && !anotacoes) {
    throw new v.ErroRequisicao(400, "Envie ao menos um arquivo ou escreva anotações de estudo.");
  }

  const nomesArquivos = arquivos.map((a) => a.originalname.slice(0, 120));
  const nomeMateria =
    v.texto(dados.materia, 120) ||
    (nomesArquivos[0] ? `Material: ${nomesArquivos[0].replace(/\.[^.]+$/, "")}` : "Material Próprio");

  const pdfs = arquivos.filter((a) => a.mimetype === "application/pdf");
  const textos = arquivos.filter((a) => a.mimetype !== "application/pdf");
  const partes = [];
  const temporarios = [];

  try {
    const bytesPdfs = pdfs.reduce((soma, a) => soma + a.size, 0);
    if (bytesPdfs <= config.limites.bytesInlineGemini) {
      for (const pdf of pdfs) {
        partes.push({ inlineData: { data: pdf.buffer.toString("base64"), mimeType: pdf.mimetype } });
      }
    } else {
      // Materiais grandes vão pela Files API (evita o limite de tamanho de requisição inline).
      const envios = await Promise.allSettled(
        pdfs.map((a) => enviarArquivoTemporario({ buffer: a.buffer, mimeType: a.mimetype, nome: a.originalname })),
      );
      for (const envio of envios) {
        if (envio.status === "fulfilled") temporarios.push(envio.value.name);
      }
      const falha = envios.find((e) => e.status === "rejected");
      if (falha) throw falha.reason;
      partes.push(...envios.map((e) => e.value.part));
    }

    for (const arquivo of textos) {
      const conteudo = arquivo.buffer.toString("utf8").slice(0, MAX_CARACTERES_ARQUIVO_TEXTO);
      partes.push({ text: `=== ARQUIVO: ${arquivo.originalname} ===\n${conteudo}\n=== FIM DO ARQUIVO ===` });
    }
    if (anotacoes) {
      partes.push({ text: `=== ANOTAÇÕES DO ALUNO ===\n${anotacoes}\n=== FIM DAS ANOTAÇÕES ===` });
    }
    partes.push({
      text: prompts.promptMaterial({ quantidade, tipo, dificuldade, nomesArquivos, temAnotacoes: Boolean(anotacoes) }),
    });

    console.log(`[Lumen IA] Gerando simulado com material próprio (${arquivos.length} arquivo(s)).`);
    const dadosIA = await gerarJSON({
      systemInstruction: prompts.SISTEMA_GERACAO,
      contents: [{ role: "user", parts: partes }],
      schema: prompts.schemaQuestoes(tipo),
      limites: config.gemini.geracao,
    });

    const novas = exigirQuestoes(
      normalizarQuestoesIA(dadosIA, {
        tipoSolicitado: tipo,
        quantidade,
        materiaPadrao: nomeMateria,
        topicoPadrao: nomesArquivos.join(", ") || "Anotações do Aluno",
        anoEscolar: nivel === "superior" ? "Ensino Superior" : "Geral",
        origemFixa: nomesArquivos.length ? nomesArquivos.join(", ").slice(0, 60) : "Anotações do Aluno",
        // Material do aluno nunca vai para o banco público de questões.
        privada: true,
        criadoPor: uid,
      }),
    );

    return { doBanco: [], novas, nomePadrao: nomeMateria };
  } finally {
    await Promise.all(temporarios.map(removerArquivoTemporario));
  }
}

// ---------------------------------------------------------------------------
// Geração por currículo (banco público + IA para completar)
// ---------------------------------------------------------------------------
async function gerarPorCurriculo(uid, dados, comuns) {
  const { quantidade, tipo, dificuldade, nivel } = comuns;
  const anos = ANOS_POR_NIVEL[nivel];
  const anoEscolar = v.umDe(dados.ano_escolar, anos, anos[anos.length - 1], "ano_escolar");
  const topicos = v
    .lista(dados.topico, 10, 100)
    .filter((t) => t.toLowerCase() !== "geral");

  let materias;
  let curso = null;
  if (nivel === "superior") {
    curso = v.texto(dados.curso, 120);
    const disciplina = v.texto(dados.disciplina, 120) || v.texto(dados.materia, 120);
    if (!curso || !disciplina) {
      throw new v.ErroRequisicao(400, "Informe o curso e a disciplina.");
    }
    materias = [disciplina];
  } else {
    materias = v
      .lista(dados.materia, MATERIAS_ESCOLARES.length, 50)
      .filter((m) => MATERIAS_ESCOLARES.includes(m));
    if (materias.length === 0) {
      throw new v.ErroRequisicao(400, "Selecione ao menos uma matéria válida.");
    }
  }

  const priorizarOficiais = nivel !== "superior" && dados.priorizar_oficiais === true;

  const doBanco = await buscarQuestoesPublicas({
    uid,
    materias,
    topicos,
    nivel,
    anoEscolar,
    tipo,
    priorizarOficiais,
    limite: quantidade,
  });

  let novas = [];
  const faltam = quantidade - doBanco.length;
  if (faltam > 0) {
    const prompt =
      nivel === "superior"
        ? prompts.promptSuperior({ quantidade: faltam, tipo, curso, disciplina: materias[0], topicos, dificuldade })
        : prompts.promptCurriculo({
            quantidade: faltam,
            tipo,
            materias,
            topicos,
            anoEscolar,
            dificuldade,
            priorizarOficiais,
          });

    const dadosIA = await gerarJSON({
      systemInstruction: prompts.SISTEMA_GERACAO,
      contents: prompt,
      schema: prompts.schemaQuestoes(tipo, nivel === "superior" ? null : materias),
      limites: config.gemini.geracao,
    });

    novas = normalizarQuestoesIA(dadosIA, {
      tipoSolicitado: tipo,
      quantidade: faltam,
      materiaPadrao: materias[0],
      materiasPermitidas: materias,
      topicoPadrao: topicos.join(", ") || "Geral",
      anoEscolar,
      origemFixa: priorizarOficiais ? null : "IA",
      privada: false,
      // Guarda o autor para permitir limpar questões de uma conta abusiva.
      criadoPor: uid,
    });
    if (doBanco.length === 0) exigirQuestoes(novas);
  }

  const nomePadrao =
    nivel === "superior"
      ? `Simulado de ${materias[0]} - ${dataHoje()}`
      : `Simulado de ${materias.length === 1 ? materias[0] : "Múltiplas"} - ${dataHoje()}`;

  return { doBanco, novas, nomePadrao };
}

// POST /api/simulado/gerar
router.post("/gerar", authMiddleware, limitesGeracao, receberMaterial, async (req, res) => {
  const uid = req.user.uid;
  const dados = lerDados(req);
  const comuns = lerParametrosComuns(dados);
  const arquivos = req.files || [];

  const { doBanco, novas, nomePadrao } =
    dados.modo === "material" || arquivos.length > 0
      ? await gerarComMaterial(uid, dados, arquivos, comuns)
      : await gerarPorCurriculo(uid, dados, comuns);

  const nome = v.texto(dados.nome, 120) || nomePadrao;

  const { simulado, questoes } = await db.withTransaction(async (cliente) => {
    const inseridas = await inserirQuestoes(cliente, novas);
    const todas = [...doBanco, ...inseridas];
    const criado = await criarSimulado(cliente, { uid, nome, questaoIds: todas.map((q) => q.id) });
    return { simulado: criado, questoes: todas };
  });

  res.status(201).json({
    simulado_id: simulado.id,
    nome: simulado.nome,
    questoes: questoes.map(paraAluno),
  });
});

// POST /api/simulado/finalizar
router.post("/finalizar", authMiddleware, limitesCorrecao, async (req, res) => {
  const uid = req.user.uid;
  const simuladoId = v.exigirUuid(req.body?.simulado_id, "simulado_id");
  const respostas = req.body?.respostas;
  if (!respostas || typeof respostas !== "object" || Array.isArray(respostas)) {
    throw new v.ErroRequisicao(400, "Respostas inválidas.");
  }
  const nomeInformado = v.texto(req.body?.nome_simulado, 120) || null;

  // Trava o simulado para evitar correção dupla (duplo clique, duas abas).
  const trava = await db.query(
    `UPDATE simulados_realizados
     SET status = 'corrigindo', corrigindo_desde = now()
     WHERE id = $1 AND firebase_uid = $2 AND status = 'em_andamento'
     RETURNING questao_ids`,
    [simuladoId, uid],
  );
  if (trava.rowCount === 0) {
    const existente = await db.query(
      `SELECT status FROM simulados_realizados WHERE id = $1 AND firebase_uid = $2`,
      [simuladoId, uid],
    );
    if (existente.rowCount === 0) throw new v.ErroRequisicao(404, "Simulado não encontrado.");
    throw new v.ErroRequisicao(
      409,
      existente.rows[0].status === "corrigindo"
        ? "Este simulado já está sendo corrigido."
        : "Este simulado já foi finalizado.",
      "JA_FINALIZADO",
    );
  }

  try {
    const questoes = await carregarQuestoes(trava.rows[0].questao_ids);
    if (questoes.length === 0) throw new v.ErroRequisicao(422, "As questões deste simulado não existem mais.");

    const resultados = await corrigirSimulado(questoes, respostas);
    const notaGeral = resultados.reduce((soma, r) => soma + r.nota, 0) / resultados.length;

    await db.withTransaction(async (cliente) => {
      await cliente.query(
        `INSERT INTO historico_respostas
           (firebase_uid, simulado_id, questao_id, acertou, nota, resposta_aluno, feedback_ia)
         SELECT $1, $2, questao_id, acertou, nota, resposta_aluno, feedback_ia
         FROM jsonb_to_recordset($3::jsonb) AS x(
           questao_id uuid, acertou boolean, nota numeric, resposta_aluno text, feedback_ia text
         )`,
        [uid, simuladoId, JSON.stringify(resultados)],
      );
      await cliente.query(
        `UPDATE simulados_realizados
         SET status = 'finalizado', corrigindo_desde = NULL, nota_geral = $1,
             nome = COALESCE($2, nome), data_realizacao = now()
         WHERE id = $3`,
        [notaGeral, nomeInformado, simuladoId],
      );
    });

    res.json({
      success: true,
      simulado_id: simuladoId,
      nota_geral: notaGeral,
      resultados,
      questoes: questoes.map(paraCorrecao),
    });
  } catch (err) {
    // Libera o simulado para o aluno tentar finalizar de novo.
    await db
      .query(
        `UPDATE simulados_realizados SET status = 'em_andamento', corrigindo_desde = NULL
         WHERE id = $1 AND status = 'corrigindo'`,
        [simuladoId],
      )
      .catch(() => {});
    throw err;
  }
});

// POST /api/simulado/:id/refazer — nova tentativa com as mesmas questões
router.post("/:id/refazer", authMiddleware, async (req, res) => {
  const uid = req.user.uid;
  const simuladoId = v.exigirUuid(req.params.id);

  const { rows } = await db.query(
    `SELECT nome, questao_ids FROM simulados_realizados
     WHERE id = $1 AND firebase_uid = $2 AND status = 'finalizado'`,
    [simuladoId, uid],
  );
  if (rows.length === 0) throw new v.ErroRequisicao(404, "Simulado não encontrado.");

  let questaoIds = rows[0].questao_ids;
  if (!questaoIds || questaoIds.length === 0) {
    // Simulados anteriores a esta versão não guardavam a lista: usa o histórico.
    const historico = await db.query(
      `SELECT questao_id FROM historico_respostas WHERE simulado_id = $1 ORDER BY data_resposta, id`,
      [simuladoId],
    );
    questaoIds = historico.rows.map((r) => r.questao_id);
  }

  const questoes = await carregarQuestoes(questaoIds);
  if (questoes.length === 0) throw new v.ErroRequisicao(404, "As questões deste simulado não existem mais.");

  const nomeBase = rows[0].nome || "Simulado";
  const nome = nomeBase.includes("(Nova Tentativa)") ? nomeBase : `${nomeBase} (Nova Tentativa)`;
  const simulado = await criarSimulado(db, { uid, nome, questaoIds: questoes.map((q) => q.id) });

  res.status(201).json({
    simulado_id: simulado.id,
    nome: simulado.nome,
    questoes: questoes.map(paraAluno),
  });
});

module.exports = router;
