"use server";

// Ações do Juiz na mesa do Sacramento. Rolagens e cartas são sorteadas aqui.

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { drawCards } from "@/lib/rulesets/sacramento/generators";
import {
  CONSEQUENCIA_DOR,
  maiorCarta,
  nomeCarta,
  ordenarIniciativa,
  rolar,
  type CenaAtual,
  type Combatente,
  type Iniciativa,
  type Rolagem,
  type TipoRolagem,
} from "@/lib/rulesets/sacramento/mesa";
import type { Carta } from "@/lib/rulesets/sacramento/types";
import type { SessionEventType } from "@/lib/types";

type R<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

async function juiz(sessionId: string) {
  const auth = await getProfile();
  if (!auth) return { ok: false as const, error: "Não autenticado" };
  const supabase = await createClient();
  const { data: sessao } = await supabase
    .from("sessions")
    .select("id, gm_id, settings, current_round")
    .eq("id", sessionId)
    .maybeSingle<{ id: string; gm_id: string; settings: Record<string, unknown> | null; current_round: number }>();
  if (!sessao || sessao.gm_id !== auth.user.id) return { ok: false as const, error: "Só o Juiz da mesa." };
  return { ok: true as const, supabase, userId: auth.user.id, sessao };
}

async function evento(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  actorId: string,
  type: SessionEventType,
  payload: Record<string, unknown>,
  isPublic: boolean,
  round?: number,
) {
  await supabase.from("session_events").insert({
    session_id: sessionId,
    actor_id: actorId,
    type,
    payload,
    is_public: isPublic,
    round: round ?? null,
  });
}

async function avisar(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  targetId: string | null,
  title: string,
  message: string,
  vibrate = false,
) {
  await supabase.from("notifications").insert({
    session_id: sessionId,
    target_id: targetId,
    type: "info",
    title,
    message,
    vibrate,
  });
}

/* ── Ficha: Vida, Dor, Sina, dinheiro, XP, condições ── */

export type AjusteFicha =
  | { vida: number }
  | { dor: number }
  | { saldo: number; motivo?: string }
  | { xp: number }
  | { sina: "dar" }
  | { sina: "usar"; indice: number }
  | { condicao: string; ativa: boolean }
  | { descansar: "comum" | "medico" };

