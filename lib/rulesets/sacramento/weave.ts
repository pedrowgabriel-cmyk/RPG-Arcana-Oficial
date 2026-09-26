// "Tecer a campanha": a IA propõe a campanha inteira a partir do bando pronto.
// A proposta é só uma proposta (docs/02 §3.3) — o Juiz escolhe o que entra e
// edita tudo depois nas seções do Hub de História.

import type { CampaignElementKind } from "@/lib/types";
import { SACRAMENTO_FACTIONS } from "./factions";
import { SACRAMENTO_PLACES } from "./places";
import type {
  CampaignCalendarEventData,
  CampaignFactionData,
  CampaignMissionData,
  CampaignNpcData,
  CampaignPlaceData,
  CampaignSceneData,
  CampaignSecretNoteData,
} from "./types";

export type WovenPlace = { canonId: string; nome: string; descricao: string; conflitos: string; notasDoJuiz: string };
export type WovenFaction = { canonId: string; nome: string; resumo: string; agenda: string; ameaca: string; notasDoJuiz: string };
export type WovenNpc = {
  nome: string; apelido: string; ocupacao: string; descricao: string; desejo: string; medo: string;
  segredo: string; vinculos: string; atitude: string; faccao: string; localizacao: string; agenda: string;
};
export type WovenScene = {
  titulo: string; lugar: string; momento: string; participantes: string; descricaoPublica: string;
  fatosVerdadeiros: string; rumores: string; segredosDoJuiz: string; elementosInterativos: string;
  testesPossiveis: string; consequenciasPossiveis: string;
};
export type WovenMission = {
  titulo: string; proponente: string; objetivo: string; envolvidos: string; local: string; motivo: string;
  recompensa: string; prazoFiccional: string; criteriosDeConclusao: string; vinculo: string; consequencias: string;
};
export type WovenCalendar = { titulo: string; quando: string; descricao: string };
export type WovenSecret = { titulo: string; texto: string };

export type WovenCampaign = {
  premissa: string;
  objetivoDoBando: string;
  arco: WovenSecret;
  lugares: WovenPlace[];
  faccoes: WovenFaction[];
  npcs: WovenNpc[];
  cenas: WovenScene[];
  missoes: WovenMission[];
  calendario: WovenCalendar[];
  segredos: WovenSecret[];
};

export type WovenListKey = "lugares" | "faccoes" | "npcs" | "cenas" | "missoes" | "calendario" | "segredos";

export const WOVEN_LISTS: { key: WovenListKey; label: string; kind: CampaignElementKind }[] = [
  { key: "lugares", label: "Lugares", kind: "place" },
  { key: "faccoes", label: "Facções", kind: "faction" },
  { key: "npcs", label: "NPCs", kind: "npc" },
  { key: "cenas", label: "Cenas", kind: "scene" },
  { key: "missoes", label: "Missões", kind: "mission" },
  { key: "calendario", label: "Calendário", kind: "calendar_event" },
  { key: "segredos", label: "Segredos do Juiz", kind: "secret_note" },
];

/** Título exibível de qualquer item da proposta. */
export function wovenTitle(item: Record<string, unknown>): string {
  return String(item.nome ?? item.titulo ?? "");
}

const str = (props: string[]) =>
  Object.fromEntries(props.map((p) => [p, { type: "string" }]));

const obj = (props: string[]) => ({
  type: "object",
  properties: str(props),
  required: props,
  additionalProperties: false,
});

const arr = (props: string[]) => ({ type: "array", items: obj(props) });

export const WEAVE_FIELDS = {
  lugares: ["canonId", "nome", "descricao", "conflitos", "notasDoJuiz"],
  faccoes: ["canonId", "nome", "resumo", "agenda", "ameaca", "notasDoJuiz"],
  npcs: ["nome", "apelido", "ocupacao", "descricao", "desejo", "medo", "segredo", "vinculos", "atitude", "faccao", "localizacao", "agenda"],
  cenas: ["titulo", "lugar", "momento", "participantes", "descricaoPublica", "fatosVerdadeiros", "rumores", "segredosDoJuiz", "elementosInterativos", "testesPossiveis", "consequenciasPossiveis"],
  missoes: ["titulo", "proponente", "objetivo", "envolvidos", "local", "motivo", "recompensa", "prazoFiccional", "criteriosDeConclusao", "vinculo", "consequencias"],
  calendario: ["titulo", "quando", "descricao"],
  segredos: ["titulo", "texto"],
} as const satisfies Record<WovenListKey, readonly string[]>;

const raiz = (props: Record<string, unknown>) => ({
  type: "object",
  properties: props,
  required: Object.keys(props),
  additionalProperties: false,
});

/**
 * A campanha sai em ETAPAS: um schema único com tudo estoura o limite de
 * gramática da API ("compiled grammar is too large"). A fundação vem primeiro;
 * NPCs, cenas e tramas saem em paralelo, costurados nela.
 */
