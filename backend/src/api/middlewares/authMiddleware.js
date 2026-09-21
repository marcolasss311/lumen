const { auth } = require("../../core/firebase");
const db = require("../../db");

// UIDs que já existem na tabela `usuarios`: evita um INSERT a cada requisição.
const usuariosSincronizados = new Set();
const MAX_CACHE_USUARIOS = 10_000;

async function garantirUsuario(token) {
  if (usuariosSincronizados.has(token.uid)) return;

  await db.query(
    `INSERT INTO usuarios (firebase_uid, email, nome, ano_escolar_atual)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (firebase_uid) DO NOTHING`,
    [
      token.uid,
      token.email ? String(token.email).slice(0, 255) : null,
      String(token.name || "Usuário Lumen").slice(0, 255),
      "Não Informado",
    ],
  );

  if (usuariosSincronizados.size >= MAX_CACHE_USUARIOS) usuariosSincronizados.clear();
  usuariosSincronizados.add(token.uid);
}

const authMiddleware = async (req, res, next) => {
  const [esquema, token] = (req.headers.authorization || "").split(" ");

  if (esquema !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token de autenticação não fornecido." });
  }

  let decodificado;
  try {
    decodificado = await auth.verifyIdToken(token);
  } catch (error) {
    console.warn("Token rejeitado:", error.code || error.message);
    return res.status(401).json({ error: "Sessão inválida ou expirada. Faça login novamente." });
  }

  req.user = decodificado;
  // Falha de banco aqui vira 500 no tratador de erros (e não um 403 enganoso).
  await garantirUsuario(decodificado);
  next();
};

module.exports = authMiddleware;
