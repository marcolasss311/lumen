"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { api, mensagemDeErro } from "@/lib/api";
import {
  CHAVE_SIMULADO_SALVO,
  type Questao,
  type SimuladoGerado,
  type SimuladoSalvo,
} from "@/lib/tipos";
import type { EstatisticaMateria } from "@/components/GraficoDesempenho";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  BarChart2,
  History,
  Home as HomeIcon,
  RotateCcw,
  Printer,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useReactToPrint } from "react-to-print";
import { SimuladoParaImprimir } from "@/components/SimuladoParaImprimir";
import TextoComTabela from "@/components/TextoComTabela";
import LoadingScreen from "@/components/LoadingScreen";

// O recharts só é baixado quando o gráfico aparece na tela.
const GraficoDesempenho = dynamic(() => import("@/components/GraficoDesempenho"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface EstatisticaApi {
  materia: string;
  total_tentativas: string;
  media_nota: string;
}

interface SimuladoResumo {
  id: string;
  nome: string;
  nota_geral: string | number;
  data_realizacao: string;
}

interface QuestaoHistorico extends Questao {
  resposta_aluno: string | null;
  feedback_ia: string | null;
  nota: string | number | null;
  acertou: boolean | null;
}

interface DetalheSimulado {
  simulado: SimuladoResumo;
  questoes: QuestaoHistorico[];
}

type SimuladoDetalhado = SimuladoResumo & { questoes: QuestaoHistorico[] };

export default function Desempenho() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EstatisticaMateria[]>([]);
  const [historico, setHistorico] = useState<SimuladoResumo[]>([]);
  const [tipoGrafico, setTipoGrafico] = useState<"Barra" | "Radar">("Barra");
  const [simuladoAtivo, setSimuladoAtivo] = useState<SimuladoDetalhado | null>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [refazendoId, setRefazendoId] = useState<string | null>(null);
  const router = useRouter();

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const carregarDetalhesSimulado = async (id: string) => {
    setCarregandoDetalhes(true);
    try {
      const simuladoData = await api<DetalheSimulado>(`/desempenho/simulado/${id}`);
      setSimuladoAtivo({
        ...simuladoData.simulado,
        questoes: simuladoData.questoes.map((q) => ({ ...q, origem: q.origem || "Oficial" })),
      });
    } catch (err) {
      console.error("Erro ao carregar detalhes", err);
      alert(mensagemDeErro(err, "Erro ao carregar os detalhes do simulado."));
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  // O servidor cria uma nova tentativa com as mesmas questões (sem o gabarito)
  // e o dashboard abre com ela.
  const refazerSimulado = async (id: string) => {
    setRefazendoId(id);
    try {
      const res = await api<SimuladoGerado>(`/simulado/${id}/refazer`, { method: "POST" });
      const estado: SimuladoSalvo = {
        simuladoId: res.simulado_id,
        questoes: res.questoes,
        respostas: {},
        resultados: null,
        paginaAtual: 1,
        simuladoFinalizado: false,
        notaGeral: null,
        nomeSimuladoCustom: res.nome,
      };
      localStorage.setItem(CHAVE_SIMULADO_SALVO, JSON.stringify(estado));
      router.push("/dashboard");
    } catch (err) {
      console.error("Erro ao refazer simulado", err);
      alert(mensagemDeErro(err, "Não foi possível carregar o simulado para refazer."));
      setRefazendoId(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        try {
          const res = await api<{ estatisticas: EstatisticaApi[]; historico: SimuladoResumo[] }>(
            "/desempenho",
          );

          // Formata as estatísticas para os gráficos
          const statsFormatadas = res.estatisticas.map((s) => ({
            subject: s.materia,
            A: Number(s.media_nota),
            fullMark: 100,
            tentativas: Number(s.total_tentativas),
          }));

          setStats(statsFormatadas);
          setHistorico(res.historico);
        } catch (err) {
          console.error("Erro ao buscar dados", err);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading)
    return <LoadingScreen text="Carregando estatísticas e desempenho..." />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <Link
              href="/home"
              className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
              title="Início"
            >
              <HomeIcon size={24} />
            </Link>
            <button
              onClick={() => router.back()}
              className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
              title="Voltar"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              Meu Desempenho
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {user.email}
            </span>
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
              ) : (
                <GraficoDesempenho stats={stats} tipo={tipoGrafico} />
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
                    <div className="text-center text-gray-400 py-10">
                      Você ainda não finalizou nenhum simulado.
                    </div>
                  ) : (
                    historico.map((h, idx) => (
                      <div
                        key={idx}
                        className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors flex justify-between items-center group"
                      >
                        <div
                          onClick={() => carregarDetalhesSimulado(h.id)}
                          className="flex-1 cursor-pointer"
                        >
                          <h3 className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {h.nome}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format(
                              new Date(h.data_realizacao),
                              "dd MMM yyyy, HH:mm",
                              { locale: ptBR },
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div
                            onClick={() => carregarDetalhesSimulado(h.id)}
                            className="text-right cursor-pointer"
                          >
                            <div className="text-xl font-black text-blue-600 dark:text-blue-400">
                              {Number(h.nota_geral).toFixed(0)}/100
                            </div>
                            <div className="text-xs text-gray-500 font-semibold uppercase">
                              Nota Geral
                            </div>
                          </div>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await refazerSimulado(h.id);
                            }}
                            disabled={refazendoId !== null}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white dark:bg-blue-900/40 dark:hover:bg-blue-600 dark:text-blue-300 dark:hover:text-white rounded-lg border border-blue-200 dark:border-blue-800 transition-all shadow-xs disabled:opacity-50"
                            title="Refazer este simulado com as mesmas questões"
                          >
                            <RotateCcw size={14} />{" "}
                            {refazendoId === h.id ? "Abrindo..." : "Refazer"}
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
                    <button
                      onClick={() => setSimuladoAtivo(null)}
                      className="text-blue-500 hover:underline mb-2 flex items-center gap-1 text-sm font-medium"
                    >
                      <ArrowLeft size={16} /> Voltar para lista
                    </button>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                      {simuladoAtivo.nome}
                    </h2>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(
                        new Date(simuladoAtivo.data_realizacao),
                        "dd MMM yyyy, HH:mm",
                        { locale: ptBR },
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right mr-2">
                      <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                        {Number(simuladoAtivo.nota_geral).toFixed(0)}/100
                      </div>
                    </div>
                    <button
                      onClick={() => refazerSimulado(simuladoAtivo.id)}
                      disabled={refazendoId !== null}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors text-sm h-fit font-medium shadow-xs disabled:opacity-50"
                      title="Refazer este simulado com as mesmas questões"
                    >
                      <RotateCcw size={15} />{" "}
                      {refazendoId === simuladoAtivo.id ? "Abrindo..." : "Refazer Prova"}
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
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm">Carregando detalhes do simulado...</p>
                    </div>
                  ) : (
                    simuladoAtivo.questoes.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                      >
                        <div className="flex justify-between mb-2">
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            Questão {idx + 1}
                          </span>
                          <span
                            className={`font-bold ${q.acertou || Number(q.nota) >= 50 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            {q.tipo_questao === "Aberta"
                              ? `${Number(q.nota).toFixed(1)}/100`
                              : q.acertou
                                ? "ACERTOU"
                                : "ERROU"}
                          </span>
                        </div>
                        <TextoComTabela
                          texto={q.pergunta}
                          className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3"
                        />

                        <div className="text-sm space-y-1">
                          <div>
                            <strong className="text-gray-600 dark:text-gray-400">
                              Sua Resposta:
                            </strong>{" "}
                            <span className="text-gray-800 dark:text-gray-200">
                              {q.resposta_aluno}
                            </span>
                          </div>
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
