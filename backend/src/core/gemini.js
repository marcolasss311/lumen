const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Lista de modelos em ordem de prioridade.
// Se um modelo sofrer pico de demanda (503) ou limite transitório (429), o próximo da fila assume automaticamente.
const MODEL_FALLBACK_CHAIN = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-pro'
];

/**
 * Executa generateContent com sistema de tolerância a falhas e IA reserva.
 */
async function generateWithFallback({ contents, config = { responseMimeType: "application/json" } }) {
    let lastError = null;

    for (const model of MODEL_FALLBACK_CHAIN) {
        try {
            console.log(`[Lumen IA] Solicitando com modelo: ${model}...`);
            const response = await ai.models.generateContent({
                model,
                contents,
                config
            });
            console.log(`[Lumen IA] Sucesso com modelo: ${model}!`);
            return response;
        } catch (error) {
            console.warn(`[Lumen IA] Modelo ${model} indisponível:`, error?.message || error);
            lastError = error;

            const isTransient = 
                error?.status === 503 || 
                error?.status === 429 || 
                error?.status === 404 ||
                (error?.message && (
                    error.message.includes("high demand") || 
                    error.message.includes("UNAVAILABLE") || 
                    error.message.includes("quota") ||
                    error.message.includes("Resource has been exhausted")
                ));

            if (!isTransient) {
                // Erro permanente de requisição, não mascara
                throw error;
            }

            console.log(`[Lumen IA] Modelo ${model} sob alta demanda. Alternando para o próximo modelo reserva...`);
        }
    }

    // Se todos os modelos da cadeia falharem, propaga o último erro
    throw lastError;
}

module.exports = {
    ai,
    generateWithFallback
};
