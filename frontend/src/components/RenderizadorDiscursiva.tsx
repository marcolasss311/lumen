"use client";

import { useState } from "react";
import axios from "axios";
import { auth } from "@/lib/firebase";

export default function RenderizadorDiscursiva({ questao, index }: { questao: any, index: number }) {
  const [respostaAluno, setRespostaAluno] = useState("");
  const [respondida, setRespondida] = useState(false);
  const [corrigindo, setCorrigindo] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const handleResponder = async () => {
    if (!respostaAluno.trim()) return;
    setCorrigindo(true);
    
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/correcao/discursiva`,
        { 
          questao_id: questao.id,
          resposta_aluno: respostaAluno
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setResultado(res.data.correcao);
      setRespondida(true);
    } catch (error) {
      console.error("Erro ao corrigir questão:", error);
      alert("Erro ao conectar com a IA de correção.");
    } finally {
      setCorrigindo(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-black">
      <div className="flex justify-between items-center mb-4 text-sm text-gray-500">
        <span className="font-semibold text-blue-600">Questão {index} (Discursiva)</span>
        <span className="px-2 py-1 bg-gray-100 rounded text-xs">{questao.origem}</span>
      </div>
      
      <p className="text-gray-800 mb-6 font-medium whitespace-pre-wrap">{questao.pergunta}</p>

      {!respondida ? (
        <div className="space-y-4">
          <textarea
            className="w-full h-40 p-4 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200 resize-y text-black"
            placeholder="Digite sua resposta aqui de forma detalhada..."
            value={respostaAluno}
            onChange={(e) => setRespostaAluno(e.target.value)}
            disabled={corrigindo}
          />
          <button 
            onClick={handleResponder}
            disabled={corrigindo || !respostaAluno.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {corrigindo ? "A IA está corrigindo..." : "Enviar Resposta e Corrigir"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 bg-gray-50 border rounded-lg">
            <h4 className="text-sm font-semibold text-gray-600 mb-2">Sua Resposta:</h4>
            <p className="text-gray-800">{respostaAluno}</p>
          </div>

          <div className={`p-5 border rounded-lg ${resultado?.nota >= 70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Feedback da IA</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">{resultado?.nota}</span>
                <span className="text-sm text-gray-500">/ 100</span>
              </div>
            </div>
            
            <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
              {resultado?.feedback_detalhado}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
