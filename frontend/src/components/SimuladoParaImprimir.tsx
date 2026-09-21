import TextoComTabela from "./TextoComTabela";
import type { Alternativa, Questao } from "@/lib/tipos";

interface Props {
  questoes: Questao[];
  alunoNome?: string;
  materia?: string;
}

const lerAlternativas = (q: Questao): Alternativa[] | null =>
  typeof q.alternativas === "string" ? JSON.parse(q.alternativas) : q.alternativas;

/**
 * Versão da prova para impressão/PDF. Fica oculta na tela (`hidden`) e só aparece na
 * impressão (`print:block`), enquanto o resto da interface some (`print:hidden`).
 * Se o simulado já foi corrigido, inclui uma folha de gabarito no final.
 */
export function SimuladoParaImprimir({ questoes, alunoNome, materia }: Props) {
  const gabarito = questoes
    .map((q, i) => {
      const correta = lerAlternativas(q)?.find((a) => a.correta);
      return correta ? { numero: i + 1, letra: correta.letra } : null;
    })
    .filter((g): g is { numero: number; letra: string } => g !== null);

  return (
    <div className="hidden print:block bg-white text-black font-serif text-[12pt] leading-snug">
      <header className="text-center border-b-2 border-black pb-4 mb-8">
        <h1 className="text-2xl font-bold uppercase mb-2">Simulado Lumen</h1>
        {materia && <p className="text-lg font-semibold">{materia}</p>}
        <p className="mt-2">
          Aluno(a): {alunoNome || "____________________________________________"}
        </p>
        <p>Data: ____/____/________</p>
      </header>

      <ol className="space-y-8">
        {questoes.map((q, idx) => {
          const alternativas = lerAlternativas(q);
          return (
            <li key={q.id || idx} className="break-inside-avoid">
              <p className="font-bold mb-2">
                {idx + 1}.{" "}
                <span className="font-normal">
                  ({q.materia} – {q.topico})
                </span>
              </p>
              <div className="mb-3">
                <TextoComTabela texto={q.pergunta} />
              </div>

              {q.tipo_questao === "Aberta" ? (
                <div className="mt-3 space-y-6" aria-label="Espaço para a resposta">
                  {[0, 1, 2, 3, 4].map((linha) => (
                    <div key={linha} className="border-b border-gray-400" />
                  ))}
                </div>
              ) : (
                alternativas && (
                  <ul className="space-y-1.5 mt-3 ml-2">
                    {alternativas.map((alt) => (
                      <li key={alt.letra} className="flex gap-3">
                        <span className="w-6 h-6 border border-black rounded-full flex items-center justify-center font-bold shrink-0">
                          {alt.letra}
                        </span>
                        <span>{alt.texto}</span>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </li>
          );
        })}
      </ol>

      {gabarito.length > 0 && (
        <section className="break-before-page pt-2">
          <h2 className="text-xl font-bold uppercase border-b-2 border-black pb-2 mb-4">
            Gabarito
          </h2>
          <ul className="grid grid-cols-5 gap-x-6 gap-y-2">
            {gabarito.map((g) => (
              <li key={g.numero}>
                <strong>{g.numero}.</strong> {g.letra}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
