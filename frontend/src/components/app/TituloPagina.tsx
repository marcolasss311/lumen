import type { LucideIcon } from "lucide-react";

interface Props {
  icone: LucideIcon;
  rotulo: string;
  titulo: string;
  subtitulo?: React.ReactNode;
  acoes?: React.ReactNode;
  cor?: "azul" | "verde";
}

/** Título de página no mesmo estilo das telas de login/cadastro: rótulo com ícone, título grande e subtítulo. */
export default function TituloPagina({
  icone: Icone,
  rotulo,
  titulo,
  subtitulo,
  acoes,
  cor = "azul",
}: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6 md:mb-8">
      <div className="min-w-0">
        <p
          className={`inline-flex items-center gap-1.5 text-sm font-semibold mb-2 ${
            cor === "verde"
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-blue-700 dark:text-blue-400"
          }`}
        >
          <Icone size={16} aria-hidden="true" /> {rotulo}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white break-words">
          {titulo}
        </h1>
        {subtitulo && <p className="mt-1.5 text-gray-600 dark:text-gray-300">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}
