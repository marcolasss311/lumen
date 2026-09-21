"use client";

import { useId } from "react";
import TextoComTabela from "@/components/TextoComTabela";
import type { Questao, ResultadoQuestao } from "@/lib/tipos";

interface Props {
  questao: Questao;
  index: number;
  modo: "prova" | "feedback";
  respostaSelecionada: string | null;
  onResponder: (resp: string) => void;
  feedback?: ResultadoQuestao;
}

// Mesmo limite aplicado pelo servidor na correção.
const MAX_CARACTERES = 5000;

export default function RenderizadorDiscursiva({ questao, index, modo, respostaSelecionada, onResponder, feedback }: Props) {
  const idEnunciado = useId();
  const idResposta = useId();
  const isFeedback = modo === "feedback";
  const resposta = respostaSelecionada || "";

  return (
    <article className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 text-sm">
        <h3 className="font-semibold text-blue-700 dark:text-blue-400">Questão {index} (discursiva)</h3>
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">{questao.origem}</span>
      </div>
      <div id={idEnunciado} className="text-gray-900 dark:text-gray-100 mb-6 font-medium">
        <TextoComTabela texto={questao.pergunta} />
      </div>

      {!isFeedback ? (
        <div>
          <label htmlFor={idResposta} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Sua resposta
          </label>
          <textarea
            id={idResposta}
            aria-describedby={idEnunciado}
            maxLength={MAX_CARACTERES}
            className="w-full h-40 p-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y text-gray-900 dark:text-gray-100"
            placeholder="Escreva sua resposta com suas palavras..."
            value={resposta}
            onChange={(e) => onResponder(e.target.value)}
          />
          <p className="text-xs text-right text-gray-600 dark:text-gray-400 mt-1">
            {resposta.length}/{MAX_CARACTERES} caracteres
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sua resposta</h4>
            <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{resposta || "Nenhuma resposta fornecida."}</p>
          </div>

          {feedback && (
            <div
              className={`p-5 border rounded-lg ${
                feedback.nota >= 50
                  ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800/60"
                  : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800/60"
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="text-lg font-bold">Correção da IA</h4>
                <p className="flex items-baseline gap-1">
                  <span className="text-2xl font-black">{feedback.nota}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">/ 100</span>
                  <span className="sr-only">{feedback.nota >= 50 ? "(acertou)" : "(precisa melhorar)"}</span>
                </p>
              </div>
              <TextoComTabela texto={feedback.feedback_ia || ""} className="text-gray-900 dark:text-gray-200 text-sm leading-relaxed" />
            </div>
          )}

          {questao.gabarito && (
            <details className="group rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-blue-700 dark:text-blue-400">
                Ver a resposta esperada
              </summary>
              <TextoComTabela texto={questao.gabarito} className="mt-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed" />
            </details>
          )}
        </div>
      )}
    </article>
  );
}
