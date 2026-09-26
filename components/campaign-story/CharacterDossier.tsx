"use client";

import { useEffect, useState } from "react";
import type { PartyCharacter } from "@/lib/types";
import type { HistoriaEstruturada, ElementosHistoria } from "@/lib/character-creation/sacramento/types";
import { ANTECEDENTES, ATRIBUTOS } from "@/lib/character-creation/sacramento/rules";
import { habilidadeById } from "@/lib/character-creation/sacramento/habilidades";
import { labelClass } from "./ui";
import { palavrasDoJogador } from "@/lib/character-creation/sacramento/palavras-do-jogador";

type Stats = {
  saldo?: number;
  atributos?: Record<string, number>;
  derivados?: Record<string, number>;
  montarias?: { nome?: string; animal?: string; descricao?: string; potencia?: number; resistencia?: number }[];
};

type Item = { id?: string; nome?: string; quantidade?: number; categoria?: string; daMesa?: boolean };

const DERIVADOS: [string, string][] = [
  ["vidaMaxima", "Vida"],
  ["capacidadeDor", "Dor"],
  ["defesa", "Defesa"],
  ["movimentos", "Movimentos"],
  ["acoesCombate", "Ações"],
  ["cartasIniciativa", "Cartas de iniciativa"],
];

const ABAS = ["História", "Retratos", "Ficha"] as const;
type Aba = (typeof ABAS)[number];

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <p className={labelClass}>{titulo}</p>
      {children}
    </section>
  );
}

function Texto({ children }: { children: React.ReactNode }) {
  return <p className="whitespace-pre-line font-crimson text-base leading-relaxed text-arcana-text">{children}</p>;
}

