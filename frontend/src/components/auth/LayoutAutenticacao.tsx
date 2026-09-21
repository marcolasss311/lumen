"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { BarChart3, BookOpenCheck, CheckCircle2, FileText, History, MessageSquareText, Sparkles } from "lucide-react";
import { auth } from "@/lib/firebase";
import { ThemeToggle } from "@/components/ThemeToggle";
import LoadingScreen from "@/components/LoadingScreen";

type Modo = "login" | "cadastro";

const PAINEL: Record<Modo, { fundo: string; titulo: string; texto: string; itens: { icone: typeof Sparkles; texto: string }[] }> = {
  login: {
    fundo: "from-blue-600 via-blue-700 to-indigo-800",
    titulo: "Que bom ter você de volta!",
    texto: "Seus simulados, correções e estatísticas estão esperando por você.",
    itens: [
      { icone: History, texto: "Retome o histórico dos seus simulados" },
      { icone: MessageSquareText, texto: "Revise os feedbacks das correções" },
      { icone: BarChart3, texto: "Veja sua evolução por matéria" },
    ],
  },
  cadastro: {
    fundo: "from-emerald-600 via-emerald-700 to-teal-800",
    titulo: "Estude do seu jeito, com IA.",
    texto: "Crie sua conta gratuita e comece a treinar em poucos segundos.",
    itens: [
      { icone: BookOpenCheck, texto: "Simulados de qualquer matéria, do Fundamental à faculdade" },
      { icone: FileText, texto: "Questões criadas a partir dos seus PDFs e anotações" },
      { icone: CheckCircle2, texto: "Correção detalhada das questões discursivas" },
      { icone: BarChart3, texto: "Acompanhamento do seu desempenho" },
    ],
  },
};

/**
 * Estrutura das telas de entrar e de criar conta: painel ilustrativo à esquerda (em telas
 * grandes) com conteúdo e cor diferentes para cada modo, e o formulário à direita.
 * Quem já está logado é levado direto para o início.
 */
export default function LayoutAutenticacao({ modo, children }: { modo: Modo; children: React.ReactNode }) {
  const router = useRouter();
  const [verificando, setVerificando] = useState(() => !auth.currentUser);
  const painel = PAINEL[modo];

  useEffect(() => {
    return onAuthStateChanged(auth, (usuario) => {
      if (usuario) router.replace("/home");
      else setVerificando(false);
    });
  }, [router]);

  if (verificando) return <LoadingScreen text="Carregando..." />;

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-gray-50 dark:bg-gray-900">
      <aside
        className={`hidden lg:flex flex-col justify-between p-12 text-white bg-gradient-to-br ${painel.fundo}`}
        aria-hidden="true"
      >
        <div className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles size={26} /> Lumen
        </div>
        <div className="space-y-6 max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">{painel.titulo}</h2>
          <p className="text-lg text-white/85">{painel.texto}</p>
          <ul className="space-y-3">
            {painel.itens.map(({ icone: Icone, texto }) => (
              <li key={texto} className="flex items-center gap-3 text-white/95">
                <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Icone size={18} />
                </span>
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/70">Plataforma de estudos com Inteligência Artificial</p>
      </aside>

      <div className="flex flex-col">
        <div className="flex justify-between items-center p-4 sm:p-6">
          <span className="flex items-center gap-2 font-bold text-lg text-gray-900 dark:text-white lg:invisible">
            <Sparkles className={modo === "cadastro" ? "text-emerald-600" : "text-blue-600"} size={22} aria-hidden="true" />
            Lumen
          </span>
          <ThemeToggle />
        </div>
        <main id="conteudo" className="flex-1 flex items-center justify-center px-4 pb-10">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
