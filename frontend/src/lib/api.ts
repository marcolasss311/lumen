import { auth } from "@/lib/firebase";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public codigo?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Opcoes {
  method?: "GET" | "POST";
  /** Objeto (enviado como JSON) ou FormData (multipart, para arquivos). */
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Chama a API do backend com o token do usuário logado.
 * Lança ApiError com a mensagem amigável que o servidor devolveu.
 */
export async function api<T>(caminho: string, { method = "GET", body, timeoutMs = 60_000 }: Opcoes = {}): Promise<T> {
  const usuario = auth.currentUser;
  if (!usuario) throw new ApiError(401, "Sua sessão expirou. Faça login novamente.");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${await usuario.getIdToken()}`,
  };
  let corpo: BodyInit | undefined;
  if (body instanceof FormData) {
    corpo = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    corpo = JSON.stringify(body);
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method,
      headers,
      body: corpo,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timeout = err instanceof DOMException && err.name === "TimeoutError";
    throw new ApiError(
      0,
      timeout
        ? "O servidor demorou demais para responder. Tente novamente."
        : "Não foi possível conectar ao servidor. Verifique sua conexão.",
    );
  }

  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new ApiError(
      resposta.status,
      dados?.error || "Ocorreu um erro inesperado. Tente novamente.",
      dados?.codigo,
    );
  }
  return dados as T;
}

export function mensagemDeErro(err: unknown, padrao: string): string {
  return err instanceof ApiError ? err.message : padrao;
}
