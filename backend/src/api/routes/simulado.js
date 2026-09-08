const express = require('express');
const router = express.Router();
const db = require('../../db');
const authMiddleware = require('../middlewares/authMiddleware');
const { generateWithFallback } = require('../../core/gemini');

// POST /api/simulado/gerar
router.post('/gerar', authMiddleware, async (req, res) => {
    try {
        const { materia, topico, ano_escolar, quantidade = 5, foco = 'ENEM', tipo_questao = 'Fechada', priorizar_oficiais = false, dificuldade = 'Intermediário (Padrão)', nivel = 'medio', curso = null, disciplina = null } = req.body;

        const isSuperior = nivel === 'superior' || Boolean(curso);

        let orderByClause = priorizar_oficiais ? `ORDER BY CASE WHEN origem != 'IA' THEN 0 ELSE 1 END, RANDOM()` : `ORDER BY RANDOM()`;

        let dbResult;
        if (tipo_questao === 'Mesclada') {
             // Busca qualquer tipo
             dbResult = await db.query(
                `SELECT * FROM questoes 
                 WHERE materia = $1 AND topico = $2 AND ano_escolar_alvo = $3
                 ${orderByClause}
                 LIMIT $4`,
                [materia, topico, ano_escolar, quantidade]
            );
        } else {
             dbResult = await db.query(
                `SELECT * FROM questoes 
                 WHERE materia = $1 AND topico = $2 AND ano_escolar_alvo = $3 AND tipo_questao = $4
                 ${orderByClause}
                 LIMIT $5`,
                [materia, topico, ano_escolar, tipo_questao, quantidade]
            );
        }

        let questoes = dbResult.rows;

        // 2. Se faltarem questões, chamar a API da IA
        if (questoes.length < quantidade) {
            const questoesFaltantes = quantidade - questoes.length;
            
            let prompt = "";

            if (isSuperior) {
                // Prompt especializado para Nível Superior / Graduação
                const cabecalhoSuperior = `Você é um professor universitário e avaliador acadêmico do curso de "${curso || 'Graduação'}". Elabore questões de nível de Ensino Superior sobre a disciplina "${disciplina || materia}", abordando os tópicos "${topico}". NÍVEL DE DIFICULDADE DESEJADO: ${dificuldade}. Utilize rigor técnico, conceitual e metodológico típico de avaliações universitárias.`;

                if (tipo_questao === 'Fechada') {
                    prompt = `${cabecalhoSuperior}
Gere ${questoesFaltantes} questões de múltipla escolha.
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2, integral de f(x) dx).
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
                    prompt = `${cabecalhoSuperior}
Gere ${questoesFaltantes} questões discursivas/analíticas de nível superior.
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2).
Retorne ESTRITAMENTE um array JSON com a seguinte estrutura:
[
  {
    "pergunta": "Texto do problema ou questão dissertativa acadêmica",
    "gabarito": "Padrão de resposta detalhado com critérios de pontuação esperados do graduando."
  }
]`;
                } else {
                    prompt = `${cabecalhoSuperior}
Gere ${questoesFaltantes} questões mistas de graduação universitária (metade de múltipla escolha e metade discursiva).
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2).
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
            } else {
                // Prompt padrão para Fundamental e Médio
                if (tipo_questao === 'Fechada') {
                    prompt = `Gere ${questoesFaltantes} questões de múltipla escolha sobre os tópicos "${topico}" da(s) matéria(s) "${materia}" para o nível "${ano_escolar}", com foco no padrão "${foco}".
NÍVEL DE DIFICULDADE DESEJADO: ${dificuldade}. Adapte a complexidade dos conceitos, textos e "pegadinhas" de acordo com esta exigência.
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2).
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
NÍVEL DE DIFICULDADE DESEJADO: ${dificuldade}. Adapte a complexidade dos conceitos, textos e "pegadinhas" de acordo com esta exigência.
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2).
Retorne ESTRITAMENTE um array JSON com a seguinte estrutura:
[
  {
    "pergunta": "Texto da pergunta dissertativa",
    "gabarito": "Padrão de resposta detalhado esperado do aluno (será usado posteriormente para corrigir)."
  }
]`;
                } else {
                    prompt = `Gere ${questoesFaltantes} questões mistas sobre os tópicos "${topico}" da(s) matéria(s) "${materia}" para o nível "${ano_escolar}", com foco no padrão "${foco}".
NÍVEL DE DIFICULDADE DESEJADO: ${dificuldade}. Adapte a complexidade dos conceitos, textos e "pegadinhas" de acordo com esta exigência.
Metade deve ser de múltipla escolha e a outra metade discursiva.
IMPORTANTE: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc). Escreva todas as fórmulas em texto plano (ex: pH = -log10[H+], x^2).
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
            }

            const response = await generateWithFallback({
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });

            let questoesIA;
            try {
                questoesIA = JSON.parse(response.text);
            } catch (err) {
                console.error("Falha ao fazer parse do JSON do simulado:", response.text);
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
        if (error.status === 503 || (error.message && error.message.includes("high demand"))) {
            return res.status(503).json({ error: 'ALTA_DEMANDA' });
        }
        return res.status(500).json({ error: 'Erro interno ao gerar o simulado.' });
    }
});

// POST /api/simulado/finalizar
router.post('/finalizar', authMiddleware, async (req, res) => {
    try {
        const { nome_simulado, respostas } = req.body;
        const firebase_uid = req.user.uid;

        // 1. Criar o registro do simulado
        const simRes = await db.query(
            `INSERT INTO simulados_realizados (firebase_uid, nome) VALUES ($1, $2) RETURNING id`,
            [firebase_uid, nome_simulado || 'Simulado Geral']
        );
        const simulado_id = simRes.rows[0].id;

        let somaNotas = 0;
        const resultadosProcessados = [];

        // 2. Corrigir em lote
        const correctionPromises = respostas.map(async (resp) => {
            let acertou = null;
            let nota = 0;
            let feedback_ia = null;

            if (resp.tipo === 'Fechada') {
                acertou = resp.acertou;
                nota = acertou ? 100 : 0;
                feedback_ia = resp.explicacao || null;
            } else if (resp.tipo === 'Aberta') {
                // Chama a IA para corrigir
                const prompt = `Atue como um corretor rigoroso. 
Pergunta original: ${resp.pergunta}
Padrão de resposta esperado: ${resp.gabarito}
Resposta do aluno: "${resp.resposta_aluno}"

IMPORTANTE PARA QUESTÕES DE EXATAS/CÁLCULOS: Não exija que o aluno escreva a conta inteira. Se a resposta final do aluno estiver correta de acordo com o gabarito, dê nota máxima (100). Só corrija e explique a resolução caso o resultado final esteja incorreto.
ALÉM DISSO: NÃO USE formatação LaTeX ou símbolos matemáticos especiais (como $, \\frac, \\log, etc) no seu feedback. Escreva fórmulas e contas em texto plano.

Retorne ESTRITAMENTE em formato JSON com a seguinte estrutura:
{
  "nota": <numero de 0 a 100>,
  "feedback_detalhado": "Sua explicação pedagógica detalhada do que o aluno acertou e onde errou."
}`;
                try {
                    const response = await ai.models.generateContent({
                        model: 'gemini-3.6-flash',
                        contents: prompt,
                        config: {
                            responseMimeType: "application/json"
                        }
                    });
                    
                    const correcaoIA = JSON.parse(response.text);
                    nota = Number(correcaoIA.nota);
                    feedback_ia = correcaoIA.feedback_detalhado;
                    acertou = nota >= 50; // Arbitrário, para a flag booleana
                } catch (err) {
                    console.error("Falha ao corrigir aberta:", err);
                    nota = 0;
                    feedback_ia = "Erro ao processar correção pela IA.";
                }
            }

            somaNotas += nota;
            resultadosProcessados.push({
                questao_id: resp.questao_id,
                acertou,
                nota,
                resposta_aluno: resp.resposta_aluno || resp.alternativa_selecionada,
                feedback_ia
            });

            // 3. Salvar no histórico de respostas
            await db.query(
                `INSERT INTO historico_respostas 
                 (firebase_uid, simulado_id, questao_id, acertou, nota, resposta_aluno, feedback_ia) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    firebase_uid, 
                    simulado_id,
                    resp.questao_id, 
                    acertou, 
                    nota,
                    resp.resposta_aluno || resp.alternativa_selecionada,
                    feedback_ia
                ]
            );
        });

        await Promise.all(correctionPromises);

        // 4. Atualizar nota geral do simulado
        const notaGeral = respostas.length > 0 ? (somaNotas / respostas.length) : 0;
        await db.query(`UPDATE simulados_realizados SET nota_geral = $1 WHERE id = $2`, [notaGeral, simulado_id]);

        return res.json({ success: true, simulado_id, nota_geral: notaGeral, resultados: resultadosProcessados });

    } catch (error) {
        console.error("Erro ao finalizar simulado:", error);
        return res.status(500).json({ error: 'Erro interno ao finalizar simulado.' });
    }
});

module.exports = router;
