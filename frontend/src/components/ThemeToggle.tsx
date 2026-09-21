"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const nada = () => () => {};

export function ThemeToggle() {
  // O tema só é conhecido no navegador; antes disso mostra um espaço reservado do mesmo tamanho.
  const montado = React.useSyncExternalStore(nada, () => true, () => false);
  // resolvedTheme é o tema de fato aplicado. Numa primeira visita o tema escolhido é "system"
  // e a página segue o Windows/celular: usar `theme` aqui deixava o botão dessincronizado.
  const { resolvedTheme, setTheme } = useTheme();

  if (!montado) {
    return <div className="w-14 h-7 rounded-full bg-gray-200 dark:bg-gray-700 opacity-50" aria-hidden="true" />;
  }

  const escuro = resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={escuro}
      aria-label="Modo escuro"
      title={escuro ? "Mudar para o modo claro" : "Mudar para o modo escuro"}
      onClick={() => setTheme(escuro ? "light" : "dark")}
      className={`relative w-14 h-7 flex items-center rounded-full p-1 transition-colors duration-300 shrink-0 ${
        escuro ? "bg-blue-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`bg-white w-5 h-5 rounded-full shadow-md flex items-center justify-center transform transition-transform duration-300 ${
          escuro ? "translate-x-7" : "translate-x-0"
        }`}
        aria-hidden="true"
      >
        {escuro ? <Moon className="w-3 h-3 text-blue-600" /> : <Sun className="w-3 h-3 text-orange-500" />}
      </span>
    </button>
  );
}
