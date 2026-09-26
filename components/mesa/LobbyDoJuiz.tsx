"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { kickPlayer, updateStatus } from "@/app/dashboard/sessions/[id]/actions";
import { economiaDaMesa } from "@/lib/rulesets/sacramento/economia";
import { fichaMesa } from "@/lib/rulesets/sacramento/mesa";
import type { LimitesCriacao } from "@/lib/character-creation/sacramento/rules";
import type { Character, Session } from "@/lib/types";
import { RetratoEstado } from "./pecas";

export type JogadorLobby = {
  playerId: string;
  nome: string;
  status: string;
  personagens: Character[];
};

const STATUS_SESSAO: Record<string, { rotulo: string; cls: string }> = {
  lobby: { rotulo: "Aguardando início", cls: "border-amber-400/60 text-amber-200" },
  active: { rotulo: "● Em jogo", cls: "border-emerald-400/60 text-emerald-200" },
  paused: { rotulo: "⏸ Pausada", cls: "border-amber-400/60 text-amber-200" },
  finished: { rotulo: "Encerrada", cls: "border-arcana-border text-arcana-text" },
};

/** Lobby da campanha Sacramento: entrada da mesa do Juiz, bando e resumo das regras. */
export function LobbyDoJuiz({
  session,
  jogadores,
  regras,
  convitesPendentes,
}: {
  session: Session;
  jogadores: JogadorLobby[];
  regras: LimitesCriacao;
  convitesPendentes: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const economia = economiaDaMesa(session.settings);
  const prontos = jogadores.filter((j) => j.personagens.length > 0).length;
  const emJogo = session.status === "active" || session.status === "paused";

  // Jogadores entrando / personagens salvos aparecem sem recarregar.
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`lobby-juiz-${session.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_players", filter: `session_id=eq.${session.id}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "characters", filter: `session_id=eq.${session.id}` }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [session.id, router]);

  function mudar(next: "active" | "paused" | "finished", irParaMesa = false) {
    start(async () => {
      setErro(null);
      const r = await updateStatus(session.id, next);
      if (r.error) {
        setErro(r.error);
        return;
      }
      if (irParaMesa) router.push(`/dashboard/sessions/${session.id}/play`);
      else router.refresh();
    });
  }

  function remover(j: JogadorLobby) {
    if (!window.confirm(`Remover ${j.nome} da mesa?`)) return;
    start(async () => {
      const r = await kickPlayer(session.id, j.playerId);
      if (r.error) setErro(r.error);
      router.refresh();
    });
  }

  const st = STATUS_SESSAO[session.status] ?? STATUS_SESSAO.lobby;

  return (
    <div className="arcana-scene fixed inset-0 z-40 overflow-y-auto text-arcana-text">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <Link href="/hub" className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-arcana-text hover:text-arcana-gold">
          ← Hub
        </Link>

        {/* Cabeçalho com a capa */}
        <header className="relative overflow-hidden rounded-2xl border border-arcana-gold/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/story/sacramento/capa-larga.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(7,7,13,0.94), rgba(7,7,13,0.7) 55%, rgba(7,7,13,0.35))" }} />
          <div className="relative space-y-3 p-5 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-cinzel text-[10px] uppercase tracking-[0.4em] text-arcana-gold">Lobby · Sacramento</span>
              <span className={`rounded-full border px-2.5 py-0.5 font-cinzel text-[10px] uppercase tracking-[0.2em] ${st.cls}`}>{st.rotulo}</span>
            </div>
            <h1 className="font-cinzel text-3xl font-bold uppercase tracking-[0.12em] text-arcana-gold-bright sm:text-4xl">{session.title}</h1>
            {session.description && <p className="max-w-xl font-crimson text-lg text-white">{session.description}</p>}

            <div className="flex flex-wrap gap-2 pt-2">
              {emJogo && (
                <Link href={`/dashboard/sessions/${session.id}/play`} className="arcana-btn-primary">
                  ⚔ Abrir mesa do Juiz
                </Link>
              )}
              {session.status === "lobby" && (
                <button
                  className="arcana-btn-primary"
                  disabled={pending}
                  onClick={() => {
                    if (prontos === 0 && !window.confirm("Nenhum personagem pronto ainda. Iniciar mesmo assim?")) return;
                    mudar("active", true);
                  }}
                >
                  {pending ? "Iniciando…" : "⚔ Iniciar partida"}
                </button>
              )}
              {session.status === "active" && (
                <button className="arcana-btn-ghost" disabled={pending} onClick={() => mudar("paused")}>Pausar</button>
              )}
              {session.status === "paused" && (
                <button className="arcana-btn-ghost" disabled={pending} onClick={() => mudar("active")}>Retomar</button>
              )}
              {session.status !== "finished" && (
                <button
                  className="arcana-btn-danger"
                  disabled={pending}
                  onClick={() => { if (window.confirm("Encerrar a partida? Não dá para desfazer.")) mudar("finished"); }}
                >
                  Encerrar
                </button>
              )}
              <Link href={`/campaigns/${session.id}/story`} className="arcana-btn-ghost">
                ✦ Hub de História
              </Link>
            </div>
            {erro && <p className="font-crimson text-sm text-red-300">{erro}</p>}
          </div>
        </header>

        {/* Bando */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="arcana-heading text-xl tracking-[0.14em]">
              Bando · {prontos}/{jogadores.length} prontos
            </h2>
            <Link href={`/campaigns/${session.id}/story`} className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-gold hover:text-arcana-gold-bright">
              Convidar e regras →
            </Link>
          </div>
          {convitesPendentes > 0 && (
            <p className="font-crimson text-sm text-arcana-text">
              {convitesPendentes} convite{convitesPendentes > 1 ? "s" : ""} por e-mail aguardando cadastro.
            </p>
          )}
          {jogadores.length === 0 ? (
            <p className="rounded-xl border border-dashed border-arcana-border p-6 text-center font-crimson text-base text-arcana-text">
              Ninguém na mesa ainda. Convide o bando por e-mail no Hub de História → Jogadores.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {jogadores.map((j) => {
                const c = j.personagens[0];
                const f = c ? fichaMesa(c) : null;
                return (
                  <li key={j.playerId} className="arcana-card flex gap-3 p-3">
                    {c && f ? (
                      <RetratoEstado character={c} ficha={f} className="h-24 w-20 shrink-0" />
                    ) : (
                      <span className="flex h-24 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-arcana-border font-cinzel text-2xl text-arcana-text-dim">?</span>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-cinzel text-base text-arcana-gold-bright">{c?.name ?? "Sem personagem"}</p>
                      <p className="truncate font-crimson text-sm text-arcana-text">Jogador: {j.nome}</p>
                      {f ? (
                        <p className="font-crimson text-sm text-arcana-text">
                          Nv {f.nivel} · Vida {f.vida}/{f.vidaMax} · ${f.saldo.toLocaleString("pt-BR")}
                        </p>
                      ) : (
                        <p className="font-crimson text-sm text-amber-200">Criando personagem…</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className={`rounded-full border px-2 py-0.5 font-cinzel text-[10px] uppercase tracking-[0.15em] ${c ? "border-emerald-400/60 text-emerald-200" : "border-amber-400/60 text-amber-200"}`}>
                          {c ? "✓ Pronto" : j.status === "joined" ? "Na mesa" : "Convidado"}
                        </span>
                        <button type="button" onClick={() => remover(j)} className="font-cinzel text-[10px] uppercase tracking-[0.15em] text-arcana-text-dim hover:text-red-300">
                          Remover
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Regras da mesa */}
        <section className="space-y-3">
          <h2 className="arcana-heading text-xl tracking-[0.14em]">Regras da mesa</h2>
          <dl className="arcana-card grid gap-x-6 gap-y-2 p-4 font-crimson text-base sm:grid-cols-2">
            {[
              ["Máximo de jogadores", String(session.settings?.max_players ?? "—")],
              ["Nível inicial / máximo", `${regras.nivelInicial} / ${regras.nivelMaximo}${regras.nivelTravado ? " (travado)" : ""}`],
              ["Dinheiro inicial (tabela)", `$${regras.dinheiroInicial}`],
              ["Economia", `${economia.emoji} ${economia.nome} ×${economia.multiplicador.toLocaleString("pt-BR")}`],
              ["Personagens por jogador", String(regras.personagensPorJogador)],
              ["Habilidades vetadas", String(regras.habilidadesBloqueadas.length || "nenhuma")],
              ["Assistente de IA", session.settings?.ai_assistant === false ? "Desligado" : "Ligado"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-arcana-border-dim py-1">
                <dt className="text-arcana-text">{k}</dt>
                <dd className="text-right text-arcana-gold-bright">{v}</dd>
              </div>
            ))}
          </dl>
          <Link href={`/campaigns/${session.id}/story`} className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-gold hover:text-arcana-gold-bright">
            Editar regras e economia no Hub de História →
          </Link>
        </section>
      </div>
    </div>
  );
}
