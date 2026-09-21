const { Pool } = require("pg");
require("../config");

// DB_SSL: "disable" | "require" (criptografa sem validar o certificado) | "verify" (valida).
// Com DATABASE_URL o padrão continua sendo "require", que é o que o Render aceita hoje.
// Para validar o certificado, use DB_SSL=verify e, se necessário, DB_SSL_CA com o certificado da CA.
function configurarSsl() {
  const modo = process.env.DB_SSL || (process.env.DATABASE_URL ? "require" : "disable");
  if (modo === "disable") return false;
  if (modo === "verify") {
    return process.env.DB_SSL_CA
      ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, "\n"), rejectUnauthorized: true }
      : { rejectUnauthorized: true };
  }
  return { rejectUnauthorized: false };
}

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: configurarSsl(),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // Impede que uma consulta travada segure uma conexão indefinidamente.
  statement_timeout: 20_000,
  application_name: "lumen-backend",
});

pool.on("error", (err) => {
  console.error("Erro inesperado em conexão ociosa do Postgres:", err.message);
});

/**
 * Executa `fn` dentro de uma transação. Faz ROLLBACK se `fn` lançar erro.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resultado = await fn(client);
    await client.query("COMMIT");
    return resultado;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  withTransaction,
  pool,
};
