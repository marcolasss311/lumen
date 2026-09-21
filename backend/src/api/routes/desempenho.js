const express = require("express");
const router = express.Router();
const db = require("../../db");
const authMiddleware = require("../middlewares/authMiddleware");
const { lerAlternativas } = require("../../services/questoes");
const v = require("../../services/validacao");

// GET /api/desempenho
router.get("/", authMiddleware, async (req, res) => {
  const uid = req.user.uid;

  const [estatisticas, historico] = await Promise.all([
    db.query(
      `SELECT
         q.materia,
         COUNT(h.id) AS total_tentativas,
         SUM(CASE WHEN h.acertou THEN 1 ELSE 0 END) AS total_acertos,
         AVG(COALESCE(h.nota, CASE WHEN h.acertou THEN 100 ELSE 0 END)) AS media_nota
       FROM historico_respostas h
       JOIN questoes q ON h.questao_id = q.id
       WHERE h.firebase_uid = $1
       GROUP BY q.materia
       ORDER BY media_nota DESC`,
      [uid],
    ),
    db.query(
      `SELECT id, nome, nota_geral, data_realizacao
       FROM simulados_realizados
       WHERE firebase_uid = $1 AND status = 'finalizado'
       ORDER BY data_realizacao DESC
       LIMIT 50`,
      [uid],
    ),
  ]);

  res.json({
    estatisticas: estatisticas.rows,
    historico: historico.rows,
  });
});

// GET /api/desempenho/simulado/:id
router.get("/simulado/:id", authMiddleware, async (req, res) => {
  const uid = req.user.uid;
  const simuladoId = v.exigirUuid(req.params.id);

  const simulado = await db.query(
    `SELECT id, nome, nota_geral, data_realizacao
     FROM simulados_realizados
     WHERE id = $1 AND firebase_uid = $2 AND status = 'finalizado'`,
    [simuladoId, uid],
  );
  if (simulado.rows.length === 0) throw new v.ErroRequisicao(404, "Simulado não encontrado.");

  const questoes = await db.query(
    `SELECT
       h.id AS historico_id,
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
     JOIN simulados_realizados s ON s.id = h.simulado_id
     WHERE h.simulado_id = $1 AND h.firebase_uid = $2
     ORDER BY array_position(s.questao_ids, h.questao_id) NULLS LAST, h.data_resposta ASC, h.id ASC`,
    [simuladoId, uid],
  );

  res.json({
    simulado: simulado.rows[0],
    questoes: questoes.rows.map((q) => ({ ...q, alternativas: lerAlternativas(q.alternativas) })),
  });
});

module.exports = router;
