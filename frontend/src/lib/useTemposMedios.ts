"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface TempoMedio {
  segundos: number;
  amostras: number;
}

export interface TemposMedios {
  geracao: TempoMedio;
  geracao_material: TempoMedio;
  correcao: TempoMedio;
}

/** Tempo médio real (mediana das últimas execuções) de geração e correção, vindo da API. */
export function useTemposMedios(ativo: boolean): TemposMedios | null {
  const [tempos, setTempos] = useState<TemposMedios | null>(null);

  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;
    api<TemposMedios>("/simulado/tempos")
      .then((t) => {
        if (!cancelado) setTempos(t);
      })
      .catch(() => {
        // Sem a média, a tela de espera usa uma estimativa padrão.
      });
    return () => {
      cancelado = true;
    };
  }, [ativo]);

  return tempos;
}
