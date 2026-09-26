import { readFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { CampaignConfig, PartyCharacter } from "@/lib/types";
import type { ElementosHistoria, HistoriaEstruturada } from "@/lib/character-creation/sacramento/types";
import { SACRAMENTO_THEMES, SACRAMENTO_TONES } from "@/lib/rulesets/sacramento/themes";
import { SACRAMENTO_PLACES } from "@/lib/rulesets/sacramento/places";
import { SACRAMENTO_FACTIONS } from "@/lib/rulesets/sacramento/factions";
import { WEAVE_SCHEMA, sanitizeWoven } from "@/lib/rulesets/sacramento/weave";
import { economiaDaMesa } from "@/lib/rulesets/sacramento/economia";
import { palavrasDoJogador } from "@/lib/character-creation/sacramento/palavras-do-jogador";

// A campanha inteira sai numa chamada só — pode levar alguns minutos.
export const maxDuration = 300;

const MODEL = process.env.ANTHROPIC_CAMPAIGN_MODEL ?? "claude-opus-5";
const MAX_INSTRUCTION_CHARS = 2000;

// Os dois documentos normativos entram inteiros no system prompt (com cache).
// next.config.ts inclui docs/*.md no bundle desta rota.
let docsCache: string | null = null;
async function loadDocs(): Promise<string> {
  if (docsCache) return docsCache;
  const dir = path.join(process.cwd(), "docs");
  const [criador, gerenciador] = await Promise.all([
    readFile(path.join(dir, "01_Sacramento_Criador_de_Personagens.md"), "utf8"),
    readFile(path.join(dir, "02_Sacramento_Gerenciador_de_Partidas.md"), "utf8"),
  ]);
  docsCache = `<doc nome="01_Sacramento_Criador_de_Personagens.md">\n${criador}\n</doc>\n\n<doc nome="02_Sacramento_Gerenciador_de_Partidas.md">\n${gerenciador}\n</doc>`;
  return docsCache;
}

const INSTRUCOES = `Você é o co-autor do Juiz (mestre) de uma campanha de Sacramento RPG — faroeste fictício à mineira (1ª ed., dez/2024): humanos, armas, conflitos sociais, sobrevivência e redenção. Sem magia jogável, raças fantásticas ou elementos de D&D. Moeda: réis.

Os documentos abaixo são a FONTE NORMATIVA. Respeite em especial o Doc 02 §2 (o que o Juiz pode criar), §3 (estrutura de campanha, cenas e missões), §3.3 (geração assistida), §4 (sessão zero), §5 (cenário, lugares, cronologia, calendário), §12 (NPCs), §14 (facções), §16.5 (missões de NPC), §18 (crimes e economia) e §19 (redenção).

Sua tarefa: propor a campanha INTEIRA, pronta para o Juiz jogar, costurada a partir das histórias dos personagens do bando. Cada personagem deve ter pelo menos uma cena, missão ou NPC ligado ao seu passado, aos seus vínculos, à sua facção ou à sua trilha de redenção — e as histórias devem se cruzar para dar motivo ao bando andar junto.

Regras invioláveis (Doc 02 §3.3):
1. Tudo é PROPOSTA para o Juiz — nunca fato consumado sobre o que os personagens farão.
2. Situações ABERTAS: nunca decida ações/pensamentos dos personagens dos jogadores nem resultados de testes.
3. Cada cena/missão tem saídas plausíveis além da violência (negociação, fuga, esperteza).
4. Perigos têm indícios perceptíveis antes de ferir.
5. NÃO conceda dinheiro, XP, habilidades, Cartas de Sina, itens ou progresso de redenção. Recompensas são sugestões marcadas como "(decisão do Juiz)".
6. Detalhe mecânico (NA, NdC, dano) só com página do livro citada ou rotulado "decisão proposta".
7. Lugares e facções canônicos: use o canonId da lista fornecida. Criações novas usam canonId "" e nunca alegam vir do livro.
8. NPCs são participantes, não invulneráveis. Segredos e fatos verdadeiros ficam nos campos do Juiz.
9. Respeite linhas e véus da sessão zero.
10. Não repita elementos que a campanha já tem (lista fornecida) — complemente-os.

Tamanho: 3–5 lugares, 2–3 facções, 6–10 NPCs, 4–6 cenas (em ordem de jogo, começando pela cena de abertura que reúne o bando), 3–5 missões, 2–4 eventos de calendário, 1 segredo por personagem (o gancho que o Juiz guarda para aquele PJ) + 1–3 segredos gerais. O campo "arco" é o resumo do arco da campanha em 3 atos, só para o Juiz. Campos sem conteúdo relevante ficam como string vazia. Escreva em português brasileiro, no tom do velho oeste mineiro, conciso e jogável.`;

function resumoPersonagem(c: PartyCharacter, jogador: string): string {
  const story = (c.story ?? {}) as { historia?: HistoriaEstruturada; elementos?: ElementosHistoria };
  const h = story.historia;
  const e = story.elementos;
  const faccao = e?.faccaoId && e.faccaoId !== "nenhuma"
    ? `${SACRAMENTO_FACTIONS.find((f) => f.id === e.faccaoId)?.nome ?? e.faccaoId}${e.faccaoRelacao ? ` (${e.faccaoRelacao})` : ""}`
    : "";
  const linhas = [
    `### ${c.name} — jogador(a): ${jogador} — nível ${c.level}`,
    e?.conceito && `Conceito: ${e.conceito}`,
    e?.origem && `Origem: ${e.origem}`,
    e?.ocupacao && `Ocupação: ${e.ocupacao}`,
    faccao && `Facção: ${faccao}`,
    e?.passadoSombrio && e.passadoDetalhe && `Passado sombrio: ${e.passadoDetalhe}`,
    // As respostas do jogador valem mais que o esboço da história, se divergirem.
    palavrasDoJogador(e).length > 0 &&
      `Nas palavras do jogador (prioridade máxima): ${palavrasDoJogador(e).map((l) => `${l.rotulo}: ${l.texto}`).join(" | ")}`,
  ];
  if (h) {
    linhas.push(
      `Resumo: ${h.resumo}`,
      ...h.capitulos.map((cap) => `${cap.titulo}: ${cap.texto}`),
      h.familia && `Família: ${h.familia}`,
      h.vinculos.length > 0 &&
        `Vínculos: ${h.vinculos.map((v) => `${v.nome} (${v.relacao})${v.detalhe ? ` — ${v.detalhe}` : ""}`).join("; ")}`,
      `Trilha de redenção (${h.redencao.trilhaNome}): ${h.redencao.premissa} Passos: ${h.redencao.passos.map((p, i) => `${i + 1}) ${p}`).join(" ")}`,
      h.ganchos.length > 0 && `Ganchos: ${h.ganchos.join(" | ")}`,
      (h.pontosChave?.length ?? 0) > 0 &&
        `Pontos-chave: ${h.pontosChave!.map((p) => `${p.rotulo}: ${p.valor}`).join("; ")}`,
    );
  } else if (c.backstory) {
    linhas.push(`História: ${c.backstory}`);
  }
  return linhas.filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  const auth = await getProfile();
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: { sessionId?: unknown; instruction?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { sessionId, instruction } = body;
  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "sessionId obrigatório" }, { status: 400 });
  }
  if (
    instruction !== undefined &&
    (typeof instruction !== "string" || instruction.length > MAX_INSTRUCTION_CHARS)
  ) {
    return NextResponse.json({ error: "Direção inválida" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, gm_id, title, description, campaign, settings")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.gm_id !== auth.user.id) {
    return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
  }
  if ((session.settings as { ai_assistant?: boolean })?.ai_assistant === false) {
    return NextResponse.json({ error: "Assistente de IA desativado nesta campanha" }, { status: 403 });
  }

  const admin = createAdminClient();
  const [charsRes, playersRes, elementsRes] = await Promise.all([
    supabase.from("characters").select("*").eq("session_id", sessionId).neq("owner_id", auth.user.id),
    admin
      .from("session_players")
      .select("player_id, profile:profiles!session_players_player_id_fkey(display_name)")
      .eq("session_id", sessionId),
    supabase.from("campaign_elements").select("kind, data").eq("session_id", sessionId),
  ]);

  const chars = (charsRes.data ?? []) as PartyCharacter[];
  if (chars.length === 0) {
    return NextResponse.json(
      { error: "Nenhum personagem pronto ainda — a IA tece a campanha a partir das histórias do bando." },
      { status: 400 },
    );
  }
  const nomes = new Map(
    ((playersRes.data ?? []) as unknown as { player_id: string; profile: { display_name: string } | null }[]).map(
      (p) => [p.player_id, p.profile?.display_name ?? "jogador"],
    ),
  );

  const campaign = (session.campaign ?? {}) as CampaignConfig;
  const existentes = (elementsRes.data ?? []).map(
    (el) => `${el.kind}: ${(el.data as { nome?: string; titulo?: string }).nome ?? (el.data as { titulo?: string }).titulo ?? ""}`,
  );
  const temas = (campaign.themes ?? [])
    .map((id) => SACRAMENTO_THEMES.find((t) => t.id === id)?.nome ?? id)
    .join(", ");
  const tom = SACRAMENTO_TONES.find((t) => t.id === campaign.tone)?.nome;
  const economia = economiaDaMesa(session.settings);

  const userPrompt = [
    "## Campanha",
    `Título: ${session.title}`,
    campaign.premise && `Premissa atual do Juiz: ${campaign.premise}`,
    campaign.band_goal && `Objetivo do bando: ${campaign.band_goal}`,
    tom && `Tom: ${tom}`,
    temas && `Temas: ${temas}`,
    `Época: ${campaign.epoch ?? 1880}`,
    `Economia da mesa (regra de mesa): ${economia.nome}, ×${economia.multiplicador} sobre os preços do livro — recompensas e valores propostos em réis devem já refletir esse multiplicador e dizer isso.`,
    (campaign.session_zero?.lines?.length ?? 0) > 0 && `Linhas (proibido): ${campaign.session_zero!.lines!.join("; ")}`,
    (campaign.session_zero?.veils?.length ?? 0) > 0 && `Véus (só em segundo plano): ${campaign.session_zero!.veils!.join("; ")}`,
    "",
    "## Lugares canônicos (canonId — nome: características)",
    ...SACRAMENTO_PLACES.map((p) => `${p.id} — ${p.nome}: ${p.caracteristicas}`),
    "",
    "## Facções canônicas (canonId — nome: resumo)",
    ...SACRAMENTO_FACTIONS.map((f) => `${f.id} — ${f.nome}: ${f.resumo}`),
    "",
    existentes.length > 0 ? `## Já existe na campanha\n${existentes.join("\n")}` : "## A campanha ainda não tem elementos.",
    "",
    "## O bando",
    ...chars.map((c) => resumoPersonagem(c, nomes.get(c.owner_id) ?? "jogador")),
    "",
    typeof instruction === "string" && instruction.trim()
      ? `## Direção do Juiz\n${instruction.trim()}`
      : "",
    "Proponha a campanha completa agora.",
  ]
    .filter((l) => l !== false && l !== undefined && l !== null)
    .join("\n");

  const { data: aiRequest } = await admin
    .from("ai_requests")
    .insert({
      session_id: sessionId,
      requested_by: auth.user.id,
      type: "gm_suggestion",
      prompt: userPrompt.slice(0, 4000),
      model: MODEL,
      status: "pending",
    })
    .select("id")
    .single<{ id: string }>();

  const finish = async (patch: Record<string, unknown>) => {
    if (!aiRequest) return;
    await admin
      .from("ai_requests")
      .update({ ...patch, completed_at: new Date().toISOString() })
      .eq("id", aiRequest.id);
  };

  try {
    const docs = await loadDocs();
    const client = new Anthropic();
    // Streaming: saída longa (campanha inteira) passa do limite de chamada síncrona do SDK.
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: WEAVE_SCHEMA },
      },
      system: [
        { type: "text", text: INSTRUCOES },
        { type: "text", text: docs, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });
    const message = await stream.finalMessage();
    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (message.stop_reason === "max_tokens") throw new Error("Resposta cortada no limite de tamanho");
    const proposal = sanitizeWoven(JSON.parse(text));

    await finish({
      status: "completed",
      response: text.slice(0, 20000),
      tokens_used: (message.usage.input_tokens ?? 0) + (message.usage.output_tokens ?? 0),
    });
    return NextResponse.json({ proposal });
  } catch (error) {
    await finish({ status: "failed" });
    console.error("[weave-campaign]", error);
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Limite de requisições atingido. Tente em instantes." }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "Erro na chamada à IA" }, { status: 502 });
    }
    return NextResponse.json({ error: "A IA não conseguiu montar a campanha. Tente de novo." }, { status: 500 });
  }
}
