"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { itemById, LOJAS, precoNaMesa } from "@/lib/character-creation/sacramento/catalogo";
import { limitesComEconomia } from "@/lib/character-creation/sacramento/rules";
import { economiaDaMesa, formatarReis } from "@/lib/rulesets/sacramento/economia";
import { calcularAjusteCorpo, nomeCarta, rolar, sanearNotas, type AjusteCorpo, type Rolagem, type TipoRolagem } from "@/lib/rulesets/sacramento/mesa";
import type { Carta } from "@/lib/rulesets/sacramento/types";

type InventarioItem = {
  id?: string;
  nome?: string;
  categoria?: string;
  quantidade?: number;
  precoPago?: number;
  espaco?: number | null;
  daMesa?: boolean;
};

/**
 * Compra no Armazém durante a partida. Preço, saldo, lojas e itens vetados são
 * calculados aqui com a economia VIGENTE da mesa — nunca com o que o cliente viu.
 */
export async function comprarNoArmazem(
  sessionId: string,
  characterId: string,
  itemId: string,
  quantidade: number,
): Promise<{ ok: true; saldo: number; pago: number } | { ok: false; error: string }> {
  const auth = await getProfile();
  if (!auth) return { ok: false, error: "Não autenticado" };

  const qtd = Math.round(quantidade);
  if (!Number.isFinite(qtd) || qtd < 1 || qtd > 20) return { ok: false, error: "Quantidade inválida." };

  const admin = createAdminClient();
  const { data: sessao } = await admin
    .from("sessions")
    .select("id, status, ruleset, settings")
    .eq("id", sessionId)
    .maybeSingle<{ id: string; status: string; ruleset: string; settings: Record<string, unknown> | null }>();
  if (!sessao || sessao.ruleset !== "sacramento") return { ok: false, error: "Armazém indisponível nesta campanha." };
  if (sessao.status === "finished") return { ok: false, error: "A partida já encerrou." };

  const supabase = await createClient();
  const { data: personagem } = await supabase
    .from("characters")
    .select("id, owner_id, session_id, gold, stats, inventory")
    .eq("id", characterId)
    .maybeSingle<{
      id: string;
      owner_id: string;
      session_id: string | null;
      gold: number;
      stats: Record<string, unknown> | null;
      inventory: InventarioItem[] | null;
    }>();
  if (!personagem || personagem.owner_id !== auth.user.id || personagem.session_id !== sessionId) {
    return { ok: false, error: "Personagem não encontrado nesta mesa." };
  }

  const item = itemById(itemId);
  if (!item) return { ok: false, error: "Item inexistente." };
  const limites = limitesComEconomia(sessao.settings);
  if (limites.itensBloqueados.includes(item.id)) return { ok: false, error: `${item.nome} está proibido nesta mesa.` };
  const lojaAberta = LOJAS.some(
    (l) =>
      l.categorias.includes(item.categoria) &&
      (!limites.lojasPermitidas || limites.lojasPermitidas.includes(l.id)),
  );
  if (!lojaAberta) return { ok: false, error: `A loja que vende ${item.nome} está fechada nesta mesa.` };

  const unitario = precoNaMesa(item.preco, limites.multiplicadorPrecos);
  const total = Math.round(unitario * qtd * 100) / 100;
  const saldoAtual =
    typeof personagem.stats?.saldo === "number" ? (personagem.stats.saldo as number) : personagem.gold;
  if (saldoAtual < total) {
    return { ok: false, error: `Faltam ${formatarReis(Math.round((total - saldoAtual) * 100) / 100)} para levar isso.` };
  }
  const saldo = Math.round((saldoAtual - total) * 100) / 100;

  const inventario = [...(personagem.inventory ?? [])];
  const existente = inventario.findIndex((i) => i.id === item.id && !i.daMesa);
  if (existente >= 0) {
    inventario[existente] = {
      ...inventario[existente],
      quantidade: (inventario[existente].quantidade ?? 0) + qtd,
    };
  } else {
    inventario.push({
      id: item.id,
      nome: item.nome,
      categoria: item.categoria,
      quantidade: qtd,
      precoPago: unitario,
      espaco: item.espaco,
    });
  }

  const { error } = await supabase
    .from("characters")
    .update({
      inventory: inventario,
      gold: Math.round(saldo),
      stats: { ...(personagem.stats ?? {}), saldo },
    })
    .eq("id", personagem.id);
  if (error) return { ok: false, error: error.message };

  // Registro para o Juiz no log da sessão (jogador não escreve eventos sob RLS).
  const economia = economiaDaMesa(sessao.settings);
  await admin.from("session_events").insert({
    session_id: sessionId,
    actor_id: auth.user.id,
    type: "player_note",
    is_public: false,
    payload: {
      tipo: "compra",
      personagemId: personagem.id,
      itemId: item.id,
      quantidade: qtd,
      total,
      economia: economia.id,
      texto: `Comprou ${qtd}× ${item.nome} por ${formatarReis(total)} (${economia.nome})`,
    },
  });

  revalidatePath(`/play/${sessionId}`);
  return { ok: true, saldo, pago: total };
}

/* ── Mesa do jogador: rolagens e Sina ── */

async function meuPersonagem(sessionId: string, characterId: string) {
  const auth = await getProfile();
  if (!auth) return null;
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("characters")
    .select("id, name, owner_id, session_id, stats")
    .eq("id", characterId)
    .maybeSingle<{ id: string; name: string; owner_id: string; session_id: string | null; stats: Record<string, unknown> | null }>();
  if (!c || c.owner_id !== auth.user.id || c.session_id !== sessionId) return null;
  return { auth, supabase, c };
}

