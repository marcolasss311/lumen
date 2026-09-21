const { GoogleGenAI, createPartFromUri } = require("@google/genai");
const config = require("../config");

const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class ErroIA extends Error {
  constructor(message, { status = 502, cause } = {}) {
    super(message, { cause });
    this.name = "ErroIA";
    this.status = status;
  }
}

function ehTimeout(error) {
  return error?.name === "TimeoutError" || error?.name === "AbortError";
}

function ehErroTemporario(error) {
  const msg = String(error?.message || "");
  return (
    error?.status === 429 ||
    error?.status === 500 ||
    error?.status === 503 ||
    msg.includes("high demand") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("quota") ||
    msg.includes("Resource has been exhausted")
  );
}

// 400 que não seja problema de chave de API (ex.: schema não aceito pelo modelo).
function ehRequisicaoRecusada(error) {
  return error?.status === 400 && !/API.?key/i.test(String(error?.message || ""));
}

function extrairJSON(texto) {
  let limpo = String(texto || "").trim();
  if (limpo.startsWith("```")) {
    limpo = limpo
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
  }
  return JSON.parse(limpo);
}

// Modelos que falharam há pouco ficam de fora por um tempo, para não gastar uma chamada
// (e segundos do aluno) em cada requisição: modelo removido (404) por 1h; sobrecarga,
// cota ou lentidão por 1 min.
const indisponivelAte = new Map();

function marcarIndisponivel(model, error) {
  const duracao = error?.status === 404 ? 60 * 60_000 : ehTimeout(error) || ehErroTemporario(error) ? 60_000 : 0;
  if (duracao) indisponivelAte.set(model, Date.now() + duracao);
}

function modelosDisponiveis() {
  const agora = Date.now();
  const livres = config.gemini.modelos.filter((m) => !(indisponivelAte.get(m) > agora));
  // Se todos estiverem marcados, tenta a cadeia inteira mesmo assim.
  return livres.length ? livres : config.gemini.modelos;
}

/**
 * Gera conteúdo em JSON com a cadeia de modelos reserva.
 * - Cada modelo é tentado uma vez: um modelo sobrecarregado costuma continuar assim,
 *   então é mais rápido passar para o próximo do que esperar e repetir.
 * - `schema` força a estrutura da resposta (responseSchema do Gemini).
 * - `limites.timeoutPorModeloMs` limita cada tentativa e `limites.prazoTotalMs` a cadeia inteira,
 *   para a requisição do aluno não ficar pendurada enquanto os modelos reserva são tentados.
 */
async function gerarJSON({ contents, systemInstruction, schema, limites }) {
  const { timeoutPorModeloMs, prazoTotalMs } = limites;
  const prazoFinal = Date.now() + prazoTotalMs;
  let ultimoErro = null;
  let usarSchema = Boolean(schema);

  for (const model of modelosDisponiveis()) {
    // A 2ª tentativa no mesmo modelo só acontece sem o schema (ver rede de segurança abaixo).
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      const restante = prazoFinal - Date.now();
      if (restante < 5_000) {
        throw new ErroIA("A IA demorou demais para responder.", { status: 503, cause: ultimoErro });
      }

      try {
        const inicio = Date.now();
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            ...(usarSchema ? { responseSchema: schema } : {}),
            abortSignal: AbortSignal.timeout(Math.min(timeoutPorModeloMs, restante)),
          },
        });
        const dados = extrairJSON(response.text);
        console.log(`[Lumen IA] ${model} respondeu em ${Date.now() - inicio}ms.`);
        return dados;
      } catch (error) {
        ultimoErro = error;
        console.warn(
          `[Lumen IA] Falha no modelo ${model} (tentativa ${tentativa}):`,
          error?.message || error,
        );
        // Rede de segurança: se a API recusar o schema, repete sem ele. O formato também
        // está descrito no systemInstruction e a resposta é validada em services/questoes.js.
        if (tentativa === 1 && usarSchema && ehRequisicaoRecusada(error)) {
          console.warn("[Lumen IA] Requisição recusada com responseSchema; repetindo sem schema.");
          usarSchema = false;
          continue;
        }
        marcarIndisponivel(model, error);
        break;
      }
    }
  }

  const temporario = ehTimeout(ultimoErro) || ehErroTemporario(ultimoErro);
  throw new ErroIA(
    temporario ? "Serviço de IA com alta demanda." : "A IA não conseguiu processar a solicitação.",
    { status: temporario ? 503 : 502, cause: ultimoErro },
  );
}

/**
 * Envia um arquivo para a Files API do Gemini (usado para materiais grandes demais para
 * irem inline). Retorna a `part` para o prompt e o `name` para remover depois.
 */
async function enviarArquivoTemporario({ buffer, mimeType, nome }) {
  let arquivo = await ai.files.upload({
    file: new Blob([buffer], { type: mimeType }),
    config: {
      mimeType,
      displayName: String(nome || "material").replace(/[^\w.\- ]/g, "_").slice(0, 100),
    },
  });

  for (let i = 0; arquivo.state === "PROCESSING" && i < 30; i++) {
    await sleep(1_000);
    arquivo = await ai.files.get({ name: arquivo.name });
  }
  if (arquivo.state !== "ACTIVE") {
    await removerArquivoTemporario(arquivo.name);
    throw new ErroIA(`Não foi possível processar o arquivo "${nome}".`, { status: 422 });
  }

  return { part: createPartFromUri(arquivo.uri, arquivo.mimeType), name: arquivo.name };
}

async function removerArquivoTemporario(name) {
  if (!name) return;
  try {
    await ai.files.delete({ name });
  } catch (err) {
    // O Gemini apaga sozinho após 48h; falhar aqui não deve quebrar a requisição.
    console.warn(`[Lumen IA] Não foi possível remover o arquivo temporário ${name}:`, err.message);
  }
}

module.exports = {
  gerarJSON,
  enviarArquivoTemporario,
  removerArquivoTemporario,
  ErroIA,
};
