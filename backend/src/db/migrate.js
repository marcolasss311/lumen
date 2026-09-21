const { pool } = require("./index");
const questoesOficiais = require("./questoesOficiais");

// Cada migração roda UMA vez, dentro de uma transação, e fica registrada em schema_migrations.
// Todas são idempotentes para funcionar tanto num banco novo quanto no banco que já existia
// antes deste sistema de migrações (criado pelo antigo initDb.js + migração no boot).
// Nunca edite uma migração já aplicada em produção: crie uma nova no fim da lista.
const MIGRACOES = [
  {
    id: "001_esquema_base",
    up: async (db) => {
      await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

      await db.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          firebase_uid VARCHAR(128) UNIQUE NOT NULL,
          nome VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          ano_escolar_atual VARCHAR(50) NOT NULL,
          data_criacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`);

      await db.query(`
        CREATE TABLE IF NOT EXISTS questoes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          materia VARCHAR(255) NOT NULL,
          topico VARCHAR(255) NOT NULL,
          ano_escolar_alvo VARCHAR(50) NOT NULL,
          tipo_questao VARCHAR(20) NOT NULL CHECK (tipo_questao IN ('Fechada', 'Aberta')),
          pergunta TEXT NOT NULL,
          alternativas JSONB,
          gabarito TEXT,
          origem VARCHAR(255) NOT NULL,
          tags TEXT[],
          data_criacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )`);

      await db.query(`
        CREATE TABLE IF NOT EXISTS simulados_realizados (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          firebase_uid VARCHAR(128) NOT NULL,
          nome VARCHAR(255) NOT NULL,
          nota_geral NUMERIC(5,2),
          data_realizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_simulado_usuario FOREIGN KEY (firebase_uid) REFERENCES usuarios(firebase_uid) ON DELETE CASCADE
        )`);

      await db.query(`
        CREATE TABLE IF NOT EXISTS historico_respostas (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          firebase_uid VARCHAR(128) NOT NULL,
          simulado_id UUID,
          questao_id UUID NOT NULL,
          acertou BOOLEAN,
          nota NUMERIC(5,2),
          resposta_aluno TEXT,
          feedback_ia TEXT,
          data_resposta TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_historico_usuario FOREIGN KEY (firebase_uid) REFERENCES usuarios(firebase_uid) ON DELETE CASCADE,
          CONSTRAINT fk_historico_simulado FOREIGN KEY (simulado_id) REFERENCES simulados_realizados(id) ON DELETE CASCADE,
          CONSTRAINT fk_historico_questao FOREIGN KEY (questao_id) REFERENCES questoes(id) ON DELETE CASCADE
        )`);
    },
  },
  {
    // Ajusta bancos criados pelas versões antigas sem apagar dados
    // (a versão anterior fazia DROP TABLE historico_respostas no boot).
    id: "002_ajustes_legados",
    up: async (db) => {
      await db.query(`
        ALTER TABLE questoes
          ALTER COLUMN materia TYPE VARCHAR(255),
          ALTER COLUMN topico TYPE VARCHAR(255),
          ALTER COLUMN origem TYPE VARCHAR(255)`);

      // Contas sem e-mail (ou recriadas com o mesmo e-mail) não podem travar o cadastro.
      await db.query(`ALTER TABLE usuarios ALTER COLUMN email DROP NOT NULL`);
      await db.query(`ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_email_key`);

      await db.query(`
        ALTER TABLE historico_respostas
          ADD COLUMN IF NOT EXISTS simulado_id UUID REFERENCES simulados_realizados(id) ON DELETE CASCADE,
          ADD COLUMN IF NOT EXISTS nota NUMERIC(5,2),
          ADD COLUMN IF NOT EXISTS resposta_aluno TEXT,
          ADD COLUMN IF NOT EXISTS feedback_ia TEXT`);
    },
  },
  {
    // O simulado passa a ser criado no servidor já na geração, guardando as questões sorteadas.
    // Assim a correção usa o gabarito do banco, e não o que o navegador envia.
    id: "003_simulado_no_servidor",
    up: async (db) => {
      const { rows } = await db.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'simulados_realizados' AND column_name = 'status'`);
      const colunaNova = rows.length === 0;

      await db.query(`
        ALTER TABLE simulados_realizados
          ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'finalizado',
          ADD COLUMN IF NOT EXISTS questao_ids UUID[],
          ADD COLUMN IF NOT EXISTS corrigindo_desde TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS data_criacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP`);

      if (colunaNova) {
        await db.query(`UPDATE simulados_realizados SET data_criacao = COALESCE(data_realizacao, data_criacao)`);
      }

      await db.query(`ALTER TABLE simulados_realizados ALTER COLUMN status SET DEFAULT 'em_andamento'`);
      await db.query(`ALTER TABLE simulados_realizados DROP CONSTRAINT IF EXISTS chk_simulado_status`);
      await db.query(`
        ALTER TABLE simulados_realizados ADD CONSTRAINT chk_simulado_status
          CHECK (status IN ('em_andamento', 'corrigindo', 'finalizado'))`);
    },
  },
  {
    // Questões geradas a partir do material do aluno (PDF/anotações) deixam de ir para o banco público.
    id: "004_questoes_privadas",
    up: async (db) => {
      await db.query(`
        ALTER TABLE questoes
          ADD COLUMN IF NOT EXISTS privada BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS criado_por VARCHAR(128) REFERENCES usuarios(firebase_uid) ON DELETE SET NULL`);

      // Marca como privadas as questões antigas que vieram de material próprio. No fluxo antigo
      // o tópico era sempre a lista de arquivos enviados ou "Anotações do Aluno".
      // O dono é quem respondeu a questão primeiro.
      await db.query(`
        UPDATE questoes q SET
          privada = true,
          criado_por = (
            SELECT h.firebase_uid FROM historico_respostas h
            WHERE h.questao_id = q.id
            ORDER BY h.data_resposta ASC
            LIMIT 1
          )
        WHERE q.privada = false
          AND (
            q.topico IN ('Anotações do Aluno', 'Slides de Aula')
            OR q.topico ~* '\\.(pdf|txt|md)\\M'
            OR q.materia LIKE 'Material%'
            OR q.origem LIKE 'Slide:%'
            OR q.origem = 'Material de Aula'
          )`);
    },
  },
  {
    id: "005_indices",
    up: async (db) => {
      // Redundantes: o UNIQUE já cria índice / não atendem ILIKE '%...%' / não usados em consultas.
      await db.query(`DROP INDEX IF EXISTS idx_usuarios_firebase_uid`);
      await db.query(`DROP INDEX IF EXISTS idx_questoes_filtros`);
      await db.query(`DROP INDEX IF EXISTS idx_questoes_origem`);
      await db.query(`DROP INDEX IF EXISTS idx_historico_aluno_data`);

      await db.query(`CREATE INDEX IF NOT EXISTS idx_historico_simulado ON historico_respostas(simulado_id)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_historico_questao ON historico_respostas(questao_id)`);
      await db.query(
        `CREATE INDEX IF NOT EXISTS idx_historico_aluno_questao ON historico_respostas(firebase_uid, questao_id)`,
      );
      await db.query(
        `CREATE INDEX IF NOT EXISTS idx_simulados_usuario_data ON simulados_realizados(firebase_uid, data_realizacao DESC)`,
      );
      await db.query(
        `CREATE INDEX IF NOT EXISTS idx_questoes_publicas ON questoes(tipo_questao, ano_escolar_alvo) WHERE privada = false`,
      );
      await db.query(
        `CREATE INDEX IF NOT EXISTS idx_questoes_criado_por ON questoes(criado_por) WHERE criado_por IS NOT NULL`,
      );

      // Índices trigram aceleram o filtro ILIKE '%...%' por matéria/tópico.
      // pg_trgm é opcional: se o provedor não permitir a extensão, o sistema segue sem ele.
      await db.query("SAVEPOINT trgm");
      try {
        await db.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
        await db.query(
          `CREATE INDEX IF NOT EXISTS idx_questoes_materia_trgm ON questoes USING gin (materia gin_trgm_ops)`,
        );
        await db.query(
          `CREATE INDEX IF NOT EXISTS idx_questoes_topico_trgm ON questoes USING gin (topico gin_trgm_ops)`,
        );
        await db.query("RELEASE SAVEPOINT trgm");
      } catch (err) {
        await db.query("ROLLBACK TO SAVEPOINT trgm");
        console.warn("[migração] pg_trgm indisponível, seguindo sem índices trigram:", err.message);
      }
    },
  },
  {
    id: "006_questoes_oficiais_iniciais",
    up: async (db) => {
      const { rows } = await db.query(
        `SELECT COUNT(*)::int AS total FROM questoes WHERE privada = false AND origem <> 'IA'`,
      );
      if (rows[0].total > 0) return;

      await db.query(
        `INSERT INTO questoes (materia, topico, ano_escolar_alvo, tipo_questao, pergunta, alternativas, gabarito, origem)
         SELECT materia, topico, ano_escolar_alvo, tipo_questao, pergunta, alternativas, gabarito, origem
         FROM jsonb_to_recordset($1::jsonb) AS x(
           materia text, topico text, ano_escolar_alvo text, tipo_questao text,
           pergunta text, alternativas jsonb, gabarito text, origem text
         )`,
        [JSON.stringify(questoesOficiais)],
      );
      console.log(`[migração] ${questoesOficiais.length} questões oficiais inseridas.`);
    },
  },
  {
    // Contadores dos limites de uso da IA (ver api/middlewares/limites.js).
    id: "007_limites_uso",
    up: async (db) => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS limites_uso (
          chave VARCHAR(200) PRIMARY KEY,
          contagem INTEGER NOT NULL,
          expira_em TIMESTAMPTZ NOT NULL
        )`);
    },
  },
  {
    // Duração real das gerações e correções, para mostrar o tempo médio ao aluno.
    id: "008_metricas_ia",
    up: async (db) => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS metricas_ia (
          id BIGSERIAL PRIMARY KEY,
          operacao VARCHAR(30) NOT NULL,
          duracao_ms INTEGER NOT NULL,
          quantidade INTEGER NOT NULL DEFAULT 0,
          usou_ia BOOLEAN NOT NULL DEFAULT true,
          criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
      await db.query(
        `CREATE INDEX IF NOT EXISTS idx_metricas_ia_operacao_data ON metricas_ia (operacao, criado_em DESC)`,
      );
    },
  },
];

// Número arbitrário e fixo usado como trava para duas instâncias não migrarem ao mesmo tempo.
const MIGRATION_LOCK_ID = 7_421_133;

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(100) PRIMARY KEY,
        aplicada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);

    const { rows } = await client.query("SELECT id FROM schema_migrations");
    const aplicadas = new Set(rows.map((r) => r.id));

    for (const migracao of MIGRACOES) {
      if (aplicadas.has(migracao.id)) continue;
      console.log(`[migração] Aplicando ${migracao.id}...`);
      await client.query("BEGIN");
      try {
        await migracao.up(client);
        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [migracao.id]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Falha na migração ${migracao.id}: ${err.message}`, { cause: err });
      }
    }
    console.log("[migração] Banco de dados atualizado.");
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }
}

module.exports = { runMigrations };

// Permite rodar manualmente: `npm run migrate`
if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
