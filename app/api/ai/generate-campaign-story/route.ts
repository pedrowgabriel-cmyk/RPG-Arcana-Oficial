import { MODELOS, chatGPT, respostaDeErroIA } from "@/lib/openai";
import { ROTULO_KIND, detalheElemento } from "@/lib/rulesets/sacramento/weave";
import { SECTION_ASK, schemaFor, type Section } from "@/lib/rulesets/sacramento/propostas";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { CampaignConfig } from "@/lib/types";
import { SACRAMENTO_THEMES, SACRAMENTO_TONES } from "@/lib/rulesets/sacramento/themes";

export const maxDuration = 120;

const MODEL = MODELOS.criativo;
const MAX_INSTRUCTION_CHARS = 1000;


const SECTIONS: Section[] = ["hooks", "npc", "scene", "mission"];

// Restrições do Doc 2 §3.3 (geração assistida de história) incorporadas ao system prompt.
// As saídas são SEMPRE propostas: nada vira fato da campanha até o Juiz aplicar na UI.
const SYSTEM_PROMPT = `Você é o assistente de preparação do Juiz (mestre) em campanhas de Sacramento RPG — faroeste fictício à mineira (1ª edição, dez/2024): humanos, armas, conflitos sociais, sobrevivência e redenção. Sem magia jogável, raças fantásticas, classes ou elementos de D&D. Época padrão: 1880. Moeda: réis.

Regras invioláveis desta geração (Doc 2 §3.3):
1. Você produz PROPOSTAS para o Juiz avaliar — nunca fatos consumados. Não escreva como se os eventos já tivessem ocorrido na campanha.
2. Crie situações ABERTAS: nunca decida ações ou pensamentos dos personagens dos jogadores, nem decrete resultados de testes futuros.
3. Inclua saídas plausíveis além de violência (negociação, fuga, esperteza).
4. Perigos devem ter indícios perceptíveis (marcas, ruídos, comportamento) — nada de punição sem aviso.
5. NÃO conceda dinheiro, XP, habilidades, Cartas de Sina, itens ou progresso de redenção. Recompensas monetárias podem ser MENCIONADAS como proposta, marcadas para decisão do Juiz.
6. Qualquer detalhe mecânico (NA de teste, NdC, dano) deve vir com referência de página do livro OU explicitamente rotulado como "decisão proposta" no campo referencias.
7. Lugares/pessoas canônicos citados devem existir no cenário; criações novas nunca alegam ser do livro.
8. NPCs são participantes da história, não invulneráveis.
Responda em português brasileiro, no tom do velho oeste mineiro.`;

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

  const { sessionId, section, instruction } = (body ?? {}) as {
    sessionId?: unknown;
    section?: unknown;
    instruction?: unknown;
  };

  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "sessionId obrigatório" }, { status: 400 });
  }
  if (typeof section !== "string" || !SECTIONS.includes(section as Section)) {
    return NextResponse.json({ error: "Seção inválida" }, { status: 400 });
  }
  if (
    instruction !== undefined &&
    (typeof instruction !== "string" || instruction.length > MAX_INSTRUCTION_CHARS)
  ) {
    return NextResponse.json(
      { error: `Instrução inválida (máx ${MAX_INSTRUCTION_CHARS} caracteres)` },
      { status: 400 },
    );
  }

  // A sessão precisa ser do Juiz autenticado (RLS também protege este select).
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, gm_id, title, description, campaign, settings")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.gm_id !== profileResult.user.id) {
    return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
  }
  if ((session.settings as { ai_assistant?: boolean })?.ai_assistant === false) {
    return NextResponse.json(
      { error: "Assistente de IA desativado nesta campanha" },
      { status: 403 },
    );
  }

  const campaign = (session.campaign ?? {}) as CampaignConfig;
  const [{ data: placeElements }, { data: bando }] = await Promise.all([
    supabase.from("campaign_elements").select("kind, data").eq("session_id", sessionId),
    supabase.from("characters").select("name, story").eq("session_id", sessionId).neq("owner_id", profileResult.user.id),
  ]);
  // Tudo que o Juiz já preencheu entra com detalhes — a IA complementa, nunca duplica.
  const jaPreenchido = (placeElements ?? [])
    .map((el) => detalheElemento(ROTULO_KIND[el.kind] ?? el.kind, (el.data ?? {}) as Record<string, unknown>))
    .join("\n")
    .slice(0, 20000);
  const resumoBando = (bando ?? [])
    .map((c) => {
      const st = (c.story ?? {}) as { elementos?: { conceito?: string; origem?: string; ocupacao?: string }; historia?: { resumo?: string } };
      return `- ${c.name}: ${[st.elementos?.conceito, st.elementos?.ocupacao, st.elementos?.origem && `de ${st.elementos.origem}`, st.historia?.resumo].filter(Boolean).join(" · ")}`;
    })
    .join("\n");

  const placeNames = (placeElements ?? [])
    .filter((el) => el.kind === "place")
    .map((el) => (el.data as { nome?: string }).nome)
    .filter(Boolean);
  const factionNames = (placeElements ?? [])
    .filter((el) => el.kind === "faction")
    .map((el) => (el.data as { nome?: string }).nome)
    .filter(Boolean);

  const themeNames = (campaign.themes ?? [])
    .map((id) => SACRAMENTO_THEMES.find((t) => t.id === id)?.nome ?? id)
    .join(", ");
  const toneName = SACRAMENTO_TONES.find((t) => t.id === campaign.tone)?.nome;

  const contextLines = [
    `Campanha: ${session.title}`,
    campaign.premise && `Premissa: ${campaign.premise}`,
    campaign.band_goal && `Objetivo do bando: ${campaign.band_goal}`,
    toneName && `Tom: ${toneName}`,
    themeNames && `Temas: ${themeNames}`,
    `Época: ${campaign.epoch ?? 1880}`,
    placeNames.length > 0 && `Lugares na campanha: ${placeNames.join(", ")}`,
    factionNames.length > 0 && `Facções na campanha: ${factionNames.join(", ")}`,
    resumoBando && `Bando (personagens dos jogadores):\n${resumoBando}`,
    jaPreenchido && `Já preenchido pelo Juiz (manter, costurar e não duplicar):\n${jaPreenchido}`,
  ].filter(Boolean);

  const userPrompt = [
    contextLines.join("\n"),
    "",
    SECTION_ASK[section as Section],
    instruction ? `Direção do Juiz (prioridade máxima): ${instruction}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const admin = createAdminClient();
  const { data: aiRequest, error: insertError } = await admin
    .from("ai_requests")
    .insert({
      session_id: sessionId,
      requested_by: profileResult.user.id,
      type: "gm_suggestion",
      prompt: userPrompt.slice(0, 4000),
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
      maxTokens: 12000,
      timeoutMs: 110000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      schema: { name: `propostas_${section}`, schema: schemaFor(section as Section) },
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
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", aiRequest.id);

    const erro = respostaDeErroIA(error);
    return NextResponse.json({ error: erro.error }, { status: erro.status });
  }
}
