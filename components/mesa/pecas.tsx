"use client";

// Peças visuais da mesa do Sacramento, usadas pelo Juiz e pelo jogador.

import type { Character } from "@/lib/types";
import type { Carta } from "@/lib/rulesets/sacramento/types";
import { NAIPE_SYMBOL } from "@/lib/rulesets/sacramento/generators";
import { ROTULO_ESTADO, cartaVermelha, indiceEstado, type FichaMesa } from "@/lib/rulesets/sacramento/mesa";

type Imagens = { close?: string; estados?: string; banner?: string };

export function imagensDe(c: Character): Imagens {
  return ((c as unknown as { visual?: { imagens?: Imagens } }).visual?.imagens ?? {}) as Imagens;
}

/**
 * Retrato que acompanha o estado do corpo: recorta a célula certa da prancha
 * de estados (3×2). Sem prancha, cai no retrato e escurece conforme o dano.
 */
export function RetratoEstado({
  character,
  ficha,
  className = "",
  mostrarRotulo = false,
}: {
  character: Character;
  ficha: FichaMesa;
  className?: string;
  mostrarRotulo?: boolean;
}) {
  const img = imagensDe(character);
  const idx = indiceEstado(ficha);
  const col = idx % 3;
  const lin = Math.floor(idx / 3);
  const fallback = img.close ?? character.avatar_url ?? undefined;
  return (
    <div className={`relative overflow-hidden rounded-xl bg-[#15121c] ${className}`}>
      {img.estados ? (
        // Célula quadrada da prancha: altura cheia, laterais cortadas (sem esticar).
        <div
          role="img"
          aria-label={`${character.name} — ${ROTULO_ESTADO[idx]}`}
          className="absolute left-1/2 top-0 h-full -translate-x-1/2 transition-[background-position] duration-700"
          style={{
            aspectRatio: "1 / 1",
            minWidth: "100%",
            backgroundImage: `url(${img.estados})`,
            backgroundSize: "300% 200%",
            backgroundPosition: `${col * 50}% ${lin * 100}%`,
          }}
        />
      ) : fallback ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fallback}
          alt={character.name}
          className="absolute inset-0 h-full w-full object-cover object-top"
          style={{ filter: idx >= 5 ? "grayscale(1) brightness(0.5)" : idx >= 3 ? "saturate(0.6)" : undefined }}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center font-cinzel text-3xl text-arcana-gold">
          {character.name.charAt(0)}
        </span>
      )}
      {mostrarRotulo && (
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-1.5 pt-5 text-center font-cinzel text-[10px] uppercase tracking-[0.2em] text-white">
          {ROTULO_ESTADO[idx]}
        </span>
      )}
    </div>
  );
}

export function BarraVida({ vida, vidaMax }: { vida: number; vidaMax: number }) {
  const pct = vidaMax > 0 ? Math.max(0, Math.min(100, (vida / vidaMax) * 100)) : 0;
  const cor = pct > 60 ? "#4ecb8a" : pct > 30 ? "#f0cc6a" : "#e0503a";
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-text">Vida</span>
        <span className="font-cinzel text-sm tabular-nums text-white">
          {vida}
          <span className="text-arcana-text-dim">/{vidaMax}</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cor, boxShadow: `0 0 10px ${cor}` }} />
      </div>
    </div>
  );
}

/** Seis círculos de Dor; o 6º fecha o ciclo. `onClick(n)` recebe o círculo tocado. */
export function CirculosDor({ dor, onClick, tamanho = "md" }: { dor: number; onClick?: (n: number) => void; tamanho?: "sm" | "md" }) {
  const s = tamanho === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-1.5" aria-label={`Dor ${dor} de 6`}>
      <span className="mr-1 font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-text">Dor</span>
      {Array.from({ length: 6 }, (_, i) => {
        const marcado = i < dor;
        const El = onClick ? "button" : "span";
        return (
          <El
            key={i}
            {...(onClick ? { type: "button" as const, onClick: () => onClick(i + 1), "aria-label": `Dor ${i + 1}` } : {})}
            className={`${s} rounded-full border-2 transition-colors ${marcado ? "border-red-400 bg-red-500/80" : "border-white/40 bg-transparent"} ${onClick ? "hover:border-red-300" : ""}`}
          />
        );
      })}
    </div>
  );
}

export function CartaMini({ carta, onClick, titulo }: { carta: Carta; onClick?: () => void; titulo?: string }) {
  const vermelha = cartaVermelha(carta);
  const El = onClick ? "button" : "span";
  return (
    <El
      {...(onClick ? { type: "button" as const, onClick } : {})}
      title={titulo}
      className={`inline-flex h-11 w-8 flex-col items-center justify-center rounded-md border bg-[#f4ecd8] font-cinzel text-sm font-bold leading-none shadow ${vermelha ? "text-red-700" : "text-zinc-900"} ${onClick ? "border-arcana-gold transition-transform hover:-translate-y-0.5" : "border-black/30"}`}
    >
      <span>{carta.valor}</span>
      <span className="text-base">{NAIPE_SYMBOL[carta.naipe]}</span>
    </El>
  );
}

export function Chip({ children, tom = "neutro" }: { children: React.ReactNode; tom?: "neutro" | "perigo" | "ouro" }) {
  const cls =
    tom === "perigo"
      ? "border-red-400/60 bg-red-950/50 text-red-200"
      : tom === "ouro"
        ? "border-arcana-gold/60 bg-arcana-gold/10 text-arcana-gold-bright"
        : "border-arcana-border text-arcana-text";
  return <span className={`rounded-full border px-2 py-0.5 font-crimson text-xs ${cls}`}>{children}</span>;
}

/** Texto de um evento da mesa (payload.texto) com fallback por tipo. */
export function textoEvento(e: { type: string; payload: Record<string, unknown> }): string {
  const t = e.payload?.texto;
  if (typeof t === "string") return t;
  const map: Record<string, string> = {
    session_start: "A partida começou",
    session_pause: "Partida pausada",
    session_end: "Partida encerrada",
    player_joined: "Jogador entrou",
  };
  return map[e.type] ?? e.type.replace(/_/g, " ");
}
