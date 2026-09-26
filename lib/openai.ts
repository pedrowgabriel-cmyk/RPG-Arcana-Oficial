// Toda a IA de texto do app roda no GPT (OpenAI) — decisão do projeto.
// Chamada direta por fetch (sem SDK), como na forja e na história do jogador.

export class ErroIA extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Modelo padrão por uso; sobrescreva por env sem mexer no código. */
export const MODELOS = {
  /** Geração criativa estruturada (propostas de campanha, templates). */
  criativo: process.env.OPENAI_CAMPAIGN_MODEL ?? "gpt-5",
  /** Conversa rápida do assistente do Juiz durante a partida. */
  conversa: process.env.OPENAI_CHAT_MODEL ?? "gpt-5-mini",
} as const;

type Mensagem = { role: "system" | "user" | "assistant"; content: string };

/**
 * Uma chamada ao chat completions. Com `schema`, a resposta vem em JSON
 * estrito (todas as props required + additionalProperties:false no schema).
 */
export async function chatGPT(p: {
  model?: string;
  messages: Mensagem[];
  schema?: { name: string; schema: unknown };
  maxTokens?: number;
  esforco?: "minimal" | "low" | "medium" | "high";
  timeoutMs?: number;
}): Promise<{ texto: string; tokens: number; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new ErroIA(500, "OPENAI_API_KEY não configurada no servidor");
  const model = p.model ?? MODELOS.criativo;
  const raciocinio = model.startsWith("gpt-5") || model.startsWith("o");

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: p.messages,
        ...(p.schema
          ? { response_format: { type: "json_schema", json_schema: { name: p.schema.name, strict: true, schema: p.schema.schema } } }
          : {}),
        // Modelos de raciocínio gastam orçamento pensando antes de escrever.
        max_completion_tokens: p.maxTokens ?? 16000,
        ...(raciocinio ? { reasoning_effort: p.esforco ?? "low" } : {}),
      }),
      signal: AbortSignal.timeout(p.timeoutMs ?? 170000),
    });
  } catch (err) {
    if ((err as Error)?.name === "TimeoutError") throw new ErroIA(504, "A IA demorou demais. Tente de novo.");
    throw new ErroIA(502, `Falha de rede ao chamar a IA: ${(err as Error)?.message ?? err}`);
  }

  const json = (await res.json().catch(() => ({}))) as {
    choices?: { finish_reason?: string; message?: { content?: string; refusal?: string } }[];
    usage?: { total_tokens?: number };
    error?: { message?: string };
  };
  if (!res.ok) throw new ErroIA(res.status, json.error?.message ?? `HTTP ${res.status}`);
  const choice = json.choices?.[0];
  if (choice?.finish_reason === "length") throw new ErroIA(502, "Resposta cortada no limite de tamanho");
  const texto = choice?.message?.content ?? "";
  if (!texto) throw new ErroIA(502, choice?.message?.refusal ?? "A IA voltou sem resposta");
  return { texto, tokens: json.usage?.total_tokens ?? 0, model };
}

/** Mensagem de erro legível para a tela + status HTTP. */
export function respostaDeErroIA(error: unknown): { error: string; status: number } {
  if (error instanceof ErroIA) {
    if (error.status === 429) return { error: "Limite de uso da IA atingido. Tente de novo em 1 minuto.", status: 429 };
    if (error.status === 504) return { error: error.message, status: 504 };
    return { error: `Erro na chamada à IA (${error.status}): ${error.message.slice(0, 240)}`, status: 502 };
  }
  return { error: "A IA respondeu num formato inesperado. Tente de novo.", status: 500 };
}
