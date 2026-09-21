"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

export interface EstatisticaMateria {
  subject: string;
  A: number;
  fullMark: number;
  tentativas: number;
}

interface Props {
  stats: EstatisticaMateria[];
  tipo: "Barra" | "Radar";
}

// Separado da página para o recharts (biblioteca pesada) ser carregado sob demanda.
// Eixos e textos usam currentColor para seguir o tema (claro/escuro) da página.
const TICK = { fill: "currentColor", fontSize: 12 };
const TOOLTIP = {
  contentStyle: {
    background: "var(--background)",
    color: "var(--foreground)",
    borderRadius: 8,
    border: "1px solid #9ca3af",
  },
  itemStyle: { color: "var(--foreground)" },
};

export default function GraficoDesempenho({ stats, tipo }: Props) {
  return (
    <div className="h-full w-full text-gray-700 dark:text-gray-300">
      {tipo === "Barra" ? <Barras stats={stats} /> : <Teia stats={stats} />}
    </div>
  );
}

function Barras({ stats }: { stats: EstatisticaMateria[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={stats} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis type="number" domain={[0, 100]} tick={TICK} stroke="currentColor" />
        <YAxis dataKey="subject" type="category" width={100} tick={TICK} stroke="currentColor" />
        <Tooltip
          formatter={(value) => `${Number(value).toFixed(1)}%`}
          cursor={{ fill: "transparent" }}
          {...TOOLTIP}
        />
        <Bar dataKey="A" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Média de Nota" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Teia({ stats }: { stats: EstatisticaMateria[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={TICK} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={TICK} />
        <Radar name="Média" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
        <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} {...TOOLTIP} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
