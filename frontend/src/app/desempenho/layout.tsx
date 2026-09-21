import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meu desempenho" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
