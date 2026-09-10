const express = require("express");
const cors = require("cors");
require("dotenv").config();

const simuladoRoutes = require("./api/routes/simulado");
const correcaoRoutes = require("./api/routes/correcao");
const desempenhoRoutes = require("./api/routes/desempenho");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Rotas
app.use("/api/simulado", simuladoRoutes);
app.use("/api/correcao", correcaoRoutes);
app.use("/api/desempenho", desempenhoRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

const db = require("./db");

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
      console.log(
        "Atualizando tabela historico_respostas para a nova arquitetura...",
      );
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

    // Garante que o banco contenha questões oficiais de vestibular
    const checkOficiais = await db.query(
      "SELECT COUNT(*) FROM questoes WHERE origem != 'IA'",
    );
    if (parseInt(checkOficiais.rows[0].count, 10) === 0) {
      console.log("Populando banco com questões oficiais de vestibulares...");
      const questoesIniciais = [
        {
          materia: "Matemática",
          topico: "Porcentagem",
          ano_escolar_alvo: "Pré-Vestibular/ENEM",
          tipo_questao: "Fechada",
          origem: "ENEM 2021",
          pergunta:
            "Uma pessoa produziu uma quantidade de bombons para vender, dividindo-os em três caixas. Na primeira colocou 25% do total, na segunda 30% do total e na terceira os 90 bombons restantes. A quantidade de bombons que essa pessoa produziu é:",
          alternativas: JSON.stringify([
            { letra: "A", texto: "180", correta: false },
            { letra: "B", texto: "200", correta: true },
            { letra: "C", texto: "250", correta: false },
            { letra: "D", texto: "300", correta: false },
            { letra: "E", texto: "400", correta: false },
          ]),
          gabarito: null,
        },
        {
          materia: "Matemática",
          topico: "Geometria Espacial",
          ano_escolar_alvo: "Pré-Vestibular/ENEM",
          tipo_questao: "Fechada",
          origem: "ENEM 2020",
          pergunta:
            "A capacidade de um reservatório em formato de paralelepípedo retângulo, cujas dimensões internas são 2m de comprimento, 1,5m de largura e 1m de altura, em litros, é de:",
          alternativas: JSON.stringify([
            { letra: "A", texto: "3000", correta: true },
            { letra: "B", texto: "300", correta: false },
            { letra: "C", texto: "30", correta: false },
            { letra: "D", texto: "3", correta: false },
            { letra: "E", texto: "1500", correta: false },
          ]),
          gabarito: null,
        },
        {
          materia: "Física",
          topico: "Cinemática",
          ano_escolar_alvo: "Pré-Vestibular/ENEM",
          tipo_questao: "Fechada",
          origem: "ENEM 2019",
          pergunta:
            "Um carro viaja a uma velocidade constante de 72 km/h durante 2 horas. A distância total percorrida pelo carro, em metros, é de:",
          alternativas: JSON.stringify([
            { letra: "A", texto: "144", correta: false },
            { letra: "B", texto: "14400", correta: false },
            { letra: "C", texto: "144000", correta: true },
            { letra: "D", texto: "72000", correta: false },
            { letra: "E", texto: "7200", correta: false },
          ]),
          gabarito: null,
        },
        {
          materia: "História",
          topico: "Era Vargas",
          ano_escolar_alvo: "Pré-Vestibular/ENEM",
          tipo_questao: "Fechada",
          origem: "ENEM 2022",
          pergunta:
            "O Estado Novo (1937-1945), liderado por Getúlio Vargas, caracterizou-se por:",
          alternativas: JSON.stringify([
            {
              letra: "A",
              texto: "Ampla liberdade de imprensa e multipartidarismo.",
              correta: false,
            },
            {
              letra: "B",
              texto: "Centralização do poder, autoritarismo e censura.",
              correta: true,
            },
            {
              letra: "C",
              texto:
                "Alinhamento imediato e incondicional ao Eixo na Segunda Guerra.",
              correta: false,
            },
            {
              letra: "D",
              texto: "Descentralização administrativa e autonomia estadual.",
              correta: false,
            },
            { letra: "E", texto: "Fim das leis trabalhistas.", correta: false },
          ]),
          gabarito: null,
        },
        {
          materia: "História",
          topico: "Era Vargas",
          ano_escolar_alvo: "Pré-Vestibular/ENEM",
          tipo_questao: "Aberta",
          origem: "FUVEST 2019",
          pergunta:
            "Explique a importância da Consolidação das Leis do Trabalho (CLT) instituída durante o governo de Getúlio Vargas, e qual era a intenção política de Vargas ao aprovar essas medidas.",
          alternativas: null,
          gabarito:
            "A CLT foi fundamental para organizar os direitos trabalhistas (férias, salário mínimo, jornada), melhorando as condições de vida dos operários. A intenção política de Vargas era angariar apoio popular e conter movimentos sindicais independentes, submetendo os sindicatos ao controle do Estado (peleguismo).",
        },
        {
          materia: "Biologia",
          topico: "Genética",
          ano_escolar_alvo: "Pré-Vestibular/ENEM",
          tipo_questao: "Fechada",
          origem: "ENEM 2018",
          pergunta:
            "O cruzamento entre duas plantas heterozigotas para uma característica com dominância completa resulta na proporção fenotípica de:",
          alternativas: JSON.stringify([
            { letra: "A", texto: "1:1", correta: false },
            { letra: "B", texto: "3:1", correta: true },
            { letra: "C", texto: "1:2:1", correta: false },
            { letra: "D", texto: "9:3:3:1", correta: false },
            { letra: "E", texto: "Todos iguais", correta: false },
          ]),
          gabarito: null,
        },
        {
          materia: "Português",
          topico: "Interpretação de Texto",
          ano_escolar_alvo: "Pré-Vestibular/ENEM",
          tipo_questao: "Fechada",
          origem: "ENEM 2021",
          pergunta:
            'No trecho "A rua era escura e os passos, rápidos", a vírgula foi empregada para:',
          alternativas: JSON.stringify([
            {
              letra: "A",
              texto: "Separar o sujeito do predicado.",
              correta: false,
            },
            {
              letra: "B",
              texto: "Indicar a elipse (omissão) do verbo.",
              correta: true,
            },
            { letra: "C", texto: "Isolar um aposto.", correta: false },
            {
              letra: "D",
              texto:
                "Separar orações coordenadas aditivas com o mesmo sujeito.",
              correta: false,
            },
            {
              letra: "E",
              texto: "Destacar o adjunto adverbial.",
              correta: false,
            },
          ]),
          gabarito: null,
        },
      ];

      for (const q of questoesIniciais) {
        await db.query(
          `INSERT INTO questoes (materia, topico, ano_escolar_alvo, tipo_questao, pergunta, alternativas, gabarito, origem)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            q.materia,
            q.topico,
            q.ano_escolar_alvo,
            q.tipo_questao,
            q.pergunta,
            q.alternativas,
            q.gabarito,
            q.origem,
          ],
        );
      }
      console.log("Questões oficiais inseridas no banco com sucesso!");
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
