const express = require("express");
const router = express.Router();
const db = require("../../db");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/", authMiddleware, async (req, res) => {
  try {
    const firebase_uid = req.user.uid;

    const statsQuery = `
            SELECT 
                q.materia,
                COUNT(h.id) as total_tentativas,
                SUM(CASE WHEN h.acertou = true THEN 1 ELSE 0 END) as total_acertos,
                AVG(COALESCE(h.nota, CASE WHEN h.acertou = true THEN 100 ELSE 0 END)) as media_nota
            FROM historico_respostas h
            JOIN questoes q ON h.questao_id = q.id
            WHERE h.firebase_uid = $1
            GROUP BY q.materia
            ORDER BY media_nota DESC
        `;
    const statsResult = await db.query(statsQuery, [firebase_uid]);

    const historyQuery = `
            SELECT 
                id,
                nome,
                nota_geral,
                data_realizacao
            FROM simulados_realizados
            WHERE firebase_uid = $1
            ORDER BY data_realizacao DESC
            LIMIT 50
        `;
    const historyResult = await db.query(historyQuery, [firebase_uid]);

    return res.json({
      estatisticas: statsResult.rows,
      historico: historyResult.rows, // agora é uma lista de simulados
    });
  } catch (error) {
    console.error("Erro ao buscar desempenho:", error);
    return res.status(500).json({ error: "Erro interno" });
  }
});

// GET /api/desempenho/simulado/:id
router.get("/simulado/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const firebase_uid = req.user.uid;

    // Verifica se o simulado pertence ao usuário
    const simRes = await db.query(
      `SELECT * FROM simulados_realizados WHERE id = $1 AND firebase_uid = $2`,
      [id, firebase_uid],
    );
    if (simRes.rows.length === 0)
      return res.status(404).json({ error: "Simulado não encontrado" });

    const historyQuery = `
            SELECT 
                h.id as historico_id,
                q.id,
                q.origem,
                q.materia,
                q.topico,
                q.pergunta,
                q.alternativas,
                q.gabarito,
                q.tipo_questao,
                h.acertou,
                h.nota,
                h.resposta_aluno,
                h.feedback_ia,
                h.data_resposta
            FROM historico_respostas h
            JOIN questoes q ON h.questao_id = q.id
            WHERE h.simulado_id = $1
            ORDER BY h.data_resposta ASC
        `;
    const historyResult = await db.query(historyQuery, [id]);

    return res.json({
      simulado: simRes.rows[0],
      questoes: historyResult.rows,
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes do simulado:", error);
    return res.status(500).json({ error: "Erro interno" });
  }
});

module.exports = router;
