"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { acessoMesa } from "@/lib/campaign-invites";
import type {
  BaseVisual,
  ElementosHistoria,
  FichaMecanica,
  HistoriaEstruturada,
  ImagensGeradas,
} from "@/lib/character-creation/sacramento/types";
import { baseId } from "@/lib/character-creation/sacramento/bases";
import { characterImagePath } from "@/lib/character-creation/sacramento/kits";
import { calcularDerivados, limitesComEconomia, validarFicha, XP_POR_NIVEL } from "@/lib/character-creation/sacramento/rules";
import { contarParrudeza } from "@/lib/character-creation/sacramento/habilidades";
import { itemById, precoNaMesa, resumoCompras } from "@/lib/character-creation/sacramento/catalogo";

export type CreateSacramentoPayload = {
  name: string;
  base: BaseVisual;
  kitId: string;
  elementos: ElementosHistoria;
  historia: HistoriaEstruturada;
  historiaModo: "manual" | "ia";
  ficha: FichaMecanica;
  /** URLs públicas geradas na forja (close/estados/banner) — ausentes se a forja falhou. */
  imagens?: ImagensGeradas;
  /** Ignorado pelo servidor — as regras valem as gravadas na campanha. */
  regras?: { dinheiroInicial: number; itensIniciais: { id: string; quantidade: number }[] };
  /** Campanha onde o personagem nasce — o jogador precisa ter sido convidado. */
  sessionId: string;
};

/** Compila a história estruturada num texto corrido para a coluna backstory. */
function renderBackstory(h: HistoriaEstruturada): string {
  const partes = [
    h.resumo,
    ...h.capitulos.map((c) => `## ${c.titulo}\n${c.texto}`),
    h.familia ? `## Família\n${h.familia}` : null,
    h.vinculos.length > 0
      ? `## Vínculos\n${h.vinculos
          .map((v) => `- ${v.nome} (${v.relacao})${v.detalhe ? `: ${v.detalhe}` : ""}`)
          .join("\n")}`
      : null,
    `## Trilha de Redenção — ${h.redencao.trilhaNome}\n${h.redencao.premissa}\n${h.redencao.passos
      .map((p, i) => `${i + 1}. ${p}${i === 5 ? " (encerramento)" : ""}`)
      .join("\n")}`,
    h.ganchos.length > 0 ? `## Pontas soltas\n${h.ganchos.map((g) => `- ${g}`).join("\n")}` : null,
  ];
  return partes.filter(Boolean).join("\n\n");
}

