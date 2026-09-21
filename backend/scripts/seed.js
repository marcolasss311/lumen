// Insere as questões oficiais que ainda não existem no banco. Não apaga nada:
// questões apagadas levariam junto (ON DELETE CASCADE) o histórico dos alunos.
const db = require("../src/db");
const { runMigrations } = require("../src/db/migrate");
const questoesOficiais = require("../src/db/questoesOficiais");

async function seed() {
  await runMigrations();
  const { rowCount } = await db.query(
    `INSERT INTO questoes (materia, topico, ano_escolar_alvo, tipo_questao, pergunta, alternativas, gabarito, origem)
     SELECT x.materia, x.topico, x.ano_escolar_alvo, x.tipo_questao, x.pergunta, x.alternativas, x.gabarito, x.origem
     FROM jsonb_to_recordset($1::jsonb) AS x(
       materia text, topico text, ano_escolar_alvo text, tipo_questao text,
       pergunta text, alternativas jsonb, gabarito text, origem text
     )
     WHERE NOT EXISTS (SELECT 1 FROM questoes q WHERE q.pergunta = x.pergunta)`,
    [JSON.stringify(questoesOficiais)],
  );
  console.log(`Seed finalizado: ${rowCount} questão(ões) nova(s) inserida(s).`);
}

seed()
  .catch((error) => {
    console.error("Erro no seed:", error);
    process.exitCode = 1;
  })
  .finally(() => db.pool.end());
