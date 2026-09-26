"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type {
  CampaignConfig,
  CampaignElement,
  CampaignElementKind,
  CampaignElementVisibility,
  PartyMember,
  Session,
} from "@/lib/types";
import {
  createElement as createElementAction,
  deleteElement as deleteElementAction,
  updateCampaignConfig,
  updateElement as updateElementAction,
} from "@/app/campaigns/[id]/story/actions";
import { OverviewSection } from "./sections/OverviewSection";
import { PlacesSection } from "./sections/PlacesSection";
import { FactionsSection } from "./sections/FactionsSection";
import { NpcsSection } from "./sections/NpcsSection";
import { ScenesSection } from "./sections/ScenesSection";
import { MissionsSection } from "./sections/MissionsSection";
import { CalendarSection } from "./sections/CalendarSection";
import { SecretsSection } from "./sections/SecretsSection";
import { PartySection } from "./sections/PartySection";
import { limitesDaMesa } from "@/lib/character-creation/sacramento/rules";
import { economiaDaMesa, nivelEconomia } from "@/lib/rulesets/sacramento/economia";
import { ReguaEconomia } from "./ReguaEconomia";
import { SectionHeader } from "./ui";

export type SectionId =
  | "overview"
  | "party"
  | "economia"
  | "places"
  | "factions"
  | "npcs"
  | "scenes"
  | "missions"
  | "calendar"
  | "secrets";

const SECTIONS: { id: SectionId; label: string; kind?: CampaignElementKind }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "party", label: "Jogadores" },
  { id: "economia", label: "Economia" },
  { id: "places", label: "Lugares", kind: "place" },
  { id: "factions", label: "Facções", kind: "faction" },
  { id: "npcs", label: "NPCs", kind: "npc" },
  { id: "scenes", label: "Cenas", kind: "scene" },
  { id: "missions", label: "Missões", kind: "mission" },
  { id: "calendar", label: "Calendário", kind: "calendar_event" },
  { id: "secrets", label: "Segredos do Juiz", kind: "secret_note" },
];

export type StoryHubApi = {
  sessionId: string;
  aiEnabled: boolean;
  config: CampaignConfig;
  saveConfig: (next: CampaignConfig) => Promise<boolean>;
  elementsOf: (kind: CampaignElementKind) => CampaignElement[];
  addElement: (
    kind: CampaignElementKind,
    visibility: CampaignElementVisibility,
    data: Record<string, unknown>,
  ) => Promise<CampaignElement | null>;
  patchElement: (
    elementId: string,
    patch: { data?: Record<string, unknown>; visibility?: CampaignElementVisibility },
  ) => Promise<CampaignElement | null>;
  removeElement: (elementId: string) => Promise<boolean>;
  /** Incorpora elementos/config gravados em lote (ex.: campanha tecida pela IA). */
  ingest: (elements: CampaignElement[], config: CampaignConfig | null) => void;
};

type Props = {
  session: Session;
  initialElements: CampaignElement[];
  justCreated: boolean;
  party: PartyMember[];
  invitesReady: boolean;
};

