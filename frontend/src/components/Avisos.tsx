"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type TipoAviso = "erro" | "sucesso" | "info";

interface Aviso {
  id: number;
  tipo: TipoAviso;
  mensagem: string;
}

type Avisar = (tipo: TipoAviso, mensagem: string) => void;

const AvisosContext = createContext<Avisar>(() => {});

const ESTILOS: Record<TipoAviso, string> = {
  erro: "bg-red-50 border-red-300 text-red-900 dark:bg-red-950 dark:border-red-800 dark:text-red-100",
  sucesso:
    "bg-green-50 border-green-300 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-100",
  info: "bg-white border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100",
};

const ICONES: Record<TipoAviso, typeof Info> = {
  erro: AlertCircle,
  sucesso: CheckCircle2,
  info: Info,
};

/**
 * Avisos na tela (substituem o alert() do navegador, que bloqueia a página e não
 * segue o tema). Ficam numa região "live", então leitores de tela anunciam a mensagem.
 */
export function AvisosProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const remover = useCallback((id: number) => {
    setAvisos((atuais) => atuais.filter((a) => a.id !== id));
  }, []);

  const avisar = useCallback<Avisar>(
    (tipo, mensagem) => {
      const id = Date.now() + Math.random();
      setAvisos((atuais) => [...atuais.slice(-2), { id, tipo, mensagem }]);
      setTimeout(() => remover(id), tipo === "erro" ? 9000 : 6000);
    },
    [remover]
  );

  return (
    <AvisosContext.Provider value={avisar}>
      {children}
      <div
        aria-live="polite"
        className="print:hidden fixed z-[90] top-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:w-96 flex flex-col gap-2 pointer-events-none"
      >
        {avisos.map((aviso) => {
          const Icone = ICONES[aviso.tipo];
          return (
            <div
              key={aviso.id}
              role={aviso.tipo === "erro" ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm ${ESTILOS[aviso.tipo]}`}
            >
              <Icone size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
              <p className="flex-1 leading-snug">{aviso.mensagem}</p>
              <button
                type="button"
                onClick={() => remover(aviso.id)}
                className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
                aria-label="Fechar aviso"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </AvisosContext.Provider>
  );
}

export const useAvisos = () => useContext(AvisosContext);