export async function createSacramentoCharacter(
  payload: CreateSacramentoPayload,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getProfile();
  if (!auth) {
    return { ok: false, error: "Não autenticado" };
  }

  const acesso = await acessoMesa(auth.user.id, payload.sessionId);
  if (!acesso.ok) {
    return {
      ok: false,
      error:
        acesso.motivo === "sem-convite"
          ? "Você não foi convidado para esta campanha."
          : "Campanha indisponível para criação de personagem.",
    };
  }
  const isJuizDaMesa = acesso.session.gm_id === auth.user.id;

  const name = payload.name?.trim();
  if (!name || name.length < 2) {
    return { ok: false, error: "Nome do personagem é obrigatório" };
  }
  if (!payload.historia || payload.historia.redencao?.passos?.length !== 6) {
    return { ok: false, error: "História incompleta — a trilha de redenção precisa de 6 passos" };
  }

  // Regras da mesa lidas do banco — nunca do cliente.
  const limites = limitesComEconomia(acesso.session.settings);
  const ficha = payload.ficha;
  const dinheiroInicial = limites.dinheiroInicial;
  const validacao = validarFicha(ficha, dinheiroInicial, limites);
  if (validacao.erros.length > 0) {
    return { ok: false, error: validacao.erros[0] };
  }

  const derivados = calcularDerivados(ficha, contarParrudeza(ficha.habilidades));
  const proximoNivel = Math.min(6, ficha.nivel + 1) as keyof typeof XP_POR_NIVEL;
  const compras = resumoCompras(ficha.compras ?? [], dinheiroInicial, limites.multiplicadorPrecos);
  const inventario = (ficha.compras ?? [])
    .map((c) => {
      const item = itemById(c.id);
      return item
        ? {
            id: item.id,
            nome: item.nome,
            categoria: item.categoria,
            quantidade: c.quantidade,
            precoPago: precoNaMesa(item.preco, limites.multiplicadorPrecos),
            espaco: item.espaco,
          }
        : null;
    })
    .filter(Boolean) as Record<string, unknown>[];

  // Equipamento da mesa: itens que todo personagem recebe de graça (não descontam).
  for (const inicial of limites.itensIniciais) {
    const item = itemById(inicial.id);
    if (!item || inicial.quantidade <= 0) continue;
    inventario.push({
      id: item.id,
      nome: item.nome,
      categoria: item.categoria,
      quantidade: inicial.quantidade,
      precoPago: 0,
      espaco: item.espaco,
      daMesa: true,
    });
  }

  const supabase = await createClient();

  // Idempotência: cliques duplos ou effects repetidos não criam personagem em dobro.
  const { data: recente } = await supabase
    .from("characters")
    .select("id")
    .eq("owner_id", auth.user.id)
    .eq("name", name)
    .gte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
    .limit(1);
  if (recente && recente.length > 0) {
    revalidatePath("/hub");
    return { ok: true };
  }

  if (!isJuizDaMesa) {
    const { count } = await supabase
      .from("characters")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", auth.user.id)
      .eq("session_id", payload.sessionId);
    if ((count ?? 0) >= limites.personagensPorJogador) {
      return {
        ok: false,
        error: `Esta mesa permite ${limites.personagensPorJogador} personagem${limites.personagensPorJogador > 1 ? "s" : ""} por jogador.`,
      };
    }
  }

  const insertRow: Record<string, unknown> = {
    owner_id: auth.user.id,
    session_id: payload.sessionId,
    name,
    class: "",
    race: "",
    level: ficha.nivel,
    hp: derivados.vidaMaxima,
    max_hp: derivados.vidaMaxima,
    temp_hp: 0,
    ac: derivados.defesa,
    initiative: 0, // iniciativa em Sacramento usa cartas, não um número (pp. 26, 78)
    speed: derivados.movimentos,
    xp: derivados.xp,
    xp_next_level: XP_POR_NIVEL[proximoNivel],
    // A coluna é integer, mas o catálogo tem preços em centavos (meias $0,25…):
    // arredonda aqui e guarda o saldo exato em stats.saldo.
    gold: Math.round(compras.saldo),
    conditions: [],
    death_saves: { successes: 0, failures: 0 },
    stats: {
      sistema: "sacramento",
      saldo: compras.saldo, // valor exato, com centavos ($200 menos as compras, p. 52)
      atributos: ficha.atributos,
      derivados: {
        vidaMaxima: derivados.vidaMaxima,
        capacidadeDor: derivados.capacidadeDor,
        defesa: derivados.defesa,
        movimentos: derivados.movimentos,
        acoesCombate: derivados.acoesCombate,
        cartasIniciativa: derivados.cartasIniciativa,
      },
      montarias: ficha.montarias ?? [],
    },
    skills: { antecedentes: ficha.antecedentes, habilidades: ficha.habilidades },
    inventory: inventario,
    spells: [],
    backstory: renderBackstory(payload.historia),
    notes: "",
    // O close gerado na forja é o retrato de qualidade do Hub; sem forja, cai no kit estático.
    avatar_url: payload.imagens?.close ?? characterImagePath(payload.base, payload.kitId),
    ai_summary: "",
    // Apresentação/idade ficam em visual (as colunas da migration 004 não existem no banco).
    visual: {
      base: { ...payload.base, baseId: baseId(payload.base) },
      kitId: payload.kitId,
      imagens: payload.imagens ?? {},
    },
    story: {
      elementos: payload.elementos,
      historia: payload.historia,
      origem: payload.historiaModo,
      aprovadaEm: new Date().toISOString(),
    },
  };

  const { error } = await supabase.from("characters").insert(insertRow);
  if (error) {
    // PostgREST: "Could not find the 'story' column of 'characters' in the schema cache"
    const colunaFaltando =
      /column/i.test(error.message) && /(visual|story)/i.test(error.message);
    return {
      ok: false,
      error: colunaFaltando
        ? "Banco desatualizado — rode a migration 007_sacramento_character_wizard.sql no SQL Editor."
        : error.message,
    };
  }

  // Personagem pronto = jogador entra de vez na mesa (o Juiz vê no Bando).
  if (!isJuizDaMesa) {
    await createAdminClient()
      .from("session_players")
      .update({ status: "joined", joined_at: new Date().toISOString() })
      .eq("session_id", payload.sessionId)
      .eq("player_id", auth.user.id)
      .eq("status", "invited");
  }

  revalidatePath("/hub");
  revalidatePath(`/campaigns/${payload.sessionId}/story`);
  // Sem redirect: o cliente ainda revela o banner de Procurado antes de ir ao Hub.
  return { ok: true };
}
