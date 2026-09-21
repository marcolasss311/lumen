"use client";

import { Logo } from "@/components/app/CabecalhoApp";

export default function LoadingScreen({ text = "Carregando..." }: { text?: string }) {
  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center" aria-hidden="true">
          <div className="w-16 h-16 rounded-full border-4 border-blue-600/15 border-t-blue-600 dark:border-blue-400/20 dark:border-t-blue-400 animate-spin" />
          <span className="absolute">
            <Logo />
          </span>
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{text}</p>
      </div>
    </div>
  );
}
