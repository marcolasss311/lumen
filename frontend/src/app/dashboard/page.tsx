"use client";

import { useEffect, useId, useRef, useState, Suspense } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import RenderizadorSimulado from "@/components/RenderizadorSimulado";
import RenderizadorDiscursiva from "@/components/RenderizadorDiscursiva";
import { api, ApiError, mensagemDeErro } from "@/lib/api";
import {
  CHAVE_SIMULADO_SALVO,
  type Questao,
  type ResultadoQuestao,
  type SimuladoCorrigido,
  type SimuladoGerado,
  type SimuladoSalvo,
} from "@/lib/tipos";
import { useTemposMedios } from "@/lib/useTemposMedios";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAvisos } from "@/components/Avisos";
import EsperaIA from "@/components/EsperaIA";
import DialogoConfirmacao from "@/components/DialogoConfirmacao";
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
  FileText,
  UploadCloud,
  Sparkles,
  BookOpen,
  Paperclip,
  Trash2,
  LogOut,
} from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { SimuladoParaImprimir } from "@/components/SimuladoParaImprimir";
import NavegacaoQuestionario from "@/components/NavegacaoQuestionario";
import LoadingScreen from "@/components/LoadingScreen";
import Link from "next/link";

const MB = 1024 * 1024;
const MAX_ARQUIVOS = 5;
const MAX_BYTES_ARQUIVO = 15 * MB;
const MAX_BYTES_TOTAL = 20 * MB;
const EXTENSOES_ACEITAS = [".pdf", ".txt", ".md"];
// Geração com material grande e correção de várias discursivas podem levar alguns minutos.
const TIMEOUT_IA_MS = 4 * 60 * 1000;
const ITENS_POR_PAGINA = 3;

const MATERIAS = [
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
];
const ANOS_FUNDAMENTAL = ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano", "6º Ano", "7º Ano", "8º Ano", "9º Ano"];
const ANOS_MEDIO = ["1º Ano EM", "2º Ano EM", "3º Ano EM", "Pré-Vestibular/ENEM"];

type Nivel = "fundamental" | "medio" | "superior";
const NIVEIS: { id: Nivel; rotulo: string }[] = [
  { id: "fundamental", rotulo: "Fundamental" },
  { id: "medio", rotulo: "Médio" },
  { id: "superior", rotulo: "Superior" },
];
const ANO_PADRAO: Record<Nivel, string> = {
  fundamental: "6º Ano",
  medio: "Pré-Vestibular/ENEM",
  superior: "Ensino Superior",
};

const ESTILO_CAMPO =
  "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500";
const ESTILO_ROTULO = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

/** Estado salvo no navegador. Simulados em andamento de versões antigas (sem id no servidor) são descartados. */
function lerSimuladoSalvo(): Partial<SimuladoSalvo> | null {
  if (typeof window === "undefined") return null;
  try {
    const salvo = localStorage.getItem(CHAVE_SIMULADO_SALVO);
    if (!salvo) return null;
    const dados: Partial<SimuladoSalvo> = JSON.parse(salvo);
    if (!dados.simuladoId && !dados.simuladoFinalizado) {
      localStorage.removeItem(CHAVE_SIMULADO_SALVO);
      return null;
    }
    return dados.questoes && dados.questoes.length > 0 ? dados : null;
  } catch {
    return null;
  }
}

