const express = require('express');
const cors = require('cors');
require('dotenv').config();

const simuladoRoutes = require('./api/routes/simulado');
const correcaoRoutes = require('./api/routes/correcao');
const desempenhoRoutes = require('./api/routes/desempenho');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/simulado', simuladoRoutes);
app.use('/api/correcao', correcaoRoutes);
app.use('/api/desempenho', desempenhoRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

const db = require('./db');

// Migração Automática no Boot
async function runMigrations() {
    try {
        console.log("Verificando migrações do banco de dados...");
        
        await db.query(`CREATE TABLE IF NOT EXISTS simulados_realizados (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            firebase_uid VARCHAR(128) NOT NULL,
            nome VARCHAR(255) NOT NULL,
            nota_geral NUMERIC(5,2),
            data_realizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_simulado_usuario FOREIGN KEY (firebase_uid) REFERENCES usuarios(firebase_uid) ON DELETE CASCADE
        );`);

        const res = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='historico_respostas' and column_name='simulado_id'
        `);
        
        if (res.rows.length === 0) {
            console.log("Atualizando tabela historico_respostas para a nova arquitetura...");
            await db.query(`DROP TABLE IF EXISTS historico_respostas CASCADE`);
            await db.query(`
                CREATE TABLE historico_respostas (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    firebase_uid VARCHAR(128) NOT NULL,
                    simulado_id UUID,
                    questao_id UUID NOT NULL,
                    acertou BOOLEAN,
                    nota NUMERIC(5,2),
                    resposta_aluno TEXT,
                    feedback_ia TEXT,
                    data_resposta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT fk_historico_usuario FOREIGN KEY (firebase_uid) REFERENCES usuarios(firebase_uid) ON DELETE CASCADE,
                    CONSTRAINT fk_historico_simulado FOREIGN KEY (simulado_id) REFERENCES simulados_realizados(id) ON DELETE CASCADE,
                    CONSTRAINT fk_historico_questao FOREIGN KEY (questao_id) REFERENCES questoes(id) ON DELETE CASCADE
                );
            `);
        }
        console.log("Migrações concluídas.");
    } catch (error) {
        console.error("Erro na migração:", error);
    }
}
runMigrations();

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
