import { MODELOS, chatGPT, respostaDeErroIA } from "@/lib/openai";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

const MODEL = MODELOS.conversa;
const MAX_MESSAGE_CHARS = 2000;

const SYSTEM_PROMPT = `Você é um assistente de RPG de mesa para o Mestre da partida.
Você tem acesso ao estado atual da sessão.
Seja conciso, criativo e útil. Respostas máximo de 3 parágrafos.
Foque em sugestões práticas que o Mestre pode usar imediatamente.
Responda sempre em português.`;

type ContextPayload = {
  session_title: string;
  current_act: string;
  characters: { name: string; hp: number; max_hp: number; conditions: string[] }[];
  last_events: string[];
  story_synopsis: string;
};

type Body = {
  session_id: string;
  message: string;
  context: ContextPayload;
  history: { role: "user" | "assistant"; content: string }[];
};

function assembleContext(c: ContextPayload, message: string): string {
  const charsLine = c.characters
    .map(
      (ch) =>
        `${ch.name}: ${ch.hp}/${ch.max_hp} HP${ch.conditions.length ? ` [${ch.conditions.join(", ")}]` : ""}`
    )
    .join("\n");
  const eventsLine = c.last_events.slice(0, 5).map((e) => `- ${e}`).join("\n");

  return `[CONTEXTO]
Sessão: ${c.session_title}
Ato atual: ${c.current_act || "(sem ato definido)"}
Sinopse: ${c.story_synopsis || "(sem sinopse)"}

Personagens:
${charsLine || "(nenhum)"}

Últimos eventos:
${eventsLine || "(nenhum)"}

[PERGUNTA]
${message}`;
}

export async function POST(request: Request) {
  const profileResult = await getProfile();
  if (!profileResult) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (
    profileResult.profile.role !== "gm" &&
    profileResult.profile.role !== "admin"
  ) {
    return NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body?.message || typeof body.message !== "string") {
    return NextResponse.json({ error: "Mensagem obrigatória" }, { status: 400 });
  }
  if (body.message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: `Mensagem muito longa (máx ${MAX_MESSAGE_CHARS} caracteres)` },
      { status: 400 }
    );
  }
  if (!body.session_id || typeof body.session_id !== "string") {
    return NextResponse.json({ error: "session_id obrigatório" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, gm_id")
    .eq("id", body.session_id)
    .maybeSingle<{ id: string; gm_id: string }>();
  if (!session) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
  }
  if (
    session.gm_id !== profileResult.user.id &&
    profileResult.profile.role !== "admin"
  ) {
    return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
  }

  const admin = createAdminClient();
  const userMessage = assembleContext(body.context, body.message);

  const { data: aiRequest } = await admin
    .from("ai_requests")
    .insert({
      session_id: body.session_id,
      requested_by: profileResult.user.id,
      type: "gm_suggestion",
      prompt: userMessage,
      model: MODEL,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();

  try {
    const { texto: text, tokens: tokensUsed } = await chatGPT({
      model: MODEL,
      maxTokens: 4000,
      esforco: "minimal",
      timeoutMs: 60000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...body.history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage },
      ],
    });

    if (aiRequest) {
      await admin
        .from("ai_requests")
        .update({
          status: "completed",
          response: text,
          tokens_used: tokensUsed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", aiRequest.id);
    }

    return NextResponse.json({ text });
  } catch (error) {
    if (aiRequest) {
      await admin
        .from("ai_requests")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", aiRequest.id);
    }
    const erro = respostaDeErroIA(error);
    return NextResponse.json({ error: erro.error }, { status: erro.status });
  }
}
