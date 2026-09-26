"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { itemById, LOJAS, precoNaMesa } from "@/lib/character-creation/sacramento/catalogo";
import { limitesComEconomia } from "@/lib/character-creation/sacramento/rules";
import { economiaDaMesa, formatarReis } from "@/lib/rulesets/sacramento/economia";

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
