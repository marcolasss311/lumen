const crypto = require("crypto");
const db = require("../db");

const LIMITE_PERGUNTA = 20_000;
const LIMITE_ALTERNATIVA = 3_000;
const LIMITE_GABARITO = 10_000;

const cortar = (valor, max) => (typeof valor === "string" ? valor.trim().slice(0, max) : "");

function lerAlternativas(alternativas) {
  if (typeof alternativas === "string") {
    try {
      return JSON.parse(alternativas);
    } catch {
      return null;
    }
  }
  return alternativas;
}

/** Valida as alternativas vindas da IA. Retorna null se não houver exatamente uma correta. */
function normalizarAlternativas(alternativas) {
  if (!Array.isArray(alternativas)) return null;
  const limpas = alternativas
    .filter((a) => a && cortar(a.texto, LIMITE_ALTERNATIVA))
    .slice(0, 6)
    .map((a, i) => ({
      letra: String.fromCharCode(65 + i),
      texto: cortar(a.texto, LIMITE_ALTERNATIVA),
      correta: a.correta === true,
      explicacao: a.correta !== true ? cortar(a.explicacao, LIMITE_ALTERNATIVA) || null : null,
    }));
  if (limpas.length < 2) return null;
  if (limpas.filter((a) => a.correta).length !== 1) return null;
  return limpas;
}

/**
 * Converte a resposta da IA em linhas prontas para o banco, descartando questões malformadas
 * (sem pergunta, sem gabarito ou com número errado de alternativas corretas).
 */
function normalizarQuestoesIA(dadosIA, opcoes) {
  const {
    tipoSolicitado,
    quantidade,
    materiaPadrao,
    materiasPermitidas = [],
    topicoPadrao,
    anoEscolar,
    origemFixa = null,
    privada = false,
    criadoPor,
  } = opcoes;

  const lista = Array.isArray(dadosIA) ? dadosIA : Array.isArray(dadosIA?.questoes) ? dadosIA.questoes : [];
  const questoes = [];
  // Lotes gerados em paralelo às vezes trazem a mesma questão: compara o começo do enunciado.
  const vistas = new Set();
  const chaveDe = (texto) => texto.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().slice(0, 120);

  for (const q of lista) {
    if (questoes.length >= quantidade) break;
    const pergunta = cortar(q?.pergunta, LIMITE_PERGUNTA);
    const chave = chaveDe(pergunta);
    if (!pergunta || vistas.has(chave)) continue;

    let tipo = tipoSolicitado;
    if (tipo === "Mesclada") {
      tipo = q.tipo_questao === "Aberta" || (!q.alternativas && q.gabarito) ? "Aberta" : "Fechada";
    }

    let alternativas = null;
    let gabarito = null;
    if (tipo === "Fechada") {
      alternativas = normalizarAlternativas(q.alternativas);
      if (!alternativas) continue;
    } else {
      gabarito = cortar(q.gabarito, LIMITE_GABARITO);
      if (!gabarito) continue;
    }

    const materiaIA = cortar(q.materia, 255);
    const materia = materiasPermitidas.includes(materiaIA) ? materiaIA : materiaPadrao;

    vistas.add(chave);
    questoes.push({
      materia: materia.slice(0, 255),
      topico: (cortar(q.topico, 255) || topicoPadrao).slice(0, 255),
      ano_escolar_alvo: anoEscolar.slice(0, 50),
      tipo_questao: tipo,
      pergunta,
      alternativas,
      gabarito,
      origem: (origemFixa || cortar(q.origem, 255) || "IA").slice(0, 255),
      privada,
      criado_por: criadoPor,
    });
  }

  return questoes;
}

/** Insere várias questões em uma única ida ao banco, preservando a ordem. */
async function inserirQuestoes(cliente, questoes) {
  if (questoes.length === 0) return [];
  const comId = questoes.map((q) => ({ ...q, id: crypto.randomUUID() }));
  const { rows } = await cliente.query(
    `INSERT INTO questoes
       (id, materia, topico, ano_escolar_alvo, tipo_questao, pergunta, alternativas, gabarito, origem, privada, criado_por)
     SELECT id, materia, topico, ano_escolar_alvo, tipo_questao, pergunta, alternativas, gabarito, origem, privada, criado_por
     FROM jsonb_to_recordset($1::jsonb) AS x(
       id uuid, materia text, topico text, ano_escolar_alvo text, tipo_questao text, pergunta text,
       alternativas jsonb, gabarito text, origem text, privada boolean, criado_por text
     )
     RETURNING *`,
    [JSON.stringify(comId)],
  );
  const porId = new Map(rows.map((r) => [r.id, r]));
  return comId.map((q) => porId.get(q.id));
}

