import { MODELOS, chatGPT, respostaDeErroIA } from "@/lib/openai";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

const MODEL = MODELOS.criativo;
const MAX_PROMPT_CHARS = 2000;

const SYSTEM_PROMPT = `Você é um assistente especializado em RPG de mesa. Dado um prompt do Mestre, gere um template completo de aventura em JSON. Responda APENAS com o JSON, sem markdown, sem explicações.

Diretrizes:
- "description" deve ter no máximo 200 caracteres
- "synopsis" deve ter 2 a 4 parágrafos
- "acts" deve ter de 3 a 7 itens
- "npcs" deve ter de 3 a 10 itens
- "locations" deve ter de 3 a 8 itens
- "music_cues" deve ter de 3 a 6 itens`;

const TEMPLATE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    genre: {
      type: "string",
      enum: ["fantasy", "sci-fi", "horror", "western", "modern", "custom"],
    },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    content: {
      type: "object",
      properties: {
        synopsis: { type: "string" },
        acts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
            },
            required: ["title", "description"],
            additionalProperties: false,
          },
        },
        npcs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              role: { type: "string" },
              motivation: { type: "string" },
            },
            required: ["name", "role", "motivation"],
            additionalProperties: false,
          },
        },
        locations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              atmosphere: { type: "string" },
            },
            required: ["name", "description", "atmosphere"],
            additionalProperties: false,
          },
        },
        music_cues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              scene: { type: "string" },
              suggestion: { type: "string" },
            },
            required: ["scene", "suggestion"],
            additionalProperties: false,
          },
        },
      },
      required: ["synopsis", "acts", "npcs", "locations", "music_cues"],
      additionalProperties: false,
    },
  },
  required: ["title", "genre", "description", "tags", "content"],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  const profileResult = await getProfile();
  if (!profileResult) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (profileResult.profile.role !== "gm" && profileResult.profile.role !== "admin") {
    return NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const prompt =
    typeof body === "object" && body !== null && "prompt" in body
      ? (body as { prompt: unknown }).prompt
      : null;

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json({ error: "Prompt obrigatório" }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json(
      { error: `Prompt muito longo (máx ${MAX_PROMPT_CHARS} caracteres)` },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: aiRequest, error: insertError } = await admin
    .from("ai_requests")
    .insert({
      requested_by: profileResult.user.id,
      type: "scene_description",
      prompt,
      model: MODEL,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !aiRequest) {
    return NextResponse.json({ error: "Falha ao registrar requisição" }, { status: 500 });
  }

  try {
    const { texto, tokens: tokensUsed } = await chatGPT({
      model: MODEL,
      maxTokens: 16000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      schema: { name: "template_aventura", schema: TEMPLATE_SCHEMA },
    });
    const parsed = JSON.parse(texto) as unknown;

    await admin
      .from("ai_requests")
      .update({
        status: "completed",
        response: JSON.stringify(parsed),
        tokens_used: tokensUsed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", aiRequest.id);

    return NextResponse.json(parsed);
  } catch (error) {
    await admin
      .from("ai_requests")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", aiRequest.id);

    const erro = respostaDeErroIA(error);
    return NextResponse.json({ error: erro.error }, { status: erro.status });
  }
}
