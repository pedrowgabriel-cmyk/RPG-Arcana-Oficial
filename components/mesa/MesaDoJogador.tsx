"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ajustarMeuCorpo, rolarTesteJogador, usarSinaJogador } from "@/app/play/[session_id]/actions";
import { ArmazemDoJogo } from "@/components/player/ArmazemDoJogo";
import { ANTECEDENTES, ATRIBUTOS } from "@/lib/character-creation/sacramento/rules";
import { habilidadeById } from "@/lib/character-creation/sacramento/habilidades";
import { itemImagem } from "@/lib/character-creation/sacramento/catalogo";
import { palavrasDoJogador } from "@/lib/character-creation/sacramento/palavras-do-jogador";
import type { ElementosHistoria, HistoriaEstruturada } from "@/lib/character-creation/sacramento/types";
import { economiaDaMesa, formatarReis } from "@/lib/rulesets/sacramento/economia";
import {
  CONDICOES,
  ROTULO_ESTADO,
  cenaDaMesa,
  fichaMesa,
  iniciativaDaMesa,
  indiceEstado,
  nomeCarta,
  type Rolagem,
  type TipoRolagem,
} from "@/lib/rulesets/sacramento/mesa";
import type { Character, Notification, Session, SessionEvent, SessionMediaState } from "@/lib/types";
import { CartaMini, RetratoEstado, imagensDe, textoEvento } from "./pecas";

type Aba = "ficha" | "historia" | "rolar" | "alforje" | "armazem" | "mesa";

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: "ficha", rotulo: "Ficha" },
  { id: "historia", rotulo: "História" },
  { id: "rolar", rotulo: "🎲 Rolar" },
  { id: "alforje", rotulo: "Alforje" },
  { id: "armazem", rotulo: "Armazém" },
  { id: "mesa", rotulo: "Mesa" },
];

const LABEL = "font-cinzel text-[10px] uppercase tracking-[0.3em] text-arcana-gold";
const PAINEL = "rounded-2xl border border-arcana-gold/25 bg-[linear-gradient(160deg,rgba(28,22,30,0.92),rgba(12,10,16,0.95))] shadow-[0_12px_40px_rgba(0,0,0,0.45)]";

type Historia = { historia?: HistoriaEstruturada; elementos?: ElementosHistoria };

