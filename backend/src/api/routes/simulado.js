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

        let dbResult;
        if (tipo_questao === 'Mesclada') {
             // Busca qualquer tipo
             dbResult = await db.query(
                `SELECT * FROM questoes 
                 WHERE materia = $1 AND topico = $2 AND ano_escolar_alvo = $3
                 LIMIT $4`,
                [materia, topico, ano_escolar, quantidade]
            );
        } else {
            dbResult = await db.query(
                `SELECT * FROM questoes 
                 WHERE materia = $1 AND topico = $2 AND ano_escolar_alvo = $3 AND tipo_questao = $4
                 LIMIT $5`,
                [materia, topico, ano_escolar, tipo_questao, quantidade]
            );
        }

        let questoes = dbResult.rows;

        // 2. Se faltarem questões, chamar a API da IA
        if (questoes.length < quantidade) {
            const questoesFaltantes = quantidade - questoes.length;
            
            let prompt = "";
            if (tipo_questao === 'Fechada') {
                prompt = `Gere ${questoesFaltantes} questões de múltipla escolha sobre os tópicos "${topico}" da(s) matéria(s) "${materia}" para o nível "${ano_escolar}", com foco no padrão "${foco}".
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
            } else if (tipo_questao === 'Aberta') {
                prompt = `Gere ${questoesFaltantes} questões discursivas (abertas) sobre os tópicos "${topico}" da(s) matéria(s) "${materia}" para o nível "${ano_escolar}", com foco no padrão "${foco}".
Retorne ESTRITAMENTE um array JSON com a seguinte estrutura:
[
  {
    "pergunta": "Texto da pergunta dissertativa",
    "gabarito": "Padrão de resposta detalhado esperado do aluno (será usado posteriormente para corrigir)."
  }
]`;
            } else {
                prompt = `Gere ${questoesFaltantes} questões mistas sobre os tópicos "${topico}" da(s) matéria(s) "${materia}" para o nível "${ano_escolar}", com foco no padrão "${foco}".
Metade deve ser de múltipla escolha e a outra metade discursiva.
Retorne ESTRITAMENTE um array JSON. Cada objeto deve ter um campo "tipo_questao" ("Fechada" ou "Aberta"):
[
  {
    "tipo_questao": "Fechada",
    "pergunta": "Texto da pergunta",
    "alternativas": [ { "letra": "A", "texto": "...", "correta": true, "explicacao": null } ]
  },
  {
    "tipo_questao": "Aberta",
    "pergunta": "Texto da pergunta dissertativa",
    "gabarito": "Resposta esperada"
  }
]`;
            }

            const interaction = await ai.interactions.create({
                model: 'gemini-3.6-flash',
                input: prompt
            });

            // Limpando possível formatação markdown antes de fazer o parse
            let questoesIA;
            try {
                const match = interaction.output_text.match(/\[[\s\S]*\]/);
                const cleanText = match ? match[0] : interaction.output_text.trim();
                questoesIA = JSON.parse(cleanText);
            } catch (err) {
                console.error("Falha ao fazer parse do JSON do simulado:", interaction.output_text);
                throw new Error("Erro de formatação da IA");
            }
            
            // Inserir as geradas no banco de dados para ter UUID válido e Foreign Key
            const idsGerados = [];
            for (const q of questoesIA) {
                const tipoReal = q.tipo_questao || tipo_questao;
                const alts = q.alternativas ? JSON.stringify(q.alternativas) : null;
                const gab = q.gabarito || null;
                
                const insertRes = await db.query(
                    `INSERT INTO questoes (materia, topico, ano_escolar_alvo, tipo_questao, pergunta, alternativas, gabarito, origem)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                    [materia, topico, ano_escolar, tipoReal, q.pergunta, alts, gab, 'IA']
                );
                idsGerados.push(insertRes.rows[0]);
            }

            questoes = [...questoes, ...idsGerados];
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