/** O jogador rola; o dado é sorteado aqui e vai para o log público da mesa. */
export async function rolarTesteJogador(
  sessionId: string,
  characterId: string,
  p: { tipo: TipoRolagem; rotulo: string; mod: number; na?: number | null },
): Promise<{ ok: true; rolagem: Rolagem } | { ok: false; error: string }> {
  const ctx = await meuPersonagem(sessionId, characterId);
  if (!ctx) return { ok: false, error: "Personagem não encontrado nesta mesa." };
  const tipo: TipoRolagem = ["teste", "ataque", "melhor2", "sorte", "morte"].includes(p.tipo) ? p.tipo : "teste";
  const rolagem = rolar({ tipo, rotulo: p.rotulo.slice(0, 60), quem: ctx.c.name, mod: Math.max(-5, Math.min(12, p.mod)), na: p.na ?? null });
  await createAdminClient().from("session_events").insert({
    session_id: sessionId,
    actor_id: ctx.auth.user.id,
    type: "player_note",
    is_public: true,
    payload: { kind: "rolagem", texto: `${ctx.c.name} · ${rolagem.rotulo}: ${rolagem.texto}`, rolagem },
  });
  return { ok: true, rolagem };
}

/** Gastar uma Carta de Sina (refazer teste, evitar Teste de Morte…). Cada Sina gasta vira 1 do Juiz. */
export async function usarSinaJogador(
  sessionId: string,
  characterId: string,
  indice: number,
  motivo: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await meuPersonagem(sessionId, characterId);
  if (!ctx) return { ok: false, error: "Personagem não encontrado nesta mesa." };
  const stats = { ...(ctx.c.stats ?? {}) };
  const sina = Array.isArray(stats.sina) ? [...(stats.sina as Carta[])] : [];
  const carta = sina[indice];
  if (!carta) return { ok: false, error: "Carta inexistente." };
  sina.splice(indice, 1);
  stats.sina = sina;
  stats.sinaDoJuiz = typeof stats.sinaDoJuiz === "number" ? (stats.sinaDoJuiz as number) + 1 : 1;
  const { error } = await ctx.supabase.from("characters").update({ stats }).eq("id", ctx.c.id);
  if (error) return { ok: false, error: error.message };
  await createAdminClient().from("session_events").insert({
    session_id: sessionId,
    actor_id: ctx.auth.user.id,
    type: "player_note",
    is_public: true,
    payload: { kind: "sina", texto: `${ctx.c.name} gastou a Sina ${nomeCarta(carta)}${motivo ? ` para ${motivo}` : ""}` },
  });
  return { ok: true };
}

/** O jogador registra dano/cura que tomou (Vida ou Dor). O Juiz vê no registro da mesa. */
export async function ajustarMeuCorpo(
  sessionId: string,
  characterId: string,
  ajuste: AjusteCorpo,
): Promise<{ ok: true; texto: string } | { ok: false; error: string }> {
  const ctx = await meuPersonagem(sessionId, characterId);
  if (!ctx) return { ok: false, error: "Personagem não encontrado nesta mesa." };
  if (!["vida", "dor"].includes(ajuste.canal)) return { ok: false, error: "Canal inválido." };
  const delta = Math.round(ajuste.delta);
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 30) return { ok: false, error: "Valor inválido." };

  const { data: c } = await ctx.supabase
    .from("characters")
    .select("hp, max_hp, stats, conditions")
    .eq("id", characterId)
    .single<{ hp: number; max_hp: number; stats: Record<string, unknown> | null; conditions: string[] | null }>();
  if (!c) return { ok: false, error: "Ficha não encontrada." };
  const stats = { ...(c.stats ?? {}) };
  const r = calcularAjusteCorpo(
    { nome: ctx.c.name, hp: c.hp, maxHp: c.max_hp, dor: typeof stats.dor === "number" ? (stats.dor as number) : 0, condicoes: c.conditions ?? [] },
    { canal: ajuste.canal, delta },
  );
  stats.dor = r.dor;
  const { error } = await ctx.supabase
    .from("characters")
    .update({ hp: r.hp, stats, conditions: r.condicoes })
    .eq("id", characterId);
  if (error) return { ok: false, error: error.message };

  await createAdminClient().from("session_events").insert({
    session_id: sessionId,
    actor_id: ctx.auth.user.id,
    type: (ajuste.canal === "vida" && delta < 0) || (ajuste.canal === "dor" && delta > 0) ? "combat_damage" : "combat_heal",
    is_public: true,
    payload: { texto: `${r.texto} · registrado pelo jogador`, personagemId: characterId },
  });
  return { ok: true, texto: r.texto };
}

/** Grava SÓ as notas: relê a ficha e troca stats.notas, sem pisar em Vida/Dor/Sina do Juiz. */
export async function salvarNotas(
  sessionId: string,
  characterId: string,
  notas: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await meuPersonagem(sessionId, characterId);
  if (!ctx) return { ok: false, error: "Personagem não encontrado nesta mesa." };
  const { data: atual } = await ctx.supabase
    .from("characters")
    .select("stats")
    .eq("id", characterId)
    .single<{ stats: Record<string, unknown> | null }>();
  const { error } = await ctx.supabase
    .from("characters")
    .update({ stats: { ...(atual?.stats ?? {}), notas: sanearNotas(notas) } })
    .eq("id", characterId);
  return error ? { ok: false, error: error.message } : { ok: true };
}