const escaparLike = (valor) => `%${valor.replace(/[\\%_]/g, "\\$&")}%`;

/**
 * Sorteia questões do banco público. Prioriza questões que o aluno ainda não respondeu e,
 * se pedido, as oficiais (origem diferente de "IA").
 */
async function buscarQuestoesPublicas({
  uid,
  materias,
  topicos,
  nivel,
  anoEscolar,
  tipo,
  priorizarOficiais,
  limite,
}) {
  const params = [];
  const p = (valor) => {
    params.push(valor);
    return `$${params.length}`;
  };
  const condicoes = ["q.privada = false"];

  if (materias.length) {
    condicoes.push(`(${materias.map((m) => `q.materia ILIKE ${p(escaparLike(m))}`).join(" OR ")})`);
  }
  if (topicos.length) {
    condicoes.push(`(${topicos.map((t) => `q.topico ILIKE ${p(escaparLike(t))}`).join(" OR ")})`);
  }
  if (nivel === "superior") {
    condicoes.push(`q.ano_escolar_alvo = 'Ensino Superior'`);
  } else if (nivel === "fundamental") {
    condicoes.push(`q.ano_escolar_alvo = ${p(anoEscolar)}`);
  } else {
    condicoes.push(`q.ano_escolar_alvo IN (${p(anoEscolar)}, 'Pré-Vestibular/ENEM')`);
  }
  if (tipo !== "Mesclada") {
    condicoes.push(`q.tipo_questao = ${p(tipo)}`);
  }

  const ordem = [
    `EXISTS (SELECT 1 FROM historico_respostas h WHERE h.questao_id = q.id AND h.firebase_uid = ${p(uid)})`,
    priorizarOficiais ? `(q.origem = 'IA')` : null,
    "random()",
  ].filter(Boolean);

  const { rows } = await db.query(
    `SELECT q.* FROM questoes q
     WHERE ${condicoes.join(" AND ")}
     ORDER BY ${ordem.join(", ")}
     LIMIT ${p(limite)}`,
    params,
  );
  return rows;
}

/** Carrega questões pela lista de IDs, na mesma ordem da lista. */
async function carregarQuestoes(ids) {
  if (!ids || ids.length === 0) return [];
  const { rows } = await db.query(`SELECT * FROM questoes WHERE id = ANY($1::uuid[])`, [ids]);
  const porId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => porId.get(id)).filter(Boolean);
}

/** Versão da questão enviada durante a prova: sem gabarito, sem alternativa correta. */
function paraAluno(q) {
  const alternativas = lerAlternativas(q.alternativas);
  return {
    id: q.id,
    materia: q.materia,
    topico: q.topico,
    tipo_questao: q.tipo_questao,
    pergunta: q.pergunta,
    origem: q.origem,
    alternativas: Array.isArray(alternativas)
      ? alternativas.map(({ letra, texto }) => ({ letra, texto }))
      : null,
  };
}

/** Versão completa, liberada depois que o simulado é corrigido. */
function paraCorrecao(q) {
  return {
    ...paraAluno(q),
    alternativas: lerAlternativas(q.alternativas),
    gabarito: q.gabarito,
  };
}

async function criarSimulado(cliente, { uid, nome, questaoIds }) {
  const { rows } = await cliente.query(
    `INSERT INTO simulados_realizados (firebase_uid, nome, status, questao_ids)
     VALUES ($1, $2, 'em_andamento', $3::uuid[])
     RETURNING id, nome`,
    [uid, nome.slice(0, 255), questaoIds],
  );
  return rows[0];
}

module.exports = {
  lerAlternativas,
  normalizarQuestoesIA,
  inserirQuestoes,
  buscarQuestoesPublicas,
  carregarQuestoes,
  paraAluno,
  paraCorrecao,
  criarSimulado,
};