/** Dossiê completo de um personagem do bando — só o Juiz abre. */
export function CharacterDossier({
  character,
  playerName,
  onClose,
}: {
  character: PartyCharacter;
  playerName: string;
  onClose: () => void;
}) {
  const [aba, setAba] = useState<Aba>("História");

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const stats = (character.stats ?? {}) as Stats;
  const skills = (character.skills ?? {}) as { antecedentes?: Record<string, number>; habilidades?: string[] };
  const story = (character.story ?? {}) as { historia?: HistoriaEstruturada; elementos?: ElementosHistoria };
  const historia = story.historia;
  const elementos = story.elementos;
  const imagens = character.visual?.imagens ?? {};
  const retratos = [
    { rotulo: "Retrato", url: imagens.close ?? character.avatar_url ?? undefined },
    { rotulo: "Marcas da jornada", url: imagens.estados },
    { rotulo: "Cartaz de procurado", url: imagens.banner },
  ].filter((r): r is { rotulo: string; url: string } => Boolean(r.url));
  const inventario = (character.inventory ?? []) as Item[];
  const habilidades = (skills.habilidades ?? []).map((id) => habilidadeById(id)?.nome ?? id);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-6">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/75" />
      <div className="arcana-card relative flex max-h-dvh w-full max-w-4xl flex-col overflow-hidden sm:max-h-[90dvh]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-arcana-border-dim px-5 py-4">
          <div className="min-w-0">
            <p className="font-cinzel text-[10px] uppercase tracking-[0.35em] text-arcana-gold">
              Dossiê · jogado por {playerName}
            </p>
            <h2 className="arcana-heading truncate text-2xl tracking-[0.12em]">{character.name}</h2>
            <p className="font-crimson text-sm text-arcana-text">
              Nível {character.level} · {character.xp} XP · Saldo $
              {(stats.saldo ?? character.gold).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              {elementos?.ocupacao ? ` · ${elementos.ocupacao}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="arcana-btn-ghost arcana-btn-sm shrink-0">
            Fechar
          </button>
        </header>

        <nav className="flex shrink-0 gap-1 border-b border-arcana-border-dim px-4 py-2">
          {ABAS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAba(a)}
              className={[
                "rounded-xl px-3 py-1.5 font-cinzel text-[10px] uppercase tracking-[0.2em]",
                aba === a ? "bg-arcana-gold font-bold text-arcana-bg" : "text-arcana-text",
              ].join(" ")}
            >
              {a}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {aba === "Retratos" &&
            (retratos.length === 0 ? (
              <Texto>Nenhum retrato gerado para este personagem.</Texto>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {retratos.map((r) => (
                  <a key={r.rotulo} href={r.url} target="_blank" rel="noreferrer" className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.url}
                      alt={`${r.rotulo} de ${character.name}`}
                      className="w-full rounded-xl border border-arcana-border-dim object-contain"
                    />
                    <p className="text-center font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-text">
                      {r.rotulo}
                    </p>
                  </a>
                ))}
              </div>
            ))}

          {aba === "Ficha" && (
            <>
              <Bloco titulo="Atributos">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {ATRIBUTOS.map((a) => (
                    <div key={a.id} className="rounded-xl border border-arcana-border-dim px-3 py-2 text-center">
                      <p className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-arcana-text-dim">{a.nome}</p>
                      <p className="font-cinzel text-xl text-arcana-gold-bright">{stats.atributos?.[a.id] ?? 0}</p>
                    </div>
                  ))}
                </div>
              </Bloco>
              <Bloco titulo="Derivados">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {DERIVADOS.map(([id, nome]) => (
                    <div key={id} className="rounded-xl border border-arcana-border-dim px-2 py-2 text-center">
                      <p className="font-cinzel text-[10px] uppercase tracking-[0.15em] text-arcana-text-dim">{nome}</p>
                      <p className="font-cinzel text-lg text-arcana-text">{stats.derivados?.[id] ?? "—"}</p>
                    </div>
                  ))}
                </div>
              </Bloco>
              <Bloco titulo="Antecedentes">
                <div className="flex flex-wrap gap-2">
                  {ANTECEDENTES.map((a) => (
                    <span key={a.id} className="rounded-full border border-arcana-border-dim px-3 py-1 font-crimson text-sm text-arcana-text">
                      {a.nome} <strong className="text-arcana-gold-bright">{skills.antecedentes?.[a.id] ?? 0}</strong>
                    </span>
                  ))}
                </div>
              </Bloco>
              <Bloco titulo="Habilidades">
                {habilidades.length === 0 ? <Texto>Nenhuma.</Texto> : <Texto>{habilidades.join(" · ")}</Texto>}
              </Bloco>
              <Bloco titulo="Itens">
                {inventario.length === 0 ? (
                  <Texto>Sem itens.</Texto>
                ) : (
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {inventario.map((i, idx) => (
                      <li key={`${i.id}-${idx}`} className="font-crimson text-base text-arcana-text">
                        {i.quantidade && i.quantidade > 1 ? `${i.quantidade}× ` : ""}
                        {i.nome}
                        {i.daMesa && <span className="text-arcana-gold"> (da mesa)</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </Bloco>
              {(stats.montarias?.length ?? 0) > 0 && (
                <Bloco titulo="Montarias">
                  {stats.montarias!.map((m, idx) => (
                    <Texto key={idx}>
                      {m.nome || m.animal} ({m.animal}) — Potência {m.potencia ?? 0}, Resistência {m.resistencia ?? 0}
                      {m.descricao ? `. ${m.descricao}` : ""}
                    </Texto>
                  ))}
                </Bloco>
              )}
            </>
          )}

          {aba === "História" && palavrasDoJogador(elementos).length > 0 && (
            <section className="space-y-2 rounded-xl border border-arcana-gold/40 bg-arcana-gold/[0.06] p-4">
              <p className={labelClass}>Nas palavras do jogador</p>
              <dl className="space-y-2">
                {palavrasDoJogador(elementos).map((l) => (
                  <div key={l.rotulo}>
                    <dt className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-arcana-gold-bright">{l.rotulo}</dt>
                    <dd className="whitespace-pre-line font-crimson text-base leading-relaxed text-arcana-text">{l.texto}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {aba === "História" &&
            (!historia ? (
              <Texto>{character.backstory || "Sem história registrada."}</Texto>
            ) : (
              <>
                <p className={labelClass}>História montada na criação</p>
                <Bloco titulo="Resumo">
                  <Texto>{historia.resumo}</Texto>
                </Bloco>
                {historia.capitulos.map((c) => (
                  <Bloco key={c.titulo} titulo={c.titulo}>
                    <Texto>{c.texto}</Texto>
                  </Bloco>
                ))}
                {historia.familia && (
                  <Bloco titulo="Família">
                    <Texto>{historia.familia}</Texto>
                  </Bloco>
                )}
                {historia.vinculos.length > 0 && (
                  <Bloco titulo="Vínculos">
                    <ul className="space-y-1">
                      {historia.vinculos.map((v) => (
                        <li key={v.nome} className="font-crimson text-base text-arcana-text">
                          <strong>{v.nome}</strong> ({v.relacao}){v.detalhe ? `: ${v.detalhe}` : ""}
                        </li>
                      ))}
                    </ul>
                  </Bloco>
                )}
                <Bloco titulo={`Trilha de redenção — ${historia.redencao.trilhaNome}`}>
                  <Texto>{historia.redencao.premissa}</Texto>
                  <ol className="list-decimal space-y-1 pl-5 font-crimson text-base text-arcana-text">
                    {historia.redencao.passos.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ol>
                </Bloco>
                {historia.ganchos.length > 0 && (
                  <Bloco titulo="Ganchos para o Juiz">
                    <ul className="list-disc space-y-1 pl-5 font-crimson text-base text-arcana-text">
                      {historia.ganchos.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </Bloco>
                )}
              </>
            ))}
        </div>
      </div>
    </div>
  );
}
