"use client";

interface Props {
  questao: any;
  index: number;
  modo: 'prova' | 'feedback';
  respostaSelecionada: string | null;
  onResponder: (resp: string) => void;
  feedback?: any;
}

export default function RenderizadorSimulado({ questao, index, modo, respostaSelecionada, onResponder, feedback }: Props) {
  const alternativas = typeof questao.alternativas === 'string' 
    ? JSON.parse(questao.alternativas) 
    : questao.alternativas;

  const isFeedback = modo === 'feedback';

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-black dark:text-gray-100">
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-semibold text-blue-600 dark:text-blue-400">Questão {index}</span>
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">{questao.origem}</span>
      </div>
      <p className="text-gray-800 dark:text-gray-200 mb-6 font-medium whitespace-pre-wrap">
        {questao.origem && questao.origem !== 'IA' && questao.origem !== 'Feedback' ? `(${questao.origem}) ` : ''}
        {questao.pergunta}
      </p>

      <div className="space-y-3">
        {alternativas?.map((alt: any, i: number) => {
          const isSelected = respostaSelecionada === alt.letra;
          let bgColor = "bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600";
          
          if (isFeedback) {
            if (alt.correta) bgColor = "bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700";
            else if (isSelected) bgColor = "bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700";
            else bgColor = "bg-gray-50 dark:bg-gray-800 opacity-50";
          } else if (isSelected) {
            bgColor = "bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700";
          }

          return (
            <div key={i} className="flex flex-col">
              <label 
                className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${bgColor}`}
              >
                <input 
                  type="radio" 
                  name={`questao-${questao.id}`} 
                  value={alt.letra}
                  checked={isSelected}
                  onChange={() => !isFeedback && onResponder(alt.letra)}
                  className="mt-1 mr-3"
                  disabled={isFeedback}
                />
                <span className="flex-1">
                  <strong>{alt.letra})</strong> {alt.texto}
                </span>
              </label>

              {/* Feedback Pedagógico Renderizado ao Errar */}
              {isFeedback && isSelected && !alt.correta && alt.explicacao && (
                <div className="mt-2 ml-8 p-3 text-sm text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800/30">
                  <strong className="block mb-1 text-red-600 dark:text-red-400">Por que esta está incorreta?</strong>
                  {alt.explicacao}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
