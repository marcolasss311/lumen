"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const ESTILO_CAMPO =
  "w-full px-3.5 py-2.5 mt-1.5 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:border-transparent transition-shadow";

interface CampoProps extends React.InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  dica?: string;
  erro?: string | null;
  cor?: "azul" | "verde";
}

/** Campo com rótulo ligado ao input e dica/erro anunciados por leitores de tela. */
export function Campo({ rotulo, dica, erro, cor = "azul", ...props }: CampoProps) {
  const id = useId();
  const idDica = `${id}-dica`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
        {rotulo}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={dica || erro ? idDica : undefined}
        className={`${ESTILO_CAMPO} ${cor === "verde" ? "focus:ring-emerald-500" : "focus:ring-blue-500"} ${
          erro ? "border-red-500 dark:border-red-500" : ""
        }`}
        {...props}
      />
      {(erro || dica) && (
        <p id={idDica} className={`mt-1.5 text-sm ${erro ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
          {erro || dica}
        </p>
      )}
    </div>
  );
}

/** Campo de senha com botão para mostrar/ocultar. */
export function CampoSenha({ rotulo, dica, erro, cor = "azul", ...props }: CampoProps) {
  const [visivel, setVisivel] = useState(false);
  const id = useId();
  const idDica = `${id}-dica`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
        {rotulo}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visivel ? "text" : "password"}
          aria-invalid={erro ? true : undefined}
          aria-describedby={dica || erro ? idDica : undefined}
          className={`${ESTILO_CAMPO} pr-11 ${cor === "verde" ? "focus:ring-emerald-500" : "focus:ring-blue-500"} ${
            erro ? "border-red-500 dark:border-red-500" : ""
          }`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 mt-[3px] p-2 rounded-md text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
        >
          {visivel ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {(erro || dica) && (
        <p id={idDica} className={`mt-1.5 text-sm ${erro ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
          {erro || dica}
        </p>
      )}
    </div>
  );
}

/** Botão "com Google" com o logo oficial. */
export function BotaoGoogle({ texto, onClick, disabled }: { texto: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-2.5 px-4 flex items-center justify-center gap-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {texto}
    </button>
  );
}

export function Divisor({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
      <span className="flex-1 border-t border-gray-300 dark:border-gray-700" aria-hidden="true" />
      {texto}
      <span className="flex-1 border-t border-gray-300 dark:border-gray-700" aria-hidden="true" />
    </div>
  );
}