export function StoryHub({ session, initialElements, justCreated, party, invitesReady }: Props) {
  // Campanha recém-fundada abre no Bando: o próximo passo é convidar.
  const [active, setActive] = useState<SectionId>(justCreated ? "party" : "overview");
  const [economiaId, setEconomiaId] = useState(() => economiaDaMesa(session.settings).id);
  const [config, setConfig] = useState<CampaignConfig>(session.campaign ?? {});
  const [elements, setElements] = useState<CampaignElement[]>(initialElements);
  const [banner, setBanner] = useState(justCreated);
  const [lastError, setLastError] = useState<string | null>(null);

  const saveConfig = useCallback(
    async (next: CampaignConfig) => {
      setConfig(next);
      const result = await updateCampaignConfig(session.id, next);
      if (!result.ok) {
        setLastError(result.error);
        return false;
      }
      setLastError(null);
      return true;
    },
    [session.id],
  );

  const addElement = useCallback(
    async (
      kind: CampaignElementKind,
      visibility: CampaignElementVisibility,
      data: Record<string, unknown>,
    ) => {
      const result = await createElementAction(session.id, kind, visibility, data);
      if (!result.ok) {
        setLastError(result.error);
        return null;
      }
      setLastError(null);
      setElements((prev) => [...prev, result.element]);
      return result.element;
    },
    [session.id],
  );

  const patchElement = useCallback(
    async (
      elementId: string,
      patch: { data?: Record<string, unknown>; visibility?: CampaignElementVisibility },
    ) => {
      const result = await updateElementAction(session.id, elementId, patch);
      if (!result.ok) {
        setLastError(result.error);
        return null;
      }
      setLastError(null);
      setElements((prev) =>
        prev.map((el) => (el.id === elementId ? result.element : el)),
      );
      return result.element;
    },
    [session.id],
  );

  const removeElement = useCallback(
    async (elementId: string) => {
      const result = await deleteElementAction(session.id, elementId);
      if (!result.ok) {
        setLastError(result.error);
        return false;
      }
      setLastError(null);
      setElements((prev) => prev.filter((el) => el.id !== elementId));
      return true;
    },
    [session.id],
  );

  const ingest = useCallback((novos: CampaignElement[], nextConfig: CampaignConfig | null) => {
    setElements((prev) => [...prev, ...novos]);
    if (nextConfig) setConfig(nextConfig);
  }, []);

  const api: StoryHubApi = useMemo(
    () => ({
      sessionId: session.id,
      aiEnabled: session.settings?.ai_assistant !== false,
      config,
      saveConfig,
      elementsOf: (kind) => elements.filter((el) => el.kind === kind),
      addElement,
      patchElement,
      removeElement,
      ingest,
    }),
    [
      session.id,
      session.settings?.ai_assistant,
      config,
      saveConfig,
      elements,
      addElement,
      patchElement,
      removeElement,
      ingest,
    ],
  );

  const prontos = party.filter((m) => m.status === "pronto").length;
  const countOf = (section: (typeof SECTIONS)[number]) =>
    section.id === "party"
      ? party.length
      : section.kind
        ? elements.filter((el) => el.kind === section.kind).length
        : 0;

  return (
    <div className="arcana-scene flex h-dvh flex-col text-arcana-text">
      {/* Header fixo */}
      <header className="arcana-glass-edge shrink-0 border-b border-arcana-border-dim">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/hub"
              className="shrink-0 font-cinzel text-[10px] uppercase tracking-[0.3em] text-arcana-text-dim transition-colors hover:text-arcana-gold"
            >
              ← Hub
            </Link>
            <div className="min-w-0">
              <p className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-arcana-gold">
                Hub de História · Sacramento
              </p>
              <h1 className="truncate font-cinzel text-base font-bold uppercase tracking-[0.15em] text-arcana-gold-bright">
                {session.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActive("economia")}
              title="Economia da mesa — clique para mudar"
              className="rounded-xl border border-arcana-border bg-arcana-surface px-3 py-2 font-cinzel text-[10px] uppercase tracking-[0.2em] text-arcana-text transition-all hover:border-arcana-gold/50"
            >
              {nivelEconomia(economiaId).emoji} {nivelEconomia(economiaId).nome} ×
              {nivelEconomia(economiaId).multiplicador.toLocaleString("pt-BR")}
            </button>
            <button
              type="button"
              onClick={() => setActive("party")}
              className="rounded-xl border border-arcana-border bg-arcana-surface px-3 py-2 font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-text transition-all hover:border-arcana-gold/50"
            >
              Jogadores {prontos}/{party.length} prontos
            </button>
            <Link
              href={`/dashboard/sessions/${session.id}`}
              className="rounded-xl border border-arcana-gold/50 px-4 py-2 font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-gold transition-all hover:shadow-[0_0_16px_rgba(201,168,76,0.3)]"
            >
              Ir para o lobby
            </Link>
          </div>
        </div>
      </header>

      {/* Banner pós-criação */}
      {banner && (
        <div className="shrink-0 border-b border-arcana-gold/20 bg-arcana-gold/5 px-5 py-2.5 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <p className="font-crimson text-sm italic text-arcana-text-dim">
              Campanha fundada. Convide os jogadores por e-mail na aba Jogadores; quando os
              personagens ficarem prontos, a IA pode tecer a campanha a partir das histórias deles.
            </p>
            <button
              type="button"
              onClick={() => setBanner(false)}
              className="shrink-0 font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-text-dim hover:text-arcana-gold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {lastError && (
        <div className="shrink-0 border-b border-red-900/40 bg-red-950/30 px-5 py-2 lg:px-8">
          <p className="font-crimson text-sm italic text-red-300">{lastError}</p>
        </div>
      )}

      {/* Corpo: nav lateral + conteúdo */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar desktop */}
        <nav className="arcana-sidebar hidden w-60 shrink-0 flex-col gap-1 overflow-y-auto p-3 lg:flex">
          <p className="px-3 pb-2 pt-1 font-cinzel text-[10px] font-bold uppercase tracking-[0.35em] text-arcana-gold">
            Grimório
          </p>
          {SECTIONS.map((section) => {
            const isActive = active === section.id;
            const count = countOf(section);
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActive(section.id)}
                className={[
                  "arcana-sidebar-item flex items-center justify-between rounded-xl px-3 py-2.5 text-left font-cinzel text-[11px] uppercase tracking-[0.18em]",
                  isActive ? "arcana-sidebar-item-active font-bold" : "",
                ].join(" ")}
              >
                <span>{section.label}</span>
                {count > 0 && (
                  <span
                    className={[
                      "min-w-[1.4rem] rounded-full px-1.5 py-0.5 text-center font-crimson text-[11px]",
                      isActive
                        ? "bg-arcana-gold/25 text-arcana-gold-bright"
                        : "bg-white/[0.06] text-arcana-text-dim",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Tabs mobile */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div
            className="shrink-0 overflow-x-auto border-b border-arcana-border-dim lg:hidden"
            style={{ background: "linear-gradient(165deg, var(--color-arcana-leather-2), var(--color-arcana-leather))" }}
          >
            <div className="flex gap-1 px-3 py-2" style={{ scrollbarWidth: "none" }}>
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActive(section.id)}
                  className={[
                    "shrink-0 rounded-xl px-3 py-1.5 font-cinzel text-[10px] uppercase tracking-[0.2em] transition-all",
                    active === section.id
                      ? "bg-arcana-gold font-bold text-arcana-bg"
                      : "text-arcana-text/75",
                  ].join(" ")}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conteúdo scrollável */}
          <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 lg:px-10 lg:py-8">
            {active === "overview" && <OverviewSection api={api} />}
            {active === "economia" && (
              <div className="max-w-3xl space-y-6">
                <SectionHeader
                  title="Economia"
                  description="Como anda o dinheiro no Oeste desta campanha. Mude quando a história pedir — seca, corrida do ouro, cidade sitiada. Lojas, dinheiro inicial, serviços da Base e recompensas seguem a régua, e os jogadores são avisados na hora."
                />
                <div className="arcana-card p-5">
                  <ReguaEconomia sessionId={session.id} nivelAtualId={economiaId} onChange={setEconomiaId} />
                </div>
              </div>
            )}
            {active === "party" && (
              <PartySection
                api={api}
                party={party}
                invitesReady={invitesReady}
                regras={limitesDaMesa((session.settings as { regrasCriacao?: unknown } | null)?.regrasCriacao)}
              />
            )}
            {active === "places" && <PlacesSection api={api} />}
            {active === "factions" && <FactionsSection api={api} />}
            {active === "npcs" && <NpcsSection api={api} />}
            {active === "scenes" && <ScenesSection api={api} />}
            {active === "missions" && <MissionsSection api={api} />}
            {active === "calendar" && <CalendarSection api={api} />}
            {active === "secrets" && <SecretsSection api={api} />}
          </main>
        </div>
      </div>
    </div>
  );
}
