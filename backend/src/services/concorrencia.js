/** Executa `fn` sobre os itens com no máximo `limite` promessas ao mesmo tempo. */
async function mapearComLimite(itens, limite, fn) {
  const resultados = new Array(itens.length);
  let proximo = 0;
  const trabalhadores = Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (proximo < itens.length) {
      const i = proximo++;
      resultados[i] = await fn(itens[i], i);
    }
  });
  await Promise.all(trabalhadores);
  return resultados;
}

/** Divide `total` em lotes equilibrados de até `tamanhoMaximo` (ex.: 12 em lotes de 5 → [4, 4, 4]). */
function dividirEmLotes(total, tamanhoMaximo) {
  const quantidadeLotes = Math.max(1, Math.ceil(total / tamanhoMaximo));
  const base = Math.floor(total / quantidadeLotes);
  const resto = total % quantidadeLotes;
  return Array.from({ length: quantidadeLotes }, (_, i) => base + (i < resto ? 1 : 0));
}

module.exports = { mapearComLimite, dividirEmLotes };
