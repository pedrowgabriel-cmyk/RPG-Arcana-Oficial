import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { MODELOS, chatGPT, respostaDeErroIA } from "@/lib/openai";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import type { CampaignConfig, PartyCharacter } from "@/lib/types";
import type { ElementosHistoria, HistoriaEstruturada } from "@/lib/character-creation/sacramento/types";
import { SACRAMENTO_THEMES, SACRAMENTO_TONES } from "@/lib/rulesets/sacramento/themes";
import { SACRAMENTO_PLACES } from "@/lib/rulesets/sacramento/places";
import { SACRAMENTO_FACTIONS } from "@/lib/rulesets/sacramento/factions";
import { WEAVE_ETAPAS, detalheElemento, sanitizeWoven, type EtapaWeave } from "@/lib/rulesets/sacramento/weave";
import { economiaDaMesa } from "@/lib/rulesets/sacramento/economia";
import { palavrasDoJogador } from "@/lib/character-creation/sacramento/palavras-do-jogador";

// Fundação + três etapas em paralelo — pode levar alguns minutos.
export const maxDuration = 300;

// Toda a IA do app roda no GPT (lib/openai.ts).
const MODEL = MODELOS.criativo;
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
10. TUDO que o Juiz já preencheu é verdade desta campanha: mantenha, respeite e costure nas propostas (cite esses lugares, facções, NPCs e cenas pelo nome). Nunca duplique nem contradiga — só complemente o que falta.
11. A "Direção do Juiz" tem prioridade máxima sobre qualquer sugestão sua.

