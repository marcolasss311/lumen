"use client";

interface Props {
  questao: any;
  index: number;
  modo: 'prova' | 'feedback';
  respostaSelecionada: string | null;
  onResponder: (resp: string) => void;
  feedback?: {
    acertou: boolean;
    nota: number;
    feedback_ia: string;
  };
}

export default function RenderizadorDiscursiva({ questao, index, modo, respostaSelecionada, onResponder, feedback }: Props) {
  const isFeedback = modo === 'feedback';

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-black dark:text-gray-100">
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-semibold text-blue-600 dark:text-blue-400">Questão {index} (Discursiva)</span>
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{questao.origem}</span>
      </div>
      <p className="text-gray-800 dark:text-gray-200 mb-6 font-medium whitespace-pre-wrap">
        {questao.origem && questao.origem !== 'IA' && questao.origem !== 'Feedback' ? `(${questao.origem}) ` : ''}
        {questao.pergunta}
      </p>

      {!isFeedback ? (
        <div className="space-y-4">
          <textarea
            className="w-full h-40 p-4 border dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg focus:outline-none focus:ring focus:ring-blue-200 resize-y text-black dark:text-gray-100"
            placeholder="Digite sua resposta aqui de forma detalhada..."
            value={respostaSelecionada || ""}
            onChange={(e) => onResponder(e.target.value)}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Sua Resposta:</h4>
            <p className="text-gray-800 dark:text-gray-200">{respostaSelecionada || "Nenhuma resposta fornecida."}</p>
          </div>

          {feedback && (
            <div className={`p-5 border rounded-lg ${feedback.nota >= 50 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Feedback da IA</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black">{feedback.nota}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/ 100</span>
                </div>
              </div>
              
              <p className="text-gray-800 dark:text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                {feedback.feedback_ia}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
