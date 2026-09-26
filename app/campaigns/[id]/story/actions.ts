"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { normalizeEmails } from "@/lib/campaign-invites";
import { sanitizeWoven, wovenToElements } from "@/lib/rulesets/sacramento/weave";
import { REGUA_ECONOMIA, economiaDaMesa } from "@/lib/rulesets/sacramento/economia";
import type {
  CampaignConfig,
  CampaignElement,
  CampaignElementKind,
  CampaignElementVisibility,
} from "@/lib/types";

type Ok<T = unknown> = ({ ok: true } & T) | { ok: false; error: string };

type GmContext =
  | { ok: false; error: string }
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string };

async function requireGmOfSession(sessionId: string): Promise<GmContext> {
  const auth = await getProfile();
  if (!auth) return { ok: false, error: "Não autenticado" };
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, gm_id")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session || session.gm_id !== auth.user.id) {
    return { ok: false, error: "Apenas o Juiz desta campanha pode editá-la." };
  }
  return { ok: true, supabase, userId: auth.user.id };
}

export async function updateCampaignConfig(
  sessionId: string,
  config: CampaignConfig,
): Promise<Ok> {
  const ctx = await requireGmOfSession(sessionId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("sessions")
    .update({ campaign: config })
    .eq("id", sessionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/campaigns/${sessionId}/story`);
  return { ok: true };
}

export async function createElement(
  sessionId: string,
  kind: CampaignElementKind,
  visibility: CampaignElementVisibility,
  data: Record<string, unknown>,
): Promise<Ok<{ element: CampaignElement }>> {
  const ctx = await requireGmOfSession(sessionId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { data: element, error } = await ctx.supabase
    .from("campaign_elements")
    .insert({ session_id: sessionId, kind, visibility, data })
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/campaigns/${sessionId}/story`);
  return { ok: true, element: element as CampaignElement };
}

export async function updateElement(
  sessionId: string,
  elementId: string,
  patch: { data?: Record<string, unknown>; visibility?: CampaignElementVisibility },
): Promise<Ok<{ element: CampaignElement }>> {
  const ctx = await requireGmOfSession(sessionId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { data: element, error } = await ctx.supabase
    .from("campaign_elements")
    .update(patch)
    .eq("id", elementId)
    .eq("session_id", sessionId)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/campaigns/${sessionId}/story`);
  return { ok: true, element: element as CampaignElement };
}

// ─── Imagens de elementos (bucket campaign-images, migration 006) ───
// Upload via service role: a autorização é a checagem de Juiz acima,
// então o bucket não precisa de policies de escrita.

const IMAGE_BUCKET = "campaign-images";
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function uploadCampaignImage(
  sessionId: string,
  formData: FormData,
): Promise<Ok<{ url: string }>> {
  const ctx = await requireGmOfSession(sessionId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Nenhuma imagem recebida." };
  }
  const ext = IMAGE_EXT_BY_TYPE[file.type];
  if (!ext) {
    return { ok: false, error: "Formato não suportado — use JPG, PNG, WebP ou GIF." };
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return { ok: false, error: "Imagem acima de 5 MB. Reduza e tente de novo." };
  }

  const admin = createAdminClient();
  const path = `${sessionId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) {
    const missing = /bucket/i.test(error.message) && /not.*found/i.test(error.message);
    return {
      ok: false,
      error: missing
        ? "Bucket de imagens não existe — rode a migration 006_campaign_images.sql no SQL Editor."
        : error.message,
    };
  }

  const { data } = admin.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

export async function deleteCampaignImage(
  sessionId: string,
  imageUrl: string,
): Promise<Ok> {
  const ctx = await requireGmOfSession(sessionId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  // Só remove objetos da pasta desta campanha dentro do bucket.
  const marker = `/object/public/${IMAGE_BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  const path = idx >= 0 ? decodeURIComponent(imageUrl.slice(idx + marker.length)) : null;
  if (!path || !path.startsWith(`${sessionId}/`)) {
    return { ok: false, error: "URL de imagem inválida para esta campanha." };
  }

  const admin = createAdminClient();
  const { error } = await admin.storage.from(IMAGE_BUCKET).remove([path]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteElement(
  sessionId: string,
  elementId: string,
): Promise<Ok> {
  const ctx = await requireGmOfSession(sessionId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("campaign_elements")
    .delete()
    .eq("id", elementId)
    .eq("session_id", sessionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/campaigns/${sessionId}/story`);
  return { ok: true };
}

// ─── Convites por e-mail (campaign_invites, migration 008) ───

export async function addInvites(sessionId: string, rawEmails: string[]): Promise<Ok<{ added: number }>> {
  const ctx = await requireGmOfSession(sessionId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const emails = normalizeEmails(rawEmails);
  if (emails.length === 0) return { ok: false, error: "Nenhum e-mail válido." };

  const { data, error } = await ctx.supabase
    .from("campaign_invites")
    .upsert(
      emails.map((email) => ({ session_id: sessionId, email })),
      { onConflict: "session_id,email", ignoreDuplicates: true },
    )
    .select("id");
  if (error) {
    const missing = /campaign_invites/i.test(error.message);
    return {
      ok: false,
      error: missing
        ? "Banco desatualizado — rode a migration 008_campaign_invites.sql no SQL Editor."
        : error.message,
    };
  }

  revalidatePath(`/campaigns/${sessionId}/story`);
  return { ok: true, added: data?.length ?? 0 };
}

/**
 * Retira um convite. Se o jogador já tinha reivindicado mas ainda não criou
 * personagem, sai da mesa também; quem já tem personagem continua (o Juiz
 * remove pelo lobby, se quiser).
 */
export async function removeInvite(
  sessionId: string,
  target: { inviteId?: string | null; playerId?: string | null },
): Promise<Ok> {
  const ctx = await requireGmOfSession(sessionId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  if (target.inviteId) {
    const { error } = await ctx.supabase
      .from("campaign_invites")
      .delete()
      .eq("id", target.inviteId)
      .eq("session_id", sessionId);
    if (error) return { ok: false, error: error.message };
  }
  if (target.playerId) {
    await ctx.supabase
      .from("session_players")
      .delete()
      .eq("session_id", sessionId)
      .eq("player_id", target.playerId)
      .eq("status", "invited");
  }

  revalidatePath(`/campaigns/${sessionId}/story`);
  return { ok: true };
}

// ─── Campanha tecida pela IA (proposta → elementos) ───

export async function applyWovenCampaign(
  sessionId: string,
  rawProposal: unknown,
  opts: { replacePremise: boolean },
): Promise<Ok<{ elements: CampaignElement[]; config: CampaignConfig | null }>> {
  const ctx = await requireGmOfSession(sessionId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const proposal = sanitizeWoven(rawProposal);
  const rows = wovenToElements(proposal).map((el, i) => ({
    session_id: sessionId,
    kind: el.kind,
    visibility: "gm_only" as const,
    position: i,
    data: el.data,
  }));

  let elements: CampaignElement[] = [];
  if (rows.length > 0) {
    const { data, error } = await ctx.supabase.from("campaign_elements").insert(rows).select("*");
    if (error) return { ok: false, error: error.message };
    elements = (data ?? []) as CampaignElement[];
  }

  let config: CampaignConfig | null = null;
  if (opts.replacePremise && (proposal.premissa || proposal.objetivoDoBando)) {
    const { data: atual } = await ctx.supabase
      .from("sessions")
      .select("campaign")
      .eq("id", sessionId)
      .single<{ campaign: CampaignConfig }>();
    config = {
      ...(atual?.campaign ?? {}),
      ...(proposal.premissa ? { premise: proposal.premissa } : {}),
      ...(proposal.objetivoDoBando ? { band_goal: proposal.objetivoDoBando } : {}),
    };
    const { error } = await ctx.supabase.from("sessions").update({ campaign: config }).eq("id", sessionId);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/campaigns/${sessionId}/story`);
  return { ok: true, elements, config };
}

// ─── Economia da mesa (regra de mesa: inflação) ───

/**
 * Muda a economia da campanha a qualquer momento — inclusive no meio da partida.
 * Jogadores recebem o novo preço em tempo real (sessions está no realtime) e um aviso.
 */
export async function definirEconomia(
  sessionId: string,
  nivelId: string,
): Promise<Ok<{ nivelId: string }>> {
  const ctx = await requireGmOfSession(sessionId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const nivel = REGUA_ECONOMIA.find((n) => n.id === nivelId);
  if (!nivel) return { ok: false, error: "Nível de economia inválido." };

  const { data: sessao } = await ctx.supabase
    .from("sessions")
    .select("settings")
    .eq("id", sessionId)
    .single<{ settings: Record<string, unknown> | null }>();
  const anterior = economiaDaMesa(sessao?.settings);
  if (anterior.id === nivel.id) return { ok: true, nivelId: nivel.id };

  const { error } = await ctx.supabase
    .from("sessions")
    .update({
      settings: {
        ...(sessao?.settings ?? {}),
        economia: { nivelId: nivel.id, alteradaEm: new Date().toISOString() },
      },
    })
    .eq("id", sessionId);
  if (error) return { ok: false, error: error.message };

  const subiu = nivel.multiplicador > anterior.multiplicador;
  const titulo = `${nivel.emoji} Os preços ${subiu ? "subiram" : "caíram"}: ${nivel.nome}`;
  const mensagem = `Tudo agora custa ×${nivel.multiplicador.toLocaleString("pt-BR")} do preço de tabela. "${nivel.fala}"`;
  // Aviso aos jogadores (falha aqui não desfaz a mudança de economia).
  await Promise.all([
    ctx.supabase.from("notifications").insert({
      session_id: sessionId,
      target_id: null,
      type: "info",
      title: titulo,
      message: mensagem,
      vibrate: false,
    }),
    ctx.supabase.from("session_events").insert({
      session_id: sessionId,
      actor_id: ctx.userId,
      type: "gm_note",
      is_public: true,
      payload: { tipo: "economia", nivelId: nivel.id, texto: `${titulo}. ${mensagem}` },
    }),
  ]);

  revalidatePath(`/campaigns/${sessionId}/story`);
  revalidatePath(`/play/${sessionId}`);
  revalidatePath("/play/characters/new");
  return { ok: true, nivelId: nivel.id };
}
