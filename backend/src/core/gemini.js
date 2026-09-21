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

// Modelos que falharam ou ficaram lentos há pouco saem da frente por um tempo, para não gastar
// uma chamada (e segundos do aluno) em cada requisição: modelo removido (404) por 1h;
// sobrecarga, cota ou lentidão por 1 min.
const indisponivelAte = new Map();

function marcarIndisponivel(model, error) {
  const duracao = error?.status === 404 ? 60 * 60_000 : ehTimeout(error) || ehErroTemporario(error) ? 60_000 : 0;
  if (duracao) indisponivelAte.set(model, Date.now() + duracao);
}

function modelosDisponiveis(modelos) {
  const agora = Date.now();
  const livres = modelos.filter((m) => !(indisponivelAte.get(m) > agora));
  // Se todos estiverem marcados, tenta a cadeia inteira mesmo assim.
  return livres.length ? livres : modelos;
}

/** Uma tentativa em um modelo, com a rede de segurança para configuração recusada. */
async function tentarModelo({ model, contents, systemInstruction, schema, sinal, timeoutMs }) {
  let completa = Boolean(schema);
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const inicio = Date.now();
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          ...(completa ? { responseSchema: schema } : {}),
          // Os modelos "flash" gastam milhares de tokens raciocinando antes de responder;
          // para gerar e corrigir questões o raciocínio curto basta e economiza muitos segundos.
          ...(completa && !model.includes("lite") ? { thinkingConfig: { thinkingLevel: "LOW" } } : {}),
          abortSignal: AbortSignal.any([sinal, AbortSignal.timeout(timeoutMs)]),
        },
      });
      const dados = extrairJSON(response.text);
      console.log(`[Lumen IA] ${model} respondeu em ${Date.now() - inicio}ms.`);
      return dados;
    } catch (error) {
      if (sinal.aborted) throw error; // outra tentativa já respondeu
      console.warn(`[Lumen IA] Falha no modelo ${model} após ${Date.now() - inicio}ms:`, error?.message || error);
      // Rede de segurança: se a API recusar o schema ou o nível de raciocínio, repete sem eles.
      // O formato também está no systemInstruction e a resposta é validada em services/questoes.js.
      if (tentativa === 1 && completa && ehRequisicaoRecusada(error)) {
        console.warn(`[Lumen IA] ${model} recusou a configuração; repetindo sem schema.`);
        completa = false;
        continue;
      }
      throw error;
    }
  }
}

/**
 * Gera conteúdo em JSON usando a cadeia de modelos do `perfil` (config.gemini.geracao/correcao).
 *
 * Tentativas escalonadas: começa pelo primeiro modelo; se ele falhar, o próximo começa na hora;
 * se ele só demorar mais que `esperaReservaMs`, o próximo começa EM PARALELO e vale a primeira
 * resposta válida (as demais são canceladas). Sob sobrecarga, o Gemini gratuito às vezes leva
 * 30-40 s só para responder "indisponível": assim o aluno nunca espera por isso.
 */
function gerarJSON({ contents, systemInstruction, schema, perfil }) {
  const { modelos, timeoutPorModeloMs, prazoTotalMs, esperaReservaMs } = perfil;
  const fila = modelosDisponiveis(modelos);
  const geral = new AbortController();
  const emAndamento = new Map(); // modelo -> início da tentativa

  return new Promise((resolve, reject) => {
    let proximo = 0;
    let encerrado = false;
    let ultimoErro = null;
    let timerReserva = null;

    const encerrar = (erro, dados) => {
      if (encerrado) return;
      encerrado = true;
      clearTimeout(timerPrazo);
      clearTimeout(timerReserva);
      // Quem ainda estava rodando há mais que a espera de reserva está lento: sai da frente.
      for (const [model, inicio] of emAndamento) {
        if (Date.now() - inicio >= esperaReservaMs) indisponivelAte.set(model, Date.now() + 60_000);
      }
      geral.abort();
      if (erro) reject(erro);
      else resolve(dados);
    };

    const timerPrazo = setTimeout(
      () => encerrar(new ErroIA("A IA demorou demais para responder.", { status: 503, cause: ultimoErro })),
      prazoTotalMs,
    );

    const iniciarProximo = () => {
      clearTimeout(timerReserva);
      if (encerrado) return;
      if (proximo >= fila.length) {
        if (emAndamento.size === 0) {
          const temporario = ehTimeout(ultimoErro) || ehErroTemporario(ultimoErro);
          encerrar(
            new ErroIA(
              temporario ? "Serviço de IA com alta demanda." : "A IA não conseguiu processar a solicitação.",
              { status: temporario ? 503 : 502, cause: ultimoErro },
            ),
          );
        }
        return;
      }

      const model = fila[proximo++];
      emAndamento.set(model, Date.now());
      timerReserva = setTimeout(iniciarProximo, esperaReservaMs);

      tentarModelo({ model, contents, systemInstruction, schema, sinal: geral.signal, timeoutMs: timeoutPorModeloMs })
        .then((dados) => {
          emAndamento.delete(model);
          encerrar(null, dados);
        })
        .catch((error) => {
          emAndamento.delete(model);
          if (encerrado) return;
          ultimoErro = error;
          marcarIndisponivel(model, error);
          iniciarProximo(); // falhou: não espera a reserva, chama o próximo já
        });
    };

    iniciarProximo();
  });
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
