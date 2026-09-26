"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Character,
  Notification,
  Session,
  SessionEvent,
  SessionMediaState,
  StoryContent,
} from "@/lib/types";
import { PlayerCharacterSheet } from "./PlayerCharacterSheet";
import { PlayerBottomSheet } from "./PlayerBottomSheet";
import { PlayerTabNotifications } from "./PlayerTabNotifications";
import { ArmazemDoJogo } from "./ArmazemDoJogo";
import { economiaDaMesa } from "@/lib/rulesets/sacramento/economia";

type Props = {
  session: Session;
  character: Character;
  mediaState: SessionMediaState;
  templateContent: StoryContent | null;
  publicEvents: SessionEvent[];
  notifications: Notification[];
  onMarkRead: (id: string) => void;
};

type Act = { title: string; description: string };

export function PlayerGame({
  session,
  character,
  mediaState,
  templateContent,
  publicEvents,
  notifications,
  onMarkRead,
}: Props) {
  const paused = session.status === "paused";
  const editable = !paused;
  const unread = notifications.filter((n) => !n.read).length;

  const [notifOpen, setNotifOpen] = useState(false);
  const [armazemOpen, setArmazemOpen] = useState(false);
  const temArmazem = session.ruleset === "sacramento";
  const economia = economiaDaMesa(session.settings);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const audio = mediaState.current_audio;
  const image = mediaState.current_image;
  const acts = (templateContent?.acts ?? []) as unknown as Act[];
  const currentAct = acts.find((a) => a.title === session.current_scene);
  const sceneTitle = currentAct?.title ?? session.current_scene ?? null;
  const sceneDesc = currentAct?.description ?? null;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setAudioPlaying(true);
    const onPause = () => setAudioPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (audio) {
      el.src = audio.url;
      el.loop = audio.loop;
      el.volume = 0.5;
    } else {
      el.pause();
      el.removeAttribute("src");
    }
  }, [audio]);

  function toggleAudio() {
    const el = audioRef.current;
    if (!el || !audio) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }

  return (
    <div className="flex h-full overflow-hidden bg-zinc-950 text-zinc-100">
      <audio ref={audioRef} />

      {/* Paused banner */}
      {paused && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex justify-center pt-2">
          <span className="rounded-full border border-amber-500/60 bg-amber-950/90 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300 backdrop-blur-sm">
            ⏸ Partida pausada
          </span>
        </div>
      )}

      {/* ── LEFT: character sheet ── */}
      <div className="flex w-full flex-col overflow-hidden lg:w-[62%] lg:border-r lg:border-zinc-800">
        <PlayerCharacterSheet
          character={character}
          publicEvents={publicEvents}
          editable={editable}
        />
      </div>

      {/* ── RIGHT: scene panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[38%] lg:flex-col lg:overflow-hidden">
        <ScenePanel
          session={session}
          sceneTitle={sceneTitle}
          sceneDesc={sceneDesc}
          imageUrl={image?.url ?? null}
          audioTitle={audio?.title ?? null}
          audioPlaying={audioPlaying}
          onToggleAudio={audio ? toggleAudio : undefined}
          unread={unread}
          onOpenNotifications={() => setNotifOpen(true)}
          notifications={notifications}
          onMarkRead={onMarkRead}
        />
      </div>

      {/* Armazém (Sacramento): preços seguem a economia da mesa ao vivo */}
      {temArmazem && (
        <button
          type="button"
          onClick={() => setArmazemOpen(true)}
          className="fixed bottom-4 right-4 z-[110] flex items-center gap-2 rounded-full border border-amber-400/70 bg-zinc-950/95 px-4 py-2.5 text-sm font-semibold text-amber-200 shadow-[0_0_20px_rgba(240,204,106,0.35)] backdrop-blur-sm transition-transform active:scale-95"
          aria-label="Abrir armazém"
        >
          🛒 Armazém
          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-100">
            {economia.emoji} ×{economia.multiplicador.toLocaleString("pt-BR")}
          </span>
        </button>
      )}
      {temArmazem && (
        <PlayerBottomSheet
          open={armazemOpen}
          onClose={() => setArmazemOpen(false)}
          title="Armazém"
          subtitle={`${economia.nome} · ×${economia.multiplicador.toLocaleString("pt-BR")}`}
          accent="gold"
        >
          <ArmazemDoJogo session={session} character={character} />
        </PlayerBottomSheet>
      )}

      {/* Mobile notifications sheet */}
      <PlayerBottomSheet
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="Notificações"
        subtitle={unread > 0 ? `${unread} não lidas` : "tudo em dia"}
        accent={unread > 0 ? "gold" : "default"}
      >
        <PlayerTabNotifications notifications={notifications} onRead={onMarkRead} />
      </PlayerBottomSheet>
    </div>
  );
}

