"use client";

import React, { useState } from "react";
import { Check, X as XIcon, ChevronUp, ListOrdered } from "lucide-react";

interface Props {
  questoes: any[];
  respostas: { [id: string]: string };
  resultados: any[] | null;
  simuladoFinalizado: boolean;
  paginaAtual: number;
  itensPorPagina: number;
  onIrParaQuestao: (index: number) => void;
  onFinalizar?: () => void;
  finalizando?: boolean;
}

export default function NavegacaoQuestionario({
  questoes,
  respostas,
  resultados,
  simuladoFinalizado,
  paginaAtual,
  itensPorPagina,
  onIrParaQuestao,
  onFinalizar,
  finalizando = false,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const totalQuestoes = questoes.length;
  const respondidasCount = Object.keys(respostas).filter(
    (id) => respostas[id] && respostas[id].trim() !== "",
  ).length;
  const porcentagem =
    totalQuestoes > 0
      ? Math.round((respondidasCount / totalQuestoes) * 100)
      : 0;

  // Renderizador da grade de cartões
  const renderGrid = () => (
    <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 my-4">
      {questoes.map((q, idx) => {
        const questaoNum = idx + 1;
        const pageOfQuestao = Math.floor(idx / itensPorPagina) + 1;
        const isCurrentPage = pageOfQuestao === paginaAtual;
        const isRespondida = Boolean(
          respostas[q.id] && respostas[q.id].trim() !== "",
        );

        let feedback = null;
        if (simuladoFinalizado && resultados) {
          feedback = resultados.find((r) => r.questao_id === q.id);
        }

        // Estilos dependendo do estado
        let tileStyle = "";
        let bottomIndicator = null;

        if (simuladoFinalizado && feedback) {
          const acertou = feedback.acertou || Number(feedback.nota) >= 50;
          if (acertou) {
            tileStyle =
              "bg-green-50 dark:bg-green-950/40 border-green-400 dark:border-green-600 text-green-800 dark:text-green-300";
            bottomIndicator = (
              <div className="w-full bg-green-500 text-white flex items-center justify-center py-0.5 text-[10px]">
                <Check size={11} strokeWidth={3} />
              </div>
            );
          } else {
            tileStyle =
              "bg-red-50 dark:bg-red-950/40 border-red-400 dark:border-red-600 text-red-800 dark:text-red-300";
            bottomIndicator = (
              <div className="w-full bg-red-500 text-white flex items-center justify-center py-0.5 text-[10px]">
                <XIcon size={11} strokeWidth={3} />
              </div>
            );
          }
        } else {
          // Durante a prova
          if (isRespondida) {
            tileStyle =
              "bg-blue-50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-200";
            bottomIndicator = (
              <div className="w-full bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center py-0.5 text-[9px] font-bold tracking-tight">
                FEITA
              </div>
            );
          } else {
            tileStyle =
              "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-gray-500";
            bottomIndicator = (
              <div className="w-full bg-gray-100 dark:bg-gray-700/60 text-gray-400 dark:text-gray-400 flex items-center justify-center py-0.5 text-[9px]">
                —
              </div>
            );
          }
        }

        const ringStyle = isCurrentPage
          ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 font-bold scale-[1.03]"
          : "opacity-90 hover:opacity-100";

        return (
          <button
            key={q.id || idx}
            type="button"
            onClick={() => {
              onIrParaQuestao(idx);
              setMobileOpen(false);
            }}
            className={`flex flex-col items-center justify-between h-13 rounded-lg border text-xs font-semibold overflow-hidden transition-all shadow-xs cursor-pointer ${tileStyle} ${ringStyle}`}
            title={`Questão ${questaoNum} ${isRespondida ? "(Feita)" : "(Em branco)"}`}
          >
            <span className="mt-1 font-bold text-xs">{questaoNum}</span>
            {bottomIndicator}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Botão Flutuante Mobile (visível apenas em telas menores que lg) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-xl font-bold text-sm transition-all"
        >
          <ListOrdered size={18} />
          <span>
            Questões ({respondidasCount}/{totalQuestoes})
          </span>
        </button>
      </div>

      {/* Modal / Gaveta Mobile */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-80 bg-white dark:bg-gray-850 h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex justify-between items-center pb-3 border-b dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-base">
                  <ListOrdered size={18} className="text-blue-500" /> Navegação
                  do questionário
                </h3>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                >
                  <XIcon size={20} />
                </button>
              </div>

              {/* Barra de Progresso Mobile */}
              <div className="my-4">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Progresso</span>
                  <span>
                    {porcentagem}% ({respondidasCount}/{totalQuestoes})
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${porcentagem}%` }}
                  />
                </div>
              </div>

              {renderGrid()}
            </div>

            {/* Ações Mobile */}
            <div className="pt-4 border-t dark:border-gray-700 space-y-2">
              {!simuladoFinalizado && onFinalizar && (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onFinalizar();
                  }}
                  disabled={finalizando || respondidasCount < totalQuestoes}
                  className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors shadow-xs"
                >
                  {finalizando ? "Corrigindo..." : "Finalizar Simulado"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Painel Sticky Desktop (Lateral ao lado da prova) */}
      <div className="hidden lg:block w-72 shrink-0 sticky top-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between pb-3 border-b dark:border-gray-700">
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <ListOrdered size={16} className="text-blue-500" /> Navegação do
              questionário
            </h3>
          </div>

          {/* Barra de Progresso */}
          <div className="my-3">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>{simuladoFinalizado ? "Resultado" : "Respondidas"}</span>
              <span className="font-bold text-gray-700 dark:text-gray-300">
                {respondidasCount}/{totalQuestoes} ({porcentagem}%)
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${simuladoFinalizado ? "bg-green-500" : "bg-blue-600"}`}
                style={{ width: `${porcentagem}%` }}
              />
            </div>
          </div>

          {/* Grade de Quadradinhos */}
          {renderGrid()}

          {/* Legenda Informativa */}
          <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-700/80 text-[11px] text-gray-500 dark:text-gray-400 space-y-1.5">
            {!simuladoFinalizado ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-blue-600 shrink-0" />
                  <span>Questão respondida</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shrink-0" />
                  <span>Em branco (pendente)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded ring-2 ring-blue-500 ring-offset-1 bg-white dark:bg-gray-800 shrink-0" />
                  <span>Página visível no momento</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-green-500 flex items-center justify-center text-white shrink-0">
                    <Check size={9} strokeWidth={3} />
                  </span>
                  <span>Acertou</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-red-500 flex items-center justify-center text-white shrink-0">
                    <XIcon size={9} strokeWidth={3} />
                  </span>
                  <span>Errou / Incompleta</span>
                </div>
              </>
            )}
          </div>

          {/* Ação rápida de Finalização / Topo */}
          <div className="pt-4 mt-3 border-t dark:border-gray-700">
            {!simuladoFinalizado && onFinalizar ? (
              <button
                onClick={onFinalizar}
                disabled={finalizando || respondidasCount < totalQuestoes}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {finalizando ? "Corrigindo IA..." : "Finalizar tentativa..."}
              </button>
            ) : (
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium"
              >
                <ChevronUp size={14} /> Voltar ao topo da prova
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
