class ErroRequisicao extends Error {
  constructor(status, message, codigo) {
    super(message);
    this.name = "ErroRequisicao";
    this.status = status;
    this.codigo = codigo;
  }
}

const REGEX_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ehUuid = (valor) => typeof valor === "string" && REGEX_UUID.test(valor);

function exigirUuid(valor, campo = "id") {
  if (!ehUuid(valor)) throw new ErroRequisicao(400, `Parâmetro "${campo}" inválido.`);
  return valor;
}

/** Texto aparado e cortado em `max` caracteres. Valores que não são string viram `padrao`. */
function texto(valor, max, padrao = "") {
  if (typeof valor !== "string") return padrao;
  const limpo = valor.trim().slice(0, max);
  return limpo || padrao;
}

/** Aceita "a, b, c" ou ["a", "b"] e devolve itens únicos, aparados e limitados. */
function lista(valor, maxItens, maxCaracteres) {
  const itens = typeof valor === "string" ? valor.split(",") : Array.isArray(valor) ? valor : [];
  const vistos = new Set();
  const resultado = [];
  for (const item of itens) {
    const limpo = texto(item, maxCaracteres);
    const chave = limpo.toLowerCase();
    if (!limpo || vistos.has(chave)) continue;
    vistos.add(chave);
    resultado.push(limpo);
    if (resultado.length >= maxItens) break;
  }
  return resultado;
}

/** Valor de uma lista fechada. Ausente => padrão; presente mas inválido => 400. */
function umDe(valor, opcoes, padrao, campo) {
  if (valor === undefined || valor === null || valor === "") return padrao;
  if (!opcoes.includes(valor)) {
    throw new ErroRequisicao(400, `Valor inválido para "${campo}".`);
  }
  return valor;
}

function inteiroEntre(valor, min, max, padrao) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return padrao;
  return Math.min(max, Math.max(min, Math.round(n)));
}

module.exports = {
  ErroRequisicao,
  ehUuid,
  exigirUuid,
  texto,
  lista,
  umDe,
  inteiroEntre,
};
