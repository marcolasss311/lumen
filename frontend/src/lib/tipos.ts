export type TipoQuestao = "Fechada" | "Aberta";

export interface Alternativa {
  letra: string;
  texto: string;
  // Só chegam depois que o simulado é corrigido.
  correta?: boolean;
  explicacao?: string | null;
}

export interface Questao {
  id: string;
  materia: string;
  topico: string;
  tipo_questao: TipoQuestao;
  pergunta: string;
  origem: string;
  alternativas: Alternativa[] | null;
  gabarito?: string | null;
}

export interface ResultadoQuestao {
  questao_id: string;
  acertou: boolean;
  nota: number;
  resposta_aluno: string | null;
  feedback_ia: string | null;
}

export interface SimuladoGerado {
  simulado_id: string;
  nome: string;
  questoes: Questao[];
}

export interface SimuladoCorrigido {
  simulado_id: string;
  nota_geral: number;
  resultados: ResultadoQuestao[];
  questoes: Questao[];
}

/** Estado do simulado em andamento salvo no navegador. */
export interface SimuladoSalvo {
  simuladoId: string | null;
  questoes: Questao[];
  respostas: Record<string, string>;
  resultados: ResultadoQuestao[] | null;
  paginaAtual: number;
  simuladoFinalizado: boolean;
  notaGeral: number | null;
  nomeSimuladoCustom: string | null;
}

export const CHAVE_SIMULADO_SALVO = "@lumen:simuladoAtivo";