export const WEAVE_ETAPAS = {
  fundacao: raiz({
    premissa: { type: "string" },
    objetivoDoBando: { type: "string" },
    arco: obj(["titulo", "texto"]),
    lugares: arr([...WEAVE_FIELDS.lugares]),
    faccoes: arr([...WEAVE_FIELDS.faccoes]),
  }),
  npcs: raiz({ npcs: arr([...WEAVE_FIELDS.npcs]) }),
  cenas: raiz({ cenas: arr([...WEAVE_FIELDS.cenas]) }),
  tramas: raiz({
    missoes: arr([...WEAVE_FIELDS.missoes]),
    calendario: arr([...WEAVE_FIELDS.calendario]),
    segredos: arr([...WEAVE_FIELDS.segredos]),
  }),
} as const;

export type EtapaWeave = keyof typeof WEAVE_ETAPAS;

const MAX_ITEMS = 20;
const MAX_CHARS = 4000;

const clean = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX_CHARS) : "");

/** Saneia a proposta (vinda da IA ou devolvida pelo cliente) no formato esperado. */
export function sanitizeWoven(raw: unknown): WovenCampaign {
  const r = (raw ?? {}) as Record<string, unknown>;
  const list = <K extends WovenListKey>(key: K) => {
    const items = Array.isArray(r[key]) ? (r[key] as Record<string, unknown>[]) : [];
    return items
      .slice(0, MAX_ITEMS)
      .map((item) =>
        Object.fromEntries(WEAVE_FIELDS[key].map((f) => [f, clean(item?.[f])])),
      )
      .filter((item) => wovenTitle(item)) as unknown as WovenCampaign[K];
  };
  const arco = (r.arco ?? {}) as Record<string, unknown>;
  return {
    premissa: clean(r.premissa),
    objetivoDoBando: clean(r.objetivoDoBando),
    arco: { titulo: clean(arco.titulo), texto: clean(arco.texto) },
    lugares: list("lugares"),
    faccoes: list("faccoes"),
    npcs: list("npcs"),
    cenas: list("cenas"),
    missoes: list("missoes"),
    calendario: list("calendario"),
    segredos: list("segredos"),
  };
}

const opt = (v: string) => v || undefined;

/** Converte a proposta escolhida em linhas de campaign_elements (todas gm_only). */
export function wovenToElements(
  w: WovenCampaign,
): { kind: CampaignElementKind; data: Record<string, unknown> }[] {
  const out: { kind: CampaignElementKind; data: Record<string, unknown> }[] = [];
  const push = (kind: CampaignElementKind, data: object) =>
    out.push({ kind, data: JSON.parse(JSON.stringify(data)) as Record<string, unknown> });

  if (w.arco.texto) {
    push("secret_note", { titulo: w.arco.titulo || "Arco da campanha", texto: w.arco.texto } satisfies CampaignSecretNoteData);
  }
  for (const p of w.lugares) {
    const canon = SACRAMENTO_PLACES.find((c) => c.id === p.canonId);
    push("place", {
      nome: canon?.nome ?? p.nome,
      origem: canon ? "canon" : "campanha",
      canonId: canon?.id,
      descricao: opt(p.descricao) ?? canon?.caracteristicas,
      conflitos: opt(p.conflitos) ?? canon?.conflitos,
      notasDoJuiz: opt(p.notasDoJuiz),
      paginas: canon?.paginas,
      imagem: canon?.imagem,
    } satisfies CampaignPlaceData);
  }
  for (const f of w.faccoes) {
    const canon = SACRAMENTO_FACTIONS.find((c) => c.id === f.canonId);
    push("faction", {
      nome: canon?.nome ?? f.nome,
      origem: canon ? "canon" : "campanha",
      canonId: canon?.id,
      resumo: opt(f.resumo) ?? canon?.resumo,
      agenda: opt(f.agenda),
      ameaca: opt(f.ameaca),
      notasDoJuiz: opt(f.notasDoJuiz),
      paginas: canon?.paginas,
      emblema: canon?.emblema,
    } satisfies CampaignFactionData);
  }
  for (const n of w.npcs) {
    push("npc", {
      nome: n.nome,
      origem: "campanha",
      apelido: opt(n.apelido),
      ocupacao: opt(n.ocupacao),
      descricao: opt(n.descricao),
      desejo: opt(n.desejo),
      medo: opt(n.medo),
      segredo: opt(n.segredo),
      vinculos: opt(n.vinculos),
      atitude: opt(n.atitude),
      faccao: opt(n.faccao),
      localizacao: opt(n.localizacao),
      agenda: opt(n.agenda),
    } satisfies CampaignNpcData);
  }
  for (const c of w.cenas) {
    push("scene", Object.fromEntries(Object.entries(c).map(([k, v]) => [k, opt(v)])) as unknown as CampaignSceneData);
  }
  for (const m of w.missoes) {
    push("mission", Object.fromEntries(Object.entries(m).map(([k, v]) => [k, opt(v)])) as unknown as CampaignMissionData);
  }
  for (const e of w.calendario) {
    push("calendar_event", {
      titulo: e.titulo,
      origem: "campanha",
      quando: e.quando || "a definir",
      descricao: opt(e.descricao),
    } satisfies CampaignCalendarEventData);
  }
  for (const s of w.segredos) {
    push("secret_note", { titulo: s.titulo, texto: s.texto } satisfies CampaignSecretNoteData);
  }
  return out;
}
