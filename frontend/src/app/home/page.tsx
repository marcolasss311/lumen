"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brain, BarChart3, LogOut, Sparkles, BookOpen, GraduationCap, Landmark, ChevronRight } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import Modal from "@/components/Modal";

const NIVEIS = [
  {
    id: "fundamental",
    titulo: "Ensino Fundamental",
    descricao: "Do 1º ao 9º ano, com linguagem e conceitos adequados à idade.",
    icone: BookOpen,
    cor: "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  },
  {
    id: "medio",
    titulo: "Ensino Médio e Pré-Vestibular",
    descricao: "1º ao 3º ano do EM e preparação para ENEM, FUVEST e vestibulares.",
    icone: GraduationCap,
    cor: "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  },
  {
    id: "superior",
    titulo: "Ensino Superior (Graduação)",
    descricao: "Informe seu curso (ex.: Direito, Engenharia) e a disciplina da faculdade.",
    icone: Landmark,
    cor: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400",
  },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(() => !auth.currentUser);
  const [escolhendoNivel, setEscolhendoNivel] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return <LoadingScreen text="Carregando início..." />;
  if (!user) return null;

  const primeiroNome = user.displayName?.split(" ")[0] || "Estudante";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="w-full max-w-5xl mx-auto p-4 sm:p-6 flex justify-between items-center">
        <span className="flex items-center gap-2 font-bold text-xl text-gray-900 dark:text-white">
          <Sparkles className="text-blue-600 dark:text-blue-400" size={24} aria-hidden="true" />
          Lumen
        </span>
        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => auth.signOut()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={16} aria-hidden="true" /> Sair
          </button>
        </div>
      </header>

      <main id="conteudo" className="flex-1 w-full max-w-3xl mx-auto px-4 pb-12 flex flex-col items-center justify-center text-center gap-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Olá, <span className="text-blue-600 dark:text-blue-400">{primeiroNome}</span>!
          </h1>
          <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            O que você quer fazer hoje? Gere um simulado sob medida com IA ou acompanhe como está sua evolução.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full pt-4">
          <button
            type="button"
            onClick={() => setEscolhendoNivel(true)}
            className="group flex flex-col items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700 transition-all text-center"
          >
            <span className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform" aria-hidden="true">
              <Brain className="text-blue-600 dark:text-blue-400" size={32} />
            </span>
            <span className="text-xl font-bold text-gray-900 dark:text-white mb-2">Criar novo simulado</span>
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              Questões personalizadas para seu nível, matéria e curso — ou a partir dos seus PDFs.
            </span>
          </button>

          <Link
            href="/desempenho"
            className="group flex flex-col items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-700 transition-all"
          >
            <span className="w-16 h-16 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform" aria-hidden="true">
              <BarChart3 className="text-purple-600 dark:text-purple-400" size={32} />
            </span>
            <span className="text-xl font-bold text-gray-900 dark:text-white mb-2">Meu desempenho</span>
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              Histórico de notas, feedbacks das correções e sua evolução por matéria.
            </span>
          </Link>
        </div>
      </main>

      <Modal
        aberto={escolhendoNivel}
        onFechar={() => setEscolhendoNivel(false)}
        titulo="Qual é o seu nível de estudo?"
        descricao="Adaptamos as questões e as opções de acordo com a sua fase."
      >
        <ul className="space-y-3">
          {NIVEIS.map(({ id, titulo, descricao, icone: Icone, cor }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => router.push(`/dashboard?nivel=${id}`)}
                className="w-full group flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all"
              >
                <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${cor}`} aria-hidden="true">
                  <Icone size={24} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-gray-900 dark:text-white">{titulo}</span>
                  <span className="block text-sm text-gray-600 dark:text-gray-400">{descricao}</span>
                </span>
                <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-600 shrink-0" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
