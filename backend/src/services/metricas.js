const db = require("../db");

// Estimativa (em segundos) usada enquanto ainda não há histórico suficiente.
const ESTIMATIVAS_INICIAIS = { geracao: 20, geracao_material: 30, correcao: 15 };
const AMOSTRAS = 30;

let cache = null;
let cacheValidoAte = 0;

/** Registra quanto tempo uma operação levou. Não bloqueia a resposta nem falha a requisição. */
function registrarMetrica({ operacao, duracaoMs, quantidade = 0, usouIA = true }) {
  db.query(
    `INSERT INTO metricas_ia (operacao, duracao_ms, quantidade, usou_ia) VALUES ($1, $2, $3, $4)`,
    [operacao, Math.round(duracaoMs), quantidade, usouIA],
  ).catch((err) => console.warn("[métricas] Falha ao registrar:", err.message));
}

/**
 * Mediana do tempo das últimas operações que chamaram a IA (a mediana ignora casos
 * extremos, como uma geração que pegou o Gemini sobrecarregado). Fica em cache por 1 min.
 */
async function temposMedios() {
  if (cache && Date.now() < cacheValidoAte) return cache;

  const { rows } = await db.query(
    `SELECT operacao,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY duracao_ms) AS mediana_ms,
            count(*)::int AS amostras
     FROM (
       SELECT operacao, duracao_ms,
              row_number() OVER (PARTITION BY operacao ORDER BY criado_em DESC) AS posicao
       FROM metricas_ia
       WHERE usou_ia AND criado_em > now() - interval '14 days'
     ) recentes
     WHERE posicao <= $1
     GROUP BY operacao`,
    [AMOSTRAS],
  );

  const resultado = {};
  for (const [operacao, estimativa] of Object.entries(ESTIMATIVAS_INICIAIS)) {
    const linha = rows.find((r) => r.operacao === operacao);
    resultado[operacao] = linha
      ? { segundos: Math.max(1, Math.round(linha.mediana_ms / 1000)), amostras: linha.amostras }
      : { segundos: estimativa, amostras: 0 };
  }

  cache = resultado;
  cacheValidoAte = Date.now() + 60_000;
  return resultado;
}

module.exports = { registrarMetrica, temposMedios };
