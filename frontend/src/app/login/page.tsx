"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { LogIn } from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import { mensagemErroAuth } from "@/lib/errosAuth";
import { useAvisos } from "@/components/Avisos";
import LayoutAutenticacao from "@/components/auth/LayoutAutenticacao";
import { BotaoGoogle, Campo, CampoSenha, Divisor } from "@/components/auth/CamposAutenticacao";

export default function Login() {
  const router = useRouter();
  const avisar = useAvisos();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      router.replace("/home");
    } catch (err) {
      setErro(mensagemErroAuth(err));
      setEnviando(false);
    }
  };

  const entrarComGoogle = async () => {
    setErro(null);
    setEnviando(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace("/home");
    } catch (err) {
      setErro(mensagemErroAuth(err));
      setEnviando(false);
    }
  };

  const esqueciSenha = async () => {
    setErro(null);
    if (!email.trim()) {
      setErro("Digite seu e-mail no campo acima para receber o link de redefinição de senha.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      const codigo = (err as { code?: string })?.code;
      // Não revela se o e-mail existe: só erros de formato ou rede aparecem para o aluno.
      if (codigo !== "auth/user-not-found") {
        setErro(mensagemErroAuth(err));
        return;
      }
    }
    avisar("sucesso", "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.");
  };

  return (
    <LayoutAutenticacao modo="login">
      <div className="space-y-6">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">
            <LogIn size={16} aria-hidden="true" /> Entrar
          </p>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Bem-vindo de volta</h1>
          <p className="mt-1.5 text-gray-600 dark:text-gray-300">Acesse sua conta para continuar estudando.</p>
        </div>

        {erro && (
          <div
            role="alert"
            className="p-3 text-sm rounded-lg bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800"
          >
            {erro}
          </div>
        )}

        <BotaoGoogle texto="Entrar com Google" onClick={entrarComGoogle} disabled={enviando} />
        <Divisor texto="ou entre com seu e-mail" />

        <form onSubmit={entrar} className="space-y-4">
          <Campo
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
          />
          <div>
            <CampoSenha
              rotulo="Senha"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <button
              type="button"
              onClick={esqueciSenha}
              className="mt-2 text-sm font-medium text-blue-700 dark:text-blue-400 hover:underline"
            >
              Esqueci minha senha
            </button>
          </div>
          <button
            type="submit"
            disabled={enviando}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm disabled:opacity-60 transition-colors"
          >
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-700 dark:text-gray-300">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-semibold text-blue-700 dark:text-blue-400 hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </LayoutAutenticacao>
  );
}
