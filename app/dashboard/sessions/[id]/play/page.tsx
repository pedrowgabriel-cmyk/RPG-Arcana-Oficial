import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type {
  Character,
  MediaLibraryItem,
  Session,
  SessionEvent,
  SessionMediaState,
  StoryTemplate,
} from "@/lib/types";
import { GmPanel } from "@/components/gm-panel/GmPanel";
import { MesaDoJuiz } from "@/components/mesa/MesaDoJuiz";
import { createAdminClient } from "@/lib/supabase-admin";
import type { CampaignElement } from "@/lib/types";
import type { GmPanelData, PlayerOption } from "@/components/gm-panel/types";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle<Session>();

  if (!session) notFound();

  if (session.status !== "active" && session.status !== "paused") {
    redirect(`/dashboard/sessions/${id}`);
  }

  // Sacramento tem mesa própria (fichas reais, Dor, Sina, iniciativa por cartas).
  if (session.ruleset === "sacramento") {
    const admin = createAdminClient();
    const [chars, evs, els, sps] = await Promise.all([
      supabase.from("characters").select("*").eq("session_id", id).neq("owner_id", session.gm_id).order("created_at"),
      supabase.from("session_events").select("*").eq("session_id", id).order("created_at", { ascending: false }).limit(80),
      supabase.from("campaign_elements").select("*").eq("session_id", id).in("kind", ["scene", "npc", "place"]).order("position"),
      admin
        .from("session_players")
        .select("player_id, profile:profiles!session_players_player_id_fkey(display_name)")
        .eq("session_id", id),
    ]);
    const jogadores = Object.fromEntries(
      ((sps.data ?? []) as unknown as { player_id: string; profile: { display_name: string } | null }[]).map((p) => [
        p.player_id,
        p.profile?.display_name ?? "Jogador",
      ]),
    );
    return (
      <MesaDoJuiz
        initialSession={session}
        initialCharacters={(chars.data ?? []) as Character[]}
        initialEvents={(evs.data ?? []) as SessionEvent[]}
        elementos={(els.data ?? []) as CampaignElement[]}
        jogadores={jogadores}
      />
    );
  }

  const [
    { data: characters },
    { data: events },
    { data: mediaState },
    { data: mediaLibrary },
    { data: sessionPlayers },
    template,
  ] = await Promise.all([
    supabase
      .from("characters")
      .select("*")
      .eq("session_id", id)
      .returns<Character[]>(),
    supabase
      .from("session_events")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<SessionEvent[]>(),
    supabase
      .from("session_media_state")
      .select("*")
      .eq("session_id", id)
      .maybeSingle<SessionMediaState>(),
    supabase
      .from("media_library")
      .select("*")
      .eq("owner_id", session.gm_id)
      .order("created_at", { ascending: false })
      .returns<MediaLibraryItem[]>(),
    supabase
      .from("session_players")
      .select(
        "player_id, status, profile:profiles!session_players_player_id_fkey(display_name)"
      )
      .eq("session_id", id)
      .in("status", ["invited", "joined"])
      .returns<
        {
          player_id: string;
          status: string;
          profile: { display_name: string } | null;
        }[]
      >(),
    session.template_id
      ? supabase
          .from("story_templates")
          .select("*")
          .eq("id", session.template_id)
          .maybeSingle<StoryTemplate>()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);

  const players: PlayerOption[] = (sessionPlayers ?? []).map((p) => ({
    id: p.player_id,
    name: p.profile?.display_name ?? "Jogador",
  }));

  const data: GmPanelData = {
    session,
    characters: characters ?? [],
    events: events ?? [],
    mediaState: mediaState ?? {
      id: "",
      session_id: id,
      current_audio: null,
      current_image: null,
      ambient_active: false,
      updated_at: new Date().toISOString(),
    },
    mediaLibrary: mediaLibrary ?? [],
    players,
    template: template ? { title: template.title, content: template.content } : null,
    templateRow: template,
  };

  return <GmPanel data={data} />;
}
