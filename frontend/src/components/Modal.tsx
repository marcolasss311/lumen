"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  /** "centro" (padrão) ou "lateral" (gaveta à direita, usada no celular). */
  variante?: "centro" | "lateral";
}

/**
 * Janela modal baseada no <dialog> nativo: prende o foco dentro dela, fecha com Esc e
 * devolve o foco ao botão que a abriu — comportamento que leitores de tela entendem.
 */
export default function Modal({ aberto, onFechar, titulo, descricao, children, variante = "centro" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const idDescricao = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) dialogo.showModal();
    if (!aberto && dialogo.open) dialogo.close();
  }, [aberto]);

  const estilo =
    variante === "lateral"
      ? "m-0 ml-auto h-dvh max-h-dvh w-[min(22rem,100vw)] rounded-none"
      : "m-auto w-[min(32rem,calc(100vw-2rem))] rounded-3xl";

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      aria-describedby={descricao ? idDescricao : undefined}
      onClose={onFechar}
      onClick={(e) => {
        // Clique no fundo escurecido (fora da caixa) fecha a janela.
        if (e.target === ref.current) onFechar();
      }}
      className={`${estilo} p-0 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-2xl border border-gray-100 dark:border-gray-700`}
    >
      <div className="p-6 flex flex-col gap-5 h-full">
        <div className="flex justify-between items-start gap-4 border-b border-gray-200 dark:border-gray-700 pb-3">
          <div>
            <h2 id={idTitulo} className="text-xl font-bold">
              {titulo}
            </h2>
            {descricao && (
              <p id={idDescricao} className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {descricao}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