/* ─── Right panel: scene + audio + notifs ─── */
function ScenePanel({
  session,
  sceneTitle,
  sceneDesc,
  imageUrl,
  audioTitle,
  audioPlaying,
  onToggleAudio,
  unread,
  onOpenNotifications,
  notifications,
  onMarkRead,
}: {
  session: Session;
  sceneTitle: string | null;
  sceneDesc: string | null;
  imageUrl: string | null;
  audioTitle: string | null;
  audioPlaying: boolean;
  onToggleAudio?: () => void;
  unread: number;
  onOpenNotifications: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
}) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div className="flex h-full flex-col bg-zinc-900">

      {/* Scene image */}
      <div className="relative shrink-0 overflow-hidden bg-zinc-950" style={{ height: "38%" }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-700">
            <span className="text-4xl">🎬</span>
            <span className="text-[10px] uppercase tracking-widest">Aguardando cena...</span>
          </div>
        )}
        {/* Gradient overlay + scene title */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/50 to-transparent px-4 pb-3 pt-10">
          {sceneTitle && (
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-100">
              {sceneTitle}
            </p>
          )}
          <p className="mt-0.5 text-[10px] uppercase tracking-widest text-zinc-500">
            {session.title}
          </p>
        </div>
      </div>

      {/* Status bar */}
      <div className="shrink-0 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${session.status === "active" ? "animate-pulse bg-emerald-400" : "bg-amber-400"}`} />
          <span className="text-[10px] uppercase tracking-widest text-zinc-400">
            {session.status === "active" ? "Em jogo" : "Pausada"}
          </span>
          {session.current_round != null && session.current_round > 0 && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                Rodada {session.current_round}
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setNotifOpen(true)}
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-sm text-zinc-300 transition-colors hover:border-amber-500/50 hover:text-amber-400"
          aria-label="Notificações"
        >
          🔔
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </div>

      {/* Audio player */}
      {audioTitle && (
        <div className="shrink-0 flex items-center gap-3 border-b border-zinc-800 bg-zinc-950/60 px-4 py-2.5">
          <button
            type="button"
            onClick={onToggleAudio}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 transition-colors hover:bg-emerald-500/20"
            aria-label={audioPlaying ? "Pausar trilha" : "Tocar trilha"}
          >
            {audioPlaying ? "⏸" : "▶"}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-zinc-300">{audioTitle}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${audioPlaying ? "animate-pulse bg-emerald-400" : "bg-zinc-600"}`} />
              <span className="text-[9px] uppercase tracking-wider text-zinc-500">
                {audioPlaying ? "Tocando" : "Parado"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Scene description + notifications feed */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {sceneDesc && (
          <div className="border-b border-zinc-800/60 px-4 py-4">
            <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Cena atual</p>
            <p className="text-sm leading-relaxed text-zinc-300 italic">{sceneDesc}</p>
          </div>
        )}

        {/* Notification feed inline */}
        <div className="px-4 py-4">
          <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Notificações
            {unread > 0 && <span className="ml-2 text-amber-400">{unread} nova{unread > 1 ? "s" : ""}</span>}
          </p>
          <PlayerTabNotifications notifications={notifications} onRead={onMarkRead} />
        </div>
      </div>

      {/* Mobile notif sheet (fallback) */}
      <PlayerBottomSheet
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        title="Notificações"
        subtitle={unread > 0 ? `${unread} não lidas` : "tudo em dia"}
        accent={unread > 0 ? "gold" : "default"}
      >
        <PlayerTabNotifications notifications={notifications} onRead={onMarkRead} />
      </PlayerBottomSheet>
    </div>
  );
}
