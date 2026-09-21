const express = require("express");
const router = express.Router();
const db = require("../../db");
const config = require("../../config");
const authMiddleware = require("../middlewares/authMiddleware");
const { limitesCorrecao } = require("../middlewares/limites");
const { corrigirDiscursiva } = require("../../services/correcao");
const v = require("../../services/validacao");

// POST /api/correcao/discursiva — corrige uma questão avulsa
router.post("/discursiva", authMiddleware, limitesCorrecao, async (req, res) => {
  const uid = req.user.uid;
  const questaoId = v.exigirUuid(req.body?.questao_id, "questao_id");
  const resposta = v.texto(req.body?.resposta_aluno, config.limites.caracteresRespostaAberta);

  const { rows } = await db.query(
    `SELECT pergunta, gabarito FROM questoes
     WHERE id = $1 AND tipo_questao = 'Aberta' AND (privada = false OR criado_por = $2)`,
    [questaoId, uid],
  );
  if (rows.length === 0) throw new v.ErroRequisicao(404, "Questão não encontrada.");

  const { nota, feedback } = await corrigirDiscursiva({ ...rows[0], resposta });

  await db.query(
    `INSERT INTO historico_respostas (firebase_uid, questao_id, acertou, nota, resposta_aluno, feedback_ia)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [uid, questaoId, nota >= config.notaMinimaAcerto, nota, resposta || null, feedback],
  );

  res.json({ correcao: { nota, feedback_detalhado: feedback } });
});

module.exports = router;
