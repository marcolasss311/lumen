const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const config = require("./config");
const { limiteGeralPorIp } = require("./api/middlewares/limites");
const { rotaNaoEncontrada, tratarErros } = require("./api/middlewares/erros");

const simuladoRoutes = require("./api/routes/simulado");
const correcaoRoutes = require("./api/routes/correcao");
const desempenhoRoutes = require("./api/routes/desempenho");

const app = express();

// O Render fica atrás de um proxy: necessário para o rate limit enxergar o IP real.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 86_400,
  }),
);
app.use(compression());
// Corpo JSON pequeno em todas as rotas. Arquivos de material chegam por multipart,
// e só depois da autenticação (ver middlewares/upload.js).
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

app.use("/api", limiteGeralPorIp);
app.use("/api/simulado", simuladoRoutes);
app.use("/api/correcao", correcaoRoutes);
app.use("/api/desempenho", desempenhoRoutes);

app.use(rotaNaoEncontrada);
app.use(tratarErros);

module.exports = app;