export function MesaDoJogador({
  session,
  character,
  mediaState,
  notifications,
  publicEvents,
  onMarkRead,
  onRefresh = () => {},
}: {
  session: Session;
  character: Character;
  mediaState: SessionMediaState;
  notifications: Notification[];
  publicEvents: SessionEvent[];
  onMarkRead: (id: string) => void;
  /** Busca a ficha/mesa de novo logo após uma ação (não espera o eco do realtime). */
  onRefresh?: () => void;
}) {
  const f = fichaMesa(character);
  const cena = cenaDaMesa(session.settings);
  const iniciativa = iniciativaDaMesa(session.settings);
  const economia = economiaDaMesa(session.settings);
  const minhaVez = iniciativa?.ordem[iniciativa.vez]?.id === character.id;
  const naoLidas = notifications.filter((n) => !n.read).length;
  const story = ((character as unknown as { story?: Historia }).story ?? {}) as Historia;
  const [aba, setAba] = useState<Aba>("ficha");
  const [ajuste, setAjuste] = useState<"dano" | "cura" | null>(null);

  // Clarão vermelho/verde quando a Vida muda (dano do Juiz ou do próprio jogador).
  const vidaAnterior = useRef(f.vida);
  const [clarao, setClarao] = useState<{ tipo: "dano" | "cura"; k: number } | null>(null);
  useEffect(() => {
    if (f.vida === vidaAnterior.current) return;
    const tipo = f.vida < vidaAnterior.current ? "dano" : "cura";
    vidaAnterior.current = f.vida;
    setClarao({ tipo, k: Date.now() });
    const t = setTimeout(() => setClarao(null), 900);
    return () => clearTimeout(t);
  }, [f.vida]);

  // Último aviso vira um toast no topo.
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

  // Trilha do Juiz.
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
  const estado = ROTULO_ESTADO[indiceEstado(f)];
  const conceito = story.elementos?.conceito;

  return (
    <div className="arcana-scene fixed inset-0 flex flex-col overflow-hidden text-arcana-text">
      <audio ref={audioRef} onPlay={() => setTocando(true)} onPause={() => setTocando(false)} />

      {clarao && (
        <div
          key={clarao.k}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[150] animate-[sacraFlash_0.9s_ease-out_forwards]"
          style={{
            background:
              clarao.tipo === "dano"
                ? "radial-gradient(ellipse at center, rgba(220,40,40,0.0) 30%, rgba(200,20,20,0.55) 100%)"
                : "radial-gradient(ellipse at center, rgba(60,200,120,0.0) 30%, rgba(60,200,120,0.4) 100%)",
          }}
        />
      )}

      {toast && (
        <button
          type="button"
          onClick={() => setToast(null)}
          className="fixed inset-x-3 top-3 z-[200] mx-auto max-w-md rounded-2xl border border-arcana-gold/70 bg-[rgba(12,10,16,0.97)] px-4 py-3 text-left shadow-[0_10px_40px_rgba(0,0,0,0.7)]"
        >
          <p className="font-cinzel text-sm text-arcana-gold-bright">{toast.title}</p>
          {toast.message && <p className="font-crimson text-sm text-arcana-text">{toast.message}</p>}
        </button>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl lg:grid lg:grid-cols-[420px_1fr] lg:gap-8 lg:px-8 lg:py-8">
          {/* ═══ Coluna do personagem ═══ */}
          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            {/* Herói */}
            <div className="relative mx-auto w-full max-w-md overflow-hidden lg:rounded-2xl lg:border lg:border-arcana-gold/40">
              <RetratoEstado character={character} ficha={f} className="aspect-square w-full rounded-none" />
              <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(7,7,13,0.55) 0%, transparent 22%, transparent 45%, rgba(7,7,13,0.97) 100%)" }} />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3">
                <span
                  className={`rounded-full border px-2.5 py-1 font-cinzel text-[10px] uppercase tracking-[0.2em] backdrop-blur ${
                    session.status === "active" ? "border-emerald-400/70 bg-black/50 text-emerald-200" : "border-amber-400/70 bg-black/50 text-amber-200"
                  }`}
                >
                  {session.status === "active" ? "● Em jogo" : session.status === "paused" ? "⏸ Pausada" : "Aguardando o Juiz"}
                </span>
                <span className="rounded-full border border-arcana-gold/50 bg-black/50 px-2.5 py-1 font-cinzel text-[10px] uppercase tracking-[0.15em] text-arcana-gold-bright backdrop-blur">
                  {economia.emoji} ×{economia.multiplicador.toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 space-y-1 p-4">
                <p className="font-cinzel text-[10px] uppercase tracking-[0.35em] text-arcana-gold">
                  Nível {f.nivel} · {f.xp} XP · {estado}
                </p>
                <h1 className="font-cinzel text-3xl font-bold uppercase leading-none tracking-[0.06em] text-white" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>
                  {character.name}
                </h1>
                {conceito && <p className="font-crimson text-base italic text-arcana-text">{conceito}</p>}
              </div>
            </div>

            <div className="space-y-4 px-4 lg:px-0">
              {minhaVez && (
                <p className="animate-pulse rounded-2xl border-2 border-arcana-gold-bright bg-arcana-gold/20 px-3 py-3 text-center font-cinzel text-lg uppercase tracking-[0.3em] text-arcana-gold-bright shadow-[0_0_30px_rgba(240,204,106,0.4)]">
                  ⚔ Sua vez!
                </p>
              )}

              <PainelCorpo character={character} onAjuste={setAjuste} />
              <PainelSinaBolso sessionId={session.id} character={character} onRefresh={onRefresh} />

              {iniciativa && (
                <section className={`${PAINEL} space-y-2 p-4`}>
                  <p className={LABEL}>Combate · rodada {iniciativa.rodada}</p>
                  <ol className="space-y-1">
                    {iniciativa.ordem.map((c, i) => (
                      <li
                        key={c.id}
                        className={`flex items-center gap-2 rounded-xl px-2 py-1 ${i === iniciativa.vez ? "bg-arcana-gold/20 ring-1 ring-arcana-gold-bright" : ""}`}
                      >
                        <CartaMini carta={c.carta} />
                        <span className={`font-cinzel text-sm ${c.id === character.id ? "text-arcana-gold-bright" : c.tipo === "npc" ? "text-red-200" : "text-arcana-text"}`}>
                          {i === iniciativa.vez ? "▶ " : ""}
                          {c.nome}
                          {c.id === character.id ? " (você)" : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              {/* Cena atual */}
              <section className={`${PAINEL} overflow-hidden`}>
                {imagemCena && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagemCena} alt="" className="h-44 w-full object-cover" />
                )}
                <div className="space-y-1.5 p-4">
                  <p className={LABEL}>Cena atual</p>
                  {cena ? (
                    <>
                      <p className="font-cinzel text-xl text-arcana-gold-bright">{cena.titulo}</p>
                      {cena.lugar && <p className="font-crimson text-sm italic text-arcana-text">📍 {cena.lugar}</p>}
                      {cena.descricao && <p className="font-crimson text-base leading-relaxed text-white">{cena.descricao}</p>}
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
                      className="mt-1 rounded-full border border-arcana-gold/40 px-3 py-1 font-crimson text-sm text-arcana-text"
                    >
                      {tocando ? "⏸" : "▶"} {audio.title}
                    </button>
                  )}
                </div>
              </section>
            </div>
          </aside>

          {/* ═══ Abas ═══ */}
          <section className="px-4 pb-24 pt-4 lg:px-0 lg:pb-8 lg:pt-0">
            <nav
              className="sticky top-0 z-10 -mx-4 flex gap-1 overflow-x-auto border-b border-arcana-gold/20 bg-[rgba(10,9,15,0.96)] px-4 py-2.5 backdrop-blur lg:mx-0 lg:rounded-2xl lg:border lg:px-2"
              style={{ scrollbarWidth: "none" }}
            >
              {ABAS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAba(a.id)}
                  className={`relative shrink-0 rounded-xl px-3.5 py-2 font-cinzel text-[11px] uppercase tracking-[0.15em] transition-colors ${
                    aba === a.id ? "bg-arcana-gold font-bold text-arcana-bg" : "text-arcana-text hover:text-arcana-gold-bright"
                  }`}
                >
                  {a.rotulo}
                  {a.id === "mesa" && naoLidas > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{naoLidas}</span>}
                </button>
              ))}
            </nav>

            <div className="pt-4">
              {aba === "ficha" && <FichaAba character={character} />}
              {aba === "historia" && <HistoriaAba character={character} story={story} />}
              {aba === "rolar" && <RolarAba sessionId={session.id} character={character} onRefresh={onRefresh} />}
              {aba === "alforje" && <AlforjeAba character={character} onArmazem={() => setAba("armazem")} />}
              {aba === "armazem" && <ArmazemDoJogo session={session} character={character} onDone={onRefresh} />}
              {aba === "mesa" && <MesaAba notifications={notifications} events={publicEvents} onMarkRead={onMarkRead} />}
            </div>
          </section>
        </div>
      </div>

      {ajuste && <SheetAjuste sessionId={session.id} character={character} modo={ajuste} onClose={() => setAjuste(null)} onRefresh={onRefresh} />}
    </div>
  );
}

/* ─── Corpo: Vida + Dor + condições ─── */

function PainelCorpo({ character, onAjuste }: { character: Character; onAjuste: (m: "dano" | "cura") => void }) {
  const f = fichaMesa(character);
  const pct = f.vidaMax > 0 ? f.vida / f.vidaMax : 0;
  const cor = pct > 0.6 ? "#4ecb8a" : pct > 0.3 ? "#f0cc6a" : "#e0503a";
  return (
    <section className={`${PAINEL} space-y-4 p-4`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={LABEL}>Vida</p>
          <p className="font-cinzel leading-none tabular-nums">
            <span className="text-5xl font-bold" style={{ color: cor, textShadow: `0 0 18px ${cor}66` }}>{f.vida}</span>
            <span className="text-2xl text-arcana-text">/{f.vidaMax}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onAjuste("dano")}
            className="rounded-xl border border-red-400/70 bg-red-950/60 px-4 py-3 font-cinzel text-xs uppercase tracking-[0.15em] text-red-100 shadow-[0_0_16px_rgba(220,50,50,0.25)] transition-transform active:scale-95"
          >
            💥 Tomei dano
          </button>
          <button
            type="button"
            onClick={() => onAjuste("cura")}
            className="rounded-xl border border-emerald-400/60 bg-emerald-950/50 px-4 py-3 font-cinzel text-xs uppercase tracking-[0.15em] text-emerald-100 transition-transform active:scale-95"
          >
            ✚ Curei
          </button>
        </div>
      </div>

      {/* Vida em blocos, um por ponto */}
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: Math.max(1, f.vidaMax) }, (_, i) => (
          <span
            key={i}
            className="h-3 flex-1 rounded-sm transition-colors duration-500"
            style={{ background: i < f.vida ? cor : "rgba(255,255,255,0.08)", boxShadow: i < f.vida ? `0 0 8px ${cor}88` : undefined }}
          />
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className={LABEL}>Dor</p>
          <p className="font-crimson text-xs text-arcana-text">no 6º círculo: −1 V e consequência</p>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className={`flex h-9 flex-1 items-center justify-center rounded-full border-2 font-cinzel text-xs transition-colors ${
                i < f.dor ? "border-red-400 bg-red-600/70 text-white shadow-[0_0_10px_rgba(220,50,50,0.5)]" : "border-white/25 text-arcana-text-dim"
              }`}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      {f.condicoes.length > 0 && (
        <div className="space-y-1.5">
          <p className={LABEL}>Condições</p>
          <ul className="space-y-1">
            {f.condicoes.map((c) => {
              const info = CONDICOES.find((x) => x.nome === c);
              const grave = ["Morto", "Inconsciente", "Sangrando"].includes(c);
              return (
                <li key={c} className={`rounded-xl border px-3 py-1.5 font-crimson text-sm ${grave ? "border-red-400/60 bg-red-950/40 text-red-100" : "border-arcana-border text-arcana-text"}`}>
                  <strong className="font-cinzel text-xs uppercase tracking-[0.12em]">{c}</strong>
                  {info ? ` — ${info.efeito}` : ""}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ─── Sheet de dano/cura ─── */

function SheetAjuste({
  sessionId,
  character,
  modo,
  onClose,
  onRefresh,
}: {
  sessionId: string;
  character: Character;
  modo: "dano" | "cura";
  onClose: () => void;
  onRefresh: () => void;
}) {
  const f = fichaMesa(character);
  const [canal, setCanal] = useState<"vida" | "dor">("vida");
  const [qtd, setQtd] = useState(1);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const dano = modo === "dano";

  const previa = (() => {
    if (canal === "vida") {
      const nova = Math.max(0, Math.min(f.vidaMax, f.vida + (dano ? -qtd : qtd)));
      return `Vida ${f.vida} → ${nova}${nova === 0 ? " · VIDA ZERADA" : ""}`;
    }
    const nova = f.dor + (dano ? qtd : -qtd);
    if (dano && nova >= 6) return `Dor ${f.dor} → ${nova % 6} · fecha ${Math.floor(nova / 6)} ciclo(s): −${Math.floor(nova / 6)} V + consequência`;
    return `Dor ${f.dor} → ${Math.max(0, nova)}`;
  })();

  function confirmar() {
    start(async () => {
      setErro(null);
      const r = await ajustarMeuCorpo(sessionId, character.id, { canal, delta: dano ? (canal === "vida" ? -qtd : qtd) : canal === "vida" ? qtd : -qtd });
      if (!r.ok) {
        setErro(r.error);
        return;
      }
      onRefresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[180] flex items-end justify-center sm:items-center">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className={`relative w-full max-w-md space-y-4 rounded-t-3xl border p-5 sm:rounded-3xl ${dano ? "border-red-400/50" : "border-emerald-400/50"} bg-[#120e16]`}>
        <div className="mx-auto h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        <p className={`font-cinzel text-lg uppercase tracking-[0.2em] ${dano ? "text-red-200" : "text-emerald-200"}`}>
          {dano ? "💥 Quanto você tomou?" : "✚ Quanto você curou?"}
        </p>

        <div className="grid grid-cols-2 gap-2">
          {(["vida", "dor"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setCanal(k)}
              className={`rounded-xl border px-3 py-2.5 text-left ${canal === k ? "border-arcana-gold bg-arcana-gold/15" : "border-arcana-border"}`}
            >
              <span className="block font-cinzel text-sm uppercase tracking-[0.15em] text-arcana-gold-bright">{k === "vida" ? "Vida (V)" : "Dor (D)"}</span>
              <span className="font-crimson text-xs text-arcana-text">
                {k === "vida" ? "Tiros de revólver, fuzil, espingarda…" : "Faca, soco, boleadeira, quedas…"}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-6 gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setQtd(n)}
              className={`aspect-square rounded-xl border font-cinzel text-2xl transition-transform active:scale-90 ${qtd === n ? (dano ? "border-red-300 bg-red-600/70 text-white" : "border-emerald-300 bg-emerald-600/60 text-white") : "border-arcana-border text-arcana-text"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => setQtd((q) => Math.max(1, q - 1))} className="h-10 w-10 rounded-full border border-arcana-border font-cinzel text-xl text-arcana-text">−</button>
          <span className="w-14 text-center font-cinzel text-4xl tabular-nums text-white">{qtd}</span>
          <button type="button" onClick={() => setQtd((q) => Math.min(30, q + 1))} className="h-10 w-10 rounded-full border border-arcana-border font-cinzel text-xl text-arcana-text">+</button>
        </div>

        <p className="rounded-xl bg-white/5 px-3 py-2 text-center font-crimson text-base text-white">{previa}</p>
        {erro && <p className="font-crimson text-sm text-red-300">{erro}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="arcana-btn-ghost flex-1">Cancelar</button>
          <button
            type="button"
            onClick={confirmar}
            disabled={pending}
            className={`flex-[2] rounded-xl px-4 py-3 font-cinzel text-sm uppercase tracking-[0.18em] text-white transition-transform active:scale-95 disabled:opacity-50 ${dano ? "bg-red-600 shadow-[0_0_20px_rgba(220,50,50,0.4)]" : "bg-emerald-600"}`}
          >
            {pending ? "Registrando…" : dano ? `Tomar ${qtd} ${canal === "vida" ? "V" : "D"}` : `Curar ${qtd} ${canal === "vida" ? "V" : "D"}`}
          </button>
        </div>
        <p className="text-center font-crimson text-xs text-arcana-text-dim">O Juiz vê o registro na mesa.</p>
      </div>
    </div>
  );
}

/* ─── Sina + bolso ─── */

const MOTIVOS_SINA = ["refazer um teste", "evitar o Teste de Morte", "reanimar (até 1 rodada)", "trocar carta no duelo"];

function PainelSinaBolso({ sessionId, character, onRefresh }: { sessionId: string; character: Character; onRefresh: () => void }) {
  const f = fichaMesa(character);
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <section className={`${PAINEL} grid grid-cols-[1fr_auto] gap-4 p-4`}>
      <div className="min-w-0 space-y-2">
        <p className={LABEL}>Cartas de Sina</p>
        {f.sina.length === 0 ? (
          <p className="font-crimson text-sm text-arcana-text">Nenhuma. O Juiz dá por façanhas e redenção.</p>
        ) : (
          <div className="flex pl-1">
            {f.sina.map((c, i) => (
              <button
                key={`${nomeCarta(c)}-${i}`}
                type="button"
                onClick={() => setEscolhida(escolhida === i ? null : i)}
                className="-ml-1 transition-transform hover:-translate-y-1"
                style={{ transform: `rotate(${(i - (f.sina.length - 1) / 2) * 7}deg)` }}
              >
                <CartaMini carta={c} />
              </button>
            ))}
          </div>
        )}
        {escolhida !== null && f.sina[escolhida] && (
          <div className="space-y-1.5 rounded-xl border border-arcana-gold/40 p-2">
            <p className="font-crimson text-sm text-arcana-text">Gastar {nomeCarta(f.sina[escolhida])} para:</p>
            <div className="flex flex-wrap gap-1.5">
              {MOTIVOS_SINA.map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await usarSinaJogador(sessionId, character.id, escolhida, m);
                      setErro(r.ok ? null : r.error);
                      setEscolhida(null);
                      onRefresh();
                    })
                  }
                  className="rounded-full border border-arcana-gold/60 px-2.5 py-1 font-crimson text-sm text-arcana-gold-bright hover:bg-arcana-gold/10"
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}
        {erro && <p className="font-crimson text-sm text-red-300">{erro}</p>}
      </div>
      <div className="space-y-2 text-right">
        <div>
          <p className={LABEL}>Bolso</p>
          <p className="font-cinzel text-2xl tabular-nums text-arcana-gold-bright">{formatarReis(f.saldo)}</p>
        </div>
        <div>
          <p className={LABEL}>XP</p>
          <p className="font-cinzel text-xl tabular-nums text-white">{f.xp}</p>
        </div>
      </div>
    </section>
  );
}

/* ─── Abas ─── */

function FichaAba({ character }: { character: Character }) {
  const f = fichaMesa(character);
  const deriv: [string, string, string | number][] = [
    ["⚔", "Ações de combate", f.derivados.acoesCombate ?? "—"],
    ["🥾", "Movimentos", f.derivados.movimentos ?? "—"],
    ["🛡", "Defesa", f.derivados.defesa ?? 5],
    ["🂡", "Cartas de iniciativa", f.derivados.cartasIniciativa ?? 1],
  ];
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <p className={LABEL}>Atributos · para resistir</p>
        <div className="grid grid-cols-4 gap-2">
          {ATRIBUTOS.map((a) => (
            <div key={a.id} className={`${PAINEL} p-3 text-center`}>
              <p className="font-cinzel text-[10px] uppercase tracking-[0.1em] text-arcana-text">{a.nome}</p>
              <p className="font-cinzel text-3xl font-bold text-arcana-gold-bright">{f.atributos[a.id] ?? 0}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <p className={LABEL}>Antecedentes · para agir</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ANTECEDENTES.map((a) => (
            <div key={a.id} className={`${PAINEL} flex items-center justify-between px-3 py-2`} title={a.abrangencia}>
              <span className="font-crimson text-base text-white">{a.nome}</span>
              <span className="font-cinzel text-xl text-arcana-gold-bright">{f.antecedentes[a.id] ?? 0}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {deriv.map(([ic, nome, v]) => (
          <div key={nome} className="rounded-xl border border-arcana-border-dim px-3 py-2">
            <p className="font-crimson text-xs text-arcana-text">
              {ic} {nome}
            </p>
            <p className="font-cinzel text-xl text-white">{v}</p>
          </div>
        ))}
      </section>
      <section className="space-y-2">
        <p className={LABEL}>Habilidades</p>
        {f.habilidades.map((id, i) => {
          const h = habilidadeById(id);
          return (
            <div key={`${id}-${i}`} className={`${PAINEL} p-3`}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-cinzel text-base text-arcana-gold-bright">{h?.nome ?? id}</p>
                {h && <span className="font-crimson text-xs text-arcana-text-dim">p. {h.pagina}</span>}
              </div>
              {h && <p className="font-crimson text-base leading-snug text-white">{h.resumo}</p>}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function HistoriaAba({ character, story }: { character: Character; story: Historia }) {
  const h = story.historia;
  const palavras = palavrasDoJogador(story.elementos);
  const banner = imagensDe(character).banner;
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt={`Cartaz de procurado de ${character.name}`} className="mx-auto w-48 -rotate-2 drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] sm:w-full" />
        )}
        <div className="space-y-2">
          <p className={LABEL}>A lenda de {character.name}</p>
          {h?.resumo ? (
            <p className="font-crimson text-xl italic leading-relaxed text-white">“{h.resumo}”</p>
          ) : (
            <p className="font-crimson text-base text-arcana-text">Sem resumo.</p>
          )}
        </div>
      </div>

      {h?.capitulos.filter((c) => c.texto?.trim()).map((c, i) => (
        <section key={c.titulo} className="space-y-1.5">
          <p className="font-cinzel text-sm uppercase tracking-[0.2em] text-arcana-gold-bright">
            <span className="mr-2 text-arcana-gold/60">{["I", "II", "III", "IV", "V", "VI"][i] ?? i + 1}</span>
            {c.titulo}
          </p>
          <p className="whitespace-pre-line font-crimson text-lg leading-relaxed text-white">{c.texto}</p>
        </section>
      ))}

      {h?.familia && (
        <section className={`${PAINEL} space-y-1 p-4`}>
          <p className={LABEL}>Família</p>
          <p className="whitespace-pre-line font-crimson text-lg leading-relaxed text-white">{h.familia}</p>
        </section>
      )}

      {h && h.vinculos.length > 0 && (
        <section className="space-y-2">
          <p className={LABEL}>Vínculos</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {h.vinculos.map((v) => (
              <li key={v.nome} className={`${PAINEL} p-3 font-crimson text-base text-white`}>
                <strong className="font-cinzel text-sm text-arcana-gold-bright">{v.nome}</strong> · {v.relacao}
                {v.detalhe && <p className="text-sm text-arcana-text">{v.detalhe}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {h && (
        <section className="space-y-2">
          <p className={LABEL}>Trilha de redenção — {h.redencao.trilhaNome}</p>
          {h.redencao.premissa && <p className="font-crimson text-lg italic text-white">{h.redencao.premissa}</p>}
          <ol className="space-y-1.5">
            {h.redencao.passos.map((p, i) =>
              p ? (
                <li key={i} className="flex gap-3 rounded-xl border border-arcana-border-dim px-3 py-2">
                  <span className="font-cinzel text-lg text-arcana-gold">{i + 1}</span>
                  <span className="font-crimson text-base text-white">{p}</span>
                </li>
              ) : null,
            )}
          </ol>
        </section>
      )}

      {palavras.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-arcana-gold/40 bg-arcana-gold/[0.05] p-4">
          <p className={LABEL}>O que você escreveu na criação</p>
          <dl className="space-y-2">
            {palavras.map((l) => (
              <div key={l.rotulo}>
                <dt className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-arcana-gold-bright">{l.rotulo}</dt>
                <dd className="whitespace-pre-line font-crimson text-base text-white">{l.texto}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {!h && palavras.length === 0 && <p className="whitespace-pre-line font-crimson text-base text-white">{character.backstory || "Sem história registrada."}</p>}
    </div>
  );
}

function RolarAba({ sessionId, character, onRefresh }: { sessionId: string; character: Character; onRefresh: () => void }) {
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
      if (r.ok) {
        setRes(r.rolagem);
        onRefresh();
      } else setErro(r.error);
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
            onClick={() => {
              setTipo(id);
              setNa(id === "ataque" ? 5 : 6);
              if (id === "ataque") setBase("violencia");
            }}
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
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${base === a.id ? "border-arcana-gold bg-arcana-gold/15" : "border-arcana-border-dim"}`}
                >
                  <span className="font-crimson text-base text-white">{a.nome}</span>
                  <span className="font-cinzel text-lg text-arcana-gold-bright">+{f.antecedentes[a.id] ?? 0}</span>
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
                  className={`rounded-xl border px-2 py-2.5 text-center ${base === a.id ? "border-arcana-gold bg-arcana-gold/15" : "border-arcana-border-dim"}`}
                >
                  <span className="block font-crimson text-sm text-white">{a.nome}</span>
                  <span className="font-cinzel text-lg text-arcana-gold-bright">+{f.atributos[a.id] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="font-crimson text-base text-arcana-text">
              Bônus/penalidade{" "}
              <select className="arcana-input font-crimson text-sm" value={extra} onChange={(e) => setExtra(Number(e.target.value))}>
                {[-2, -1, 0, 1, 2].map((n) => (
                  <option key={n} value={n}>
                    {n > 0 ? `+${n}` : n}
                  </option>
                ))}
              </select>
            </label>
            <label className="font-crimson text-base text-arcana-text">
              {tipo === "ataque" ? "Defesa do alvo" : "NA"}{" "}
              <select className="arcana-input font-crimson text-sm" value={na} onChange={(e) => setNa(Number(e.target.value))}>
                {(tipo === "ataque" ? [3, 5, 6, 7, 8] : [4, 5, 6, 7, 8, 9]).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
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
          className={`animate-[arcanaRiseIn_0.4s_ease-out] rounded-2xl border-2 p-5 text-center ${res.sucesso === true ? "border-emerald-400/70 bg-emerald-950/40" : res.sucesso === false ? "border-red-400/70 bg-red-950/40" : "border-arcana-gold/60"}`}
        >
          <p className="font-cinzel text-6xl tabular-nums text-white">{res.dados.join(" · ")}</p>
          <p className="mt-2 font-crimson text-lg text-white">{res.texto}</p>
          <p className="mt-1 font-crimson text-xs text-arcana-text-dim">O Juiz e a mesa viram esta rolagem.</p>
        </div>
      )}
    </div>
  );
}

function AlforjeAba({ character, onArmazem }: { character: Character; onArmazem: () => void }) {
  const itens = (character.inventory ?? []) as { id?: string; nome?: string; quantidade?: number; daMesa?: boolean }[];
  return (
    <div className="space-y-3">
      {itens.length === 0 && <p className="font-crimson text-base text-arcana-text">Alforje vazio.</p>}
      <ul className="grid gap-2 sm:grid-cols-2">
        {itens.map((i, idx) => (
          <li key={`${i.id}-${idx}`} className={`${PAINEL} flex items-center gap-3 p-2.5`}>
            {i.id && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={itemImagem(i.id)} alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain" loading="lazy" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-cinzel text-sm text-white">{i.nome}</span>
              <span className="font-crimson text-xs text-arcana-text">
                {i.quantidade && i.quantidade > 1 ? `${i.quantidade} unidades` : "1 unidade"}
                {i.daMesa ? " · da mesa" : ""}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onArmazem} className="arcana-btn-ghost w-full">
        🛒 Ir ao Armazém
      </button>
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
    <div className="space-y-5">
      <section className="space-y-1.5">
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
            {n.message && <p className="font-crimson text-sm text-white">{n.message}</p>}
          </button>
        ))}
      </section>
      <section className="space-y-1.5">
        <p className={LABEL}>O que rolou na mesa</p>
        {events.map((e) => (
          <p key={e.id} className="rounded-lg border border-arcana-border-dim px-2.5 py-1.5 font-crimson text-sm text-white">
            <span className="mr-1.5 text-xs text-arcana-text-dim">
              {new Date(e.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {textoEvento(e)}
          </p>
        ))}
      </section>
    </div>
  );
}
