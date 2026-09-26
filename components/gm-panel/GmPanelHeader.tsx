"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Session, SessionEvent } from "@/lib/types";
import { updateStatus } from "@/app/dashboard/sessions/[id]/actions";
import { updateRound } from "@/app/dashboard/sessions/[id]/play/actions";
import { StatusBadge } from "@/components/sessions/SessionCard";
import { ReguaEconomia } from "@/components/campaign-story/ReguaEconomia";
import { economiaDaMesa, nivelEconomia } from "@/lib/rulesets/sacramento/economia";

type Props = {
  session: Session;
  events: SessionEvent[];
};

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function GmPanelHeader({ session, events }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [economiaAberta, setEconomiaAberta] = useState(false);
  const [economiaId, setEconomiaId] = useState(() => economiaDaMesa(session.settings).id);
  const economia = nivelEconomia(economiaId);

  const startEvent = events.find((e) => e.type === "session_start");
  const elapsed = startEvent
    ? now - new Date(startEvent.created_at).getTime()
    : 0;

  useEffect(() => {
    if (session.status !== "active" || !startEvent) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session.status, startEvent]);

  function changeStatus(next: "active" | "paused" | "finished") {
    startTransition(async () => {
      const r = await updateStatus(session.id, next);
      if (r.error) {
        setError(r.error);
        return;
      }
      if (next === "finished") {
        router.push(`/dashboard/sessions/${session.id}`);
      } else {
        router.refresh();
      }
    });
  }

  function changeRound(delta: number) {
    startTransition(async () => {
      const r = await updateRound(session.id, delta);
      if (r.error) setError(r.error);
    });
  }

  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-zinc-800 bg-zinc-900 px-4 py-2">
      <Link
        href={`/dashboard/sessions/${session.id}`}
        className="text-xs text-zinc-400 hover:text-zinc-200"
      >
        ← Lobby
      </Link>
      <div className="flex items-center gap-2">
        <h1 className="font-semibold text-zinc-100">{session.title}</h1>
        <StatusBadge status={session.status} />
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => changeRound(-1)}
          disabled={pending || session.current_round === 0}
          className="rounded bg-zinc-800 px-2 py-0.5 text-sm hover:bg-zinc-700 disabled:opacity-50"
        >
          −
        </button>
        <span className="text-xs text-zinc-400">
          Rodada <span className="text-zinc-100">{session.current_round}</span>
        </span>
        <button
          type="button"
          onClick={() => changeRound(1)}
          disabled={pending}
          className="rounded bg-zinc-800 px-2 py-0.5 text-sm hover:bg-zinc-700 disabled:opacity-50"
        >
          +
        </button>
      </div>

      {startEvent && (
        <div className="font-mono text-xs text-zinc-400">{formatElapsed(elapsed)}</div>
      )}

      {session.ruleset === "sacramento" && (
        <button
          type="button"
          onClick={() => setEconomiaAberta(true)}
          title="Economia da mesa — mudar preços agora"
          className="rounded border border-amber-500/40 bg-zinc-800 px-2 py-1 text-xs text-amber-200 hover:border-amber-400"
        >
          {economia.emoji} {economia.nome} ×{economia.multiplicador.toLocaleString("pt-BR")}
        </button>
      )}

      <div className="ml-auto flex items-center gap-1">
        {session.status === "active" && (
          <button
            type="button"
            onClick={() => changeStatus("paused")}
            disabled={pending}
            className="rounded bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-500 disabled:opacity-50"
          >
            Pausar
          </button>
        )}
        {session.status === "paused" && (
          <button
            type="button"
            onClick={() => changeStatus("active")}
            disabled={pending}
            className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Retomar
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (!confirm("Encerrar partida? Esta ação não pode ser desfeita."))
              return;
            changeStatus("finished");
          }}
          disabled={pending}
          className="rounded border border-red-900/50 bg-red-950/30 px-2 py-1 text-xs text-red-300 hover:bg-red-950/50 disabled:opacity-50"
        >
          Encerrar
        </button>
      </div>

      {error && <p className="ml-2 text-xs text-red-400">{error}</p>}

      {economiaAberta && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <button aria-label="Fechar" onClick={() => setEconomiaAberta(false)} className="absolute inset-0 bg-black/70" />
          <div className="arcana-card relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="arcana-heading text-xl tracking-[0.12em]">Economia da mesa</h2>
              <button type="button" onClick={() => setEconomiaAberta(false)} className="arcana-btn-ghost arcana-btn-sm">
                Fechar
              </button>
            </div>
            <ReguaEconomia
              sessionId={session.id}
              nivelAtualId={economiaId}
              onChange={(id) => {
                setEconomiaId(id);
                router.refresh();
              }}
              compacto
            />
          </div>
        </div>
      )}
    </header>
  );
}
