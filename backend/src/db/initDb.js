// Mantido por compatibilidade: o build antigo do Render roda `node src/db/initDb.js`.
// As migrações agora ficam em migrate.js e também rodam automaticamente no boot do servidor.
const { runMigrations } = require("./migrate");
const { pool } = require("./index");

runMigrations()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
