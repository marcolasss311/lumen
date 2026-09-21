"use client";

import Modal from "@/components/Modal";

interface Props {
  aberto: boolean;
  titulo: string;
  descricao: string;
  textoConfirmar: string;
  perigo?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/** Substitui o confirm() do navegador por uma janela acessível e no tema do site. */
export default function DialogoConfirmacao({
  aberto,
  titulo,
  descricao,
  textoConfirmar,
  perigo = false,
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <Modal aberto={aberto} onFechar={onCancelar} titulo={titulo} descricao={descricao}>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          onClick={onCancelar}
          autoFocus
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
            perigo ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}
