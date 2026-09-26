"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { rolarTesteJogador, usarSinaJogador } from "@/app/play/[session_id]/actions";
import { ArmazemDoJogo } from "@/components/player/ArmazemDoJogo";
import { ANTECEDENTES, ATRIBUTOS } from "@/lib/character-creation/sacramento/rules";
import { habilidadeById } from "@/lib/character-creation/sacramento/habilidades";
import { itemImagem } from "@/lib/character-creation/sacramento/catalogo";
import { palavrasDoJogador } from "@/lib/character-creation/sacramento/palavras-do-jogador";
import type { ElementosHistoria, HistoriaEstruturada } from "@/lib/character-creation/sacramento/types";
import { economiaDaMesa, formatarReis } from "@/lib/rulesets/sacramento/economia";
import {
  CONDICOES,
  cenaDaMesa,
  fichaMesa,
  iniciativaDaMesa,
  nomeCarta,
  type Rolagem,
  type TipoRolagem,
} from "@/lib/rulesets/sacramento/mesa";
import type { Character, Notification, Session, SessionEvent, SessionMediaState } from "@/lib/types";
import { BarraVida, CartaMini, CirculosDor, Chip, RetratoEstado, textoEvento } from "./pecas";

type Aba = "ficha" | "rolar" | "alforje" | "armazem" | "historia" | "mesa";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "ficha", rotulo: "Ficha" },
  { id: "rolar", rotulo: "🎲 Rolar" },
  { id: "alforje", rotulo: "Alforje" },
  { id: "armazem", rotulo: "🛒 Armazém" },
  { id: "historia", rotulo: "História" },
  { id: "mesa", rotulo: "Mesa" },
];

const LABEL = "font-cinzel text-[10px] uppercase tracking-[0.28em] text-arcana-gold";

