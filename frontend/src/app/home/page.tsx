"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brain, BarChart3, LogOut, Sparkles, BookOpen, GraduationCap, Landmark, X } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNivelModal, setShowNivelModal] = useState(false);
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

  if (loading) return <div className="min-h-screen flex items-center justify-center dark:bg-gray-900"><p className="text-gray-500">Carregando...</p></div>;
  if (!user) return null;

  const firstName = user.displayName?.split(" ")[0] || "Estudante";

  const handleSelectNivel = (nivel: string) => {
    setShowNivelModal(false);
    router.push(`/dashboard?nivel=${nivel}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      {/* Header minimalista absoluto */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center max-w-5xl">
        <div className="flex items-center gap-2">
          <Sparkles className="text-blue-600 dark:text-blue-400" size={24} />
          <span className="font-bold text-xl text-gray-900 dark:text-white">Lumen</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button 
            onClick={() => auth.signOut()} 
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full max-w-3xl flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Olá, <span className="text-blue-600 dark:text-blue-400">{firstName}</span>!
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Bem-vindo à sua plataforma de estudos. Utilize nossa Inteligência Artificial para gerar baterias de questões exclusivas e analisar suas respostas com precisão cirúrgica.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full pt-8">
          {/* Card: Gerador de Simulado (Abre Modal) */}
          <button 
            onClick={() => setShowNivelModal(true)}
            className="group flex flex-col items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer text-center"
          >
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/50 transition-transform">
              <Brain className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Criar Novo Simulado</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Gere listas de questões personalizadas para seu nível de ensino, matéria e curso.
            </p>
          </button>

          {/* Card: Desempenho */}
          <Link href="/desempenho" className="group flex flex-col items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-purple-200 dark:hover:border-purple-800 transition-all cursor-pointer">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-purple-100 dark:group-hover:bg-purple-800/50 transition-transform">
              <BarChart3 className="text-purple-600 dark:text-purple-400" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Meu Desempenho</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Analise seu histórico de notas e confira os feedbacks das suas correções passadas.
            </p>
          </Link>
        </div>

      </main>

      {/* Modal de Escolha do Nível */}
      {showNivelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 max-w-lg w-full p-6 space-y-6 relative">
            <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Qual é o seu nível de estudo?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Adaptamos as questões e os filtros de acordo com sua fase</p>
              </div>
              <button 
                onClick={() => setShowNivelModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Opção 1: Ensino Fundamental */}
              <button 
                onClick={() => handleSelectNivel("fundamental")}
                className="w-full group flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Ensino Fundamental</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Do 1º ao 9º Ano com linguagem e conceitos didáticos adequados à idade.</p>
                </div>
              </button>

              {/* Opção 2: Ensino Médio & Pré-Vestibular */}
              <button 
                onClick={() => handleSelectNivel("medio")}
                className="w-full group flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Ensino Médio & Pré-Vestibular</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">1º ao 3º Ano do EM, preparação intensiva para ENEM, FUVEST e vestibulares.</p>
                </div>
              </button>

              {/* Opção 3: Ensino Superior */}
              <button 
                onClick={() => handleSelectNivel("superior")}
                className="w-full group flex items-center gap-4 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 text-left transition-all cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Landmark size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Ensino Superior (Graduação)</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">Novo</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Digite seu Curso (ex: Direito, Engenharia) e a Disciplina matriculada na faculdade.</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
