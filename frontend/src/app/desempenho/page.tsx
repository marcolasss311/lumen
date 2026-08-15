"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, BarChart2, Hexagon, History } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

export default function Desempenho() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [tipoGrafico, setTipoGrafico] = useState<"Barra" | "Radar">("Barra");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        try {
          const token = await currentUser.getIdToken();
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/desempenho`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Formata as estatísticas para os gráficos
          const statsFormatadas = res.data.estatisticas.map((s: any) => ({
            subject: s.materia,
            A: Number(s.media_nota),
            fullMark: 100,
            tentativas: Number(s.total_tentativas)
          }));

          setStats(statsFormatadas);
          setHistorico(res.data.historico);
        } catch (err) {
          console.error("Erro ao buscar dados", err);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return <div className="p-8 text-black dark:text-white">Carregando...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <header className="flex justify-between items-center mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Meu Desempenho</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span className="text-sm text-gray-600 dark:text-gray-300">{user.email}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Painel Gráfico */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <BarChart2 className="text-blue-500" /> Domínio por Matéria
            </h2>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md p-1">
              <button 
                onClick={() => setTipoGrafico("Barra")}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${tipoGrafico === "Barra" ? "bg-white dark:bg-gray-600 shadow-sm font-medium text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
              >
                Barras
              </button>
              <button 
                onClick={() => setTipoGrafico("Radar")}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${tipoGrafico === "Radar" ? "bg-white dark:bg-gray-600 shadow-sm font-medium text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
              >
                Radar
              </button>
            </div>
          </div>

          <div className="h-80 w-full">
            {stats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                Nenhum dado suficiente. Faça alguns simulados!
              </div>
            ) : tipoGrafico === "Barra" ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="subject" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} cursor={{fill: 'transparent'}} />
                  <Bar dataKey="A" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Média de Nota" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Média" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Histórico Recente */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[500px]">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4 shrink-0">
            <History className="text-blue-500" /> Histórico Recente de Questões
          </h2>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {historico.length === 0 ? (
              <div className="text-center text-gray-400 py-10">Você ainda não respondeu nenhuma questão.</div>
            ) : (
              historico.map((h, idx) => (
                <div key={idx} className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded">
                      {h.materia}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(h.data_resposta), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 mb-2">{h.pergunta}</p>
                  
                  {h.tipo_questao === 'Aberta' ? (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Questão Discursiva</span>
                      <span className={`font-bold ${Number(h.nota) >= 70 ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'}`}>
                        Nota: {Number(h.nota).toFixed(1)}/100
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Sua Resposta: {h.resposta_aluno}</span>
                      <span className={`font-bold ${h.acertou ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {h.acertou ? 'ACERTOU' : 'ERROU'}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
