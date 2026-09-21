"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { UserPlus } from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import { mensagemErroAuth } from "@/lib/errosAuth";
import LayoutAutenticacao from "@/components/auth/LayoutAutenticacao";
import { BotaoGoogle, Campo, CampoSenha, Divisor } from "@/components/auth/CamposAutenticacao";

const NIVEIS_FORCA = [
  { rotulo: "Muito fraca", cor: "bg-red-500" },
  { rotulo: "Fraca", cor: "bg-orange-500" },
  { rotulo: "Razoável", cor: "bg-amber-500" },
  { rotulo: "Boa", cor: "bg-lime-500" },
  { rotulo: "Forte", cor: "bg-emerald-600" },
];

function forcaDaSenha(senha: string) {
  let pontos = 0;
  if (senha.length >= 8) pontos++;
  if (senha.length >= 12) pontos++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++;
  if (/\d/.test(senha)) pontos++;
  if (/[^A-Za-z0-9]/.test(senha)) pontos++;
  return Math.min(4, senha.length < 6 ? 0 : pontos);
}

export default function Cadastro() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const forca = forcaDaSenha(senha);
  const erroNome = tentouEnviar && nome.trim().length < 2 ? "Digite seu nome." : null;
  const erroSenha = tentouEnviar && senha.length < 6 ? "A senha precisa ter pelo menos 6 caracteres." : null;
  const erroConfirmacao =
    (tentouEnviar || confirmacao.length >= senha.length) && confirmacao && confirmacao !== senha
      ? "As senhas não são iguais."
      : tentouEnviar && !confirmacao
        ? "Repita a senha."
        : null;

  const criarConta = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setTentouEnviar(true);
    setErro(null);
    if (nome.trim().length < 2 || senha.length < 6 || senha !== confirmacao) return;

    setEnviando(true);
    try {
      const credencial = await createUserWithEmailAndPassword(auth, email.trim(), senha);
      await updateProfile(credencial.user, { displayName: nome.trim() });
      // Renova o token para o nome já chegar ao servidor na primeira requisição.
      await credencial.user.getIdToken(true);
      router.replace("/home");
    } catch (err) {
      setErro(mensagemErroAuth(err));
      setEnviando(false);
    }
  };

  const cadastrarComGoogle = async () => {
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

  return (
    <LayoutAutenticacao modo="cadastro">
      <div className="space-y-6">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
            <UserPlus size={16} aria-hidden="true" /> Criar conta
          </p>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Crie sua conta grátis</h1>
          <p className="mt-1.5 text-gray-600 dark:text-gray-300">Leva menos de um minuto. Depois é só escolher o que estudar.</p>
        </div>

        {erro && (
          <div
            role="alert"
            className="p-3 text-sm rounded-lg bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-100 dark:border-red-800"
          >
            {erro}{" "}
            {erro.startsWith("Já existe uma conta") && (
              <Link href="/login" className="font-semibold underline">
                Ir para o login
              </Link>
            )}
          </div>
        )}

        <BotaoGoogle texto="Cadastrar com Google" onClick={cadastrarComGoogle} disabled={enviando} />
        <Divisor texto="ou cadastre-se com e-mail" />

        <form onSubmit={criarConta} className="space-y-4" noValidate>
          <Campo
            rotulo="Nome"
            cor="verde"
            autoComplete="name"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como devemos te chamar?"
            erro={erroNome}
          />
          <Campo
            rotulo="E-mail"
            cor="verde"
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
              cor="verde"
              autoComplete="new-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              dica="Use pelo menos 6 caracteres. Misturar letras, números e símbolos deixa a senha mais forte."
              erro={erroSenha}
            />
            {senha && (
              <div className="mt-2">
                <div className="flex gap-1" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i < Math.max(1, forca) ? NIVEIS_FORCA[forca].cor : "bg-gray-200 dark:bg-gray-700"}`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400" aria-live="polite">
                  Força da senha: <strong>{NIVEIS_FORCA[forca].rotulo}</strong>
                </p>
              </div>
            )}
          </div>
          <CampoSenha
            rotulo="Confirmar senha"
            cor="verde"
            autoComplete="new-password"
            required
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            erro={erroConfirmacao}
          />
          <button
            type="submit"
            disabled={enviando}
            className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-sm disabled:opacity-60 transition-colors"
          >
            {enviando ? "Criando conta..." : "Criar minha conta"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-700 dark:text-gray-300">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </LayoutAutenticacao>
  );
}
