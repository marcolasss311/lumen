import { initializeApp, getApps, getApp } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
// E-mails do Firebase (ex.: redefinição de senha) em português.
auth.languageCode = "pt-BR";

// Só em desenvolvimento/testes: usa o emulador local de login em vez do Firebase real.
const emulador = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR;
if (emulador && !auth.emulatorConfig) {
  connectAuthEmulator(auth, emulador, { disableWarnings: true });
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export { app, auth, googleProvider };
