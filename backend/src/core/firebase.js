const { initializeApp, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const config = require("../config");

// Só o projectId é necessário para verificar ID tokens (as chaves públicas do Google são
// baixadas e cacheadas pelo SDK). Não use arquivo de service account aqui.
if (!getApps().length) {
  initializeApp({ projectId: config.firebaseProjectId });
}

module.exports = { auth: getAuth() };
