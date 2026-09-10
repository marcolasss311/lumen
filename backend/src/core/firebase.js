const admin = require("firebase-admin");
require("dotenv").config({ path: "../../.env" }); // Garantir leitura do .env

try {
  // Passando o projectId é suficiente para o verifyIdToken funcionar sem o arquivo JSON local
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "lumenm",
  });
  console.log("Firebase Admin inicializado com sucesso.");
} catch (error) {
  console.error("Erro ao inicializar Firebase Admin:", error);
}

module.exports = admin;
