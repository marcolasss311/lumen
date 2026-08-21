"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brain, BarChart3, LogOut, Sparkles } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
          {/* Card: Gerador de Simulado */}
          <Link href="/dashboard" className="group flex flex-col items-center p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-100 dark:group-hover:bg-blue-800/50 transition-transform">
              <Brain className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Criar Novo Simulado</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Gere listas de questões objetivas e discursivas personalizadas pelo seu nível e matéria.
            </p>
          </Link>

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
    </div>
  );
}
