import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { limitesDaMesa } from "@/lib/character-creation/sacramento/rules";
import { LobbyDoJuiz, type JogadorLobby } from "@/components/mesa/LobbyDoJuiz";
import type { Character } from "@/lib/types";
import { createClient } from "@/lib/supabase-server";
import type { Session } from "@/lib/types";
import {
  SessionLobby,
  type LobbyPlayer,
} from "@/components/sessions/SessionLobby";

type SessionWithTemplate = Session & {
  template: { id: string; title: string } | null;
};

export default async function SessionLobbyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("*, template:story_templates(id, title)")
    .eq("id", id)
    .maybeSingle<SessionWithTemplate>();

  if (!session) notFound();

  // Sacramento: lobby próprio com acesso à mesa do Juiz.
  if (session.ruleset === "sacramento") {
    const auth = await getProfile();
    if (!auth || auth.user.id !== session.gm_id) redirect("/unauthorized");
    const admin = createAdminClient();
    const [sps, chars, convites] = await Promise.all([
      // Admin: sob RLS o Juiz não lê o perfil (nome) dos jogadores.
      admin
        .from("session_players")
        .select("player_id, status, profile:profiles!session_players_player_id_fkey(display_name)")
        .eq("session_id", id)
        .in("status", ["invited", "joined"]),
      supabase.from("characters").select("*").eq("session_id", id).neq("owner_id", session.gm_id).order("created_at"),
      supabase.from("campaign_invites").select("id", { count: "exact", head: true }).eq("session_id", id).is("player_id", null),
    ]);
    const personagens = (chars.data ?? []) as Character[];
    const jogadores: JogadorLobby[] = ((sps.data ?? []) as unknown as {
      player_id: string;
      status: string;
      profile: { display_name: string } | null;
    }[]).map((p) => ({
      playerId: p.player_id,
      nome: p.profile?.display_name ?? "Jogador",
      status: p.status,
      personagens: personagens.filter((c) => c.owner_id === p.player_id),
    }));
    return (
      <LobbyDoJuiz
        session={session}
        jogadores={jogadores}
        regras={limitesDaMesa((session.settings as { regrasCriacao?: unknown } | null)?.regrasCriacao)}
        convitesPendentes={convites.count ?? 0}
      />
    );
  }

  const { data: players } = await supabase
    .from("session_players")
    .select(
      "*, profile:profiles!session_players_player_id_fkey(display_name, avatar_url)"
    )
    .eq("session_id", id)
    .returns<LobbyPlayer[]>();

  const { template, ...sessionWithoutTemplate } = session;

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <SessionLobby
        session={sessionWithoutTemplate}
        initialPlayers={players ?? []}
        template={template}
      />
    </div>
  );
}
