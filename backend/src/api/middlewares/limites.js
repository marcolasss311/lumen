const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const config = require("../../config");
const db = require("../../db");

const HORA = 60 * 60 * 1000;

/**
 * Guarda as contagens no Postgres. No Cloud Run as instâncias desligam quando ociosas
 * (e pode haver mais de uma), então uma contagem em memória zeraria a cada cold start
 * e deixaria de proteger a cota do Gemini.
 */
class ArmazenamentoPostgres {
  constructor(prefixo) {
    this.prefix = prefixo;
    this.localKeys = false;
  }

  init(opcoes) {
    this.janelaMs = opcoes.windowMs;
  }

  async increment(chave) {
    const { rows } = await db.query(
      `INSERT INTO limites_uso (chave, contagem, expira_em)
       VALUES ($1, 1, now() + make_interval(secs => $2::double precision / 1000))
       ON CONFLICT (chave) DO UPDATE SET
         contagem = CASE WHEN limites_uso.expira_em <= now() THEN 1 ELSE limites_uso.contagem + 1 END,
         expira_em = CASE WHEN limites_uso.expira_em <= now() THEN EXCLUDED.expira_em ELSE limites_uso.expira_em END
       RETURNING contagem, expira_em`,
      [this.prefix + chave, this.janelaMs],
    );
    return { totalHits: rows[0].contagem, resetTime: rows[0].expira_em };
  }

  async decrement(chave) {
    await db.query(`UPDATE limites_uso SET contagem = GREATEST(contagem - 1, 0) WHERE chave = $1`, [
      this.prefix + chave,
    ]);
  }

  async resetKey(chave) {
    await db.query(`DELETE FROM limites_uso WHERE chave = $1`, [this.prefix + chave]);
  }
}

/**
 * `nome` identifica o limite no banco. Sem `nome`, a contagem fica em memória
 * (suficiente para o limite geral contra excesso de requisições).
 */
function criarLimite({ nome, janelaMs, maximo, mensagem, porUsuario = true }) {
  return rateLimit({
    windowMs: janelaMs,
    limit: maximo,
    store: nome ? new ArmazenamentoPostgres(`${nome}:`) : undefined,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Depois do authMiddleware, o limite é por conta; antes dele, por IP.
    keyGenerator: (req) => (porUsuario && req.user?.uid ? `uid:${req.user.uid}` : ipKeyGenerator(req.ip)),
    handler: (req, res) => {
      res.status(429).json({ error: mensagem, codigo: "LIMITE_USO" });
    },
  });
}

// Protege toda a API contra excesso de requisições por IP.
const limiteGeralPorIp = criarLimite({
  janelaMs: 15 * 60 * 1000,
  maximo: config.rateLimit.requisicoesPorIp15Min,
  mensagem: "Muitas requisições. Aguarde alguns minutos e tente novamente.",
  porUsuario: false,
});

const MSG_GERACAO = "Você atingiu o limite de simulados gerados por enquanto. Tente novamente mais tarde.";

// Geração chama a IA (custo): limite por conta por hora e por dia, e um limite por IP
// para dificultar o abuso com várias contas.
const limitesGeracao = [
  criarLimite({
    nome: "geracao-hora",
    janelaMs: HORA,
    maximo: config.rateLimit.geracoesPorHora,
    mensagem: MSG_GERACAO,
  }),
  criarLimite({
    nome: "geracao-dia",
    janelaMs: 24 * HORA,
    maximo: config.rateLimit.geracoesPorDia,
    mensagem: MSG_GERACAO,
  }),
  criarLimite({
    nome: "geracao-ip",
    janelaMs: HORA,
    maximo: config.rateLimit.geracoesPorHora * 4,
    mensagem: MSG_GERACAO,
    porUsuario: false,
  }),
];

const limitesCorrecao = [
  criarLimite({
    nome: "correcao-hora",
    janelaMs: HORA,
    maximo: config.rateLimit.correcoesPorHora,
    mensagem: "Você atingiu o limite de correções por hora. Tente novamente mais tarde.",
  }),
];

module.exports = { limiteGeralPorIp, limitesGeracao, limitesCorrecao };
