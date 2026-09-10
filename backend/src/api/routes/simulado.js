const express = require("express");
const router = express.Router();
const db = require("../../db");
const authMiddleware = require("../middlewares/authMiddleware");
const { generateWithFallback } = require("../../core/gemini");

// POST /api/simulado/gerar
router.post("/gerar", authMiddleware, async (req, res) => {
  try {
    const {
      materia,
      topico,
      ano_escolar,
      quantidade = 5,
      foco = "ENEM",
      tipo_questao = "Fechada",
      priorizar_oficiais = false,
      dificuldade = "Intermediário (Padrão)",
      nivel = "medio",
      curso = null,
      disciplina = null,
      materiais_arquivos = [],
      material_arquivo = null,
      material_texto = null,
    } = req.body;

    // -------------------------------------------------------------
    // FLUXO ESPECIALIZADO: Simulado com Material Próprio (PDF / Slides / Anotações)
    // -------------------------------------------------------------
    const materiais = Array.isArray(materiais_arquivos) && materiais_arquivos.length > 0
      ? materiais_arquivos
      : material_arquivo
        ? [material_arquivo]
        : [];
    const materialTexto = typeof material_texto === "string" ? material_texto.trim() : "";

    if (materiais.length > 0 || materialTexto) {
      const nomesArquivos = materiais.map((m) => m.nome).filter(Boolean).join(", ");
      const regraTabelas = `TABELAS E DADOS: Sempre que a interpretação da questão depender de comparação de dados, propriedades, experimentos, estatísticas, cronologias ou tabelas-verdade, inclua a tabela diretamente no texto da pergunta formatada em Markdown padrão (com barras verticais | e separador |--|--|).`;

      let instrucaoFormato = "";
      if (tipo_questao === "Fechada") {
        instrucaoFormato = `Gere ${quantidade} questões de múltipla escolha.
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2).
Retorne ESTRITAMENTE um array JSON com a seguinte estrutura:
[
  {
    "origem": "${nomesArquivos ? nomesArquivos.slice(0, 40) : "Material de Aula"}",
    "pergunta": "Texto da pergunta",
    "alternativas": [
      { "letra": "A", "texto": "...", "correta": false, "explicacao": "Por que esta está incorreta..." },
      { "letra": "B", "texto": "...", "correta": true, "explicacao": null }
    ]
  }
]`;
      } else if (tipo_questao === "Aberta") {
        instrucaoFormato = `Gere ${quantidade} questões discursivas (abertas).
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2).
Retorne ESTRITAMENTE um array JSON com a seguinte estrutura:
[
  {
    "origem": "${nomesArquivos ? nomesArquivos.slice(0, 40) : "Material de Aula"}",
    "pergunta": "Texto da pergunta dissertativa",
    "gabarito": "Padrão de resposta detalhado com critérios de pontuação esperados do aluno com base estrita no material."
  }
]`;
      } else {
        instrucaoFormato = `Gere ${quantidade} questões mistas (metade de múltipla escolha e metade discursiva).
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2).
Retorne ESTRITAMENTE um array JSON. Cada objeto deve ter um campo "tipo_questao" ("Fechada" ou "Aberta"):
[
  {
    "tipo_questao": "Fechada",
    "origem": "${nomesArquivos ? nomesArquivos.slice(0, 40) : "Material de Aula"}",
    "pergunta": "Texto da pergunta",
    "alternativas": [ { "letra": "A", "texto": "...", "correta": true, "explicacao": null } ]
  },
  {
    "tipo_questao": "Aberta",
    "origem": "${nomesArquivos ? nomesArquivos.slice(0, 40) : "Material de Aula"}",
    "pergunta": "Texto da pergunta dissertativa",
    "gabarito": "Resposta esperada"
  }
]`;
      }

      const promptTexto = `Você é um professor e avaliador acadêmico especialista.
O aluno forneceu ${materiais.length > 0 ? `${materiais.length} arquivo(s) de aula/slides` : ""}${materiais.length > 0 && materialTexto ? " e " : ""}${materialTexto ? "anotações de estudo" : ""} ${nomesArquivos ? `(Arquivos: ${nomesArquivos})` : ""}.

DIRETRIZES CRÍTICAS:
1. FIDELIDADE AO MATERIAL: As perguntas devem ser formuladas com base ESTRITAMENTE nos conceitos, definições, teorias, nomes de autores/pesquisadores, comparações, arquiteturas, diagramas, códigos, tabelas e exemplos presentes no material fornecido.
2. Não cobre conteúdos externos que não tenham sido mencionados ou fundamentados no material.
3. DIFICULDADE: ${dificuldade}. Crie questões inteligentes, com contextos bem formulados e alternativas plausíveis (evite pegadinhas óbvias; teste a compreensão real dos conceitos da aula).
${regraTabelas}

${materialTexto ? `=== ANOTAÇÕES / TEXTO COMPLEMENTAR DO ALUNO ===\n${materialTexto}\n=== FIM DAS ANOTAÇÕES ===\n` : ""}
${instrucaoFormato}`;

      const parts = [];
      for (const arq of materiais) {
        if (arq.base64) {
          let cleanBase64 = arq.base64;
          if (cleanBase64.includes(",")) {
            cleanBase64 = cleanBase64.split(",")[1];
          }
          cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, "");
          parts.push({
            inlineData: {
              data: cleanBase64,
              mimeType: arq.mimeType || "application/pdf",
            },
          });
        }
      }
      parts.push({ text: promptTexto });

      console.log(`[Lumen IA] Gerando simulado a partir de material próprio (${materiais.length} arquivo(s), ${materialTexto ? "com texto" : "sem texto"})...`);
      const response = await generateWithFallback({
        contents: [
          {
            role: "user",
            parts: parts,
          },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      let questoesIA;
      try {
        questoesIA = JSON.parse(response.text);
      } catch (err) {
        console.error("Falha ao fazer parse do JSON do simulado com material:", response.text);
        throw new Error("Erro de formatação da IA ao gerar as questões.");
      }

      const materiaFinal = (
        materia || disciplina || curso || (nomesArquivos ? `Material: ${nomesArquivos}` : "Material Próprio")
      ).slice(0, 95);
      const topicoFinal = (
        topico || (nomesArquivos ? nomesArquivos : "Slides de Aula")
      ).slice(0, 145);
      const anoEscolarFinal = (
        ano_escolar || (nivel === "superior" ? "Ensino Superior" : "Geral")
      ).slice(0, 45);

      const questoesSalvas = [];
      for (const q of questoesIA) {
        let tipoReal = "Fechada";
        if (q.tipo_questao === "Aberta" || (!q.alternativas && q.gabarito)) {
          tipoReal = "Aberta";
        } else if (q.tipo_questao === "Fechada" || (q.alternativas && q.alternativas.length > 0)) {
          tipoReal = "Fechada";
        } else if (tipo_questao === "Aberta") {
          tipoReal = "Aberta";
        } else {
          tipoReal = "Fechada";
        }

        const alts = q.alternativas ? JSON.stringify(q.alternativas) : null;
        const gab = q.gabarito || null;
        const origemFinal = (
          q.origem && q.origem.trim()
            ? q.origem.trim()
            : nomesArquivos
              ? `Slide: ${nomesArquivos}`
              : "Material de Aula"
        ).slice(0, 95);

        const insertRes = await db.query(
          `INSERT INTO questoes (materia, topico, ano_escolar_alvo, tipo_questao, pergunta, alternativas, gabarito, origem)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [materiaFinal, topicoFinal, anoEscolarFinal, tipoReal, q.pergunta, alts, gab, origemFinal],
        );
        questoesSalvas.push(insertRes.rows[0]);
      }

      return res.json({ questoes: questoesSalvas });
    }

    const isSuperior = nivel === "superior" || Boolean(curso);

    let orderByClause = priorizar_oficiais
      ? `ORDER BY CASE WHEN origem != 'IA' THEN 0 ELSE 1 END, RANDOM()`
      : `ORDER BY RANDOM()`;

    let whereConditions = [];
    let queryParams = [];

    // Filtro flexível por matéria
    if (materia) {
      const materiasArray = materia
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      if (materiasArray.length === 1) {
        queryParams.push(`%${materiasArray[0]}%`);
        whereConditions.push(`materia ILIKE $${queryParams.length}`);
      } else if (materiasArray.length > 1) {
        const orClauses = materiasArray.map((mat) => {
          queryParams.push(`%${mat}%`);
          return `materia ILIKE $${queryParams.length}`;
        });
        whereConditions.push(`(${orClauses.join(" OR ")})`);
      }
    }

    // Filtro por tópico (apenas se for específico, ignorando "Geral")
    if (topico && topico.trim() && topico.trim().toLowerCase() !== "geral") {
      const topicosArray = topico
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      if (topicosArray.length === 1) {
        queryParams.push(`%${topicosArray[0]}%`);
        whereConditions.push(`topico ILIKE $${queryParams.length}`);
      } else if (topicosArray.length > 1) {
        const orClauses = topicosArray.map((top) => {
          queryParams.push(`%${top}%`);
          return `topico ILIKE $${queryParams.length}`;
        });
        whereConditions.push(`(${orClauses.join(" OR ")})`);
      }
    }

    // Filtro por série/ano escolar
    if (ano_escolar && ano_escolar !== "Ensino Superior") {
      queryParams.push(ano_escolar);
      whereConditions.push(
        `(ano_escolar_alvo = $${queryParams.length} OR ano_escolar_alvo = 'Pré-Vestibular/ENEM')`,
      );
    }

    if (tipo_questao !== "Mesclada") {
      queryParams.push(tipo_questao);
      whereConditions.push(`tipo_questao = $${queryParams.length}`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";
    queryParams.push(quantidade);
    const limitParamIndex = queryParams.length;

    const dbResult = await db.query(
      `SELECT * FROM questoes 
             ${whereClause}
             ${orderByClause}
             LIMIT $${limitParamIndex}`,
      queryParams,
    );

    let questoes = dbResult.rows;

    // 2. Se faltarem questões, chamar a API da IA
    if (questoes.length < quantidade) {
      const questoesFaltantes = quantidade - questoes.length;

      let prompt = "";

      const regraTabelas = `TABELAS E DADOS: Sempre que a interpretação da questão depender de comparação de dados, propriedades químicas/físicas, experimentos, estatísticas, cronologias ou tabelas-verdade, inclua a tabela diretamente no texto da pergunta formatada em Markdown padrão (com barras verticais | e separador |--|--|).`;
      const regraOficiais = priorizar_oficiais
        ? `BANCA E ORIGEM DAS QUESTÕES: O usuário marcou "Priorizar Questões Oficiais". Portanto, busque em sua base de dados e transcreva questões REAIS e AUTÊNTICAS de vestibulares e exames oficiais conhecidos (como ENEM, FUVEST, UNICAMP, UNESP, UERJ, ENADE, etc.). No campo "origem" de cada questão, indique obrigatoriamente a banca e ano de aplicação real (ex: "ENEM 2022", "FUVEST 2021", "UNICAMP 2020"). Se e somente se não encontrar nenhuma questão oficial sobre o tema, gere uma questão inédita e defina "origem": "IA".`
        : `No campo "origem" de cada questão, preencha com "IA".`;

      if (isSuperior) {
        // Prompt especializado para Nível Superior / Graduação
        const cabecalhoSuperior = `Você é um professor universitário e avaliador acadêmico do curso de "${curso || "Graduação"}". Elabore questões de nível de Ensino Superior sobre a disciplina "${disciplina || materia}", abordando os tópicos "${topico}". NÍVEL DE DIFICULDADE DESEJADO: ${dificuldade}. Utilize rigor técnico, conceitual e metodológico típico de avaliações universitárias.\n${regraTabelas}\n${regraOficiais}`;

        if (tipo_questao === "Fechada") {
          prompt = `${cabecalhoSuperior}
Gere ${questoesFaltantes} questões de múltipla escolha.
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2, integral de f(x) dx).
Retorne ESTRITAMENTE um array JSON com a seguinte estrutura:
[
  {
    "origem": "ENADE 2021",
    "pergunta": "Texto da pergunta",
    "alternativas": [
      { "letra": "A", "texto": "...", "correta": false, "explicacao": "Por que esta está errada..." },
      { "letra": "B", "texto": "...", "correta": true, "explicacao": null }
    ]
  }
]`;
        } else if (tipo_questao === "Aberta") {
          prompt = `${cabecalhoSuperior}
Gere ${questoesFaltantes} questões discursivas/analíticas de nível superior.
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2).
Retorne ESTRITAMENTE um array JSON com a seguinte estrutura:
[
  {
    "origem": "ENADE 2019",
    "pergunta": "Texto do problema ou questão dissertativa acadêmica",
    "gabarito": "Padrão de resposta detalhado com critérios de pontuação esperados do graduando."
  }
]`;
        } else {
          prompt = `${cabecalhoSuperior}
Gere ${questoesFaltantes} questões mistas de graduação universitária (metade de múltipla escolha e metade discursiva).
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2).
Retorne ESTRITAMENTE um array JSON. Cada objeto deve ter um campo "tipo_questao" ("Fechada" ou "Aberta"):
[
  {
    "tipo_questao": "Fechada",
    "origem": "ENADE 2021",
    "pergunta": "Texto da pergunta",
    "alternativas": [ { "letra": "A", "texto": "...", "correta": true, "explicacao": null } ]
  },
  {
    "tipo_questao": "Aberta",
    "origem": "ENADE 2019",
    "pergunta": "Texto da pergunta dissertativa",
    "gabarito": "Resposta esperada"
  }
]`;
        }
      } else {
        // Prompt padrão para Fundamental e Médio
        if (tipo_questao === "Fechada") {
          prompt = `Gere ${questoesFaltantes} questões de múltipla escolha sobre os tópicos "${topico}" da(s) matéria(s) "${materia}" para o nível "${ano_escolar}", com foco no padrão "${foco}".
NÍVEL DE DIFICULDADE DESEJADO: ${dificuldade}. Adapte a complexidade dos conceitos, textos e "pegadinhas" de acordo com esta exigência.
${regraTabelas}
${regraOficiais}
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2).
Retorne ESTRITAMENTE um array JSON com a seguinte estrutura:
[
  {
    "origem": "ENEM 2022",
    "pergunta": "Texto da pergunta",
    "alternativas": [
      { "letra": "A", "texto": "...", "correta": false, "explicacao": "Por que esta está errada..." },
      { "letra": "B", "texto": "...", "correta": true, "explicacao": null }
    ]
  }
]`;
        } else if (tipo_questao === "Aberta") {
          prompt = `Gere ${questoesFaltantes} questões discursivas (abertas) sobre os tópicos "${topico}" da(s) matéria(s) "${materia}" para o nível "${ano_escolar}", com foco no padrão "${foco}".
NÍVEL DE DIFICULDADE DESEJADO: ${dificuldade}. Adapte a complexidade dos conceitos, textos e "pegadinhas" de acordo com esta exigência.
${regraTabelas}
${regraOficiais}
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2).
Retorne ESTRITAMENTE um array JSON com a seguinte estrutura:
[
  {
    "origem": "FUVEST 2021",
    "pergunta": "Texto da pergunta dissertativa",
    "gabarito": "Padrão de resposta detalhado esperado do aluno (será usado posteriormente para corrigir)."
  }
]`;
        } else {
          prompt = `Gere ${questoesFaltantes} questões mistas sobre os tópicos "${topico}" da(s) matéria(s) "${materia}" para o nível "${ano_escolar}", com foco no padrão "${foco}".
NÍVEL DE DIFICULDADE DESEJADO: ${dificuldade}. Adapte a complexidade dos conceitos, textos e "pegadinhas" de acordo com esta exigência.
${regraTabelas}
${regraOficiais}
Metade deve ser de múltipla escolha e a outra metade discursiva.
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2).
Retorne ESTRITAMENTE um array JSON. Cada objeto deve ter um campo "tipo_questao" ("Fechada" ou "Aberta"):
[
  {
    "tipo_questao": "Fechada",
    "origem": "ENEM 2022",
    "pergunta": "Texto da pergunta",
    "alternativas": [ { "letra": "A", "texto": "...", "correta": true, "explicacao": null } ]
  },
  {
    "tipo_questao": "Aberta",
    "origem": "FUVEST 2020",
    "pergunta": "Texto da pergunta dissertativa",
    "gabarito": "Resposta esperada"
  }
]`;
        }
      }

      const response = await generateWithFallback({
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      let questoesIA;
      try {
        questoesIA = JSON.parse(response.text);
      } catch (err) {
        console.error(
          "Falha ao fazer parse do JSON do simulado:",
          response.text,
        );
        throw new Error("Erro de formatação da IA");
      }

      // Inserir as geradas no banco de dados para ter UUID válido e Foreign Key
      const idsGerados = [];
      for (const q of questoesIA) {
        const tipoReal = q.tipo_questao || tipo_questao;
        const alts = q.alternativas ? JSON.stringify(q.alternativas) : null;
        const gab = q.gabarito || null;
        const origemFinal =
          q.origem && q.origem.trim()
            ? q.origem.trim()
            : priorizar_oficiais
              ? "ENEM"
              : "IA";

        const insertRes = await db.query(
          `INSERT INTO questoes (materia, topico, ano_escolar_alvo, tipo_questao, pergunta, alternativas, gabarito, origem)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [
            materia,
            topico,
            ano_escolar,
            tipoReal,
            q.pergunta,
            alts,
            gab,
            origemFinal,
          ],
        );
        idsGerados.push(insertRes.rows[0]);
      }

      questoes = [...questoes, ...idsGerados];
    }

    return res.json({ questoes });
  } catch (error) {
    console.error("Erro ao gerar simulado:", error);
    if (
      error.status === 503 ||
      (error.message && error.message.includes("high demand"))
    ) {
      return res.status(503).json({ error: "ALTA_DEMANDA" });
    }
    return res.status(500).json({ error: error?.message || "Erro interno ao gerar o simulado." });
  }
});

