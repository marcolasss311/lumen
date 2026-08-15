import React from 'react';

interface Props {
  questoes: any[];
  alunoNome?: string;
  materia?: string;
}

export const SimuladoParaImprimir = React.forwardRef<HTMLDivElement, Props>(({ questoes, alunoNome, materia }, ref) => {
  return (
    <div ref={ref} className="p-10 bg-white text-black font-serif hidden print:block">
      <div className="text-center border-b-2 border-black pb-4 mb-8">
        <h1 className="text-3xl font-bold uppercase mb-2">Simulado Lumen</h1>
        <p className="text-lg">Aluno(a): {alunoNome || "____________________________________________"}</p>
        {materia && <p className="text-lg">Matéria(s): {materia}</p>}
        <p className="text-lg">Data: ____/____/________</p>
      </div>

      <div className="space-y-8">
        {questoes.map((q, idx) => (
          <div key={idx} className="break-inside-avoid">
            <h3 className="font-bold text-lg mb-2">{idx + 1}. ({q.materia} - {q.topico})</h3>
            <p className="mb-4 whitespace-pre-wrap">{q.pergunta}</p>

            {q.tipo_questao === 'Aberta' ? (
              <div className="mt-4 border-l-2 border-gray-300 pl-4 h-32">
                <span className="text-gray-400 italic">Resposta:</span>
              </div>
            ) : (
              q.alternativas && (
                <div className="space-y-2 mt-4 ml-4">
                  {(typeof q.alternativas === 'string' ? JSON.parse(q.alternativas) : q.alternativas).map((alt: any) => (
                    <div key={alt.letra} className="flex gap-3">
                      <div className="w-6 h-6 border border-black rounded-full flex items-center justify-center font-bold shrink-0">
                        {alt.letra}
                      </div>
                      <p>{alt.texto}</p>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

SimuladoParaImprimir.displayName = "SimuladoParaImprimir";
