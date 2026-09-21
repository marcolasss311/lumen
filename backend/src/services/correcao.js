const config = require("../config");
const { gerarJSON } = require("../core/gemini");
const { SISTEMA_CORRECAO, SCHEMA_CORRECAO, promptCorrecao } = require("./prompts");
const { lerAlternativas } = require("./questoes");

/** Executa `fn` sobre os itens com no máximo `limite` promessas ao mesmo tempo. */
async function mapearComLimite(itens, limite, fn) {
  const resultados = new Array(itens.length);
  let proximo = 0;
  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await fn(itens[i], i);
    }
  });
  await Promise.all(trabalhadores);
  return resultados;
}

async function corrigirDiscursiva({ pergunta, gabarito, resposta }) {
  const respostaLimpa = String(resposta || "").trim().slice(0, config.limites.caracteresRespostaAberta);
  if (!respostaLimpa) {
    return { nota: 0, feedback: "Nenhuma resposta foi fornecida para esta questão." };
  }

  const dados = await gerarJSON({
    systemInstruction: SISTEMA_CORRECAO,
    contents: promptCorrecao({ pergunta, gabarito, resposta: respostaLimpa }),
    schema: SCHEMA_CORRECAO,
    limites: config.gemini.correcao,
  });

  const nota = Number(dados?.nota);
  return {
    nota: Number.isFinite(nota) ? Math.min(100, Math.max(0, Math.round(nota))) : 0,
    feedback: String(dados?.feedback_detalhado || "").slice(0, 10_000),
  };
}

function corrigirFechada(questao, resposta) {
  const alternativas = lerAlternativas(questao.alternativas) || [];
  const letra = typeof resposta === "string" ? resposta.trim().toUpperCase() : "";
  const escolhida = alternativas.find((a) => a.letra === letra);
  const acertou = Boolean(escolhida?.correta);
  return {
    acertou,
    nota: acertou ? 100 : 0,
    resposta_aluno: escolhida ? letra : null,
    feedback_ia: !acertou ? escolhida?.explicacao || null : null,
  };
}

/**
 * Corrige todas as respostas de um simulado usando o gabarito do banco.
 * `respostas` é um objeto { [questao_id]: letra ou texto }.
 */
async function corrigirSimulado(questoes, respostas) {
  return mapearComLimite(questoes, config.gemini.correcoesSimultaneas, async (questao) => {
    const resposta = respostas[questao.id];

    if (questao.tipo_questao === "Aberta") {
      const texto = typeof resposta === "string" ? resposta.slice(0, config.limites.caracteresRespostaAberta) : "";
      const { nota, feedback } = await corrigirDiscursiva({
        pergunta: questao.pergunta,
        gabarito: questao.gabarito,
        resposta: texto,
      });
      return {
        questao_id: questao.id,
        acertou: nota >= config.notaMinimaAcerto,
        nota,
        resposta_aluno: texto || null,
        feedback_ia: feedback,
      };
    }

    return { questao_id: questao.id, ...corrigirFechada(questao, resposta) };
  });
}

module.exports = { corrigirDiscursiva, corrigirSimulado };
