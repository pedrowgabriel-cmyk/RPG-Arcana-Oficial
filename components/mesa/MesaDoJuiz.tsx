"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { updateStatus } from "@/app/dashboard/sessions/[id]/actions";
import { ReguaEconomia } from "@/components/campaign-story/ReguaEconomia";
import { economiaDaMesa, nivelEconomia } from "@/lib/rulesets/sacramento/economia";
import { cenaDaMesa, iniciativaDaMesa } from "@/lib/rulesets/sacramento/mesa";
import type { CampaignElement, Character, Session, SessionEvent } from "@/lib/types";
import { BandoJuiz } from "./BandoJuiz";
import { CenaJuiz, type NpcCombate } from "./CenaJuiz";
import { CombateJuiz } from "./CombateJuiz";
import { textoEvento } from "./pecas";

type Aba = "bando" | "cena" | "combate" | "log";

function Coluna({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      <h2 className="mb-2 shrink-0 font-cinzel text-xs uppercase tracking-[0.3em] text-arcana-gold-bright">{titulo}</h2>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
        {children}
      </div>
    </section>
  );
}

export function MesaDoJuiz({
  initialSession,
  initialCharacters,
  initialEvents,
  elementos,
  jogadores,
}: {
  initialSession: Session;
  initialCharacters: Character[];
  initialEvents: SessionEvent[];
  elementos: CampaignElement[];
  jogadores: Record<string, string>;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState(initialSession);
  const [characters, setCharacters] = useState(initialCharacters);
  const [events, setEvents] = useState(initialEvents);
  const [aba, setAba] = useState<Aba>("bando");
  const [economiaAberta, setEconomiaAberta] = useState(false);
  const [npcs, setNpcs] = useState<(NpcCombate & { qtd: number })[]>([]);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const refetchChars = useCallback(async () => {
    const { data } = await supabase.from("characters").select("*").eq("session_id", session.id).order("created_at");
    if (data) setCharacters((data as Character[]).filter((c) => c.owner_id !== session.gm_id));
  }, [supabase, session.id, session.gm_id]);

  useEffect(() => {
    const ch = supabase
      .channel(`mesa-juiz-${session.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "characters", filter: `session_id=eq.${session.id}` }, () => void refetchChars())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_events", filter: `session_id=eq.${session.id}` }, (p) =>
        setEvents((prev) => [p.new as SessionEvent, ...prev].slice(0, 200)),
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${session.id}` }, (p) =>
        setSession((s) => ({ ...s, ...(p.new as Session) })),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, session.id, refetchChars]);

  const economia = nivelEconomia(economiaDaMesa(session.settings).id);
  const cena = cenaDaMesa(session.settings);
  const iniciativa = iniciativaDaMesa(session.settings);

  function status(next: "active" | "paused" | "finished") {
    start(async () => {
      const r = await updateStatus(session.id, next);
      if (r.error) setErro(r.error);
      else if (next === "finished") router.push(`/dashboard/sessions/${session.id}`);
      else router.refresh();
    });
  }

  const colBando = <BandoJuiz sessionId={session.id} characters={characters} jogadores={jogadores} />;
  const colCena = (
    <CenaJuiz
      sessionId={session.id}
      cenaAtual={cena}
      elementos={elementos}
      onNpcCombate={(n) => {
        setNpcs((prev) => (prev.some((x) => x.id === n.id) ? prev : [...prev, { ...n, qtd: 1 }]));
        setAba("combate");
      }}
    />
  );
  const colCombate = <CombateJuiz sessionId={session.id} iniciativa={iniciativa} characters={characters} npcs={npcs} setNpcs={setNpcs} />;
  const colLog = (
    <ul className="space-y-1.5">
      {events.map((e) => (
        <li key={e.id} className="rounded-lg border border-arcana-border-dim px-2.5 py-1.5 font-crimson text-sm text-arcana-text">
          <span className="mr-1.5 text-xs text-arcana-text-dim">
            {new Date(e.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            {!e.is_public && " 🔒"}
          </span>
          {textoEvento(e)}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="arcana-scene fixed inset-0 z-40 flex flex-col text-arcana-text">
      {/* Cabeçalho */}
      <header className="arcana-glass-edge flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-arcana-border-dim px-4 py-2.5">
        <Link href={`/dashboard/sessions/${session.id}`} className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-text hover:text-arcana-gold">
          ← Lobby
        </Link>
        <div className="min-w-0">
          <p className="font-cinzel text-[10px] uppercase tracking-[0.35em] text-arcana-gold">Mesa do Juiz · Sacramento</p>
          <h1 className="truncate font-cinzel text-base font-bold uppercase tracking-[0.12em] text-arcana-gold-bright">{session.title}</h1>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 font-cinzel text-[10px] uppercase tracking-[0.2em] ${session.status === "active" ? "border-emerald-400/60 text-emerald-200" : "border-amber-400/60 text-amber-200"}`}>
          {session.status === "active" ? "● Em jogo" : "⏸ Pausada"}
        </span>
        {iniciativa && <span className="font-cinzel text-xs text-arcana-gold-bright">⚔ Rodada {iniciativa.rodada}</span>}
        <button
          type="button"
          onClick={() => setEconomiaAberta(true)}
          className="rounded-xl border border-arcana-border px-3 py-1.5 font-cinzel text-[10px] uppercase tracking-[0.18em] text-arcana-text hover:border-arcana-gold/60"
        >
          {economia.emoji} {economia.nome} ×{economia.multiplicador.toLocaleString("pt-BR")}
        </button>
        <Link href={`/campaigns/${session.id}/story`} className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-arcana-text hover:text-arcana-gold">
          Hub de História ↗
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {session.status === "active" ? (
            <button className="arcana-btn-ghost arcana-btn-sm" disabled={pending} onClick={() => status("paused")}>Pausar</button>
          ) : (
            <button className="arcana-btn-primary arcana-btn-sm" disabled={pending} onClick={() => status("active")}>Retomar</button>
          )}
          <button
            className="arcana-btn-danger arcana-btn-sm"
            disabled={pending}
            onClick={() => { if (window.confirm("Encerrar a partida? Não dá para desfazer.")) status("finished"); }}
          >
            Encerrar
          </button>
        </div>
        {erro && <p className="w-full font-crimson text-sm text-red-300">{erro}</p>}
      </header>

      {/* Abas no celular */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-arcana-border-dim px-3 py-2 lg:hidden">
        {(["bando", "cena", "combate", "log"] as Aba[]).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAba(a)}
            className={`shrink-0 rounded-xl px-3 py-1.5 font-cinzel text-[11px] uppercase tracking-[0.18em] ${aba === a ? "bg-arcana-gold font-bold text-arcana-bg" : "text-arcana-text"}`}
          >
            {{ bando: "Bando", cena: "Cena", combate: "Combate", log: "Registro" }[a]}
          </button>
        ))}
      </nav>

      <main className="min-h-0 flex-1 overflow-y-auto p-3 lg:hidden">
        {aba === "bando" && colBando}
        {aba === "cena" && colCena}
        {aba === "combate" && colCombate}
        {aba === "log" && colLog}
      </main>

      <main className="hidden min-h-0 flex-1 gap-4 p-4 lg:grid lg:grid-cols-[1.15fr_1fr_1fr]">
        <Coluna titulo={`Bando (${characters.length})`}>{colBando}</Coluna>
        <Coluna titulo="Cena">{colCena}</Coluna>
        <section className="flex min-h-0 flex-col gap-3">
          <div className="min-h-0 flex-[3]">
            <Coluna titulo="Combate e dados">{colCombate}</Coluna>
          </div>
          <div className="min-h-0 flex-[2]">
            <Coluna titulo="Registro da mesa">{colLog}</Coluna>
          </div>
        </section>
      </main>

      {economiaAberta && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <button aria-label="Fechar" onClick={() => setEconomiaAberta(false)} className="absolute inset-0 bg-black/70" />
          <div className="arcana-card relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="arcana-heading text-xl tracking-[0.12em]">Economia da mesa</h2>
              <button type="button" onClick={() => setEconomiaAberta(false)} className="arcana-btn-ghost arcana-btn-sm">Fechar</button>
            </div>
            <ReguaEconomia sessionId={session.id} nivelAtualId={economia.id} compacto />
          </div>
        </div>
      )}
    </div>
  );
}