export async function ajustarFicha(
  sessionId: string,
  characterId: string,
  ajuste: AjusteFicha,
): Promise<R<{ texto: string }>> {
  const ctx = await juiz(sessionId);
  if (!ctx.ok) return ctx;
  const { supabase, userId } = ctx;

  const { data: c } = await supabase
    .from("characters")
    .select("id, name, owner_id, session_id, hp, max_hp, xp, gold, stats, conditions")
    .eq("id", characterId)
    .maybeSingle<{
      id: string;
      name: string;
      owner_id: string;
      session_id: string;
      hp: number;
      max_hp: number;
      xp: number;
      gold: number;
      stats: Record<string, unknown> | null;
      conditions: string[] | null;
    }>();
  if (!c || c.session_id !== sessionId) return { ok: false, error: "Personagem fora desta mesa." };

  const stats = { ...(c.stats ?? {}) };
  let hp = c.hp;
  let xp = c.xp;
  let condicoes = [...(c.conditions ?? [])];
  const addCond = (n: string) => {
    if (!condicoes.includes(n)) condicoes.push(n);
  };
  let texto = "";
  const publico = true;
  let tipo: SessionEventType = "gm_note";
  let avisoJogador: string | null = null;

  if ("vida" in ajuste) {
    const antes = hp;
    hp = Math.max(0, Math.min(c.max_hp, hp + Math.round(ajuste.vida)));
    tipo = ajuste.vida < 0 ? "combat_damage" : "combat_heal";
    texto = ajuste.vida < 0 ? `${c.name} perdeu ${antes - hp} V (${hp}/${c.max_hp})` : `${c.name} recuperou ${hp - antes} V (${hp}/${c.max_hp})`;
    if (hp === 0 && antes > 0) {
      texto += " — VIDA ZERADA: Livramento, Sina ou Teste de Morte";
      addCond("Inconsciente");
    }
    if (hp > 0) condicoes = condicoes.filter((x) => x !== "Inconsciente");
    avisoJogador = texto;
  } else if ("dor" in ajuste) {
    let dor = (typeof stats.dor === "number" ? (stats.dor as number) : 0) + Math.round(ajuste.dor);
    tipo = ajuste.dor > 0 ? "combat_damage" : "combat_heal";
    if (dor >= 6) {
      // Ciclo de Dor (p. 86–87): risca 1 V, rola consequência, apaga os seis D.
      const d = 1 + Math.floor(Math.random() * 6);
      const cons = CONSEQUENCIA_DOR[d];
      hp = Math.max(0, hp - 1);
      dor = 0;
      addCond(cons.condicao);
      texto = `${c.name} completou 6 de Dor: −1 V (${hp}/${c.max_hp}) · d6 = ${d} → ${cons.texto}`;
      if (hp === 0) {
        texto += " — VIDA ZERADA";
        addCond("Inconsciente");
      }
    } else {
      dor = Math.max(0, dor);
      texto = `${c.name}: Dor ${dor}/6`;
    }
    stats.dor = dor;
    avisoJogador = texto;
  } else if ("saldo" in ajuste) {
    const atual = typeof stats.saldo === "number" ? (stats.saldo as number) : c.gold;
    const novo = Math.round((atual + ajuste.saldo) * 100) / 100;
    if (novo < 0) return { ok: false, error: `${c.name} não tem esse dinheiro.` };
    stats.saldo = novo;
    tipo = "item_given";
    texto = `${c.name} ${ajuste.saldo >= 0 ? "recebeu" : "pagou"} $${Math.abs(ajuste.saldo).toLocaleString("pt-BR")}${ajuste.motivo ? ` (${ajuste.motivo})` : ""} — saldo $${novo.toLocaleString("pt-BR")}`;
    avisoJogador = texto;
  } else if ("xp" in ajuste) {
    xp = Math.max(0, xp + Math.round(ajuste.xp));
    tipo = "xp_gained";
    texto = `${c.name} ${ajuste.xp >= 0 ? "ganhou" : "perdeu"} ${Math.abs(ajuste.xp)} XP (total ${xp})`;
    avisoJogador = texto;
  } else if ("sina" in ajuste) {
    const sina = Array.isArray(stats.sina) ? [...(stats.sina as Carta[])] : [];
    if (ajuste.sina === "dar") {
      const [carta] = drawCards(1);
      sina.push(carta);
      texto = `${c.name} ganhou uma Carta de Sina: ${nomeCarta(carta)}`;
    } else {
      const carta = sina[ajuste.indice];
      if (!carta) return { ok: false, error: "Carta de Sina inexistente." };
      sina.splice(ajuste.indice, 1);
      stats.sinaDoJuiz = typeof stats.sinaDoJuiz === "number" ? (stats.sinaDoJuiz as number) + 1 : 1;
      texto = `${c.name} usou a Sina ${nomeCarta(carta)}`;
    }
    stats.sina = sina;
    avisoJogador = texto;
  } else if ("condicao" in ajuste) {
    if (ajuste.ativa) addCond(ajuste.condicao);
    else condicoes = condicoes.filter((x) => x !== ajuste.condicao);
    tipo = ajuste.ativa ? "condition_added" : "condition_removed";
    texto = `${c.name} ${ajuste.ativa ? "está" : "não está mais"}: ${ajuste.condicao}`;
    if (ajuste.condicao === "Morto" && ajuste.ativa) avisoJogador = `${c.name} morreu. Uma Sina ainda pode trazê-lo de volta nesta rodada.`;
  } else if ("descansar" in ajuste) {
    // 24 h de descanso: todos os D + 2 V; com cuidado médico: todos os D + 3 V (p. 88).
    const cura = ajuste.descansar === "medico" ? 3 : 2;
    const antes = hp;
    hp = Math.min(c.max_hp, hp + cura);
    stats.dor = 0;
    condicoes = condicoes.filter((x) => !["Inconsciente", "Sangrando", "Atordoado", "Caído", "Distraído", "Intimidado", "Desorientado", "Livramento usado", "Teste de Morte usado"].includes(x));
    texto = `${c.name} descansou${ajuste.descansar === "medico" ? " com cuidado médico" : ""}: Dor zerada, +${hp - antes} V (${hp}/${c.max_hp})`;
    avisoJogador = texto;
  }

  const { error } = await supabase
    .from("characters")
    .update({
      hp,
      xp,
      stats,
      conditions: condicoes,
      gold: Math.round(typeof stats.saldo === "number" ? (stats.saldo as number) : c.gold),
    })
    .eq("id", c.id);
  if (error) return { ok: false, error: error.message };

  await evento(supabase, sessionId, userId, tipo, { texto, personagemId: c.id }, publico, ctx.sessao.current_round);
  if (avisoJogador) await avisar(supabase, sessionId, c.owner_id, c.name, avisoJogador, "vida" in ajuste && ajuste.vida < 0);
  return { ok: true, texto };
}

