const config = require("./config");
const app = require("./app");
const { pool } = require("./db");
const { runMigrations } = require("./db/migrate");
const { agendarManutencao } = require("./services/manutencao");

async function iniciar() {
  if (!config.gemini.apiKey) {
    console.warn("GEMINI_API_KEY não definida: a geração e a correção com IA vão falhar.");
  }

  // Migra antes de aceitar requisições. Se falhar, o processo encerra e o Render
  // mantém a versão anterior no ar, em vez de subir com o banco inconsistente.
  await runMigrations();
  agendarManutencao();

  const server = app.listen(config.port, () => {
    console.log(`Servidor rodando na porta ${config.port}`);
  });
  // Uploads grandes + geração com IA podem levar alguns minutos.
  server.requestTimeout = 5 * 60 * 1000;

  const encerrar = (sinal) => {
    console.log(`${sinal} recebido, encerrando...`);
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 30_000).unref();
  };
  process.on("SIGTERM", encerrar);
  process.on("SIGINT", encerrar);
}

iniciar().catch((err) => {
  console.error("Falha ao iniciar o servidor:", err);
  process.exit(1);
});
