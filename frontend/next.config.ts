import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Todas as páginas rodam no navegador: o build gera HTML/JS estáticos em `out/`,
  // servidos direto pela CDN do Firebase Hosting (sem Cloud Function e sem cold start).
  output: "export",
};

export default nextConfig;
