// Mensagens em português para os erros do Firebase Auth (o padrão vem em inglês e técnico).
const MENSAGENS: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Digite um e-mail válido.",
  "auth/missing-password": "Digite sua senha.",
  "auth/email-already-in-use": "Já existe uma conta com este e-mail. Tente entrar.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com a internet. Verifique sua rede.",
  "auth/popup-blocked": "O navegador bloqueou a janela do Google. Permita pop-ups para este site.",
  "auth/user-disabled": "Esta conta foi desativada.",
  "auth/account-exists-with-different-credential":
    "Este e-mail já está cadastrado com outra forma de login.",
};

// O aluno fechou a janela do Google: não é um erro que precise de mensagem.
const IGNORADOS = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

export function mensagemErroAuth(err: unknown): string | null {
  const codigo = (err as { code?: string })?.code || "";
  if (IGNORADOS.has(codigo)) return null;
  return MENSAGENS[codigo] || "Não foi possível concluir agora. Tente novamente.";
}
