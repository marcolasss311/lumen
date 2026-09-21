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
export default function GraficoDesempenho({ stats, tipo }: Props) {
  if (tipo === "Barra") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={stats}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis type="number" domain={[0, 100]} />
          <YAxis
            dataKey="subject"
            type="category"
            width={100}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => `${Number(value).toFixed(1)}%`}
            cursor={{ fill: "transparent" }}
          />
          <Bar
            dataKey="A"
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
            name="Média de Nota"
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} />
        <Radar
          name="Média"
          dataKey="A"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.5}
        />
        <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
