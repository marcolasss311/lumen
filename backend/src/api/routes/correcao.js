const express = require('express');
const router = express.Router();
const db = require('../../db');
const authMiddleware = require('../middlewares/authMiddleware');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// POST /api/correcao/discursiva
router.post('/discursiva', authMiddleware, async (req, res) => {
    try {
        const { questao_id, resposta_aluno } = req.body;
        const firebase_uid = req.user.uid;

        // 1. Buscar a questão no banco
        const questaoResult = await db.query('SELECT pergunta, gabarito FROM questoes WHERE id = $1', [questao_id]);
        
        if (questaoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Questão não encontrada.' });
        }

        const questao = questaoResult.rows[0];

        // 2. Enviar à IA para correção
        const prompt = `Atue como um corretor rigoroso. 
Pergunta original: ${questao.pergunta}
Padrão de resposta esperado: ${questao.gabarito}
Resposta do aluno: "${resposta_aluno}"

IMPORTANTE PARA QUESTÕES DE EXATAS/CÁLCULOS: Não exija que o aluno escreva a conta inteira. Se a resposta final do aluno estiver correta de acordo com o gabarito, dê nota máxima (100). Só corrija e explique a resolução caso o resultado final esteja incorreto.
ALÉM DISSO: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc) no seu feedback. Escreva fórmulas e contas em texto plano.

Retorne ESTRITAMENTE em formato JSON com a seguinte estrutura:
{
  "nota": <numero de 0 a 100>,
  "feedback_detalhado": "Sua explicação pedagógica detalhada do que o aluno acertou e onde errou."
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        let correcaoIA;
        try {
            correcaoIA = JSON.parse(response.text);
        } catch (err) {
            console.error("Falha ao fazer parse do JSON da IA:", response.text);
            return res.status(500).json({ error: 'Erro ao interpretar resposta da IA.' });
        }

        // 3. Salvar no historico_respostas
        await db.query(
            `INSERT INTO historico_respostas 
             (firebase_uid, questao_id, acertou, nota, resposta_aluno, feedback_ia) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                firebase_uid, 
                questao_id, 
                correcaoIA.nota >= 70, // >= 70 é "acerto"
                correcaoIA.nota, 
                resposta_aluno, 
                correcaoIA.feedback_detalhado
            ]
        );

        return res.json({ correcao: correcaoIA });

    } catch (error) {
        console.error("Erro na correção:", error);
        return res.status(500).json({ error: 'Erro interno ao corrigir a questão.' });
    }
});

module.exports = router;