/* ── Rolagens do Juiz ── */

export async function rolarNaMesa(
  sessionId: string,
  p: { tipo: TipoRolagem; rotulo: string; quem: string; mod?: number; na?: number | null; publico: boolean },
): Promise<R<{ rolagem: Rolagem }>> {
  const ctx = await juiz(sessionId);
  if (!ctx.ok) return ctx;
  const rolagem = rolar(p);
  await evento(
    ctx.supabase,
    sessionId,
    ctx.userId,
    "gm_note",
    { kind: "rolagem", texto: `${p.quem} · ${p.rotulo}: ${rolagem.texto}`, rolagem },
    p.publico,
    ctx.sessao.current_round,
  );
  return { ok: true, rolagem };
}

/* ── Cena pública ── */

export async function definirCena(sessionId: string, cena: CenaAtual | null): Promise<R> {
  const ctx = await juiz(sessionId);
  if (!ctx.ok) return ctx;
  const settings = { ...(ctx.sessao.settings ?? {}), cenaAtual: cena };
  const { error } = await ctx.supabase
    .from("sessions")
    .update({ settings, current_scene: cena?.titulo ?? "" })
    .eq("id", sessionId);
  if (error) return { ok: false, error: error.message };

  await ctx.supabase
    .from("session_media_state")
    .update({
      current_image: cena?.imagem ? { media_id: cena.elementoId ?? "cena", url: cena.imagem, caption: cena.titulo } : null,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);

  if (cena) {
    await evento(ctx.supabase, sessionId, ctx.userId, "scene_change", { texto: `Nova cena: ${cena.titulo}${cena.lugar ? ` — ${cena.lugar}` : ""}` }, true);
    await avisar(ctx.supabase, sessionId, null, `🎬 ${cena.titulo}`, cena.lugar ?? "Nova cena");
  }
  revalidatePath(`/play/${sessionId}`);
  return { ok: true };
}

/* ── Iniciativa por cartas (§7.1) ── */

async function salvarIniciativa(ctx: Extract<Awaited<ReturnType<typeof juiz>>, { ok: true }>, sessionId: string, ini: Iniciativa | null, rodada?: number) {
  const settings = { ...(ctx.sessao.settings ?? {}), iniciativa: ini };
  const patch: Record<string, unknown> = { settings };
  if (typeof rodada === "number") patch.current_round = rodada;
  return ctx.supabase.from("sessions").update(patch).eq("id", sessionId);
}

export async function sacarIniciativa(
  sessionId: string,
  participantes: { id: string; nome: string; tipo: "pj" | "npc"; nCartas: number; ndc?: number; vida?: number; vidaMax?: number }[],
): Promise<R> {
  const ctx = await juiz(sessionId);
  if (!ctx.ok) return ctx;
  if (participantes.length === 0) return { ok: false, error: "Ninguém no combate." };
  const total = participantes.reduce((n, p) => n + Math.max(1, Math.min(4, p.nCartas)), 0);
  if (total > 52) return { ok: false, error: "Cartas demais para um baralho." };
  const baralho = drawCards(total);
  let k = 0;
  const ordem: Combatente[] = participantes.map((p) => {
    const cartas = baralho.slice(k, (k += Math.max(1, Math.min(4, p.nCartas))));
    return { id: p.id, nome: p.nome, tipo: p.tipo, cartas, carta: maiorCarta(cartas), ndc: p.ndc, vida: p.vida, vidaMax: p.vidaMax };
  });
  const ini: Iniciativa = { ativa: true, rodada: 1, vez: 0, ordem: ordenarIniciativa(ordem) };
  const { error } = await salvarIniciativa(ctx, sessionId, ini, 1);
  if (error) return { ok: false, error: error.message };
  await evento(
    ctx.supabase,
    sessionId,
    ctx.userId,
    "round_start",
    { texto: `Combate! Iniciativa: ${ini.ordem.map((c) => `${c.nome} ${nomeCarta(c.carta)}`).join(" › ")}` },
    true,
    1,
  );
  await avisar(ctx.supabase, sessionId, null, "⚔️ Combate!", `Primeiro a agir: ${ini.ordem[0].nome}`, true);
  return { ok: true };
}

export async function acaoIniciativa(
  sessionId: string,
  acao: { tipo: "proximo" } | { tipo: "encerrar" } | { tipo: "descartar"; id: string } | { tipo: "escolher"; id: string; carta: number } | { tipo: "vidaNpc"; id: string; delta: number },
): Promise<R> {
  const ctx = await juiz(sessionId);
  if (!ctx.ok) return ctx;
  const atual = (ctx.sessao.settings as { iniciativa?: Iniciativa } | null)?.iniciativa;
  if (!atual?.ativa) return { ok: false, error: "Nenhum combate em andamento." };
  const ini: Iniciativa = { ...atual, ordem: atual.ordem.map((c) => ({ ...c })) };

  if (acao.tipo === "encerrar") {
    const { error } = await salvarIniciativa(ctx, sessionId, null);
    if (error) return { ok: false, error: error.message };
    await evento(ctx.supabase, sessionId, ctx.userId, "round_end", { texto: "Fim do combate." }, true, ini.rodada);
    return { ok: true };
  }
  if (acao.tipo === "proximo") {
    ini.vez += 1;
    if (ini.vez >= ini.ordem.length) {
      ini.vez = 0;
      ini.rodada += 1;
      await evento(ctx.supabase, sessionId, ctx.userId, "round_start", { texto: `Rodada ${ini.rodada}` }, true, ini.rodada);
    }
    const { error } = await salvarIniciativa(ctx, sessionId, ini, ini.rodada);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }
  const alvo = ini.ordem.find((c) => c.id === acao.id);
  if (!alvo) return { ok: false, error: "Combatente não encontrado." };
  const vezDeQuem = ini.ordem[ini.vez]?.id;
  if (acao.tipo === "descartar") {
    if (!["A", "K", "Q", "J"].includes(alvo.carta.valor)) return { ok: false, error: "Só figuras (A, K, Q, J) dão bônus ao descartar." };
    alvo.descarte = alvo.carta.valor;
    await evento(ctx.supabase, sessionId, ctx.userId, "gm_note", { texto: `${alvo.nome} descartou ${nomeCarta(alvo.carta)} pelo bônus e vai para o fim da fila` }, true, ini.rodada);
  } else if (acao.tipo === "escolher") {
    const carta = alvo.cartas[acao.carta];
    if (!carta) return { ok: false, error: "Carta inexistente." };
    alvo.carta = carta;
  } else if (acao.tipo === "vidaNpc") {
    alvo.vida = Math.max(0, Math.min(alvo.vidaMax ?? 99, (alvo.vida ?? 0) + acao.delta));
  }
  if (acao.tipo !== "vidaNpc") {
    ini.ordem = ordenarIniciativa(ini.ordem);
    ini.vez = Math.max(0, ini.ordem.findIndex((c) => c.id === vezDeQuem));
  }
  const { error } = await salvarIniciativa(ctx, sessionId, ini);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
