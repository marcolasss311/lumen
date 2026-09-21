const path = require("path");
const multer = require("multer");
const config = require("../../config");
const { ErroRequisicao } = require("../../services/validacao");

const TIPOS_POR_EXTENSAO = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

const { arquivosPorSimulado, bytesPorArquivo, bytesTotaisArquivos } = config.limites;

const upload = multer({
  storage: multer.memoryStorage(),
  defParamCharset: "utf8",
  limits: {
    fileSize: bytesPorArquivo,
    files: arquivosPorSimulado,
    fields: 5,
    fieldSize: 256 * 1024,
    parts: arquivosPorSimulado + 5,
  },
  fileFilter: (req, file, cb) => {
    const extensao = path.extname(file.originalname || "").toLowerCase();
    if (!TIPOS_POR_EXTENSAO[extensao]) {
      return cb(
        new ErroRequisicao(415, `Tipo de arquivo não suportado: "${file.originalname}". Envie PDF, TXT ou MD.`),
      );
    }
    cb(null, true);
  },
}).array("arquivos", arquivosPorSimulado);

/**
 * Recebe os arquivos do material (multipart/form-data) em memória.
 * Deve ficar DEPOIS do authMiddleware: só usuários autenticados podem enviar arquivos grandes.
 * Requisições JSON (sem arquivos) passam direto.
 */
function receberMaterial(req, res, next) {
  if (!req.is("multipart/form-data")) return next();

  upload(req, res, (err) => {
    if (err) return next(err);

    const arquivos = req.files || [];
    const total = arquivos.reduce((soma, a) => soma + a.size, 0);
    if (total > bytesTotaisArquivos) {
      return next(
        new ErroRequisicao(413, `Os arquivos somam mais de ${bytesTotaisArquivos / 1024 / 1024}MB.`),
      );
    }

    for (const arquivo of arquivos) {
      arquivo.mimetype = TIPOS_POR_EXTENSAO[path.extname(arquivo.originalname).toLowerCase()];
      // Confere a assinatura do arquivo, não só a extensão.
      if (
        arquivo.mimetype === "application/pdf" &&
        arquivo.buffer.subarray(0, 5).toString("latin1") !== "%PDF-"
      ) {
        return next(new ErroRequisicao(415, `O arquivo "${arquivo.originalname}" não é um PDF válido.`));
      }
    }
    next();
  });
}

module.exports = { receberMaterial };
