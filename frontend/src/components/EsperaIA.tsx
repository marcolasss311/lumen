"use client";

import { useEffect, useState } from "react";
import { Clock, Sparkles } from "lucide-react";

interface Props {
  titulo: string;
  descricao: string;
  /** Tempo médio real da operação, em segundos (null enquanto não carregou). */
  segundosMedios: number | null;
  /** Estimativa usada enquanto a média não chega. */
  segundosPadrao: number;
  compacto?: boolean;
}

/**
 * Tela de espera da IA com o tempo médio real, o tempo decorrido e uma barra de progresso
 * estimada (vai até 90% no tempo médio e depois avança devagar até a resposta chegar).
 */
export default function EsperaIA({ titulo, descricao, segundosMedios, segundosPadrao, compacto = false }: Props) {
  const [decorrido, setDecorrido] = useState(0);

  useEffect(() => {
    const inicio = Date.now();
    const timer = setInterval(() => setDecorrido(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const media = Math.max(3, segundosMedios ?? segundosPadrao);
  const progresso =
    decorrido <= media ? (decorrido / media) * 90 : 90 + Math.min(9, ((decorrido - media) / media) * 9);
  const demorando = decorrido > media * 1.6 && decorrido > media + 10;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-blue-100 dark:border-blue-900/40 w-full flex flex-col items-center text-center ${
        compacto ? "p-6" : "p-8 md:p-12 min-h-[380px] justify-center"
      }`}
      aria-busy="true"
    >
      <div className="relative mb-5" aria-hidden="true">
        <div className="w-14 h-14 rounded-full border-4 border-blue-100 dark:border-blue-900/50 border-t-blue-600 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Sparkles size={22} />
        </div>
      </div>

      {/* Só o texto principal é anunciado por leitores de tela; o cronômetro não, para não repetir a cada segundo. */}
      <div role="status">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{titulo}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mb-6">{descricao}</p>
      </div>

      <div className="w-full max-w-md">
        <div
          role="progressbar"
          aria-label="Progresso estimado"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progresso)}
          className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden"
        >
          <div
            className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-[width] duration-1000 ease-linear"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
          <Clock size={15} aria-hidden="true" />
          <span>
            Tempo médio: <strong>~{media} s</strong>
            <span aria-hidden="true"> · </span>
            <span className="sr-only">, </span>
            decorrido: <strong className="tabular-nums">{decorrido} s</strong>
          </span>
        </p>
        {demorando && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            Está levando mais que o normal porque a IA está com alta demanda. Aguarde mais um pouco.
          </p>
        )}
      </div>
    </div>
  );
}
