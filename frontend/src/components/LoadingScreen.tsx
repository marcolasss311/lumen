"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export default function LoadingScreen({
  text = "Carregando...",
}: {
  text?: string;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center" aria-hidden="true">
          <div className="w-12 h-12 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <Sparkles
            className="absolute text-blue-600 dark:text-blue-400 animate-pulse"
            size={18}
          />
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 tracking-wide">
          {text}
        </p>
      </div>
    </div>
  );
}
