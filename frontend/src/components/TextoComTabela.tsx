"use client";

import React from "react";

interface Props {
  texto: string;
  className?: string;
}

/**
 * A IA às vezes manda a tabela Markdown numa linha só, com as linhas separadas por "||"
 * (ex.: "Veja: | A | B || 1 | 2 |"). Quebra essas tabelas em uma linha por registro.
 */
function separarTabelasEmLinha(texto: string): string[] {
  return texto.split("\n").flatMap((linha) => {
    const barras = (linha.match(/\|/g) || []).length;
    if (!linha.includes("||") || barras < 6) return [linha];
    const inicio = linha.indexOf("|");
    const antes = linha.slice(0, inicio).trim();
    const registros = linha
      .slice(inicio)
      .split(/\|\s*\|/)
      .map((r) => r.replace(/^\|/, "").replace(/\|$/, "").trim())
      .filter(Boolean)
      .map((r) => `| ${r} |`);
    return antes ? [antes, ...registros] : registros;
  });
}

const ehSeparador = (linha: string) => /^\|?[\s:|-]+\|?$/.test(linha) && linha.includes("-");

/**
 * Componente que renderiza texto comum com suporte nativo a tabelas em Markdown (| col1 | col2 |)
 * e formatações de negrito (**texto**), com suporte total a Modo Escuro e Impressão.
 */
export default function TextoComTabela({ texto, className = "" }: Props) {
  if (!texto) return null;

  // Função para formatar negrito (**texto**) dentro de qualquer texto ou célula
  const formatarNegrito = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const lines = separarTabelasEmLinha(texto);
  const elements: React.ReactNode[] = [];

  let currentTextLines: string[] = [];
  let currentTableLines: string[] = [];
  let inTable = false;

  const flushText = (keyPrefix: number) => {
    if (currentTextLines.length > 0) {
      const block = currentTextLines.join("\n");
      elements.push(
        <span
          key={`text-${keyPrefix}`}
          className="whitespace-pre-wrap leading-relaxed"
        >
          {formatarNegrito(block)}
        </span>,
      );
      currentTextLines = [];
    }
  };

  const flushTable = (keyPrefix: number) => {
    if (currentTableLines.length >= 2) {
      const headerLine = currentTableLines[0];
      // A linha 1 costuma ser o separador |---|---|, mas nem sempre a IA o inclui.
      const dataLines = currentTableLines.slice(ehSeparador(currentTableLines[1]) ? 2 : 1);

      const parseCells = (line: string) => {
        return line
          .split("|")
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1); // remove bordas vazias
      };

      const headers = parseCells(headerLine);
      const rows = dataLines.map(parseCells).filter((row) => row.length > 0);

      elements.push(
        <div
          key={`table-${keyPrefix}`}
          className="overflow-x-auto print:overflow-visible my-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800/90"
        >
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm text-left">
            <thead className="bg-gray-100 dark:bg-gray-900 font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="px-4 py-3 border-r last:border-r-0 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {formatarNegrito(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
              {rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={
                    rIdx % 2 === 0
                      ? "bg-white dark:bg-gray-800/90 hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors"
                      : "bg-gray-50/70 dark:bg-gray-900/40 hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors"
                  }
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-4 py-2.5 border-r last:border-r-0 border-gray-200 dark:border-gray-700"
                    >
                      {formatarNegrito(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (currentTableLines.length > 0) {
      currentTextLines.push(...currentTableLines);
      flushText(keyPrefix);
    }
    currentTableLines = [];
    inTable = false;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const isTableLine =
      trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|");

    if (isTableLine) {
      if (!inTable) {
        flushText(idx);
        inTable = true;
      }
      currentTableLines.push(trimmed);
    } else {
      if (inTable) {
        flushTable(idx);
      }
      currentTextLines.push(line);
    }
  });

  if (inTable) {
    flushTable(lines.length);
  } else {
    flushText(lines.length);
  }

  return <div className={className}>{elements}</div>;
}
