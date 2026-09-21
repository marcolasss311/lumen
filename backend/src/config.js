const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  quiet: true,
});

const isProduction = process.env.NODE_ENV === "production";

const inteiro = (valor, padrao) => {
  const n = Number.parseInt(valor, 10);
  return Number.isFinite(n) && n > 0 ? n : padrao;
};

// Origens autorizadas a chamar a API pelo navegador (separadas por vírgula).
const ORIGENS_PADRAO = [
  "https://lumenm.web.app",
  "https://lumenm.firebaseapp.com",
  ...(isProduction ? [] : ["http://localhost:3000", "http://127.0.0.1:3000"]),
];

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
      .map((o) => o.trim().replace(/\/$/, ""))
      .filter(Boolean)
  : ORIGENS_PADRAO;

const MB = 1024 * 1024;

module.exports = {
  isProduction,
  port: inteiro(process.env.PORT, 3001),
  corsOrigins,
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "lumenm",

  limites: {
    questoesPorSimulado: 20,
    arquivosPorSimulado: 5,
    bytesPorArquivo: 15 * MB,
    bytesTotaisArquivos: 20 * MB,
    // Acima disso os arquivos vão pela Files API do Gemini em vez de inline (base64 no corpo).
    bytesInlineGemini: inteiro(process.env.GEMINI_INLINE_MAX_BYTES, 14 * MB),
    caracteresAnotacoes: 50_000,
    caracteresRespostaAberta: 5_000,
    caracteresCampoTexto: 200,
  },

  // Limites de uso da IA por usuário (protegem a cota/custo do Gemini).
  rateLimit: {
    geracoesPorHora: inteiro(process.env.LIMITE_GERACOES_HORA, 15),
    geracoesPorDia: inteiro(process.env.LIMITE_GERACOES_DIA, 60),
    correcoesPorHora: inteiro(process.env.LIMITE_CORRECOES_HORA, 30),
    requisicoesPorIp15Min: inteiro(process.env.LIMITE_REQUISICOES_IP, 300),
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    // Do melhor para o mais leve. A família 2.5 não está mais disponível para contas novas (404),
    // e o gemini-3.7-flash ficou fora por estar lento demais (respostas de ~2 min em set/2026).
    modelos: process.env.GEMINI_MODELOS
      ? process.env.GEMINI_MODELOS.split(",").map((m) => m.trim()).filter(Boolean)
      : ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"],
    // Limite por modelo e para a cadeia inteira. Sob sobrecarga, alguns modelos "penduram"
    // em vez de responder 503; o limite por modelo garante tempo para tentar os reservas.
    geracao: { timeoutPorModeloMs: 70_000, prazoTotalMs: 210_000 },
    correcao: { timeoutPorModeloMs: 40_000, prazoTotalMs: 100_000 },
    correcoesSimultaneas: 5,
  },

  // Nota mínima (0-100) para considerar uma questão discursiva como "acerto".
  notaMinimaAcerto: 50,
};
