"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  FileText,
  GraduationCap,
  History,
  Landmark,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  resumirDesempenho,
  estiloNota,
  type DadosDesempenho,
  type Resumo,
  type SimuladoResumo,
} from "@/lib/desempenho";
import LoadingScreen from "@/components/LoadingScreen";
import CabecalhoApp from "@/components/app/CabecalhoApp";

const OPCOES = [
  {
    href: "/dashboard?nivel=fundamental",
    titulo: "Ensino Fundamental",
    descricao: "Do 1º ao 9º ano, com linguagem e conceitos adequados à idade.",
    icone: BookOpen,
    cor: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  {
    href: "/dashboard?nivel=medio",
    titulo: "Ensino Médio e ENEM",
    descricao: "Do 1º ao 3º ano e preparação para ENEM, FUVEST e vestibulares.",
    icone: GraduationCap,
    cor: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    href: "/dashboard?nivel=superior",
    titulo: "Ensino Superior",
    descricao: "Informe seu curso e a disciplina da faculdade.",
    icone: Landmark,
    cor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  },
  {
    href: "/dashboard?modo=material",
    titulo: "Meu material",
    descricao: "Envie PDFs, slides ou anotações e a IA cria questões fiéis ao conteúdo.",
    icone: FileText,
    cor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(() => !auth.currentUser);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [recentes, setRecentes] = useState<SimuladoResumo[] | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        api<DadosDesempenho>("/desempenho")
          .then((dados) => {
            setResumo(resumirDesempenho(dados));
            setRecentes(dados.historico.slice(0, 3));
          })
          .catch(() => setRecentes([]));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return <LoadingScreen text="Carregando início..." />;
  if (!user) return null;

  const primeiroNome = user.displayName?.split(" ")[0] || "Estudante";
  const numeros = [
    { rotulo: "Simulados feitos", valor: resumo ? String(resumo.simulados) : "—" },
    {
      rotulo: "Média geral",
      valor: resumo?.media != null ? `${resumo.media.toFixed(0)}/100` : "—",
    },
    { rotulo: "Melhor matéria", valor: resumo?.melhorMateria || "—" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <CabecalhoApp usuario={user} />

      <main id="conteudo" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-10">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-7 sm:p-10 shadow-lg">
          <div
            className="absolute -right-20 -top-24 w-80 h-80 rounded-full bg-white/10"
            aria-hidden="true"
          />
          <div
            className="absolute right-24 -bottom-28 w-64 h-64 rounded-full bg-white/5"
            aria-hidden="true"
          />
          <div className="relative grid lg:grid-cols-[1fr_17rem] gap-8 items-center">
            <div>
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/85 mb-3">
                <Sparkles size={16} aria-hidden="true" /> Início
              </p>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
                Olá, {primeiroNome}!
              </h1>
              <p className="mt-3 text-lg text-white/85 max-w-xl">
                O que vamos estudar hoje? Monte um simulado com IA em segundos ou acompanhe sua
                evolução.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-lg bg-white text-blue-800 font-semibold px-5 py-2.5 shadow-sm hover:bg-blue-50 transition-colors"
                >
                  <PlusCircle size={18} aria-hidden="true" /> Novo simulado
                </Link>
                <Link
                  href="/desempenho"
                  className="inline-flex items-center gap-2 rounded-lg bg-white/15 hover:bg-white/25 font-semibold px-5 py-2.5 transition-colors"
                >
                  <BarChart3 size={18} aria-hidden="true" /> Meu desempenho
                </Link>
              </div>
            </div>
            <dl className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              {numeros.map((n) => (
                <div key={n.rotulo} className="rounded-2xl bg-white/15 px-4 py-3">
                  <dt className="text-xs sm:text-sm text-white/80">{n.rotulo}</dt>
                  <dd className="text-lg sm:text-2xl font-extrabold truncate" title={n.valor}>
                    {n.valor}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section aria-labelledby="titulo-comecar">
          <div className="mb-4">
            <h2 id="titulo-comecar" className="text-2xl font-bold text-gray-900 dark:text-white">
              Comece por aqui
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Escolha seu nível ou use o seu próprio material de estudo.
            </p>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {OPCOES.map(({ href, titulo, descricao, icone: Icone, cor }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group h-full flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5 transition-all"
                >
                  <span
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${cor}`}
                    aria-hidden="true"
                  >
                    <Icone size={22} />
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">{titulo}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex-1">
                    {descricao}
                  </span>
                  <span
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-400"
                    aria-hidden="true"
                  >
                    Começar{" "}
                    <ArrowRight
                      size={16}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="titulo-recentes">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="titulo-recentes" className="text-2xl font-bold text-gray-900 dark:text-white">
                Seus últimos simulados
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Retome de onde parou ou refaça para fixar o conteúdo.
              </p>
            </div>
            <Link
              href="/desempenho"
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline"
            >
              Ver histórico completo <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {recentes === null ? (
            <p role="status" className="text-gray-600 dark:text-gray-400">
              Carregando...
            </p>
          ) : recentes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
              <span
                className="mx-auto w-12 h-12 rounded-xl bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 flex items-center justify-center mb-3"
                aria-hidden="true"
              >
                <History size={22} />
              </span>
              <p className="font-semibold text-gray-900 dark:text-white">
                Você ainda não finalizou nenhum simulado.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Quando terminar o primeiro, ele aparece aqui.
              </p>
            </div>
          ) : (
            <ul className="grid md:grid-cols-3 gap-4">
              {recentes.map((s) => {
                const nota = Number(s.nota_geral);
                return (
                  <li key={s.id}>
                    <Link
                      href="/desempenho"
                      className="h-full flex items-start justify-between gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-gray-900 dark:text-white truncate">
                          {s.nome}
                        </span>
                        <span className="block text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {format(new Date(s.data_realizacao), "dd 'de' MMM, HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold ${estiloNota(nota)}`}
                      >
                        {nota.toFixed(0)}/100
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
