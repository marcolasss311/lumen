// Tipos e cálculos do resumo de desempenho (usados no início e na página de desempenho).

export interface EstatisticaApi {
  materia: string;
  total_tentativas: string;
  total_acertos?: string;
  media_nota: string;
}

export interface SimuladoResumo {
  id: string;
  nome: string;
  nota_geral: string | number;
  data_realizacao: string;
}

export interface DadosDesempenho {
  estatisticas: EstatisticaApi[];
  historico: SimuladoResumo[];
}

export interface Resumo {
  simulados: number;
  media: number | null;
  melhorMateria: string | null;
  questoes: number;
}

export function resumirDesempenho({ estatisticas, historico }: DadosDesempenho): Resumo {
  const notas = historico.map((h) => Number(h.nota_geral)).filter(Number.isFinite);
  const melhor = [...estatisticas].sort((a, b) => Number(b.media_nota) - Number(a.media_nota))[0];
  return {
    simulados: historico.length,
    media: notas.length ? notas.reduce((soma, n) => soma + n, 0) / notas.length : null,
    melhorMateria: melhor?.materia ?? null,
    questoes: estatisticas.reduce((soma, e) => soma + Number(e.total_tentativas || 0), 0),
  };
}

/** Cores do selo de nota: o texto sempre acompanha a cor (não depende só dela). */
export function estiloNota(nota: number) {
  if (nota >= 70) return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  if (nota >= 50) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
}
