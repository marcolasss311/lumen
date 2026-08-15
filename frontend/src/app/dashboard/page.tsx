"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import RenderizadorSimulado from "@/components/RenderizadorSimulado";
import RenderizadorDiscursiva from "@/components/RenderizadorDiscursiva";
import axios from "axios";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [anoEscolar, setAnoEscolar] = useState("8º Ano");
  const [materia, setMateria] = useState("Matemática");
  const [topico, setTopico] = useState("Equações do 1º Grau");
  const [tipoQuestao, setTipoQuestao] = useState("Fechada");
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const gerarSimulado = async () => {
    if (!user) return;
    setGerando(true);
    try {
      const token = await user.getIdToken();
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/simulado/gerar`,
        { ano_escolar: anoEscolar, materia, topico, quantidade: 3, tipo_questao: tipoQuestao },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setQuestoes(res.data.questoes);
    } catch (error) {
      console.error("Erro ao gerar simulado", error);
      alert("Erro ao gerar simulado. O backend está rodando?");
    } finally {
      setGerando(false);
    }
  };

  if (loading) return <div className="p-8 text-black">Carregando...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-black">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-blue-600">Lumen Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Olá, {user.email}</span>
          <button onClick={() => auth.signOut()} className="text-sm text-red-500 hover:underline">Sair</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-semibold text-lg border-b pb-2">Configurar Bateria</h2>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nível Escolar</label>
            <select className="w-full border rounded p-2 text-black" value={anoEscolar} onChange={e => setAnoEscolar(e.target.value)}>
              <option>8º Ano</option>
              <option>9º Ano</option>
              <option>1º Ano EM</option>
              <option>Pré-Vestibular/ENEM</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Matéria</label>
            <select className="w-full border rounded p-2 text-black" value={materia} onChange={e => setMateria(e.target.value)}>
              <option>Matemática</option>
              <option>Português</option>
              <option>História</option>
              <option>Física</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Tópico</label>
            <input 
              type="text" 
              className="w-full border rounded p-2 text-black" 
              value={topico} 
              onChange={e => setTopico(e.target.value)} 
              placeholder="Ex: Frações..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Tipo de Questão</label>
            <select className="w-full border rounded p-2 text-black" value={tipoQuestao} onChange={e => setTipoQuestao(e.target.value)}>
              <option value="Fechada">Múltipla Escolha</option>
              <option value="Aberta">Discursiva (Aberta)</option>
            </select>
          </div>

          <button 
            onClick={gerarSimulado}
            disabled={gerando}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {gerando ? "Gerando IA..." : "Gerar Simulado"}
          </button>
        </div>

        <div className="md:col-span-3">
          {questoes.length > 0 ? (
            <div className="space-y-6">
              {questoes.map((q, idx) => (
                q.tipo_questao === 'Aberta' ? (
                  <RenderizadorDiscursiva key={idx} questao={q} index={idx + 1} />
                ) : (
                  <RenderizadorSimulado key={idx} questao={q} index={idx + 1} />
                )
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-100 text-gray-500">
              Configure os filtros na lateral e clique em "Gerar Simulado" para começar seus estudos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
