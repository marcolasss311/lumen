const express = require('express');
const router = express.Router();
const db = require('../../db');
const authMiddleware = require('../middlewares/authMiddleware');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// POST /api/simulado/gerar
router.post('/gerar', authMiddleware, async (req, res) => {
    try {
        const { materia, topico, ano_escolar, quantidade = 5, foco = 'ENEM', tipo_questao = 'Fechada' } = req.body;

        // 1. Buscar no PostgreSQL questões reais
        const dbResult = await db.query(
            `SELECT * FROM questoes 
             WHERE materia = $1 AND topico = $2 AND ano_escolar_alvo = $3 AND tipo_questao = $4
             LIMIT $5`,
            [materia, topico, ano_escolar, tipo_questao, quantidade]
        );

        let questoes = dbResult.rows;

        // 2. Se faltarem questões, chamar a API da IA
        if (questoes.length < quantidade) {
            const questoesFaltantes = quantidade - questoes.length;
            
            let prompt = "";
            if (tipo_questao === 'Fechada') {
                prompt = `Gere ${questoesFaltantes} questões de múltipla escolha sobre o tópico "${topico}" da matéria "${materia}" para o nível "${ano_escolar}", com foco no padrão "${foco}".
Retorne ESTRITAMENTE um array JSON com a seguinte estrutura:
[
  {
    "pergunta": "Texto da pergunta",
    "alternativas": [
      { "letra": "A", "texto": "...", "correta": false, "explicacao": "Por que esta está errada..." },
      { "letra": "B", "texto": "...", "correta": true, "explicacao": null }
    ]
  }
]`;
            } else {
                prompt = `Gere ${questoesFaltantes} questões discursivas (abertas) sobre o tópico "${topico}" da matéria "${materia}" para o nível "${ano_escolar}", com foco no padrão "${foco}".
Retorne ESTRITAMENTE um array JSON com a seguinte estrutura:
[
  {
    "pergunta": "Texto da pergunta dissertativa",
    "gabarito": "Padrão de resposta detalhado esperado do aluno (será usado posteriormente para corrigir)."
  }
]`;
            }

            // Chamada ao Gemini usando a Interactions API
            const interaction = await ai.interactions.create({
                model: 'gemini-3.6-flash',
                input: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });

            const questoesIA = JSON.parse(interaction.output_text);
            
            // Formatando para o mesmo padrão do banco e mesclando
            const formatadasIA = questoesIA.map(q => ({
                id: 'gerada-ia-' + Math.random().toString(36).substr(2, 9),
                origem: 'IA',
                materia,
                topico,
                ano_escolar_alvo: ano_escolar,
                tipo_questao: tipo_questao,
                pergunta: q.pergunta,
                alternativas: q.alternativas ? JSON.stringify(q.alternativas) : null,
                gabarito: q.gabarito || null
            }));

            questoes = [...questoes, ...formatadasIA];
        }

        return res.json({ questoes });

    } catch (error) {
        console.error("Erro ao gerar simulado:", error);
        return res.status(500).json({ error: 'Erro interno ao gerar o simulado.' });
    }
});

// POST /api/simulado/responder
router.post('/responder', authMiddleware, async (req, res) => {
    try {
        const { questao_id, alternativa_selecionada, acertou } = req.body;
        const firebase_uid = req.user.uid;

        // Salvar no historico_respostas
        await db.query(
            `INSERT INTO historico_respostas 
             (firebase_uid, questao_id, acertou, resposta_aluno) 
             VALUES ($1, $2, $3, $4)`,
            [
                firebase_uid, 
                questao_id, 
                acertou, 
                alternativa_selecionada
            ]
        );

        return res.json({ success: true });

    } catch (error) {
        console.error("Erro ao salvar resposta:", error);
        return res.status(500).json({ error: 'Erro interno ao salvar a resposta.' });
    }
});

module.exports = router;