// POST /api/simulado/finalizar
router.post("/finalizar", authMiddleware, async (req, res) => {
  try {
    const { nome_simulado, respostas } = req.body;
    const firebase_uid = req.user.uid;

    // 1. Criar o registro do simulado
    const simRes = await db.query(
      `INSERT INTO simulados_realizados (firebase_uid, nome) VALUES ($1, $2) RETURNING id`,
      [firebase_uid, nome_simulado || "Simulado Geral"],
    );
    const simulado_id = simRes.rows[0].id;

    let somaNotas = 0;
    const resultadosProcessados = [];

    // 2. Corrigir em lote
    const correctionPromises = respostas.map(async (resp) => {
      let acertou = null;
      let nota = 0;
      let feedback_ia = null;

      if (resp.tipo === "Fechada") {
        acertou = resp.acertou;
        nota = acertou ? 100 : 0;
        feedback_ia = resp.explicacao || null;
      } else if (resp.tipo === "Aberta") {
        // Chama a IA para corrigir
        const prompt = `Atue como um corretor rigoroso. 
Pergunta original: ${resp.pergunta}
Padrão de resposta esperado: ${resp.gabarito}
Resposta do aluno: "${resp.resposta_aluno}"

IMPORTANTE PARA QUESTÕES DE EXATAS/CÁLCULOS: Não exija que o aluno escreva a conta inteira. Se a resposta final do aluno estiver correta de acordo com o gabarito, dê nota máxima (100). Só corrija e explique a resolução caso o resultado final esteja incorreto.
ALÉM DISSO: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc) no seu feedback. Escreva fórmulas e contas em texto plano.

Retorne ESTRITAMENTE em formato JSON com a seguinte estrutura:
{
  "nota": <numero de 0 a 100>,
  "feedback_detalhado": "Sua explicação pedagógica detalhada do que o aluno acertou e onde errou."
}`;
        try {
          const response = await generateWithFallback({
            contents: prompt,
            config: {
              responseMimeType: "application/json",
            },
          });

          let cleanText = response.text.trim();
          if (cleanText.startsWith("```")) {
            cleanText = cleanText
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/\s*```$/, "");
          }
          const correcaoIA = JSON.parse(cleanText);
          nota = Number(correcaoIA.nota);
          feedback_ia = correcaoIA.feedback_detalhado;
          acertou = nota >= 50; // Arbitrário, para a flag booleana
        } catch (err) {
          console.error("Falha ao corrigir aberta:", err);
          nota = 0;
          feedback_ia = "Erro ao processar correção pela IA.";
        }
      }

      somaNotas += nota;
      resultadosProcessados.push({
        questao_id: resp.questao_id,
        acertou,
        nota,
        resposta_aluno: resp.resposta_aluno || resp.alternativa_selecionada,
        feedback_ia,
      });

      // 3. Salvar no histórico de respostas
      await db.query(
        `INSERT INTO historico_respostas 
                 (firebase_uid, simulado_id, questao_id, acertou, nota, resposta_aluno, feedback_ia) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          firebase_uid,
          simulado_id,
          resp.questao_id,
          acertou,
          nota,
          resp.resposta_aluno || resp.alternativa_selecionada,
          feedback_ia,
        ],
      );
    });

    await Promise.all(correctionPromises);

    // 4. Atualizar nota geral do simulado
    const notaGeral = respostas.length > 0 ? somaNotas / respostas.length : 0;
    await db.query(
      `UPDATE simulados_realizados SET nota_geral = $1 WHERE id = $2`,
      [notaGeral, simulado_id],
    );

    return res.json({
      success: true,
      simulado_id,
      nota_geral: notaGeral,
      resultados: resultadosProcessados,
    });
  } catch (error) {
    console.error("Erro ao finalizar simulado:", error);
    return res
      .status(500)
      .json({ error: "Erro interno ao finalizar simulado." });
  }
});

module.exports = router;
