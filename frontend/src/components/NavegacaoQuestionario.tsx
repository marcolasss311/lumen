"use client";

import { useState } from "react";
import { Check, X as XIcon, ChevronUp, ListOrdered } from "lucide-react";
import type { Questao, ResultadoQuestao } from "@/lib/tipos";
import Modal from "@/components/Modal";

interface Props {
  questoes: Questao[];
  respostas: { [id: string]: string };
  resultados: ResultadoQuestao[] | null;
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
  const [gavetaAberta, setGavetaAberta] = useState(false);

  const total = questoes.length;
  const respondidas = questoes.filter((q) => (respostas[q.id] || "").trim() !== "").length;
  const porcentagem = total > 0 ? Math.round((respondidas / total) * 100) : 0;

  const grade = (
    <ul className="grid grid-cols-5 gap-2 my-4" aria-label="Questões">
      {questoes.map((q, idx) => {
        const numero = idx + 1;
        const naPaginaAtual = Math.floor(idx / itensPorPagina) + 1 === paginaAtual;
        const respondida = (respostas[q.id] || "").trim() !== "";
        const resultado = simuladoFinalizado ? resultados?.find((r) => r.questao_id === q.id) : undefined;

        let estilo: string;
        let rodape: React.ReactNode;
        let estado: string;
        if (resultado) {
          const acertou = resultado.acertou || Number(resultado.nota) >= 50;
          estado = acertou ? "acertou" : "errou";
          estilo = acertou
            ? "bg-green-50 dark:bg-green-950/40 border-green-500 dark:border-green-600 text-green-900 dark:text-green-200"
            : "bg-red-50 dark:bg-red-950/40 border-red-500 dark:border-red-600 text-red-900 dark:text-red-200";
          rodape = (
            <span className={`w-full flex items-center justify-center py-0.5 text-white ${acertou ? "bg-green-600" : "bg-red-600"}`}>
              {acertou ? <Check size={12} strokeWidth={3} /> : <XIcon size={12} strokeWidth={3} />}
            </span>
          );
        } else if (respondida) {
          estado = "respondida";
          estilo = "bg-blue-50 dark:bg-blue-950/30 border-blue-500 dark:border-blue-600 text-blue-900 dark:text-blue-200";
          rodape = <span className="w-full bg-blue-600 text-white py-0.5 text-[11px] font-bold">FEITA</span>;
        } else {
          estado = "em branco";
          estilo =
            "bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-500 text-gray-800 dark:text-gray-200 hover:border-blue-500";
          rodape = <span className="w-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-0.5 text-[11px]">—</span>;
        }

        return (
          <li key={q.id || idx}>
            <button
              type="button"
              onClick={() => {
                onIrParaQuestao(idx);
                setGavetaAberta(false);
              }}
              aria-label={`Questão ${numero}, ${estado}`}
              aria-current={naPaginaAtual ? "true" : undefined}
              className={`w-full flex flex-col items-center justify-between h-13 rounded-lg border text-sm font-semibold overflow-hidden transition-all ${estilo} ${
                naPaginaAtual ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800" : ""
              }`}
            >
              <span className="mt-1 font-bold" aria-hidden="true">
                {numero}
              </span>
              <span className="w-full" aria-hidden="true">
                {rodape}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const barra = (
    <div className="my-3">
      <div className="flex justify-between text-sm text-gray-700 dark:text-gray-300 mb-1">
        <span>{simuladoFinalizado ? "Resultado" : "Respondidas"}</span>
        <span className="font-bold">
          {respondidas}/{total} ({porcentagem}%)
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Questões respondidas"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={respondidas}
        className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden"
      >
        <div
          className={`h-full transition-all duration-300 ${simuladoFinalizado ? "bg-green-600" : "bg-blue-600"}`}
          style={{ width: `${porcentagem}%` }}
        />
      </div>
    </div>
  );

  const botaoFinalizar = !simuladoFinalizado && onFinalizar && (
    <button
      type="button"
      onClick={() => {
        setGavetaAberta(false);
        onFinalizar();
      }}
      disabled={finalizando}
      className="w-full py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-xl font-bold text-sm shadow-sm transition-colors disabled:opacity-60"
    >
      {finalizando ? "Corrigindo..." : "Finalizar simulado"}
    </button>
  );

  return (
    <>
      {/* Botão flutuante no celular */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setGavetaAberta(true)}
          aria-haspopup="dialog"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-xl font-bold text-sm transition-all"
        >
          <ListOrdered size={18} aria-hidden="true" />
          Questões ({respondidas}/{total})
        </button>
      </div>

      <Modal aberto={gavetaAberta} onFechar={() => setGavetaAberta(false)} titulo="Navegação do questionário" variante="lateral">
        <div className="flex flex-col justify-between flex-1">
          <div>
            {barra}
            {grade}
          </div>
          {botaoFinalizar && <div className="pt-4 border-t border-gray-200 dark:border-gray-700">{botaoFinalizar}</div>}
        </div>
      </Modal>

      {/* Painel fixo ao lado da prova em telas grandes */}
      <aside aria-label="Navegação do questionário" className="hidden lg:block w-72 shrink-0 sticky top-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
            <ListOrdered size={16} className="text-blue-600" aria-hidden="true" /> Navegação do questionário
          </h2>

          {barra}
          {grade}

          <div className="pt-3 mt-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 space-y-1.5">
            {!simuladoFinalizado ? (
              <>
                <p className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-blue-600 shrink-0" aria-hidden="true" /> Respondida
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded border border-gray-400 bg-white dark:bg-gray-800 shrink-0" aria-hidden="true" /> Em branco
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded ring-2 ring-blue-500 ring-offset-1 bg-white dark:bg-gray-800 shrink-0" aria-hidden="true" /> Página
                  atual
                </p>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-green-600 shrink-0" aria-hidden="true" /> Acertou
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-red-600 shrink-0" aria-hidden="true" /> Errou ou incompleta
                </p>
              </>
            )}
          </div>

          <div className="pt-4 mt-3 border-t border-gray-200 dark:border-gray-700">
            {botaoFinalizar || (
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors font-medium"
              >
                <ChevronUp size={14} aria-hidden="true" /> Voltar ao topo
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
