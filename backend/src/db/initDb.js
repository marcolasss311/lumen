const db = require('./index');

const init = async () => {
    try {
        console.log("Iniciando migração do banco de dados...");
        
        await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                firebase_uid VARCHAR(128) UNIQUE NOT NULL,
                nome VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                ano_escolar_atual VARCHAR(50) NOT NULL,
                data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS questoes (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                materia VARCHAR(100) NOT NULL,
                topico VARCHAR(150) NOT NULL,
                ano_escolar_alvo VARCHAR(50) NOT NULL,
                tipo_questao VARCHAR(20) NOT NULL CHECK (tipo_questao IN ('Fechada', 'Aberta')),
                pergunta TEXT NOT NULL,
                alternativas JSONB, 
                gabarito TEXT,
                origem VARCHAR(100) NOT NULL,
                tags TEXT[],
                data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS simulados_realizados (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                firebase_uid VARCHAR(128) NOT NULL,
                nome VARCHAR(255) NOT NULL,
                nota_geral NUMERIC(5,2),
                data_realizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_simulado_usuario FOREIGN KEY (firebase_uid) REFERENCES usuarios(firebase_uid) ON DELETE CASCADE
            );
        `);

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
                data_resposta TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_historico_usuario FOREIGN KEY (firebase_uid) REFERENCES usuarios(firebase_uid) ON DELETE CASCADE,
                CONSTRAINT fk_historico_simulado FOREIGN KEY (simulado_id) REFERENCES simulados_realizados(id) ON DELETE CASCADE,
                CONSTRAINT fk_historico_questao FOREIGN KEY (questao_id) REFERENCES questoes(id) ON DELETE CASCADE
            );
        `);

        await db.query(`CREATE INDEX IF NOT EXISTS idx_usuarios_firebase_uid ON usuarios(firebase_uid);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_questoes_filtros ON questoes(materia, topico, ano_escolar_alvo);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_questoes_origem ON questoes(origem);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_historico_aluno_data ON historico_respostas(firebase_uid, data_resposta);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_historico_questao ON historico_respostas(questao_id);`);

        console.log("Migração concluída com sucesso!");
    } catch (error) {
        console.error("Erro durante a migração:", error);
    } finally {
        process.exit();
    }
};

init();
