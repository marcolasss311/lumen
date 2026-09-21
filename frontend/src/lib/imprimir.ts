/**
 * Abre a impressão do navegador (onde dá para "Salvar como PDF") usando o nome informado
 * como título, que o Chrome sugere como nome do arquivo.
 *
 * Imprime a própria página: os estilos de impressão escondem a interface (`print:hidden`)
 * e mostram só a prova (`print:block`). Isso é mais leve e confiável do que clonar a prova
 * num iframe e copiar todas as folhas de estilo para ele.
 */
export function imprimir(titulo: string) {
  const anterior = document.title;
  const restaurar = () => {
    document.title = anterior;
    window.removeEventListener("afterprint", restaurar);
  };
  document.title = titulo.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) || anterior;
  window.addEventListener("afterprint", restaurar);
  window.print();
}
