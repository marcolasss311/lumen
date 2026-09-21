const multer = require("multer");
const config = require("../../config");
const { ErroRequisicao } = require("../../services/validacao");
const { ErroIA } = require("../../core/gemini");

const MENSAGENS_MULTER = {
  LIMIT_FILE_SIZE: [413, `Cada arquivo pode ter no máximo ${config.limites.bytesPorArquivo / 1024 / 1024}MB.`],
  LIMIT_FILE_COUNT: [400, `Envie no máximo ${config.limites.arquivosPorSimulado} arquivos.`],
  LIMIT_UNEXPECTED_FILE: [400, "Campo de arquivo inesperado."],
};

function rotaNaoEncontrada(req, res) {
  res.status(404).json({ error: "Rota não encontrada." });
}

// Nunca devolve mensagens internas (SQL, stack, SDKs) para o cliente: elas só vão para o log.
// O Express reconhece o tratador de erros pelos 4 parâmetros, por isso `next` precisa existir.
function tratarErros(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ErroRequisicao) {
    return res.status(err.status).json({ error: err.message, codigo: err.codigo });
  }
  if (err instanceof multer.MulterError) {
    const [status, mensagem] = MENSAGENS_MULTER[err.code] || [400, "Envio de arquivos inválido."];
    return res.status(status).json({ error: mensagem });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Requisição grande demais." });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "JSON inválido." });
  }
  if (err instanceof ErroIA) {
    console.error(`[Lumen IA] ${err.message}`, err.cause?.message || "");
    if (err.status === 503) {
      return res.status(503).json({
        error: "A IA está com alta demanda no momento. Aguarde alguns segundos e tente novamente.",
        codigo: "ALTA_DEMANDA",
      });
    }
    return res.status(err.status === 422 ? 422 : 502).json({ error: err.message, codigo: "FALHA_IA" });
  }

  console.error(`Erro em ${req.method} ${req.originalUrl}:`, err);
  return res.status(500).json({ error: "Erro interno do servidor." });
}

module.exports = { rotaNaoEncontrada, tratarErros };
