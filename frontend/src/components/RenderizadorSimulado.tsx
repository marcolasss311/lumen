"use client";

import { useState } from "react";

export default function RenderizadorSimulado({ questao, index }: { questao: any, index: number }) {
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [respondida, setRespondida] = useState(false);

  const alternativas = typeof questao.alternativas === 'string' 
    ? JSON.parse(questao.alternativas) 
    : questao.alternativas;

  const handleResponder = async () => {
    if (!selecionada) return;
    setRespondida(true);
    
    // Verifica se acertou
    const alternativaEscolhida = alternativas.find((a: any) => a.letra === selecionada);
    const acertou = alternativaEscolhida?.correta || false;

    try {
      const { auth } = await import("@/lib/firebase");
      const token = await auth.currentUser?.getIdToken();
      
      const axios = (await import("axios")).default;
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/simulado/responder`,
        { 
          questao_id: questao.id,
          alternativa_selecionada: selecionada,
          acertou
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error("Erro ao salvar resposta:", error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-black">
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
        <span className="font-semibold text-blue-600">Questão {index}</span>
        <span className="px-2 py-1 bg-gray-100 rounded text-xs">{questao.origem}</span>
      </div>
      
      <p className="text-gray-800 mb-6 font-medium whitespace-pre-wrap">{questao.pergunta}</p>

      <div className="space-y-3">
        {alternativas?.map((alt: any, i: number) => {
          const isSelected = selecionada === alt.letra;
          let bgColor = "bg-gray-50 hover:bg-blue-50 border-gray-200";
          
          if (respondida) {
            if (alt.correta) bgColor = "bg-green-100 border-green-300";
            else if (isSelected) bgColor = "bg-red-100 border-red-300";
            else bgColor = "bg-gray-50 opacity-50";
          } else if (isSelected) {
            bgColor = "bg-blue-50 border-blue-300";
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
                  onChange={() => !respondida && setSelecionada(alt.letra)}
                  className="mt-1 mr-3"
                  disabled={respondida}
                />
                <span className="flex-1">
                  <strong>{alt.letra})</strong> {alt.texto}
                </span>
              </label>

              {/* Feedback Pedagógico Renderizado ao Errar */}
              {respondida && isSelected && !alt.correta && alt.explicacao && (
                <div className="mt-2 ml-8 p-3 text-sm text-red-800 bg-red-50 rounded-md border border-red-200">
                  <strong className="block mb-1 text-red-600">Por que esta está incorreta?</strong>
                  {alt.explicacao}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!respondida && (
        <button 
          onClick={handleResponder}
          disabled={!selecionada}
          className="mt-6 px-6 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Responder
        </button>
      )}
    </div>
  );
}
