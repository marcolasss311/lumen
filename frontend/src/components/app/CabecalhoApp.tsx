"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "firebase/auth";
import { BarChart3, Home, LogOut, PlusCircle, Sparkles } from "lucide-react";
import { auth } from "@/lib/firebase";
import { ThemeToggle } from "@/components/ThemeToggle";

const LINKS = [
  { href: "/home", rotulo: "Início", icone: Home },
  { href: "/dashboard", rotulo: "Novo simulado", icone: PlusCircle },
  { href: "/desempenho", rotulo: "Meu desempenho", icone: BarChart3 },
];

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return (
    (
      (partes[0]?.[0] || "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")
    ).toUpperCase() || "L"
  );
}

export function Logo({ tamanho = "md" }: { tamanho?: "md" | "lg" }) {
  const caixa = tamanho === "lg" ? "w-10 h-10 rounded-xl" : "w-8 h-8 rounded-lg";
  return (
    <span
      className={`${caixa} bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-sm shrink-0`}
      aria-hidden="true"
    >
      <Sparkles size={tamanho === "lg" ? 22 : 17} />
    </span>
  );
}

/** Barra superior das telas logadas: marca, navegação principal, tema e conta do aluno. */
export default function CabecalhoApp({
  usuario,
  extra,
}: {
  usuario: User;
  extra?: React.ReactNode;
}) {
  const caminho = usePathname();
  const nome = usuario.displayName || usuario.email?.split("@")[0] || "Estudante";

  const links = (celular: boolean) =>
    LINKS.map(({ href, rotulo, icone: Icone }) => {
      const ativo = caminho === href || caminho?.startsWith(`${href}/`);
      return (
        <Link
          key={href}
          href={href}
          aria-current={ativo ? "page" : undefined}
          className={
            celular
              ? `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium ${
                  ativo ? "text-blue-700 dark:text-blue-300" : "text-gray-600 dark:text-gray-400"
                }`
              : `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  ativo
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`
          }
        >
          <Icone size={celular ? 20 : 16} aria-hidden="true" />
          {rotulo}
        </Link>
      );
    });

  return (
    <header className="print:hidden sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        <Link
          href="/home"
          className="flex items-center gap-2 font-bold text-lg text-gray-900 dark:text-white"
        >
          <Logo /> Lumen
        </Link>
        <nav aria-label="Principal" className="hidden md:flex items-center gap-1 ml-6">
          {links(false)}
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {extra}
          <ThemeToggle />
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-700">
            <span
              className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white text-xs font-bold flex items-center justify-center"
              aria-hidden="true"
            >
              {iniciais(nome)}
            </span>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 max-w-[9rem] truncate">
              {nome}
            </span>
          </div>
          <button
            type="button"
            onClick={() => auth.signOut()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-red-700 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={16} aria-hidden="true" />
            Sair
          </button>
        </div>
      </div>
      <nav
        aria-label="Principal no celular"
        className="md:hidden flex border-t border-gray-100 dark:border-gray-800"
      >
        {links(true)}
      </nav>
    </header>
  );
}
