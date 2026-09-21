"use client";

import { useEffect, useState } from "react";
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
import CabecalhoApp from "@/components/app/CabecalhoApp";
import TituloPagina from "@/components/app/TituloPagina";
import { resumirDesempenho, type EstatisticaApi, type SimuladoResumo } from "@/lib/desempenho";
import {
  ArrowLeft,
  BarChart2,
  History,
  Plus,
  Target,
  Trophy,
  ListChecks,
  RotateCcw,
  Printer,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { imprimir } from "@/lib/imprimir";
import { SimuladoParaImprimir } from "@/components/SimuladoParaImprimir";
import TextoComTabela from "@/components/TextoComTabela";
import LoadingScreen from "@/components/LoadingScreen";
import { useAvisos } from "@/components/Avisos";

// O recharts só é baixado quando o gráfico aparece na tela.
const GraficoDesempenho = dynamic(() => import("@/components/GraficoDesempenho"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

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
  const [estatisticas, setEstatisticas] = useState<EstatisticaApi[]>([]);
  const [tipoGrafico, setTipoGrafico] = useState<"Barra" | "Radar">("Barra");
  const [simuladoAtivo, setSimuladoAtivo] = useState<SimuladoDetalhado | null>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);
  const [refazendoId, setRefazendoId] = useState<string | null>(null);
  const router = useRouter();
  const avisar = useAvisos();

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
      avisar("erro", mensagemDeErro(err, "Erro ao carregar os detalhes do simulado."));
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
      avisar("erro", mensagemDeErro(err, "Não foi possível carregar o simulado para refazer."));
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
            "/desempenho"
          );

          // Formata as estatísticas para os gráficos
          const statsFormatadas = res.estatisticas.map((s) => ({
            subject: s.materia,
            A: Number(s.media_nota),
            fullMark: 100,
            tentativas: Number(s.total_tentativas),
          }));

          setStats(statsFormatadas);
          setEstatisticas(res.estatisticas);
          setHistorico(res.historico);
        } catch (err) {
          console.error("Erro ao buscar dados", err);
          avisar(
            "erro",
            mensagemDeErro(
              err,
              "Não foi possível carregar seu desempenho. Tente recarregar a página."
            )
          );
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, avisar]);

  if (loading) return <LoadingScreen text="Carregando estatísticas e desempenho..." />;
  if (!user) return null;

  const dataFormatada = (data: string) =>
    format(new Date(data), "dd 'de' MMM yyyy, HH:mm", { locale: ptBR });

  const resumo = resumirDesempenho({ estatisticas, historico });
  const cartoes = [
    { rotulo: "Simulados realizados", valor: String(resumo.simulados), icone: ListChecks },
    { rotulo: "Questões respondidas", valor: String(resumo.questoes), icone: Target },
    { rotulo: "Melhor matéria", valor: resumo.melhorMateria || "—", icone: Trophy },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 print:min-h-0 print:bg-white">
      <CabecalhoApp usuario={user} />
      <main id="conteudo" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 print:hidden">
        <TituloPagina
          icone={BarChart2}
          rotulo="Meu desempenho"
          titulo="Sua evolução"
          subtitulo="Acompanhe suas notas por matéria, reveja as correções e refaça simulados."
          acoes={
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 shadow-sm transition-colors"
            >
              <Plus size={18} aria-hidden="true" /> Novo simulado
            </Link>
          }
        />

        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 lg:mb-8">
          <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-5 shadow-lg">
            <div
              className="absolute -right-8 -top-10 w-32 h-32 rounded-full bg-white/10"
              aria-hidden="true"
            />
            <dt className="relative text-sm text-white/85">Média geral</dt>
            <dd className="relative text-4xl font-extrabold mt-1">
              {resumo.media != null ? resumo.media.toFixed(0) : "—"}
              {resumo.media != null && <span className="text-lg font-bold">/100</span>}
            </dd>
          </div>
          {cartoes.map(({ rotulo, valor, icone: Icone }) => (
            <div
              key={rotulo}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm"
            >
              <dt className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span
                  className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center"
                  aria-hidden="true"
                >
                  <Icone size={15} />
                </span>
                {rotulo}
              </dt>
              <dd
                className="text-2xl font-extrabold text-gray-900 dark:text-white mt-2 truncate"
                title={valor}
              >
                {valor}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <section
            aria-labelledby="titulo-grafico"
            className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <h2
                id="titulo-grafico"
                className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
              >
                <BarChart2 className="text-blue-600" aria-hidden="true" /> Domínio por matéria
              </h2>
              <div
                role="group"
                aria-label="Tipo de gráfico"
                className="flex bg-gray-100 dark:bg-gray-700 rounded-md p-1"
              >
                {(["Barra", "Radar"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={tipoGrafico === t}
                    onClick={() => setTipoGrafico(t)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      tipoGrafico === t
                        ? "bg-white dark:bg-gray-600 shadow-sm font-semibold text-blue-700 dark:text-blue-300"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {t === "Barra" ? "Barras" : "Radar"}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-80 w-full">
              {stats.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-gray-600 dark:text-gray-400">
                  Ainda não há dados. Faça alguns simulados para ver sua evolução!
                </div>
              ) : (
                <GraficoDesempenho stats={stats} tipo={tipoGrafico} />
              )}
            </div>

            {/* O gráfico é só visual; esta tabela traz os mesmos números para leitores de tela. */}
            {stats.length > 0 && (
              <table className="sr-only">
                <caption>Média de nota por matéria</caption>
                <thead>
                  <tr>
                    <th scope="col">Matéria</th>
                    <th scope="col">Média (0 a 100)</th>
                    <th scope="col">Questões respondidas</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.subject}>
                      <th scope="row">{s.subject}</th>
                      <td>{s.A.toFixed(0)}</td>
                      <td>{s.tentativas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section
            aria-label="Simulados realizados"
            className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col lg:h-[560px]"
          >
            {!simuladoAtivo ? (
              <>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4 shrink-0">
                  <History className="text-blue-600" aria-hidden="true" /> Simulados realizados
                </h2>

                {historico.length === 0 ? (
                  <div className="text-center text-gray-600 dark:text-gray-400 py-10">
                    Você ainda não finalizou nenhum simulado.{" "}
                    <Link
                      href="/dashboard"
                      className="text-blue-700 dark:text-blue-400 font-semibold hover:underline"
                    >
                      Criar o primeiro
                    </Link>
                  </div>
                ) : (
                  <ul className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {historico.map((h) => (
                      <li
                        key={h.id}
                        className="flex items-stretch gap-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                      >
                        <button
                          type="button"
                          onClick={() => carregarDetalhesSimulado(h.id)}
                          className="flex-1 min-w-0 flex items-center justify-between gap-3 p-4 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors group"
                        >
                          <span className="min-w-0">
                            <span className="block font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate">
                              {h.nome}
                            </span>
                            <span className="block text-sm text-gray-600 dark:text-gray-400">
                              {dataFormatada(h.data_realizacao)}
                            </span>
                          </span>
                          <span className="text-right shrink-0">
                            <span className="block text-xl font-black text-blue-700 dark:text-blue-400">
                              {Number(h.nota_geral).toFixed(0)}
                              <span className="text-sm font-bold">/100</span>
                            </span>
                            <span className="sr-only">Ver detalhes</span>
                          </span>
                          <ChevronRight
                            size={18}
                            className="text-gray-400 shrink-0"
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => refazerSimulado(h.id)}
                          disabled={refazendoId !== null}
                          className="my-3 mr-3 flex items-center gap-1.5 px-3 text-sm font-bold bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-blue-900/40 dark:hover:bg-blue-600 dark:text-blue-300 dark:hover:text-white rounded-lg border border-blue-200 dark:border-blue-800 transition-all disabled:opacity-50"
                          aria-label={`Refazer o simulado ${h.nome}`}
                        >
                          <RotateCcw size={14} aria-hidden="true" />
                          <span aria-hidden="true">
                            {refazendoId === h.id ? "Abrindo..." : "Refazer"}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="flex flex-col h-full min-h-0">
                <div className="flex flex-wrap justify-between items-start gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setSimuladoAtivo(null)}
                      className="text-blue-700 dark:text-blue-400 hover:underline mb-2 flex items-center gap-1 text-sm font-medium"
                    >
                      <ArrowLeft size={16} aria-hidden="true" /> Voltar para a lista
                    </button>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 break-words">
                      {simuladoAtivo.nome}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {dataFormatada(simuladoAtivo.data_realizacao)} · nota{" "}
                      <strong className="text-blue-700 dark:text-blue-400">
                        {Number(simuladoAtivo.nota_geral).toFixed(0)}/100
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => refazerSimulado(simuladoAtivo.id)}
                      disabled={refazendoId !== null}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <RotateCcw size={15} aria-hidden="true" />{" "}
                      {refazendoId === simuladoAtivo.id ? "Abrindo..." : "Refazer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => imprimir(simuladoAtivo.nome)}
                      className="flex items-center gap-1.5 bg-green-700 hover:bg-green-800 text-white px-3 py-2 rounded-md transition-colors text-sm font-medium"
                    >
                      <Printer size={15} aria-hidden="true" /> PDF
                    </button>
                  </div>
                </div>

                <div
                  className="flex-1 overflow-y-auto space-y-4 pr-1"
                  aria-busy={carregandoDetalhes}
                  tabIndex={0}
                  role="region"
                  aria-label="Questões do simulado"
                >
                  {carregandoDetalhes ? (
                    <div
                      role="status"
                      className="flex flex-col items-center justify-center py-12 gap-3 text-gray-600 dark:text-gray-400"
                    >
                      <div
                        className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
                        aria-hidden="true"
                      />
                      <p className="text-sm">Carregando detalhes do simulado...</p>
                    </div>
                  ) : (
                    simuladoAtivo.questoes.map((q, idx) => {
                      const acertou = q.acertou || Number(q.nota) >= 50;
                      return (
                        <article
                          key={idx}
                          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50"
                        >
                          <div className="flex justify-between gap-3 mb-2">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                              Questão {idx + 1}
                            </h3>
                            <span
                              className={`font-bold text-sm ${acertou ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
                            >
                              {q.tipo_questao === "Aberta"
                                ? `Nota ${Number(q.nota).toFixed(0)}/100`
                                : acertou
                                  ? "✓ Acertou"
                                  : "✗ Errou"}
                            </span>
                          </div>
                          <TextoComTabela
                            texto={q.pergunta}
                            className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3"
                          />
                          <div className="text-sm space-y-1">
                            <p>
                              <strong className="text-gray-700 dark:text-gray-300">
                                Sua resposta:
                              </strong>{" "}
                              <span className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                {q.resposta_aluno || "(em branco)"}
                              </span>
                            </p>
                            {q.feedback_ia && (
                              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 rounded border border-blue-200 dark:border-blue-800/40">
                                <strong>Comentário:</strong> {q.feedback_ia}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {simuladoAtivo && (
        <SimuladoParaImprimir
          questoes={simuladoAtivo.questoes}
          alunoNome={user?.displayName || user?.email || "Aluno"}
          materia={simuladoAtivo.nome}
        />
      )}
    </div>
  );
}