export function MesaDoJogador({
  session,
  character,
  mediaState,
  notifications,
  publicEvents,
  onMarkRead,
}: {
  session: Session;
  character: Character;
  mediaState: SessionMediaState;
  notifications: Notification[];
  publicEvents: SessionEvent[];
  onMarkRead: (id: string) => void;
}) {
  const f = fichaMesa(character);
  const cena = cenaDaMesa(session.settings);
  const iniciativa = iniciativaDaMesa(session.settings);
  const economia = economiaDaMesa(session.settings);
  const minhaVez = iniciativa?.ordem[iniciativa.vez]?.id === character.id;
  const naoLidas = notifications.filter((n) => !n.read).length;
  const [aba, setAba] = useState<Aba>("ficha");

  // Último aviso vira um "toast" no topo por alguns segundos.
  const [toast, setToast] = useState<Notification | null>(null);
  const ultimo = useRef(notifications[0]?.id);
  useEffect(() => {
    const n = notifications[0];
    if (!n || n.id === ultimo.current) return;
    ultimo.current = n.id;
    setToast(n);
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [notifications]);

  // Trilha sonora do Juiz.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tocando, setTocando] = useState(false);
  const audio = mediaState.current_audio;
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (audio) {
      el.src = audio.url;
      el.loop = audio.loop;
      el.volume = 0.5;
    } else {
      el.pause(); // onPause atualiza `tocando`
    }
  }, [audio]);

  const imagemCena = cena?.imagem ?? mediaState.current_image?.url;
  const story = ((character as unknown as { story?: { historia?: HistoriaEstruturada; elementos?: ElementosHistoria } }).story) ?? {};

  return (
    <div className="arcana-scene fixed inset-0 flex flex-col overflow-hidden text-arcana-text">
      <audio ref={audioRef} onPlay={() => setTocando(true)} onPause={() => setTocando(false)} />

      {toast && (
        <button
          type="button"
          onClick={() => setToast(null)}
          className="fixed inset-x-3 top-3 z-[200] rounded-2xl border border-arcana-gold/70 bg-[rgba(12,10,16,0.97)] px-4 py-3 text-left shadow-[0_10px_40px_rgba(0,0,0,0.7)]"
        >
          <p className="font-cinzel text-sm text-arcana-gold-bright">{toast.title}</p>
          {toast.message && <p className="font-crimson text-sm text-arcana-text">{toast.message}</p>}
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl lg:grid lg:grid-cols-[380px_1fr] lg:gap-6 lg:p-6">
          {/* ── Coluna do personagem ── */}
          <aside className="space-y-3 p-4 lg:p-0">
            {(session.status === "paused" || session.status === "lobby") && (
              <p className="rounded-xl border border-amber-400/60 bg-amber-950/40 px-3 py-2 text-center font-cinzel text-[11px] uppercase tracking-[0.2em] text-amber-200">
                {session.status === "lobby" ? "Aguardando o Juiz iniciar a partida" : "⏸ Partida pausada"}
              </p>
            )}
            {minhaVez && (
              <p className="animate-pulse rounded-xl border-2 border-arcana-gold-bright bg-arcana-gold/20 px-3 py-2 text-center font-cinzel text-base uppercase tracking-[0.25em] text-arcana-gold-bright">
                ⚔ Sua vez!
              </p>
            )}

            <div className="flex gap-3">
              <RetratoEstado character={character} ficha={f} className="h-44 w-36 shrink-0 border border-arcana-gold/40" mostrarRotulo />
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="truncate font-cinzel text-xl tracking-[0.06em] text-arcana-gold-bright">{character.name}</p>
                  <p className="font-crimson text-sm text-arcana-text">Nível {f.nivel} · {f.xp} XP</p>
                </div>
                <div>
                  <p className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-text">Saldo</p>
                  <p className="font-cinzel text-xl tabular-nums text-arcana-gold-bright">{formatarReis(f.saldo)}</p>
                </div>
                <p className="font-crimson text-xs text-arcana-text">
                  {economia.emoji} {economia.nome} ×{economia.multiplicador.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>

            <BarraVida vida={f.vida} vidaMax={f.vidaMax} />
            <CirculosDor dor={f.dor} />

            <SinaDoJogador sessionId={session.id} character={character} />

            {f.condicoes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {f.condicoes.map((c) => (
                  <span key={c} title={CONDICOES.find((x) => x.nome === c)?.efeito}>
                    <Chip tom={["Morto", "Inconsciente", "Sangrando"].includes(c) ? "perigo" : "neutro"}>
                      {c}
                      {CONDICOES.find((x) => x.nome === c) ? ` · ${CONDICOES.find((x) => x.nome === c)!.efeito}` : ""}
                    </Chip>
                  </span>
                ))}
              </div>
            )}

            {iniciativa && (
              <div className="space-y-1.5 rounded-xl border border-arcana-border-dim p-2.5">
                <p className={LABEL}>Combate · rodada {iniciativa.rodada}</p>
                <ol className="flex flex-wrap gap-1.5">
                  {iniciativa.ordem.map((c, i) => (
                    <li
                      key={c.id}
                      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-crimson text-sm ${i === iniciativa.vez ? "border-arcana-gold-bright bg-arcana-gold/20 text-arcana-gold-bright" : c.tipo === "npc" ? "border-red-400/40 text-red-200" : "border-arcana-border text-arcana-text"}`}
                    >
                      {i === iniciativa.vez ? "▶ " : ""}
                      {c.nome} <span className="text-xs">{nomeCarta(c.carta)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Cena atual */}
            <section className="overflow-hidden rounded-2xl border border-arcana-gold/40">
              {imagemCena && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagemCena} alt="" className="h-40 w-full object-cover" />
              )}
              <div className="space-y-1 bg-[rgba(12,10,16,0.92)] p-3">
                <p className={LABEL}>Cena atual</p>
                {cena ? (
                  <>
                    <p className="font-cinzel text-lg text-arcana-gold-bright">{cena.titulo}</p>
                    {cena.lugar && <p className="font-crimson text-sm italic text-arcana-text">{cena.lugar}</p>}
                    {cena.descricao && <p className="font-crimson text-base leading-relaxed text-arcana-text">{cena.descricao}</p>}
                  </>
                ) : (
                  <p className="font-crimson text-base text-arcana-text">O Juiz ainda não abriu uma cena.</p>
                )}
                {audio && (
                  <button
                    type="button"
                    onClick={() => {
                      const el = audioRef.current;
                      if (!el) return;
                      if (el.paused) el.play().catch(() => {});
                      else el.pause();
                    }}
                    className="mt-1 rounded-full border border-arcana-border px-3 py-1 font-crimson text-sm text-arcana-text"
                  >
                    {tocando ? "⏸" : "▶"} {audio.title}
                  </button>
                )}
              </div>
            </section>
          </aside>

          {/* ── Abas ── */}
          <section className="px-4 pb-24 lg:px-0 lg:pb-6">
            <nav className="sticky top-0 z-10 -mx-4 flex gap-1 overflow-x-auto bg-[rgba(10,9,15,0.95)] px-4 py-2 backdrop-blur lg:mx-0 lg:rounded-xl lg:px-2" style={{ scrollbarWidth: "none" }}>
              {ABAS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAba(a.id)}
                  className={`relative shrink-0 rounded-xl px-3 py-1.5 font-cinzel text-[11px] uppercase tracking-[0.15em] ${aba === a.id ? "bg-arcana-gold font-bold text-arcana-bg" : "text-arcana-text"}`}
                >
                  {a.rotulo}
                  {a.id === "mesa" && naoLidas > 0 && (
                    <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{naoLidas}</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="pt-3">
              {aba === "ficha" && <FichaAba character={character} />}
              {aba === "rolar" && <RolarAba sessionId={session.id} character={character} />}
              {aba === "alforje" && <AlforjeAba character={character} />}
              {aba === "armazem" && <ArmazemDoJogo session={session} character={character} />}
              {aba === "historia" && <HistoriaAba historia={story.historia} elementos={story.elementos} />}
              {aba === "mesa" && (
                <MesaAba notifications={notifications} events={publicEvents} onMarkRead={onMarkRead} />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SinaDoJogador({ sessionId, character }: { sessionId: string; character: Character }) {
  const f = fichaMesa(character);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-text">Sina</span>
        {f.sina.length === 0 && <span className="font-crimson text-sm text-arcana-text-dim">nenhuma carta</span>}
        {f.sina.map((c, i) => (
          <CartaMini
            key={`${nomeCarta(c)}-${i}`}
            carta={c}
            titulo="Gastar esta Sina"
            onClick={() => {
              if (pending) return;
              const motivo = window.prompt(
                `Gastar a Sina ${nomeCarta(c)}? Para quê? (refazer teste, evitar Teste de Morte, reanimar…)`,
                "refazer um teste",
              );
              if (motivo === null) return;
              start(async () => {
                const r = await usarSinaJogador(sessionId, character.id, i, motivo);
                setErro(r.ok ? null : r.error);
              });
            }}
          />
        ))}
      </div>
      {erro && <p className="font-crimson text-sm text-red-300">{erro}</p>}
    </div>
  );
}

function FichaAba({ character }: { character: Character }) {
  const f = fichaMesa(character);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {ATRIBUTOS.map((a) => (
          <div key={a.id} className="rounded-xl border border-arcana-border-dim p-2 text-center">
            <p className="font-cinzel text-[10px] uppercase tracking-[0.12em] text-arcana-text">{a.nome}</p>
            <p className="font-cinzel text-2xl text-arcana-gold-bright">{f.atributos[a.id] ?? 0}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {ANTECEDENTES.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-arcana-border-dim px-2.5 py-1.5" title={a.abrangencia}>
            <span className="font-crimson text-sm text-arcana-text">{a.nome}</span>
            <span className="font-cinzel text-base text-arcana-gold-bright">{f.antecedentes[a.id] ?? 0}</span>
          </div>
        ))}
      </div>
      <p className="font-crimson text-base text-arcana-text">
        Ações de combate <strong>{f.derivados.acoesCombate ?? "—"}</strong> · Movimentos <strong>{f.derivados.movimentos ?? "—"}</strong> · Defesa{" "}
        <strong>{f.derivados.defesa ?? 5}</strong> · Cartas de iniciativa <strong>{f.derivados.cartasIniciativa ?? 1}</strong>
      </p>
      <div className="space-y-2">
        <p className={LABEL}>Habilidades</p>
        {f.habilidades.map((id, i) => {
          const h = habilidadeById(id);
          return (
            <div key={`${id}-${i}`} className="rounded-xl border border-arcana-border-dim p-2.5">
              <p className="font-cinzel text-sm text-arcana-gold-bright">{h?.nome ?? id}</p>
              {h && <p className="font-crimson text-sm leading-snug text-arcana-text">{h.resumo} <span className="text-arcana-text-dim">(p. {h.pagina})</span></p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RolarAba({ sessionId, character }: { sessionId: string; character: Character }) {
  const f = fichaMesa(character);
  const [tipo, setTipo] = useState<TipoRolagem>("teste");
  const [base, setBase] = useState<string>("violencia");
  const [extra, setExtra] = useState(0);
  const [na, setNa] = useState(6);
  const [res, setRes] = useState<Rolagem | null>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const valorBase = f.antecedentes[base] ?? f.atributos[base] ?? 0;
  const nomeBase = [...ANTECEDENTES, ...ATRIBUTOS].find((x) => x.id === base)?.nome ?? "";
  const usaBase = tipo === "teste" || tipo === "ataque" || tipo === "melhor2";

  function rolarAgora() {
    start(async () => {
      setErro(null);
      const r = await rolarTesteJogador(sessionId, character.id, {
        tipo,
        rotulo: usaBase ? nomeBase : tipo === "sorte" ? "Sorte" : "Teste de Morte",
        mod: usaBase ? valorBase + extra : 0,
        na: usaBase ? na : null,
      });
      if (r.ok) setRes(r.rolagem);
      else setErro(r.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {([
          ["teste", "Teste"],
          ["ataque", "Ataque"],
          ["melhor2", "Melhor de 2"],
          ["sorte", "Sorte"],
          ["morte", "Teste de Morte"],
        ] as [TipoRolagem, string][]).map(([id, nome]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setTipo(id); setNa(id === "ataque" ? 5 : 6); if (id === "ataque") setBase("violencia"); }}
            className={`rounded-full border px-3 py-1.5 font-cinzel text-[11px] uppercase tracking-[0.12em] ${tipo === id ? "border-arcana-gold bg-arcana-gold/15 text-arcana-gold-bright" : "border-arcana-border text-arcana-text"}`}
          >
            {nome}
          </button>
        ))}
      </div>

      {usaBase && (
        <>
          <div className="space-y-1.5">
            <p className={LABEL}>Antecedente — para agir</p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {ANTECEDENTES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setBase(a.id)}
                  className={`flex items-center justify-between rounded-lg border px-2.5 py-2 ${base === a.id ? "border-arcana-gold bg-arcana-gold/15" : "border-arcana-border-dim"}`}
                >
                  <span className="font-crimson text-sm text-arcana-text">{a.nome}</span>
                  <span className="font-cinzel text-base text-arcana-gold-bright">+{f.antecedentes[a.id] ?? 0}</span>
                </button>
              ))}
            </div>
            <p className={LABEL}>Atributo — para resistir</p>
            <div className="grid grid-cols-4 gap-1.5">
              {ATRIBUTOS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setBase(a.id)}
                  className={`rounded-lg border px-2 py-2 text-center ${base === a.id ? "border-arcana-gold bg-arcana-gold/15" : "border-arcana-border-dim"}`}
                >
                  <span className="block font-crimson text-sm text-arcana-text">{a.nome}</span>
                  <span className="font-cinzel text-base text-arcana-gold-bright">+{f.atributos[a.id] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="font-crimson text-base text-arcana-text">
              Bônus/penalidade{" "}
              <select className="arcana-input font-crimson text-sm" value={extra} onChange={(e) => setExtra(Number(e.target.value))}>
                {[-2, -1, 0, 1, 2].map((n) => <option key={n} value={n}>{n > 0 ? `+${n}` : n}</option>)}
              </select>
            </label>
            <label className="font-crimson text-base text-arcana-text">
              {tipo === "ataque" ? "Defesa do alvo" : "NA"}{" "}
              <select className="arcana-input font-crimson text-sm" value={na} onChange={(e) => setNa(Number(e.target.value))}>
                {(tipo === "ataque" ? [3, 5, 6, 7, 8] : [4, 5, 6, 7, 8, 9]).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
          <p className="font-crimson text-sm italic text-arcana-text">
            {tipo === "ataque"
              ? "1d6 + Violência ≥ Defesa (5 aberto · 6 cobertura parcial · 7 completa · 3 surpreso). 6 seguido de 6 = crítico; 1 sempre erra."
              : "1d6 + modificador ≥ NA. O Juiz diz o NA — o padrão é 6."}
          </p>
        </>
      )}

      <button className="arcana-btn-primary w-full" disabled={pending} onClick={rolarAgora}>
        {pending ? "Rolando…" : usaBase ? `🎲 Rolar ${nomeBase} (1d6 ${valorBase + extra >= 0 ? "+" : "−"} ${Math.abs(valorBase + extra)})` : "🎲 Rolar"}
      </button>
      {erro && <p className="font-crimson text-sm text-red-300">{erro}</p>}

      {res && (
        <div
          key={res.dados.join("-") + res.texto}
          className={`animate-[arcanaRiseIn_0.4s_ease-out] rounded-2xl border-2 p-4 text-center ${res.sucesso === true ? "border-emerald-400/70 bg-emerald-950/40" : res.sucesso === false ? "border-red-400/70 bg-red-950/40" : "border-arcana-gold/60"}`}
        >
          <p className="font-cinzel text-5xl tabular-nums text-white">{res.dados.join(" · ")}</p>
          <p className="mt-1 font-crimson text-lg text-arcana-text">{res.texto}</p>
          <p className="mt-1 font-crimson text-xs text-arcana-text-dim">O Juiz e a mesa viram esta rolagem.</p>
        </div>
      )}
    </div>
  );
}

function AlforjeAba({ character }: { character: Character }) {
  const itens = (character.inventory ?? []) as { id?: string; nome?: string; quantidade?: number; daMesa?: boolean; categoria?: string }[];
  if (itens.length === 0) return <p className="font-crimson text-base text-arcana-text">Alforje vazio. Passe no Armazém.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {itens.map((i, idx) => (
        <li key={`${i.id}-${idx}`} className="flex items-center gap-3 rounded-xl border border-arcana-border-dim bg-[rgba(12,10,16,0.7)] p-2.5">
          {i.id && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={itemImagem(i.id)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-contain" loading="lazy" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-cinzel text-sm text-arcana-text">{i.nome}</span>
            <span className="font-crimson text-xs text-arcana-text-dim">
              {i.quantidade && i.quantidade > 1 ? `${i.quantidade} unidades` : "1 unidade"}
              {i.daMesa ? " · da mesa" : ""}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function HistoriaAba({ historia, elementos }: { historia?: HistoriaEstruturada; elementos?: ElementosHistoria }) {
  const palavras = palavrasDoJogador(elementos);
  return (
    <div className="space-y-4 font-crimson text-base leading-relaxed text-arcana-text">
      {historia?.resumo && <p className="text-lg italic">{historia.resumo}</p>}
      {historia?.capitulos.filter((c) => c.texto).map((c) => (
        <div key={c.titulo}>
          <p className={LABEL}>{c.titulo}</p>
          <p className="whitespace-pre-line">{c.texto}</p>
        </div>
      ))}
      {historia?.familia && (
        <div>
          <p className={LABEL}>Família</p>
          <p className="whitespace-pre-line">{historia.familia}</p>
        </div>
      )}
      {historia && (
        <div>
          <p className={LABEL}>Trilha de redenção — {historia.redencao.trilhaNome}</p>
          <p>{historia.redencao.premissa}</p>
          <ol className="list-decimal pl-5">
            {historia.redencao.passos.filter(Boolean).map((p, i) => <li key={i}>{p}</li>)}
          </ol>
        </div>
      )}
      {palavras.length > 0 && (
        <div className="rounded-xl border border-arcana-gold/30 p-3">
          <p className={LABEL}>O que você escreveu</p>
          {palavras.map((l) => (
            <p key={l.rotulo}><strong className="text-arcana-gold-bright">{l.rotulo}:</strong> {l.texto}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function MesaAba({
  notifications,
  events,
  onMarkRead,
}: {
  notifications: Notification[];
  events: SessionEvent[];
  onMarkRead: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className={LABEL}>Avisos do Juiz</p>
        {notifications.length === 0 && <p className="font-crimson text-sm">Nenhum aviso.</p>}
        {notifications.slice(0, 30).map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => !n.read && onMarkRead(n.id)}
            className={`block w-full rounded-xl border px-3 py-2 text-left ${n.read ? "border-arcana-border-dim" : "border-arcana-gold/60 bg-arcana-gold/10"}`}
          >
            <p className="font-cinzel text-sm text-arcana-gold-bright">{n.title}</p>
            {n.message && <p className="font-crimson text-sm text-arcana-text">{n.message}</p>}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <p className={LABEL}>O que rolou na mesa</p>
        {events.map((e) => (
          <p key={e.id} className="rounded-lg border border-arcana-border-dim px-2.5 py-1.5 font-crimson text-sm text-arcana-text">
            <span className="mr-1.5 text-xs text-arcana-text-dim">
              {new Date(e.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {textoEvento(e)}
          </p>
        ))}
      </div>
    </div>
  );
}
