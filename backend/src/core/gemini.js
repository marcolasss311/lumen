const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Modelos oficiais ativos da geração 3.x recomendados pela API do Google
const MODEL_FALLBACK_CHAIN = [
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-pro-preview'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executa generateContent com sistema de tolerância a falhas, retry automático e IAs reservas ativas.
 */
async function generateWithFallback({ contents, config = { responseMimeType: "application/json" } }) {
    let lastError = null;

    for (const model of MODEL_FALLBACK_CHAIN) {
        // Tenta até 2 vezes cada modelo (com pausa de 1.5s entre tentativas caso seja erro 503 de alta demanda)
        for (let tentativa = 1; tentativa <= 2; tentativa++) {
            try {
                console.log(`[Lumen IA] Solicitando com modelo: ${model} (tentativa ${tentativa})...`);
                const response = await ai.models.generateContent({
                    model,
                    contents,
                    config
                });
                console.log(`[Lumen IA] Sucesso com o modelo: ${model}!`);
                return response;
            } catch (error) {
                console.warn(`[Lumen IA] Falha no modelo ${model} (tentativa ${tentativa}):`, error?.message || error);
                lastError = error;

                const isDemandOrQuota = 
                    error?.status === 503 || 
                    error?.status === 429 || 
                    (error?.message && (
                        error.message.includes("high demand") || 
                        error.message.includes("UNAVAILABLE") || 
                        error.message.includes("quota") ||
                        error.message.includes("Resource has been exhausted")
                    ));

                if (!isDemandOrQuota) {
                    // Se for erro de 404 ou formato inválido, não adianta tentar novamente o mesmo modelo
                    break;
                }

                if (tentativa === 1) {
                    console.log(`[Lumen IA] Aguardando 1.5s antes de retentar ${model}...`);
                    await sleep(1500);
                }
            }
        }
        console.log(`[Lumen IA] Modelo ${model} segue indisponível. Alternando para o próximo modelo reserva...`);
    }

    // Se todos os modelos da cadeia falharem
    throw lastError;
}

module.exports = {
    ai,
    generateWithFallback
};
