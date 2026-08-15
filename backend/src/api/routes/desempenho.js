const express = require('express');
const router = express.Router();
const db = require('../../db');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, async (req, res) => {
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
                h.id as historico_id,
                q.materia,
                q.topico,
                q.pergunta,
                q.tipo_questao,
                h.acertou,
                h.nota,
                h.resposta_aluno,
                h.feedback_ia,
                h.data_resposta
            FROM historico_respostas h
            JOIN questoes q ON h.questao_id = q.id
            WHERE h.firebase_uid = $1
            ORDER BY h.data_resposta DESC
            LIMIT 50
        `;
        const historyResult = await db.query(historyQuery, [firebase_uid]);

        return res.json({
            estatisticas: statsResult.rows,
            historico: historyResult.rows
        });
    } catch (error) {
        console.error("Erro ao buscar desempenho:", error);
        return res.status(500).json({ error: 'Erro interno' });
    }
});

module.exports = router;
