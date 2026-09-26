"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type {
  Character,
  Notification,
  Session,
  SessionEvent,
  SessionMediaState,
  StoryContent,
} from "@/lib/types";
import { PlayerLobby } from "./PlayerLobby";
import { PlayerGame } from "./PlayerGame";
import { MesaDoJogador } from "@/components/mesa/MesaDoJogador";

type LobbyPlayer = {
  player_id: string;
  display_name: string;
  avatar_url: string | null;
  status: string;
};

type Props = {
  userId: string;
  initialSession: Session;
  initialCharacter: Character;
  initialMediaState: SessionMediaState;
  initialNotifications: Notification[];
  initialPlayers: LobbyPlayer[];
  initialPublicEvents: SessionEvent[];
  templateContent: StoryContent | null;
};

export function PlayerView({
  userId,
  initialSession,
  initialCharacter,
  initialMediaState,
  initialNotifications,
  initialPlayers,
  initialPublicEvents,
  templateContent,
}: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session>(initialSession);
  const [character, setCharacter] = useState<Character>(initialCharacter);
  const [mediaState, setMediaState] = useState<SessionMediaState>(initialMediaState);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [players, setPlayers] = useState<LobbyPlayer[]>(initialPlayers);
  const [publicEvents, setPublicEvents] =
    useState<SessionEvent[]>(initialPublicEvents);
  const [levelUpVisible, setLevelUpVisible] = useState(false);

  const refetchCharacter = useCallback(async () => {
    const { data } = await supabase
      .from("characters")
      .select("*")
      .eq("id", character.id)
      .maybeSingle<Character>();
    if (data) setCharacter(data);
  }, [supabase, character.id]);

  // Sempre busca a linha inteira: o pacote do realtime pode vir sem colunas grandes.
  const refetchSession = useCallback(async () => {
    const { data } = await supabase.from("sessions").select("*").eq("id", session.id).maybeSingle<Session>();
    if (data) setSession(data);
  }, [supabase, session.id]);

  const refetchMedia = useCallback(async () => {
    const { data } = await supabase
      .from("session_media_state")
      .select("*")
      .eq("session_id", session.id)
      .maybeSingle<SessionMediaState>();
    if (data) setMediaState(data);
  }, [supabase, session.id]);

  const refetchFeed = useCallback(async () => {
    const [n, e] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("session_id", session.id)
        .or(`target_id.eq.${userId},target_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("session_events")
        .select("*")
        .eq("session_id", session.id)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (n.data) setNotifications(n.data as Notification[]);
    if (e.data) setPublicEvents(e.data as SessionEvent[]);
  }, [supabase, session.id, userId]);

  const refetchTudo = useCallback(async () => {
    await Promise.all([refetchSession(), refetchCharacter(), refetchMedia(), refetchFeed()]);
  }, [refetchSession, refetchCharacter, refetchMedia, refetchFeed]);

  // Rede de segurança do tempo real: ao voltar para a tela (celular que apagou,
  // aba em segundo plano, rede que caiu) e a cada 4 s com a tela visível.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void refetchTudo();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    window.addEventListener("online", aoVoltar);
    const t = setInterval(aoVoltar, 4000);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
      window.removeEventListener("online", aoVoltar);
      clearInterval(t);
    };
  }, [refetchTudo]);

  const [canalVersao, setCanalVersao] = useState(0);

  const refetchPlayers = useCallback(async () => {
    const { data } = await supabase
      .from("session_players")
      .select(
        "player_id, status, profile:profiles!session_players_player_id_fkey(display_name, avatar_url)"
      )
      .eq("session_id", session.id)
      .in("status", ["invited", "joined"])
      .returns<
        {
          player_id: string;
          status: string;
          profile: { display_name: string; avatar_url: string | null } | null;
        }[]
      >();
    if (data) {
      setPlayers(
        data.map((p) => ({
          player_id: p.player_id,
          status: p.status,
          display_name: p.profile?.display_name ?? "Jogador",
          avatar_url: p.profile?.avatar_url ?? null,
        }))
      );
    }
  }, [supabase, session.id]);

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    void supabase.from("notifications").update({ read: true }).eq("id", id);
  }

  // Redirect on finish
  useEffect(() => {
    if (session.status === "finished") {
      router.push(`/play/${session.id}/summary`);
    }
  }, [session.status, session.id, router]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`player-view-${session.id}-${canalVersao}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${session.id}`,
        },
        () => {
          void refetchSession();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "characters",
          filter: `id=eq.${character.id}`,
        },
        () => {
          refetchCharacter();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_media_state",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
            setMediaState(payload.new as SessionMediaState);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const notif = payload.new as Notification;
          if (notif.target_id !== null && notif.target_id !== userId) return;
          setNotifications((prev) => [notif, ...prev]);
          if (notif.vibrate) {
            try {
              navigator.vibrate?.(200);
            } catch {
              // browser without vibrate support
            }
          }
          if (notif.type === "level_up") {
            setLevelUpVisible(true);
            setTimeout(() => setLevelUpVisible(false), 3000);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_players",
          filter: `session_id=eq.${session.id}`,
        },
        () => {
          refetchPlayers();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_events",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const ev = payload.new as SessionEvent;
          if (!ev.is_public) return;
          setPublicEvents((prev) => [ev, ...prev].slice(0, 50));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refetchTudo();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // Reconecta com um canal novo em 2 s.
          setTimeout(() => setCanalVersao((v) => v + 1), 2000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    supabase,
    session.id,
    character.id,
    userId,
    refetchCharacter,
    refetchPlayers,
    refetchSession,
    refetchTudo,
    canalVersao,
  ]);

  // Sacramento: mesa própria (Vida/Dor/Sina, cartas, rolagens no servidor).
  if (session.ruleset === "sacramento") {
    return (
      <MesaDoJogador
        session={session}
        character={character}
        mediaState={mediaState}
        notifications={notifications}
        publicEvents={publicEvents}
        onMarkRead={markRead}
        onRefresh={() => void refetchTudo()}
      />
    );
  }

  const hpPercent = character.max_hp > 0 ? (character.hp / character.max_hp) * 100 : 0;
  const critical = hpPercent < 25 && character.hp > 0;
  const containerBorder = critical
    ? "border-2 border-red-500 animate-pulse"
    : "border-0";

  return (
    <div
      className={`flex h-dvh w-full flex-col bg-zinc-950 text-zinc-100 overflow-hidden ${containerBorder}`}
    >
      {session.status === "lobby" ? (
        <PlayerLobby
          session={session}
          players={players}
          hasCharacter
          characterName={character.name}
        />
      ) : (
        <PlayerGame
          session={session}
          character={character}
          mediaState={mediaState}
          templateContent={templateContent}
          publicEvents={publicEvents}
          notifications={notifications}
          onMarkRead={markRead}
        />
      )}

      {levelUpVisible && (
        <div className="pointer-events-none fixed inset-0 z-[200] flex items-center justify-center bg-violet-950/80 backdrop-blur-sm">
          <div className="animate-levelUp text-center">
            <p className="text-5xl">⭐</p>
            <p className="mt-2 text-3xl font-extrabold tracking-widest text-violet-200">
              LEVEL UP!
            </p>
          </div>
          <style jsx>{`
            @keyframes levelUp {
              0% {
                opacity: 0;
                transform: scale(0.4);
              }
              30% {
                opacity: 1;
                transform: scale(1.15);
              }
              70% {
                opacity: 1;
                transform: scale(1);
              }
              100% {
                opacity: 0;
                transform: scale(1.6);
              }
            }
            .animate-levelUp {
              animation: levelUp 3s ease-out forwards;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