A campanha é montada em etapas: você recebe a etapa pedida e, a partir da segunda, a fundação já proposta — use exatamente os nomes dela. Campos sem conteúdo relevante ficam como string vazia. Escreva em português brasileiro, no tom do velho oeste mineiro, conciso e jogável.`;

const PEDIDO_ETAPA: Record<EtapaWeave, string> = {
  fundacao:
    "ETAPA 1 — FUNDAÇÃO. Proponha premissa e objetivo do bando (se o Juiz já escreveu, refine sem contradizer), o arco da campanha em 3 atos (só para o Juiz), 3–5 lugares e 2–3 facções que ainda NÃO existem na campanha (canônicos pelo canonId ou criações novas).",
  npcs:
    "ETAPA 2 — NPCs. Proponha 6–10 NPCs novos, ligados à fundação, aos lugares/facções (existentes e novos) e ao passado, vínculos e redenção de cada personagem do bando.",
  cenas:
    "ETAPA 3 — CENAS. Proponha 4–6 cenas em ordem de jogo, começando pela cena de abertura que reúne o bando. Use os lugares e NPCs existentes e os da fundação; cada personagem precisa de ao menos uma cena ligada à sua história.",
  tramas:
    "ETAPA 4 — TRAMAS. Proponha 3–5 missões, 2–4 eventos de calendário e segredos do Juiz: 1 segredo por personagem do bando (o gancho que o Juiz guarda para aquele PJ) + 1–3 segredos gerais.",
};

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
  const ROTULO_KIND: Record<string, string> = {
    place: "lugar", faction: "facção", npc: "NPC", scene: "cena", mission: "missão", calendar_event: "calendário", secret_note: "segredo",
  };
  const existentes = (elementsRes.data ?? [])
    .map((el) => detalheElemento(ROTULO_KIND[el.kind] ?? el.kind, (el.data ?? {}) as Record<string, unknown>))
    .join("\n")
    .slice(0, 30000);
  const temas = (campaign.themes ?? [])
    .map((id) => SACRAMENTO_THEMES.find((t) => t.id === id)?.nome ?? id)
    .join(", ");
  const tom = SACRAMENTO_TONES.find((t) => t.id === campaign.tone)?.nome;
  const economia = economiaDaMesa(session.settings);
  const direcao = typeof instruction === "string" ? instruction.trim() : "";

  const contexto = [
    "## Campanha",
    `Título: ${session.title}`,
    session.description && `Descrição do Juiz: ${session.description}`,
    campaign.premise && `Premissa atual do Juiz: ${campaign.premise}`,
    campaign.band_goal && `Objetivo do bando: ${campaign.band_goal}`,
    tom && `Tom: ${tom}`,
    temas && `Temas: ${temas}`,
    `Época: ${campaign.epoch ?? 1880}`,
    campaign.fictional_date && `Data ficcional: ${campaign.fictional_date}`,
    `Economia da mesa (regra de mesa): ${economia.nome}, ×${economia.multiplicador} sobre os preços do livro — recompensas e valores em réis devem refletir esse multiplicador e dizer isso.`,
    (campaign.session_zero?.lines?.length ?? 0) > 0 && `Linhas (proibido): ${campaign.session_zero!.lines!.join("; ")}`,
    (campaign.session_zero?.veils?.length ?? 0) > 0 && `Véus (só em segundo plano): ${campaign.session_zero!.veils!.join("; ")}`,
    campaign.session_zero?.notes && `Notas da sessão zero: ${campaign.session_zero.notes}`,
    "",
    "## Lugares canônicos (canonId — nome: características)",
    ...SACRAMENTO_PLACES.map((p) => `${p.id} — ${p.nome}: ${p.caracteristicas}`),
    "",
    "## Facções canônicas (canonId — nome: resumo)",
    ...SACRAMENTO_FACTIONS.map((f) => `${f.id} — ${f.nome}: ${f.resumo}`),
    "",
    existentes
      ? `## O que o Juiz JÁ preencheu nesta campanha (manter e costurar)\n${existentes}`
      : "## A campanha ainda não tem elementos preenchidos.",
    "",
    "## O bando",
    ...chars.map((c) => resumoPersonagem(c, nomes.get(c.owner_id) ?? "jogador")),
    "",
    direcao ? `## Direção do Juiz (prioridade máxima)\n${direcao}` : "",
  ]
    .filter((l) => l !== false && l !== undefined && l !== null)
    .join("\n");

  const { data: aiRequest } = await admin
    .from("ai_requests")
    .insert({
      session_id: sessionId,
      requested_by: auth.user.id,
      type: "gm_suggestion",
      prompt: contexto.slice(0, 4000),
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

  let tokens = 0;
  try {
    const docs = await loadDocs();
    const system = `${INSTRUCOES}\n\n${docs}`;

    // Um schema por etapa: um único com a campanha inteira fica grande demais.
    const etapa = async (nome: EtapaWeave, fundacao?: unknown) => {
      const conteudo = [
        contexto,
        fundacao ? `\n## Fundação já proposta (use estes nomes)\n${JSON.stringify(fundacao)}` : "",
        `\n${PEDIDO_ETAPA[nome]}`,
      ].join("\n");
      const r = await chatGPT({
        model: MODEL,
        maxTokens: 24000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: conteudo },
        ],
        schema: { name: `campanha_${nome}`, schema: WEAVE_ETAPAS[nome] },
      });
      tokens += r.tokens;
      return JSON.parse(r.texto) as Record<string, unknown>;
    };

    const fundacao = await etapa("fundacao");
    const [npcs, cenas, tramas] = await Promise.all([
      etapa("npcs", fundacao),
      etapa("cenas", fundacao),
      etapa("tramas", fundacao),
    ]);
    const proposal = sanitizeWoven({ ...fundacao, ...npcs, ...cenas, ...tramas });

    await finish({
      status: "completed",
      response: JSON.stringify(proposal).slice(0, 20000),
      tokens_used: tokens,
    });
    return NextResponse.json({ proposal });
  } catch (error) {
    await finish({ status: "failed", response: String((error as Error)?.message ?? error).slice(0, 2000) });
    console.error("[weave-campaign]", error);
    const erro = respostaDeErroIA(error);
    return NextResponse.json({ error: erro.error }, { status: erro.status });
  }
}
