"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import axios from "axios";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, BarChart2, Hexagon, History, Home as HomeIcon, RotateCcw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";
import { SimuladoParaImprimir } from "@/components/SimuladoParaImprimir";
import TextoComTabela from "@/components/TextoComTabela";
import { useRef } from "react";

export default function Desempenho() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [tipoGrafico, setTipoGrafico] = useState<"Barra" | "Radar">("Barra");
  const [simuladoAtivo, setSimuladoAtivo] = useState<any>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const router = useRouter();

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const carregarDetalhesSimulado = async (id: string) => {
    setCarregandoDetalhes(true);
    try {
      const token = await user?.getIdToken();
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/desempenho/simulado/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const simuladoData = res.data;
      const questoesFormatadas = simuladoData.questoes.map((q: any) => ({
        id: q.id || q.questao_id,
        pergunta: q.pergunta,
        materia: q.materia,
        topico: q.topico,
        tipo_questao: q.tipo_questao,
        alternativas: q.alternativas,
        gabarito: q.gabarito,
        origem: q.origem || "Oficial",
        resposta_aluno: q.resposta_aluno,
        feedback_ia: q.feedback_ia,
        nota: q.nota,
        acertou: q.acertou
      }));

      setSimuladoAtivo({ ...simuladoData.simulado, questoes: questoesFormatadas });
    } catch (err) {
      console.error("Erro ao carregar detalhes", err);
      alert("Erro ao carregar os detalhes do simulado.");
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const refazerSimulado = (simulado: any) => {
    if (!simulado || !simulado.questoes || simulado.questoes.length === 0) return;

    const questoesLimpas = simulado.questoes.map((q: any) => ({
      id: q.id,
      pergunta: q.pergunta,
      materia: q.materia,
      topico: q.topico,
      tipo_questao: q.tipo_questao,
      alternativas: q.alternativas,
      gabarito: q.gabarito,
      origem: q.origem
    }));

    let nomeTentativa = simulado.nome || "Simulado";
    if (!nomeTentativa.includes("(Nova Tentativa)")) {
      nomeTentativa = `${nomeTentativa} (Nova Tentativa)`;
    }

    localStorage.setItem("@lumen:simuladoAtivo", JSON.stringify({
      questoes: questoesLimpas,
      respostas: {},
      resultados: null,
      paginaAtual: 1,
      simuladoFinalizado: false,
      notaGeral: null,
      nomeSimuladoCustom: nomeTentativa
    }));

    router.push("/dashboard");
  };

  const carregarEDepoisRefazer = async (id: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/desempenho/simulado/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const simuladoData = res.data;
      const questoesFormatadas = simuladoData.questoes.map((q: any) => ({
        id: q.id || q.questao_id,
        pergunta: q.pergunta,
        materia: q.materia,
        topico: q.topico,
        tipo_questao: q.tipo_questao,
        alternativas: q.alternativas,
        gabarito: q.gabarito,
        origem: q.origem || "Oficial"
      }));

      refazerSimulado({ ...simuladoData.simulado, questoes: questoesFormatadas });
    } catch (err) {
      console.error("Erro ao carregar simulado para refazer", err);
      alert("Não foi possível carregar o simulado para refazer.");
    }
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <Link href="/home" className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="Início">
              <HomeIcon size={24} />
            </Link>
            <button onClick={() => router.back()} className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="Voltar">
              <ArrowLeft size={24} />
            </button>
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

          {/* Histórico Recente de Simulados */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-[500px]">
            {!simuladoAtivo ? (
              <>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4 shrink-0">
                  <History className="text-blue-500" /> Simulados Realizados
                </h2>
                
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {historico.length === 0 ? (
                    <div className="text-center text-gray-400 py-10">Você ainda não finalizou nenhum simulado.</div>
                  ) : (
                    historico.map((h, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors flex justify-between items-center group"
                      >
                        <div onClick={() => carregarDetalhesSimulado(h.id)} className="flex-1 cursor-pointer">
                          <h3 className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{h.nome}</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format(new Date(h.data_realizacao), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div onClick={() => carregarDetalhesSimulado(h.id)} className="text-right cursor-pointer">
                            <div className="text-xl font-black text-blue-600 dark:text-blue-400">{Number(h.nota_geral).toFixed(0)}/100</div>
                            <div className="text-xs text-gray-500 font-semibold uppercase">Nota Geral</div>
                          </div>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await carregarEDepoisRefazer(h.id);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Refazer este simulado"
                          >
                            <RotateCcw size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-4 pb-4 border-b dark:border-gray-700 shrink-0">
                  <div>
                    <button onClick={() => setSimuladoAtivo(null)} className="text-blue-500 hover:underline mb-2 flex items-center gap-1 text-sm font-medium">
                      <ArrowLeft size={16} /> Voltar para lista
                    </button>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{simuladoAtivo.nome}</h2>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(simuladoAtivo.data_realizacao), "dd MMM yyyy, HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{Number(simuladoAtivo.nota_geral).toFixed(0)}/100</div>
                    </div>
                    <button 
                      onClick={() => refazerSimulado(simuladoAtivo)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors text-sm h-fit font-medium shadow-xs"
                      title="Refazer este simulado com as mesmas questões"
                    >
                      <RotateCcw size={15} /> Refazer Prova
                    </button>
                    <button 
                      onClick={() => handlePrint()}
                      className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md transition-colors text-sm h-fit font-medium shadow-xs"
                    >
                      <Printer size={15} /> PDF
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                  {carregandoDetalhes ? (
                    <div className="text-center py-10 text-gray-500">Carregando detalhes...</div>
                  ) : (
                    simuladoAtivo.questoes.map((q: any, idx: number) => (
                      <div key={idx} className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex justify-between mb-2">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Questão {idx + 1}</span>
                          <span className={`font-bold ${q.acertou || Number(q.nota) >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {q.tipo_questao === 'Aberta' ? `${Number(q.nota).toFixed(1)}/100` : (q.acertou ? 'ACERTOU' : 'ERROU')}
                          </span>
                        </div>
                        <TextoComTabela texto={q.pergunta} className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3" />
                        
                        <div className="text-sm space-y-1">
                          <div><strong className="text-gray-600 dark:text-gray-400">Sua Resposta:</strong> <span className="text-gray-800 dark:text-gray-200">{q.resposta_aluno}</span></div>
                          {q.feedback_ia && (
                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded border border-blue-100 dark:border-blue-800/40">
                              <strong>Feedback:</strong> {q.feedback_ia}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      <div style={{ display: "none" }}>
        {simuladoAtivo && (
          <SimuladoParaImprimir 
            ref={printRef} 
            questoes={simuladoAtivo.questoes} 
            alunoNome={user?.displayName || user?.email || "Aluno"} 
            materia={simuladoAtivo.nome}
            // we can pass feedback data to the print component or it will just print the questions.
          />
        )}
      </div>
    </div>
  );
}
