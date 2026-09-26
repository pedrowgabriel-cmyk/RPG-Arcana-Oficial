import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { acessoMesa, claimEmailInvites, mesasSemPersonagem } from "@/lib/campaign-invites";
import { limitesComEconomia } from "@/lib/character-creation/sacramento/rules";
import { CharacterWizard } from "./CharacterWizard";

function SemConvite({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="arcana-scene flex min-h-dvh items-center justify-center px-4 text-arcana-text">
      <div className="arcana-card w-full max-w-md space-y-4 p-6 text-center">
        <p className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-arcana-gold">
          Criador de personagem
        </p>
        <h1 className="arcana-heading text-xl tracking-[0.12em]">{titulo}</h1>
        <p className="font-crimson text-base text-arcana-text">{texto}</p>
        <Link href="/hub" className="arcana-btn-primary inline-flex">
          Voltar ao Hub
        </Link>
      </div>
    </div>
  );
}

// O personagem nasce dentro de uma campanha: só quem foi convidado (por e-mail)
// cria, e a jornada de criação é a do modelo da campanha — hoje só Sacramento.
export default async function NewCharacterPage({
  searchParams,
}: {
  searchParams: Promise<{ mesa?: string }>;
}) {
  const auth = await getProfile();
  if (!auth) redirect("/login?redirect=/play/characters/new");

  await claimEmailInvites(auth.user.id, auth.user.email);

  const { mesa } = await searchParams;
  if (!mesa) {
    const pendentes = await mesasSemPersonagem(auth.user.id);
    if (pendentes.length === 1) redirect(`/play/characters/new?mesa=${pendentes[0].id}`);
    if (pendentes.length > 1) redirect("/hub");
    return (
      <SemConvite
        titulo="Aguardando convite"
        texto={`Personagens nascem dentro de uma campanha. Peça ao Juiz para convidar o e-mail ${auth.user.email ?? "da sua conta"} — o convite aparece no seu Hub assim que ele adicionar.`}
      />
    );
  }

  const acesso = await acessoMesa(auth.user.id, mesa);
  if (!acesso.ok) {
    if (acesso.motivo === "modelo") {
      return (
        <SemConvite
          titulo="Modelo ainda não disponível"
          texto="Esta campanha usa um modelo de RPG que ainda não tem criador de personagem."
        />
      );
    }
    return (
      <SemConvite
        titulo={acesso.motivo === "sem-convite" ? "Você não foi convidado" : "Campanha indisponível"}
        texto={
          acesso.motivo === "sem-convite"
            ? `O e-mail ${auth.user.email ?? "desta conta"} não está na lista de convidados desta campanha. Peça ao Juiz para adicioná-lo.`
            : "Esta campanha não existe mais ou já foi encerrada."
        }
      />
    );
  }

  const limites = limitesComEconomia(acesso.session.settings);

  if (acesso.session.gm_id !== auth.user.id) {
    const { count } = await createAdminClient()
      .from("characters")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", auth.user.id)
      .eq("session_id", acesso.session.id);
    if ((count ?? 0) >= limites.personagensPorJogador) {
      return (
        <SemConvite
          titulo="Seu personagem já está na mesa"
          texto={`${acesso.session.title} permite ${limites.personagensPorJogador} personagem${limites.personagensPorJogador > 1 ? "s" : ""} por jogador. Ele está te esperando no Hub.`}
        />
      );
    }
  }

  return <CharacterWizard limites={limites} mesaNome={acesso.session.title} mesaId={acesso.session.id} />;
}
