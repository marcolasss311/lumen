"use client";

import { useId } from "react";
import { Check, X } from "lucide-react";
import TextoComTabela from "@/components/TextoComTabela";
import type { Alternativa, Questao, ResultadoQuestao } from "@/lib/tipos";

interface Props {
  questao: Questao;
  index: number;
  modo: "prova" | "feedback";
  respostaSelecionada: string | null;
  onResponder: (resp: string) => void;
  feedback?: ResultadoQuestao;
}

export default function RenderizadorSimulado({ questao, index, modo, respostaSelecionada, onResponder }: Props) {
  const idEnunciado = useId();
  // Na prova as alternativas chegam sem "correta"/"explicacao"; elas só vêm após a correção.
  const alternativas: Alternativa[] | null =
    typeof questao.alternativas === "string" ? JSON.parse(questao.alternativas) : questao.alternativas;

  const isFeedback = modo === "feedback";

  return (
    <article className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 text-sm">
        <h3 className="font-semibold text-blue-700 dark:text-blue-400">Questão {index}</h3>
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">{questao.origem}</span>
      </div>
      <div id={idEnunciado} className="text-gray-900 dark:text-gray-100 mb-6 font-medium">
        <TextoComTabela texto={questao.pergunta} />
      </div>

      <div role="radiogroup" aria-labelledby={idEnunciado} className="space-y-3">
        {alternativas?.map((alt) => {
          const selecionada = respostaSelecionada === alt.letra;
          const certa = isFeedback && alt.correta;
          const errada = isFeedback && selecionada && !alt.correta;

          let estilo =
            "bg-gray-50 dark:bg-gray-700/60 hover:bg-blue-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600 cursor-pointer";
          if (isFeedback) {
            if (certa) estilo = "bg-green-50 dark:bg-green-900/40 border-green-500 dark:border-green-600";
            else if (errada) estilo = "bg-red-50 dark:bg-red-900/40 border-red-500 dark:border-red-600";
            else estilo = "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400";
          } else if (selecionada) {
            estilo = "bg-blue-50 dark:bg-blue-900/40 border-blue-500 dark:border-blue-600 cursor-pointer";
          }

          return (
            <div key={alt.letra} className="flex flex-col">
              <label className={`flex items-start gap-3 p-4 border rounded-lg transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 ${estilo}`}>
                <input
                  type="radio"
                  name={`questao-${questao.id}`}
                  value={alt.letra}
                  checked={selecionada}
                  onChange={() => !isFeedback && onResponder(alt.letra)}
                  className="mt-1 w-4 h-4 accent-blue-600 shrink-0"
                  disabled={isFeedback}
                />
                <span className="flex-1">
                  <strong>{alt.letra})</strong> {alt.texto}
                </span>
                {certa && (
                  <span className="flex items-center gap-1 text-xs font-bold text-green-800 dark:text-green-300 shrink-0">
                    <Check size={14} strokeWidth={3} aria-hidden="true" />
                    {selecionada ? "Sua resposta · correta" : "Resposta correta"}
                  </span>
                )}
                {errada && (
                  <span className="flex items-center gap-1 text-xs font-bold text-red-800 dark:text-red-300 shrink-0">
                    <X size={14} strokeWidth={3} aria-hidden="true" /> Sua resposta
                  </span>
                )}
              </label>

              {errada && alt.explicacao && (
                <div className="mt-2 ml-8 p-3 text-sm text-red-900 dark:text-red-200 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800/40">
                  <strong className="block mb-1 text-red-800 dark:text-red-300">Por que esta está incorreta?</strong>
                  {alt.explicacao}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isFeedback && !respostaSelecionada && (
        <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-400">Questão deixada em branco.</p>
      )}
    </article>
  );
}
