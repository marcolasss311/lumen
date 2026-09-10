"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import RenderizadorSimulado from "@/components/RenderizadorSimulado";
import RenderizadorDiscursiva from "@/components/RenderizadorDiscursiva";
import axios from "axios";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  Plus,
  X,
  Printer,
  BarChart2,
  Home as HomeIcon,
  RotateCcw,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { SimuladoParaImprimir } from "@/components/SimuladoParaImprimir";
import NavegacaoQuestionario from "@/components/NavegacaoQuestionario";
import LoadingScreen from "@/components/LoadingScreen";
import Link from "next/link";

function DashboardContent() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(() => !auth.currentUser);
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramNivel = searchParams.get("nivel");

  const [nivelSegmento, setNivelSegmento] = useState<
    "fundamental" | "medio" | "superior"
  >("medio");
  const [curso, setCurso] = useState("");
  const [disciplina, setDisciplina] = useState("");

  const [anoEscolar, setAnoEscolar] = useState("Pré-Vestibular/ENEM");
  const [modoMateria, setModoMateria] = useState("Única");
  const [materiaUnica, setMateriaUnica] = useState("Matemática");
  const [materiasMultiplas, setMateriasMultiplas] = useState<string[]>([]);
  const [topicos, setTopicos] = useState<string[]>([]);
  const [novoTopico, setNovoTopico] = useState("");
  const [quantidade, setQuantidade] = useState(5);
  const [tipoQuestao, setTipoQuestao] = useState("Mesclada");
  const [priorizarOficiais, setPriorizarOficiais] = useState(true);
  const [dificuldade, setDificuldade] = useState("Intermediário (Padrão)");

  // Estados do Simulado
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [gerando, setGerando] = useState(false);
  const [respostas, setRespostas] = useState<{ [id: string]: string }>({});
  const [resultados, setResultados] = useState<any[] | null>(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [simuladoFinalizado, setSimuladoFinalizado] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [notaGeral, setNotaGeral] = useState<number | null>(null);
  const [nomeSimuladoCustom, setNomeSimuladoCustom] = useState<string | null>(
    null,
  );

  const [showEmail, setShowEmail] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

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

  // Sincronizar nível com base no parâmetro da URL
  useEffect(() => {
    if (
      paramNivel === "fundamental" ||
      paramNivel === "medio" ||
      paramNivel === "superior"
    ) {
      setNivelSegmento(paramNivel);
      if (paramNivel === "fundamental") {
        setAnoEscolar("6º Ano");
      } else if (paramNivel === "superior") {
        setAnoEscolar("Ensino Superior");
      } else {
        setAnoEscolar("Pré-Vestibular/ENEM");
      }
    }
  }, [paramNivel]);

  // Carregar simulado salvo no localStorage
  useEffect(() => {
    const saved = localStorage.getItem("@lumen:simuladoAtivo");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.questoes && parsed.questoes.length > 0) {
          setQuestoes(parsed.questoes);
          setRespostas(parsed.respostas || {});
          setResultados(parsed.resultados || null);
          setPaginaAtual(parsed.paginaAtual || 1);
          setSimuladoFinalizado(parsed.simuladoFinalizado || false);
          setNotaGeral(parsed.notaGeral || null);
          if (parsed.nomeSimuladoCustom)
            setNomeSimuladoCustom(parsed.nomeSimuladoCustom);
        }
      } catch (e) {
        console.error("Erro ao carregar simulado salvo", e);
      }
    }
  }, []);

  // Salvar estado atual do simulado sempre que mudar
  useEffect(() => {
    if (questoes.length > 0) {
      localStorage.setItem(
        "@lumen:simuladoAtivo",
        JSON.stringify({
          questoes,
          respostas,
          resultados,
          paginaAtual,
          simuladoFinalizado,
          notaGeral,
          nomeSimuladoCustom,
        }),
      );
    } else {
      localStorage.removeItem("@lumen:simuladoAtivo");
    }
  }, [
    questoes,
    respostas,
    resultados,
    paginaAtual,
    simuladoFinalizado,
    notaGeral,
    nomeSimuladoCustom,
  ]);

  const gerarSimulado = async () => {
    if (!user) return;

    // Validações
    if (nivelSegmento === "superior") {
      if (!curso.trim()) {
        return alert("Por favor, digite o seu curso de graduação!");
      }
      if (!disciplina.trim()) {
        return alert("Por favor, digite a disciplina ou matéria da faculdade!");
      }
      if (topicos.length === 0) {
        return alert("Adicione ao menos um tópico ou conteúdo da matéria!");
      }
    } else {
      if (modoMateria === "Múltiplas" && materiasMultiplas.length === 0) {
        return alert("Selecione ao menos uma matéria!");
      }
      if (topicos.length === 0 && modoMateria === "Única") {
        return alert("Adicione ao menos um tópico!");
      }
    }

    setGerando(true);
    setRespostas({});
    setResultados(null);
    setPaginaAtual(1);
    setSimuladoFinalizado(false);
    setNotaGeral(null);
    setNomeSimuladoCustom(null);

    try {
      const token = await user.getIdToken();
      const payload = {
        ano_escolar:
          nivelSegmento === "superior" ? "Ensino Superior" : anoEscolar,
        nivel: nivelSegmento,
        curso: nivelSegmento === "superior" ? curso.trim() : null,
        disciplina: nivelSegmento === "superior" ? disciplina.trim() : null,
        materia:
          nivelSegmento === "superior"
            ? disciplina.trim()
            : modoMateria === "Única"
              ? materiaUnica
              : materiasMultiplas.join(", "),
        topico: topicos.length > 0 ? topicos.join(", ") : "Geral",
        quantidade: quantidade,
        tipo_questao: tipoQuestao,
        priorizar_oficiais:
          nivelSegmento === "superior" ? false : priorizarOficiais,
        dificuldade: dificuldade,
      };

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/simulado/gerar`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setQuestoes(res.data.questoes);
      setFocusMode(true);
    } catch (error: any) {
      console.error("Erro ao gerar simulado", error);
      if (error.response && error.response.status === 503) {
        alert(
          "Os servidores da inteligência artificial estão com alta demanda no momento. Aguarde alguns segundos e tente novamente!",
        );
      } else {
        alert("Erro ao gerar simulado. O backend está rodando?");
      }
    } finally {
      setGerando(false);
    }
  };

  const finalizarSimulado = async () => {
    if (!user) return;
    if (Object.keys(respostas).length < questoes.length) {
      return alert("Responda todas as questões antes de finalizar!");
    }
    setFinalizando(true);
    try {
      const token = await user.getIdToken();

      const payloadRespostas = questoes.map((q) => {
        const resp = respostas[q.id];
        if (q.tipo_questao === "Fechada") {
          const alts =
            typeof q.alternativas === "string"
              ? JSON.parse(q.alternativas)
              : q.alternativas;
          const escolhida = alts.find((a: any) => a.letra === resp);
          return {
            questao_id: q.id,
            tipo: "Fechada",
            alternativa_selecionada: resp,
            acertou: escolhida?.correta || false,
            explicacao: escolhida?.explicacao || null,
          };
        } else {
          return {
            questao_id: q.id,
            tipo: "Aberta",
            resposta_aluno: resp,
            pergunta: q.pergunta,
            gabarito: q.gabarito,
          };
        }
      });

      const defaultNome =
        nivelSegmento === "superior"
          ? `Simulado de ${disciplina || curso || "Graduação"} - ${new Date().toLocaleDateString()}`
          : `Simulado de ${modoMateria === "Única" ? materiaUnica : "Múltiplas"} - ${new Date().toLocaleDateString()}`;

      const payload = {
        nome_simulado: nomeSimuladoCustom || defaultNome,
        respostas: payloadRespostas,
      };

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/simulado/finalizar`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setResultados(res.data.resultados);
      setNotaGeral(res.data.nota_geral);
      setSimuladoFinalizado(true);
      setPaginaAtual(1); // Volta pra 1 pra ver os feedbacks
    } catch (error) {
      console.error("Erro ao finalizar simulado", error);
      alert("Erro ao conectar com a IA de correção.");
    } finally {
      setFinalizando(false);
    }
  };

  const itensPorPagina = 3;
  const totalPaginas = Math.ceil(questoes.length / itensPorPagina);
  const paginatedQuestoes = questoes.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina,
  );

  const handleIrParaQuestao = (index: number) => {
    const pageOfQuestao = Math.floor(index / itensPorPagina) + 1;
    setPaginaAtual(pageOfQuestao);
    const questao = questoes[index];
    if (questao) {
      setTimeout(() => {
        const el = document.getElementById(`questao-card-${questao.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  };

  if (loading) return <LoadingScreen text="Carregando painel..." />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            Lumen Dashboard
          </h1>
          <div className="flex items-center gap-4">
            <Link
              href="/home"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <HomeIcon size={16} /> Início
            </Link>
            <Link
              href="/desempenho"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <BarChart2 size={16} /> Meu Desempenho
            </Link>

            <button
              onClick={() => setFocusMode(!focusMode)}
              className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Modo Foco"
            >
              {focusMode ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>

            <ThemeToggle />

            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {showEmail
                  ? user.email
                  : user.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3")}
              </span>
              <button
                onClick={() => setShowEmail(!showEmail)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showEmail ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              onClick={() => auth.signOut()}
              className="text-sm text-red-500 hover:text-red-600 font-medium"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {!focusMode && (
            <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
              <h2 className="font-semibold text-lg border-b dark:border-gray-700 pb-2">
                Configurar Bateria
              </h2>

              {/* Seletor de Nível */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Nível de Ensino
                </label>
                <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setNivelSegmento("fundamental");
                      setAnoEscolar("6º Ano");
                    }}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                      nivelSegmento === "fundamental"
                        ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
                  >
                    Fundamental
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNivelSegmento("medio");
                      setAnoEscolar("Pré-Vestibular/ENEM");
                    }}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                      nivelSegmento === "medio"
                        ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-xs"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
                  >
                    Médio
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNivelSegmento("superior");
                      setAnoEscolar("Ensino Superior");
                    }}
                    className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                      nivelSegmento === "superior"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    }`}
                  >
                    Superior
                  </button>
                </div>
              </div>

              {nivelSegmento === "superior" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1 font-medium">
                      Curso de Graduação
                    </label>
                    <input
                      type="text"
                      className="w-full border dark:border-gray-600 rounded p-2 text-black dark:text-white bg-white dark:bg-gray-800 text-sm"
                      value={curso}
                      onChange={(e) => setCurso(e.target.value)}
                      placeholder="Ex: Direito, Engenharia de Software, Medicina..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1 font-medium">
                      Disciplina / Matéria Matriculada
                    </label>
                    <input
                      type="text"
                      className="w-full border dark:border-gray-600 rounded p-2 text-black dark:text-white bg-white dark:bg-gray-800 text-sm"
                      value={disciplina}
                      onChange={(e) => setDisciplina(e.target.value)}
                      placeholder="Ex: Cálculo I, Direito Penal, Anatomia..."
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Nível Escolar
                    </label>
                    <select
                      className="w-full border dark:border-gray-600 rounded p-2 text-black dark:text-white bg-white dark:bg-gray-800"
                      value={anoEscolar}
                      onChange={(e) => setAnoEscolar(e.target.value)}
                    >
                      {nivelSegmento === "fundamental" ? (
                        <>
                          <option>1º Ano</option>
                          <option>2º Ano</option>
                          <option>3º Ano</option>
                          <option>4º Ano</option>
                          <option>5º Ano</option>
                          <option>6º Ano</option>
                          <option>7º Ano</option>
                          <option>8º Ano</option>
                          <option>9º Ano</option>
                        </>
                      ) : (
                        <>
                          <option>1º Ano EM</option>
                          <option>2º Ano EM</option>
                          <option>3º Ano EM</option>
                          <option>Pré-Vestibular/ENEM</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Modo de Matéria
                    </label>
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setModoMateria("Única")}
                        className={`flex-1 py-1 text-sm rounded ${modoMateria === "Única" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
                      >
                        Única
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoMateria("Múltiplas")}
                        className={`flex-1 py-1 text-sm rounded ${modoMateria === "Múltiplas" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
                      >
                        Várias
                      </button>
                    </div>

                    {modoMateria === "Única" ? (
                      <select
                        className="w-full border dark:border-gray-600 rounded p-2 text-black dark:text-white bg-white dark:bg-gray-800"
                        value={materiaUnica}
                        onChange={(e) => setMateriaUnica(e.target.value)}
                      >
                        <option>Matemática</option>
                        <option>Português</option>
                        <option>História</option>
                        <option>Geografia</option>
                        <option>Física</option>
                        <option>Química</option>
                        <option>Biologia</option>
                        <option>Filosofia</option>
                        <option>Sociologia</option>
                        <option>Inglês</option>
                        <option>Espanhol</option>
                      </select>
                    ) : (
                      <div className="max-h-32 overflow-y-auto border dark:border-gray-600 rounded p-2 space-y-1">
                        {[
                          "Matemática",
                          "Português",
                          "História",
                          "Geografia",
                          "Física",
                          "Química",
                          "Biologia",
                          "Filosofia",
                          "Sociologia",
                          "Inglês",
                          "Espanhol",
                        ].map((mat) => (
                          <label
                            key={mat}
                            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                          >
                            <input
                              type="checkbox"
                              checked={materiasMultiplas.includes(mat)}
                              onChange={(e) => {
                                if (e.target.checked)
                                  setMateriasMultiplas([
                                    ...materiasMultiplas,
                                    mat,
                                  ]);
                                else
                                  setMateriasMultiplas(
                                    materiasMultiplas.filter((m) => m !== mat),
                                  );
                              }}
                            />
                            {mat}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Tópicos
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className="flex-1 border dark:border-gray-600 rounded p-2 text-black dark:text-white bg-white dark:bg-gray-800 text-sm"
                    value={novoTopico}
                    onChange={(e) => setNovoTopico(e.target.value)}
                    placeholder={
                      nivelSegmento === "superior"
                        ? "Ex: Derivadas, Crimes Contra a Vida..."
                        : "Ex: Frações, Revolução Francesa..."
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && novoTopico.trim()) {
                        if (!topicos.includes(novoTopico.trim()))
                          setTopicos([...topicos, novoTopico.trim()]);
                        setNovoTopico("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        novoTopico.trim() &&
                        !topicos.includes(novoTopico.trim())
                      ) {
                        setTopicos([...topicos, novoTopico.trim()]);
                        setNovoTopico("");
                      }
                    }}
                    className="bg-gray-200 dark:bg-gray-700 p-2 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                {topicos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {topicos.map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs"
                      >
                        {t}
                        <button
                          type="button"
                          onClick={() =>
                            setTopicos(topicos.filter((item) => item !== t))
                          }
                          className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Quantidade: {quantidade}
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Tipo de Questão
                </label>
                <select
                  className="w-full border dark:border-gray-600 rounded p-2 text-black dark:text-white bg-white dark:bg-gray-800 mb-3"
                  value={tipoQuestao}
                  onChange={(e) => setTipoQuestao(e.target.value)}
                >
                  <option value="Fechada">Múltipla Escolha</option>
                  <option value="Aberta">Discursiva (Aberta)</option>
                  <option value="Mesclada">
                    Mesclada (Múltipla + Discursiva)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Nível de Dificuldade (Para IA)
                </label>
                <select
                  className="w-full border dark:border-gray-600 rounded p-2 text-black dark:text-white bg-white dark:bg-gray-800 mb-3"
                  value={dificuldade}
                  onChange={(e) => setDificuldade(e.target.value)}
                >
                  {nivelSegmento === "superior" ? (
                    <>
                      <option>Iniciante (Conceitual / Básico)</option>
                      <option>Intermediário (Padrão de Prova)</option>
                      <option>Avançado (Exames / ENADE / OAB)</option>
                    </>
                  ) : (
                    <>
                      <option>Iniciante</option>
                      <option>Intermediário (Padrão)</option>
                      <option>Avançado / Vestibular</option>
                    </>
                  )}
                </select>

                {nivelSegmento !== "superior" && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={priorizarOficiais}
                      onChange={(e) => setPriorizarOficiais(e.target.checked)}
                      className="rounded text-blue-600"
                    />
                    Priorizar Questões Oficiais (Provas)
                  </label>
                )}
              </div>

              <button
                onClick={gerarSimulado}
                disabled={gerando}
                className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {gerando ? "Gerando IA..." : "Gerar Simulado"}
              </button>
            </div>
          )}

          <div className={focusMode ? "md:col-span-4" : "md:col-span-3"}>
            {questoes.length > 0 ? (
              <div className="flex flex-col xl:flex-row gap-6 justify-center items-start w-full">
                {/* Espaço Principal da Prova (Padrão PDF / Folha) */}
                <div className="w-full max-w-4xl space-y-6 flex-1">
                  {/* Cabeçalho do Caderno de Questões (Padrão PDF / Documento) */}
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider font-bold px-2.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                          Caderno de Questões
                        </span>
                        {nomeSimuladoCustom && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                            {nomeSimuladoCustom}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">
                        {nomeSimuladoCustom ||
                          (nivelSegmento === "superior"
                            ? disciplina || curso || "Graduação"
                            : modoMateria === "Única"
                              ? materiaUnica
                              : materiasMultiplas.join(", "))}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Total: {questoes.length} questões • Respondidas:{" "}
                        {Object.keys(respostas).length}/{questoes.length}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Deseja fechar este simulado e iniciar um novo?",
                            )
                          ) {
                            setQuestoes([]);
                            setRespostas({});
                            setResultados(null);
                            setSimuladoFinalizado(false);
                            setNotaGeral(null);
                            setNomeSimuladoCustom(null);
                            localStorage.removeItem("@lumen:simuladoAtivo");
                          }
                        }}
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 font-medium px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                        title="Descartar e criar novo simulado"
                      >
                        <RotateCcw size={14} /> Novo Simulado
                      </button>

                      <button
                        onClick={() => handlePrint()}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3.5 py-2 rounded-lg transition-colors text-sm font-medium shadow-xs"
                      >
                        <Printer size={16} />
                        Exportar PDF
                      </button>
                    </div>
                  </div>

                  {simuladoFinalizado && notaGeral !== null && (
                    <div className="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 p-6 rounded-2xl flex flex-wrap justify-between items-center gap-4 shadow-sm">
                      <div>
                        <h2 className="text-xl font-bold text-blue-800 dark:text-blue-300">
                          Simulado Finalizado!
                        </h2>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          Veja seus erros e acertos abaixo.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            onClick={() => {
                              let novoNome =
                                nomeSimuladoCustom ||
                                (nivelSegmento === "superior"
                                  ? disciplina || curso || "Graduação"
                                  : modoMateria === "Única"
                                    ? materiaUnica
                                    : materiasMultiplas.join(", "));
                              if (!novoNome.includes("(Nova Tentativa)")) {
                                novoNome = `${novoNome} (Nova Tentativa)`;
                              }
                              setNomeSimuladoCustom(novoNome);
                              setRespostas({});
                              setResultados(null);
                              setSimuladoFinalizado(false);
                              setNotaGeral(null);
                              setPaginaAtual(1);
                            }}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all"
                          >
                            <RotateCcw size={16} /> Refazer Este Simulado
                          </button>
                          <Link
                            href="/desempenho"
                            className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 transition-all shadow-xs"
                          >
                            <BarChart2 size={16} /> Ver no Histórico
                          </Link>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black text-blue-700 dark:text-blue-400">
                          {notaGeral.toFixed(0)}
                          <span className="text-lg">/100</span>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-500 uppercase tracking-wider font-bold">
                          Nota Geral
                        </div>
                      </div>
                    </div>
                  )}

                  {paginatedQuestoes.map((q, idx) => {
                    const globalIndex =
                      (paginaAtual - 1) * itensPorPagina + idx + 1;
                    const feedback = resultados?.find(
                      (r) => r.questao_id === q.id,
                    );

                    return (
                      <div key={q.id} id={`questao-card-${q.id}`}>
                        {q.tipo_questao === "Aberta" ? (
                          <RenderizadorDiscursiva
                            questao={q}
                            index={globalIndex}
                            modo={simuladoFinalizado ? "feedback" : "prova"}
                            respostaSelecionada={respostas[q.id] || null}
                            onResponder={(resp) =>
                              setRespostas({ ...respostas, [q.id]: resp })
                            }
                            feedback={feedback}
                          />
                        ) : (
                          <RenderizadorSimulado
                            questao={q}
                            index={globalIndex}
                            modo={simuladoFinalizado ? "feedback" : "prova"}
                            respostaSelecionada={respostas[q.id] || null}
                            onResponder={(resp) =>
                              setRespostas({ ...respostas, [q.id]: resp })
                            }
                            feedback={feedback}
                          />
                        )}
                      </div>
                    );
                  })}

                  <div className="flex justify-between items-center mt-6 pt-6 border-t dark:border-gray-700">
                    <button
                      onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                      disabled={paginaAtual === 1}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50 text-black dark:text-white font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                      Página {paginaAtual} de {totalPaginas}
                    </span>

                    {paginaAtual < totalPaginas ? (
                      <button
                        onClick={() =>
                          setPaginaAtual((p) => Math.min(totalPaginas, p + 1))
                        }
                        className="px-4 py-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-700 dark:text-blue-300 font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        Próxima
                      </button>
                    ) : !simuladoFinalizado ? (
                      <button
                        onClick={finalizarSimulado}
                        disabled={
                          finalizando ||
                          Object.keys(respostas).length < questoes.length
                        }
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                      >
                        {finalizando
                          ? "Corrigindo IA..."
                          : "Finalizar Simulado"}
                      </button>
                    ) : (
                      <div className="text-green-600 dark:text-green-400 font-bold">
                        ✓ Concluído
                      </div>
                    )}
                  </div>
                </div>

                {/* Balão / Painel de Navegação Lateral (Estilo Moodle) */}
                <NavegacaoQuestionario
                  questoes={questoes}
                  respostas={respostas}
                  resultados={resultados}
                  simuladoFinalizado={simuladoFinalizado}
                  paginaAtual={paginaAtual}
                  itensPorPagina={itensPorPagina}
                  onIrParaQuestao={handleIrParaQuestao}
                  onFinalizar={finalizarSimulado}
                  finalizando={finalizando}
                />
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-12 text-center rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 w-full">
                Configure os filtros na lateral e clique em "Gerar Simulado"
                para começar seus estudos.
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "none" }}>
        <SimuladoParaImprimir
          ref={printRef}
          questoes={questoes}
          alunoNome={user?.displayName || ""}
          materia={
            modoMateria === "Única"
              ? materiaUnica
              : materiasMultiplas.join(", ")
          }
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<LoadingScreen text="Carregando painel..." />}>
      <DashboardContent />
    </Suspense>
  );
}