/** Botão de alternância (ex.: nível, modo) com estado anunciado por leitores de tela. */
function BotaoOpcao({
  ativo,
  onClick,
  children,
  corAtiva = "bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 shadow-sm",
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  corAtiva?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-2 px-1.5 text-[13px] font-semibold rounded-lg transition-all whitespace-nowrap ${
        ativo ? corAtiva : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function DashboardContent() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(() => !auth.currentUser);
  const router = useRouter();
  const avisar = useAvisos();
  const searchParams = useSearchParams();
  const ids = useId();

  // O nível vem do link da página inicial (?nivel=...).
  const nivelInicial = ((): Nivel => {
    const p = searchParams.get("nivel");
    return p === "fundamental" || p === "medio" || p === "superior" ? p : "medio";
  })();

  const [nivelSegmento, setNivelSegmento] = useState<Nivel>(nivelInicial);
  const [curso, setCurso] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [anoEscolar, setAnoEscolar] = useState(ANO_PADRAO[nivelInicial]);
  const [modoMateria, setModoMateria] = useState<"Única" | "Múltiplas">("Única");
  const [materiaUnica, setMateriaUnica] = useState("Matemática");
  const [materiasMultiplas, setMateriasMultiplas] = useState<string[]>([]);
  const [topicos, setTopicos] = useState<string[]>([]);
  const [novoTopico, setNovoTopico] = useState("");
  const [quantidade, setQuantidade] = useState(5);
  const [tipoQuestao, setTipoQuestao] = useState("Mesclada");
  const [priorizarOficiais, setPriorizarOficiais] = useState(true);
  const [dificuldade, setDificuldade] = useState("Intermediário (Padrão)");

  // Simulado em andamento (restaurado do navegador, se houver)
  const [salvo] = useState(lerSimuladoSalvo);
  const [simuladoId, setSimuladoId] = useState<string | null>(salvo?.simuladoId ?? null);
  const [questoes, setQuestoes] = useState<Questao[]>(salvo?.questoes ?? []);
  const [respostas, setRespostas] = useState<{ [id: string]: string }>(salvo?.respostas ?? {});
  const [resultados, setResultados] = useState<ResultadoQuestao[] | null>(salvo?.resultados ?? null);
  const [paginaAtual, setPaginaAtual] = useState(salvo?.paginaAtual ?? 1);
  const [simuladoFinalizado, setSimuladoFinalizado] = useState(salvo?.simuladoFinalizado ?? false);
  const [notaGeral, setNotaGeral] = useState<number | null>(salvo?.notaGeral ?? null);
  const [nomeSimuladoCustom, setNomeSimuladoCustom] = useState<string | null>(salvo?.nomeSimuladoCustom ?? null);
  const [gerando, setGerando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [refazendo, setRefazendo] = useState(false);
  const [confirmandoNovo, setConfirmandoNovo] = useState(false);

  const [showEmail, setShowEmail] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  // Criação a partir de material próprio (PDF / anotações)
  const [modoCriacao, setModoCriacao] = useState<"curriculo" | "material">("curriculo");
  const [arquivosMaterial, setArquivosMaterial] = useState<{ arquivo: File; nome: string; tamanho: number }[]>([]);
  const [textoMaterial, setTextoMaterial] = useState("");
  const [exibirAnotacoes, setExibirAnotacoes] = useState(false);
  const [nomeMateriaMaterial, setNomeMateriaMaterial] = useState("");
  const [arrastando, setArrastando] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const tempos = useTemposMedios(Boolean(user));

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

  // Salva o simulado no navegador a cada mudança (sobrevive a recarregar a página).
  useEffect(() => {
    try {
      if (questoes.length > 0) {
        const estado: SimuladoSalvo = {
          simuladoId,
          questoes,
          respostas,
          resultados,
          paginaAtual,
          simuladoFinalizado,
          notaGeral,
          nomeSimuladoCustom,
        };
        localStorage.setItem(CHAVE_SIMULADO_SALVO, JSON.stringify(estado));
      } else {
        localStorage.removeItem(CHAVE_SIMULADO_SALVO);
      }
    } catch {
      // Sem espaço ou armazenamento bloqueado: o simulado continua funcionando, só não persiste.
    }
  }, [simuladoId, questoes, respostas, resultados, paginaAtual, simuladoFinalizado, notaGeral, nomeSimuladoCustom]);

  const escolherNivel = (nivel: Nivel) => {
    setNivelSegmento(nivel);
    setAnoEscolar(ANO_PADRAO[nivel]);
  };

  // Os arquivos são enviados como estão (multipart), sem conversão para base64 no navegador.
  const adicionarArquivos = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const novosArquivos = [...arquivosMaterial];
    let tamanhoTotal = novosArquivos.reduce((acc, curr) => acc + curr.tamanho, 0);

    for (const file of Array.from(files)) {
      if (novosArquivos.length >= MAX_ARQUIVOS) {
        avisar("erro", `Você pode adicionar no máximo ${MAX_ARQUIVOS} arquivos por simulado.`);
        break;
      }
      const extensao = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!EXTENSOES_ACEITAS.includes(extensao)) {
        avisar("erro", `O arquivo "${file.name}" não é suportado. Envie PDF, TXT ou MD.`);
        continue;
      }
      if (file.size > MAX_BYTES_ARQUIVO) {
        avisar("erro", `O arquivo "${file.name}" passa do limite de ${MAX_BYTES_ARQUIVO / MB} MB.`);
        continue;
      }
      if (tamanhoTotal + file.size > MAX_BYTES_TOTAL) {
        avisar("erro", `Os arquivos juntos passam do limite de ${MAX_BYTES_TOTAL / MB} MB.`);
        break;
      }
      tamanhoTotal += file.size;
      novosArquivos.push({ arquivo: file, nome: file.name, tamanho: file.size });
    }

    setArquivosMaterial(novosArquivos);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const adicionarTopico = () => {
    const t = novoTopico.trim();
    if (t && !topicos.includes(t)) setTopicos([...topicos, t]);
    setNovoTopico("");
  };

  const gerarSimulado = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!user || gerando) return;

    if (modoCriacao === "material") {
      if (arquivosMaterial.length === 0 && !textoMaterial.trim()) {
        return avisar("erro", "Envie ao menos um arquivo (PDF, TXT ou MD) ou escreva suas anotações de estudo.");
      }
    } else if (nivelSegmento === "superior") {
      if (!curso.trim()) return avisar("erro", "Digite o seu curso de graduação.");
      if (!disciplina.trim()) return avisar("erro", "Digite a disciplina da faculdade.");
      if (topicos.length === 0) return avisar("erro", "Adicione ao menos um tópico ou conteúdo da disciplina.");
    } else {
      if (modoMateria === "Múltiplas" && materiasMultiplas.length === 0) {
        return avisar("erro", "Selecione ao menos uma matéria.");
      }
      if (topicos.length === 0 && modoMateria === "Única") {
        return avisar("erro", "Adicione ao menos um tópico (ex.: Frações).");
      }
    }

    setGerando(true);
    setSimuladoId(null);
    setRespostas({});
    setResultados(null);
    setPaginaAtual(1);
    setSimuladoFinalizado(false);
    setNotaGeral(null);
    setNomeSimuladoCustom(null);

    try {
      let body: FormData | Record<string, unknown>;

      if (modoCriacao === "material") {
        const form = new FormData();
        form.append(
          "dados",
          JSON.stringify({
            modo: "material",
            material_texto: textoMaterial.trim() || null,
            materia: nomeMateriaMaterial.trim() || null,
            quantidade,
            tipo_questao: tipoQuestao,
            dificuldade,
            nivel: nivelSegmento,
          }),
        );
        for (const a of arquivosMaterial) form.append("arquivos", a.arquivo, a.nome);
        body = form;
      } else {
        body = {
          ano_escolar: nivelSegmento === "superior" ? "Ensino Superior" : anoEscolar,
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
          quantidade,
          tipo_questao: tipoQuestao,
          priorizar_oficiais: nivelSegmento === "superior" ? false : priorizarOficiais,
          dificuldade,
        };
      }

      const res = await api<SimuladoGerado>("/simulado/gerar", { method: "POST", body, timeoutMs: TIMEOUT_IA_MS });
      setSimuladoId(res.simulado_id);
      setQuestoes(res.questoes);
      if (modoCriacao === "material") setNomeSimuladoCustom(res.nome);
      setFocusMode(true);
    } catch (error) {
      console.error("Erro ao gerar simulado", error);
      avisar(
        "erro",
        error instanceof ApiError && error.status >= 500 && error.status !== 503
          ? `Não foi possível gerar o simulado: ${error.message}`
          : mensagemDeErro(error, "Erro ao gerar simulado. Verifique sua conexão e tente novamente."),
      );
    } finally {
      setGerando(false);
    }
  };

  // A correção acontece no servidor, com o gabarito do banco. O navegador só envia as respostas.
  const finalizarSimulado = async () => {
    if (!user || finalizando) return;
    if (!simuladoId) {
      return avisar("erro", "Este simulado foi criado em uma versão anterior e não pode ser corrigido. Gere um novo simulado.");
    }
    if (questoesRespondidas < questoes.length) {
      return avisar("erro", `Ainda faltam ${questoes.length - questoesRespondidas} questão(ões) para responder.`);
    }
    setFinalizando(true);
    try {
      const res = await api<SimuladoCorrigido>("/simulado/finalizar", {
        method: "POST",
        body: { simulado_id: simuladoId, respostas, nome_simulado: nomeSimuladoCustom || undefined },
        timeoutMs: TIMEOUT_IA_MS,
      });
      // As questões voltam com o gabarito liberado para exibir o feedback.
      setQuestoes(res.questoes);
      setResultados(res.resultados);
      setNotaGeral(res.nota_geral);
      setSimuladoFinalizado(true);
      setPaginaAtual(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Erro ao finalizar simulado", error);
      avisar("erro", mensagemDeErro(error, "Erro ao conectar com a IA de correção. Suas respostas foram mantidas; tente de novo."));
    } finally {
      setFinalizando(false);
    }
  };

  const refazerSimulado = async () => {
    if (!simuladoId) return;
    setRefazendo(true);
    try {
      const res = await api<SimuladoGerado>(`/simulado/${simuladoId}/refazer`, { method: "POST" });
      setSimuladoId(res.simulado_id);
      setQuestoes(res.questoes);
      setNomeSimuladoCustom(res.nome);
      setRespostas({});
      setResultados(null);
      setSimuladoFinalizado(false);
      setNotaGeral(null);
      setPaginaAtual(1);
    } catch (error) {
      console.error("Erro ao refazer simulado", error);
      avisar("erro", mensagemDeErro(error, "Não foi possível refazer o simulado."));
    } finally {
      setRefazendo(false);
    }
  };

  const descartarSimulado = () => {
    setConfirmandoNovo(false);
    setSimuladoId(null);
    setQuestoes([]);
    setRespostas({});
    setResultados(null);
    setSimuladoFinalizado(false);
    setNotaGeral(null);
    setNomeSimuladoCustom(null);
    setFocusMode(false);
  };

  const questoesRespondidas = questoes.filter((q) => (respostas[q.id] || "").trim() !== "").length;
  const faltam = questoes.length - questoesRespondidas;
  const totalPaginas = Math.ceil(questoes.length / ITENS_POR_PAGINA);
  const paginadas = questoes.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA);
  const discursivas = questoes.filter((q) => q.tipo_questao === "Aberta").length;

  const irParaQuestao = (index: number) => {
    setPaginaAtual(Math.floor(index / ITENS_POR_PAGINA) + 1);
    const questao = questoes[index];
    if (questao) {
      setTimeout(() => {
        const el = document.getElementById(`questao-card-${questao.id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus({ preventScroll: true });
      }, 100);
    }
  };

  const mudarPagina = (pagina: number) => {
    setPaginaAtual(pagina);
    document.getElementById("caderno-questoes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) return <LoadingScreen text="Carregando painel..." />;
  if (!user) return null;

  const tituloCaderno =
    nomeSimuladoCustom ||
    (nivelSegmento === "superior"
      ? disciplina || curso || "Graduação"
      : modoMateria === "Única"
        ? materiaUnica
        : materiasMultiplas.join(", "));

  const tempoGeracao = modoCriacao === "material" ? tempos?.geracao_material : tempos?.geracao;
  const emailExibido = showEmail ? user.email : user.email?.replace(/(.{2})(.*)(@.*)/, "$1***$3");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-wrap justify-between items-center gap-3 mb-6 md:mb-8 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <Link href="/home" className="flex items-center gap-2 text-xl font-bold text-blue-700 dark:text-blue-400">
            <Sparkles size={22} aria-hidden="true" /> Lumen
          </Link>
          <nav aria-label="Principal" className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/home"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <HomeIcon size={16} aria-hidden="true" /> <span className="hidden sm:inline">Início</span>
              <span className="sr-only sm:hidden">Início</span>
            </Link>
            <Link
              href="/desempenho"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <BarChart2 size={16} aria-hidden="true" /> <span className="hidden sm:inline">Meu desempenho</span>
              <span className="sr-only sm:hidden">Meu desempenho</span>
            </Link>
            <button
              type="button"
              onClick={() => setFocusMode(!focusMode)}
              aria-pressed={focusMode}
              className="p-2 rounded-md text-gray-600 hover:text-blue-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-700 transition-colors"
              title={focusMode ? "Mostrar painel de configuração" : "Modo foco: esconder o painel de configuração"}
            >
              {focusMode ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
              <span className="sr-only">Modo foco</span>
            </button>
            <ThemeToggle />
            <div className="flex items-center gap-1 pl-3 pr-1 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
              <span className="text-sm text-gray-700 dark:text-gray-200 max-w-[10rem] sm:max-w-none truncate">{emailExibido}</span>
              <button
                type="button"
                onClick={() => setShowEmail(!showEmail)}
                className="p-1 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
                aria-label={showEmail ? "Ocultar e-mail" : "Mostrar e-mail"}
                aria-pressed={showEmail}
              >
                {showEmail ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => auth.signOut()}
              className="flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
            >
              <LogOut size={16} aria-hidden="true" /> Sair
            </button>
          </nav>
        </header>

        <main id="conteudo" className="grid grid-cols-1 lg:grid-cols-[20rem_minmax(0,1fr)] gap-6">
          <h1 className="sr-only">Criar e responder simulado</h1>

          {!focusMode && (
            <form
              onSubmit={gerarSimulado}
              aria-labelledby={`${ids}-titulo-config`}
              className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-5 self-start"
            >
              <h2 id={`${ids}-titulo-config`} className="font-semibold text-lg border-b border-gray-200 dark:border-gray-700 pb-2">
                Configurar simulado
              </h2>

              <div role="group" aria-label="Como criar as questões" className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
                <BotaoOpcao ativo={modoCriacao === "curriculo"} onClick={() => setModoCriacao("curriculo")}>
                  <BookOpen size={15} aria-hidden="true" /> Por matéria
                </BotaoOpcao>
                <BotaoOpcao
                  ativo={modoCriacao === "material"}
                  onClick={() => setModoCriacao("material")}
                  corAtiva="bg-blue-600 text-white shadow-sm"
                >
                  <Paperclip size={15} aria-hidden="true" /> Meu material
                </BotaoOpcao>
              </div>

              {modoCriacao === "material" ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span id={`${ids}-arquivos-rotulo`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Arquivos de aula
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">até {MAX_ARQUIVOS} arquivos</span>
                    </div>

                    {/* Input visível para o teclado (sr-only), mas representado pela área de arrastar. */}
                    <input
                      ref={fileInputRef}
                      id={`${ids}-arquivos`}
                      type="file"
                      accept=".pdf,.txt,.md"
                      multiple
                      onChange={(e) => adicionarArquivos(e.target.files)}
                      className="peer sr-only"
                      aria-describedby={`${ids}-arquivos-dica`}
                    />
                    <label
                      htmlFor={`${ids}-arquivos`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setArrastando(true);
                      }}
                      onDragLeave={() => setArrastando(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setArrastando(false);
                        adicionarArquivos(e.dataTransfer.files);
                      }}
                      className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer text-center transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-gray-800 ${
                        arrastando
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                          : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20"
                      }`}
                    >
                      <UploadCloud size={28} className="text-gray-500 dark:text-gray-400 mb-2" aria-hidden="true" />
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {arrastando ? "Solte os arquivos aqui" : "Clique ou arraste seus arquivos"}
                      </span>
                      <span id={`${ids}-arquivos-dica`} className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        PDF, TXT ou MD · até {MAX_BYTES_ARQUIVO / MB} MB cada, {MAX_BYTES_TOTAL / MB} MB no total
                      </span>
                    </label>

                    {arquivosMaterial.length > 0 && (
                      <ul className="mt-3 space-y-2" aria-label="Arquivos selecionados">
                        {arquivosMaterial.map((arq, idx) => (
                          <li
                            key={`${arq.nome}-${idx}`}
                            className="flex items-center justify-between p-2 rounded-lg bg-blue-50/70 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-sm"
                          >
                            <span className="flex items-center gap-2 min-w-0 pr-2">
                              <FileText size={16} className="text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
                              <span className="font-medium text-gray-800 dark:text-gray-100 truncate" title={arq.nome}>
                                {arq.nome}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400 shrink-0 text-xs">
                                ({(arq.tamanho / MB).toFixed(1)} MB)
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setArquivosMaterial((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1 rounded"
                              aria-label={`Remover o arquivo ${arq.nome}`}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setExibirAnotacoes(!exibirAnotacoes)}
                      aria-expanded={exibirAnotacoes}
                      aria-controls={`${ids}-anotacoes`}
                      className="text-sm text-blue-700 dark:text-blue-400 hover:underline font-medium"
                    >
                      {exibirAnotacoes ? "− Ocultar anotações" : "+ Adicionar anotações de aula"}
                    </button>
                    {exibirAnotacoes && (
                      <div className="mt-2">
                        <label htmlFor={`${ids}-anotacoes`} className="sr-only">
                          Anotações de aula
                        </label>
                        <textarea
                          id={`${ids}-anotacoes`}
                          rows={4}
                          value={textoMaterial}
                          onChange={(e) => setTextoMaterial(e.target.value)}
                          placeholder="Cole aqui os pontos importantes, o que o professor enfatizou ou seu resumo..."
                          className={ESTILO_CAMPO}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor={`${ids}-nome-material`} className={ESTILO_ROTULO}>
                      Nome da matéria <span className="font-normal text-gray-600 dark:text-gray-400">(opcional)</span>
                    </label>
                    <input
                      id={`${ids}-nome-material`}
                      type="text"
                      value={nomeMateriaMaterial}
                      onChange={(e) => setNomeMateriaMaterial(e.target.value)}
                      placeholder="Ex.: Arquitetura de Software – Aula 5"
                      className={ESTILO_CAMPO}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <span id={`${ids}-nivel`} className={ESTILO_ROTULO}>
                      Nível de ensino
                    </span>
                    <div role="group" aria-labelledby={`${ids}-nivel`} className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg">
                      {NIVEIS.map((n) => (
                        <BotaoOpcao
                          key={n.id}
                          ativo={nivelSegmento === n.id}
                          onClick={() => escolherNivel(n.id)}
                          corAtiva={
                            n.id === "superior"
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 shadow-sm"
                          }
                        >
                          {n.rotulo}
                        </BotaoOpcao>
                      ))}
                    </div>
                  </div>

                  {nivelSegmento === "superior" ? (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor={`${ids}-curso`} className={ESTILO_ROTULO}>
                          Curso de graduação
                        </label>
                        <input
                          id={`${ids}-curso`}
                          type="text"
                          className={ESTILO_CAMPO}
                          value={curso}
                          onChange={(e) => setCurso(e.target.value)}
                          placeholder="Ex.: Direito, Engenharia de Software, Medicina..."
                        />
                      </div>
                      <div>
                        <label htmlFor={`${ids}-disciplina`} className={ESTILO_ROTULO}>
                          Disciplina
                        </label>
                        <input
                          id={`${ids}-disciplina`}
                          type="text"
                          className={ESTILO_CAMPO}
                          value={disciplina}
                          onChange={(e) => setDisciplina(e.target.value)}
                          placeholder="Ex.: Cálculo I, Direito Penal, Anatomia..."
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label htmlFor={`${ids}-ano`} className={ESTILO_ROTULO}>
                          Ano escolar
                        </label>
                        <select id={`${ids}-ano`} className={ESTILO_CAMPO} value={anoEscolar} onChange={(e) => setAnoEscolar(e.target.value)}>
                          {(nivelSegmento === "fundamental" ? ANOS_FUNDAMENTAL : ANOS_MEDIO).map((ano) => (
                            <option key={ano}>{ano}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <span id={`${ids}-modo-materia`} className={ESTILO_ROTULO}>
                          Matérias
                        </span>
                        <div role="group" aria-labelledby={`${ids}-modo-materia`} className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg mb-2">
                          <BotaoOpcao ativo={modoMateria === "Única"} onClick={() => setModoMateria("Única")}>
                            Uma matéria
                          </BotaoOpcao>
                          <BotaoOpcao ativo={modoMateria === "Múltiplas"} onClick={() => setModoMateria("Múltiplas")}>
                            Várias
                          </BotaoOpcao>
                        </div>

                        {modoMateria === "Única" ? (
                          <>
                            <label htmlFor={`${ids}-materia`} className="sr-only">
                              Matéria
                            </label>
                            <select id={`${ids}-materia`} className={ESTILO_CAMPO} value={materiaUnica} onChange={(e) => setMateriaUnica(e.target.value)}>
                              {MATERIAS.map((m) => (
                                <option key={m}>{m}</option>
                              ))}
                            </select>
                          </>
                        ) : (
                          <fieldset className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 space-y-1">
                            <legend className="sr-only">Escolha as matérias</legend>
                            {MATERIAS.map((mat) => (
                              <label key={mat} className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 py-0.5">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-blue-600"
                                  checked={materiasMultiplas.includes(mat)}
                                  onChange={(e) =>
                                    setMateriasMultiplas(
                                      e.target.checked ? [...materiasMultiplas, mat] : materiasMultiplas.filter((m) => m !== mat),
                                    )
                                  }
                                />
                                {mat}
                              </label>
                            ))}
                          </fieldset>
                        )}
                      </div>
                    </>
                  )}

                  <div>
                    <label htmlFor={`${ids}-topico`} className={ESTILO_ROTULO}>
                      Tópicos
                    </label>
                    <div className="flex gap-2">
                      <input
                        id={`${ids}-topico`}
                        type="text"
                        className={`${ESTILO_CAMPO} flex-1`}
                        value={novoTopico}
                        onChange={(e) => setNovoTopico(e.target.value)}
                        aria-describedby={`${ids}-topico-dica`}
                        placeholder={nivelSegmento === "superior" ? "Ex.: Derivadas" : "Ex.: Frações"}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault(); // Enter adiciona o tópico em vez de enviar o formulário
                            adicionarTopico();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={adicionarTopico}
                        className="bg-gray-200 dark:bg-gray-700 px-2.5 rounded-lg text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                        aria-label="Adicionar tópico"
                      >
                        <Plus size={20} aria-hidden="true" />
                      </button>
                    </div>
                    <p id={`${ids}-topico-dica`} className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Digite e pressione Enter para adicionar cada tópico.
                    </p>
                    {topicos.length > 0 && (
                      <ul className="flex flex-wrap gap-2 mt-2" aria-label="Tópicos escolhidos">
                        {topicos.map((t) => (
                          <li key={t} className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 pl-2 pr-1 py-1 rounded text-sm">
                            {t}
                            <button
                              type="button"
                              onClick={() => setTopicos(topicos.filter((item) => item !== t))}
                              className="p-0.5 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                              aria-label={`Remover o tópico ${t}`}
                            >
                              <X size={14} aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              <div>
                <label htmlFor={`${ids}-quantidade`} className={ESTILO_ROTULO}>
                  Quantidade: <strong>{quantidade} questões</strong>
                </label>
                <input
                  id={`${ids}-quantidade`}
                  type="range"
                  min="1"
                  max="20"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  aria-valuetext={`${quantidade} questões`}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label htmlFor={`${ids}-tipo`} className={ESTILO_ROTULO}>
                  Tipo de questão
                </label>
                <select id={`${ids}-tipo`} className={ESTILO_CAMPO} value={tipoQuestao} onChange={(e) => setTipoQuestao(e.target.value)}>
                  <option value="Fechada">Múltipla escolha</option>
                  <option value="Aberta">Discursiva (aberta)</option>
                  <option value="Mesclada">Mesclada (múltipla + discursiva)</option>
                </select>
              </div>

              <div>
                <label htmlFor={`${ids}-dificuldade`} className={ESTILO_ROTULO}>
                  Nível de dificuldade
                </label>
                <select id={`${ids}-dificuldade`} className={ESTILO_CAMPO} value={dificuldade} onChange={(e) => setDificuldade(e.target.value)}>
                  {modoCriacao === "material" || nivelSegmento === "superior" ? (
                    <>
                      <option>Iniciante (Conceitual / Básico)</option>
                      <option>Intermediário (Padrão de Prova)</option>
                      <option>{nivelSegmento === "superior" ? "Avançado (Exames / ENADE / OAB)" : "Avançado (Exames / Padrão Universitário)"}</option>
                    </>
                  ) : (
                    <>
                      <option>Iniciante</option>
                      <option>Intermediário (Padrão)</option>
                      <option>Avançado / Vestibular</option>
                    </>
                  )}
                </select>
                {modoCriacao === "curriculo" && nivelSegmento !== "superior" && (
                  <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 mt-3">
                    <input
                      type="checkbox"
                      checked={priorizarOficiais}
                      onChange={(e) => setPriorizarOficiais(e.target.checked)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    Priorizar questões oficiais (provas reais)
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={gerando}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Sparkles size={16} aria-hidden="true" />
                {gerando ? "Gerando..." : modoCriacao === "material" ? "Gerar a partir do material" : "Gerar simulado"}
              </button>
              {tempoGeracao && tempoGeracao.amostras > 0 && (
                <p className="text-xs text-center text-gray-600 dark:text-gray-400 -mt-2">
                  Tempo médio de geração: ~{tempoGeracao.segundos} s
                </p>
              )}
            </form>
          )}

          <div className={focusMode ? "lg:col-span-2" : "min-w-0"}>
            {questoes.length > 0 && !gerando ? (
              <div className="flex flex-col xl:flex-row gap-6 justify-center items-start w-full">
                <section id="caderno-questoes" aria-label="Caderno de questões" className="w-full max-w-4xl space-y-6 flex-1 scroll-mt-4">
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-wider font-bold text-blue-700 dark:text-blue-300">Caderno de questões</p>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1 break-words">{tituloCaderno}</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {questoes.length} {questoes.length === 1 ? "questão" : "questões"} · {questoesRespondidas}{" "}
                        {questoesRespondidas === 1 ? "respondida" : "respondidas"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmandoNovo(true)}
                        className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-red-700 dark:text-gray-300 dark:hover:text-red-400 font-medium px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <RotateCcw size={15} aria-hidden="true" /> Novo simulado
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrint()}
                        className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-3.5 py-2 rounded-lg transition-colors text-sm font-medium shadow-sm"
                      >
                        <Printer size={16} aria-hidden="true" /> Exportar PDF
                      </button>
                    </div>
                  </div>

                  {finalizando && discursivas > 0 && (
                    <EsperaIA
                      compacto
                      titulo="Corrigindo suas respostas"
                      descricao={`A IA está avaliando ${discursivas === 1 ? "sua resposta discursiva" : `suas ${discursivas} respostas discursivas`}. As de múltipla escolha já foram conferidas.`}
                      segundosMedios={tempos?.correcao.amostras ? tempos.correcao.segundos : null}
                      segundosPadrao={15}
                    />
                  )}

                  {simuladoFinalizado && notaGeral !== null && (
                    <div className="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 p-6 rounded-2xl flex flex-wrap justify-between items-center gap-4 shadow-sm" role="status">
                      <div>
                        <h2 className="text-xl font-bold text-blue-900 dark:text-blue-200">Simulado finalizado!</h2>
                        <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">Veja abaixo seus acertos, erros e os comentários da correção.</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={refazerSimulado}
                            disabled={refazendo || !simuladoId}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-60"
                          >
                            <RotateCcw size={16} aria-hidden="true" /> {refazendo ? "Preparando..." : "Refazer este simulado"}
                          </button>
                          <Link
                            href="/desempenho"
                            className="flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-semibold border border-gray-300 dark:border-gray-600 transition-all"
                          >
                            <BarChart2 size={16} aria-hidden="true" /> Ver no histórico
                          </Link>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-blue-800 dark:text-blue-300">
                          {notaGeral.toFixed(0)}
                          <span className="text-lg">/100</span>
                        </p>
                        <p className="text-xs text-blue-800 dark:text-blue-300 uppercase tracking-wider font-bold">Nota geral</p>
                      </div>
                    </div>
                  )}

                  {paginadas.map((q, idx) => {
                    const numero = (paginaAtual - 1) * ITENS_POR_PAGINA + idx + 1;
                    const feedback = resultados?.find((r) => r.questao_id === q.id);
                    const props = {
                      questao: q,
                      index: numero,
                      modo: (simuladoFinalizado ? "feedback" : "prova") as "feedback" | "prova",
                      respostaSelecionada: respostas[q.id] || null,
                      onResponder: (resp: string) => setRespostas((atuais) => ({ ...atuais, [q.id]: resp })),
                      feedback,
                    };
                    return (
                      <div key={q.id} id={`questao-card-${q.id}`} tabIndex={-1} className="scroll-mt-4 rounded-xl">
                        {q.tipo_questao === "Aberta" ? <RenderizadorDiscursiva {...props} /> : <RenderizadorSimulado {...props} />}
                      </div>
                    );
                  })}

                  <nav aria-label="Paginação das questões" className="flex flex-wrap justify-between items-center gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => mudarPagina(Math.max(1, paginaAtual - 1))}
                      disabled={paginaAtual === 1}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg disabled:opacity-50 text-gray-900 dark:text-white font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="text-gray-700 dark:text-gray-300 text-sm font-medium" aria-live="polite">
                      Página {paginaAtual} de {totalPaginas}
                    </span>

                    {paginaAtual < totalPaginas ? (
                      <button
                        type="button"
                        onClick={() => mudarPagina(Math.min(totalPaginas, paginaAtual + 1))}
                        className="px-4 py-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-800 dark:text-blue-200 font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        Próxima
                      </button>
                    ) : !simuladoFinalizado ? (
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={finalizarSimulado}
                          disabled={finalizando}
                          aria-describedby={faltam > 0 ? `${ids}-faltam` : undefined}
                          className="px-6 py-2 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 disabled:opacity-60 shadow-sm transition-colors"
                        >
                          {finalizando ? "Corrigindo..." : "Finalizar simulado"}
                        </button>
                        {faltam > 0 && (
                          <span id={`${ids}-faltam`} className="text-xs text-amber-700 dark:text-amber-300">
                            Faltam {faltam} {faltam === 1 ? "questão" : "questões"} para responder
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-green-700 dark:text-green-400 font-bold">✓ Concluído</span>
                    )}
                  </nav>
                </section>

                <NavegacaoQuestionario
                  questoes={questoes}
                  respostas={respostas}
                  resultados={resultados}
                  simuladoFinalizado={simuladoFinalizado}
                  paginaAtual={paginaAtual}
                  itensPorPagina={ITENS_POR_PAGINA}
                  onIrParaQuestao={irParaQuestao}
                  onFinalizar={finalizarSimulado}
                  finalizando={finalizando}
                />
              </div>
            ) : gerando ? (
              <EsperaIA
                titulo={modoCriacao === "material" ? "Criando questões a partir do seu material" : "Criando seu simulado com IA"}
                descricao={
                  modoCriacao === "material"
                    ? "A IA está lendo seus arquivos para criar questões fiéis ao conteúdo."
                    : `Buscando questões no banco e criando as que faltarem (${quantidade} no total).`
                }
                segundosMedios={tempoGeracao?.amostras ? tempoGeracao.segundos : null}
                segundosPadrao={modoCriacao === "material" ? 30 : 20}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 p-8 sm:p-12 text-center rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 w-full flex flex-col items-center justify-center min-h-[400px]">
                <div className="p-4 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4" aria-hidden="true">
                  {modoCriacao === "material" ? <Paperclip size={32} /> : <BookOpen size={32} />}
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {modoCriacao === "material" ? "Pronto para estudar seus slides ou anotações?" : "Pronto para começar?"}
                </h2>
                <p className="text-sm max-w-md text-gray-600 dark:text-gray-400">
                  {modoCriacao === "material"
                    ? "Envie até 5 arquivos de aula (slides, apostilas ou resumos) no painel e clique em “Gerar a partir do material”."
                    : "Escolha o nível, a matéria e os tópicos no painel e clique em “Gerar simulado”."}
                </p>
                {focusMode && (
                  <button
                    type="button"
                    onClick={() => setFocusMode(false)}
                    className="mt-5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                  >
                    Mostrar painel de configuração
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <DialogoConfirmacao
        aberto={confirmandoNovo}
        titulo="Descartar este simulado?"
        descricao={
          simuladoFinalizado
            ? "O resultado continua salvo em “Meu desempenho”. Você poderá configurar um novo simulado."
            : "As respostas deste simulado ainda não foram enviadas e serão perdidas."
        }
        textoConfirmar="Descartar e criar novo"
        perigo={!simuladoFinalizado}
        onConfirmar={descartarSimulado}
        onCancelar={() => setConfirmandoNovo(false)}
      />

      <div style={{ display: "none" }}>
        <SimuladoParaImprimir ref={printRef} questoes={questoes} alunoNome={user?.displayName || ""} materia={tituloCaderno} />
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
