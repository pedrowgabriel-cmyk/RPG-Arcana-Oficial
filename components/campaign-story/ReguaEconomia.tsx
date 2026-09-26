"use client";

import { useState, useTransition } from "react";
import { definirEconomia } from "@/app/campaigns/[id]/story/actions";
import { itemById, precoNaMesa } from "@/lib/character-creation/sacramento/catalogo";
import {
  REFERENCIAS_ECONOMIA,
  REGUA_ECONOMIA,
  formatarReis,
  nivelEconomia,
  comInflacao,
} from "@/lib/rulesets/sacramento/economia";

const EXEMPLOS = ["revolver", "fuzil", "cavalo", "municao", "unguento-pasta", "dinamite", "uisque", "chapeu"];

// Cor da régua: barato = verde, tabela = dourado, caro = vermelho.
const COR: Record<string, string> = {
  "vaca-gorda": "#4ecb8a",
  "preco-de-mae": "#9fd46a",
  tabela: "#f0cc6a",
  "ta-salgado": "#f3a54a",
  "olho-da-cara": "#ec7a3c",
  "assalto-sem-mascara": "#e0503a",
  "rim-e-meio": "#c0262d",
};

/**
 * Régua da economia (regra de mesa). O Juiz escolhe o nível e aplica: lojas,
 * dinheiro inicial, serviços e recompensas passam a valer o novo multiplicador.
 */
export function ReguaEconomia({
  sessionId,
  nivelAtualId,
  onChange,
  compacto = false,
}: {
  sessionId: string;
  nivelAtualId: string;
  onChange?: (nivelId: string) => void;
  /** Painel ao vivo: esconde a tabela de referências longa. */
  compacto?: boolean;
}) {
  const [atual, setAtual] = useState(nivelAtualId);
  const [escolhido, setEscolhido] = useState(nivelAtualId);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const idx = REGUA_ECONOMIA.findIndex((n) => n.id === escolhido);
  const nivel = nivelEconomia(escolhido);
  const mudou = escolhido !== atual;
  const cor = COR[nivel.id] ?? "#f0cc6a";

  function aplicar() {
    setErro(null);
    setAviso(null);
    startTransition(async () => {
      const r = await definirEconomia(sessionId, escolhido);
      if (!r.ok) {
        setErro(r.error);
        return;
      }
      setAtual(escolhido);
      onChange?.(escolhido);
      setAviso("Economia aplicada — os jogadores já foram avisados.");
    });
  }

  const exemplos = EXEMPLOS.map(itemById).filter((i): i is NonNullable<typeof i> => Boolean(i)).slice(0, compacto ? 4 : 8);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-arcana-gold/50 px-3 py-1 font-cinzel text-[10px] uppercase tracking-[0.2em] text-arcana-gold-bright">
          Regra de mesa — não é do livro (docs/02 §18)
        </span>
        {!mudou && (
          <span className="font-crimson text-sm text-arcana-text">
            Em vigor: <strong style={{ color: COR[atual] }}>{nivelEconomia(atual).nome}</strong>
          </span>
        )}
      </div>

      {/* Placa do nível escolhido */}
      <div
        className="flex items-center gap-4 rounded-2xl border p-4 transition-colors"
        style={{ borderColor: `${cor}99`, background: `linear-gradient(135deg, ${cor}22, rgba(12,10,16,0.9) 60%)` }}
      >
        <span className="text-5xl leading-none" aria-hidden>
          {nivel.emoji}
        </span>
        <div className="min-w-0">
          <p className="font-cinzel text-xl uppercase tracking-[0.12em]" style={{ color: cor }}>
            {nivel.nome}
          </p>
          <p className="font-cinzel text-sm text-arcana-text">
            ×{nivel.multiplicador.toLocaleString("pt-BR")} do preço de tabela
          </p>
          <p className="mt-1 font-crimson text-base italic text-arcana-text">“{nivel.fala}”</p>
        </div>
      </div>

      {/* A régua */}
      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={REGUA_ECONOMIA.length - 1}
          step={1}
          value={idx}
          onChange={(e) => {
            setAviso(null);
            setEscolhido(REGUA_ECONOMIA[Number(e.target.value)].id);
          }}
          aria-label="Nível da economia"
          aria-valuetext={`${nivel.nome}, vezes ${nivel.multiplicador}`}
          className="regua-economia w-full"
          style={{ ["--regua-cor" as string]: cor }}
        />
        <div className="grid grid-cols-7 gap-1">
          {REGUA_ECONOMIA.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                setAviso(null);
                setEscolhido(n.id);
              }}
              aria-pressed={escolhido === n.id}
              className="flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors hover:bg-white/5"
            >
              <span className={`text-xl transition-transform ${escolhido === n.id ? "scale-125" : "opacity-80"}`} aria-hidden>
                {n.emoji}
              </span>
              <span
                className="font-cinzel text-[10px] tabular-nums"
                style={{ color: escolhido === n.id ? COR[n.id] : "var(--color-arcana-text)" }}
              >
                ×{n.multiplicador.toLocaleString("pt-BR")}
              </span>
              <span className="hidden text-center font-crimson text-[11px] leading-tight text-arcana-text sm:block">
                {n.nome}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={aplicar}
          disabled={!mudou || pending}
          className={mudou && !pending ? "arcana-btn-primary arcana-btn-sm" : "arcana-btn-disabled arcana-btn-sm"}
        >
          {pending ? "Aplicando…" : mudou ? `Aplicar ${nivel.nome}` : "Economia em vigor"}
        </button>
        {mudou && (
          <button type="button" onClick={() => setEscolhido(atual)} className="arcana-btn-ghost arcana-btn-sm">
            Cancelar
          </button>
        )}
        {aviso && <p className="font-crimson text-sm text-emerald-300">{aviso}</p>}
        {erro && <p className="font-crimson text-sm text-red-300">{erro}</p>}
      </div>

      {/* Prévia de preços */}
      <div className="space-y-2">
        <p className="font-cinzel text-[10px] uppercase tracking-[0.28em] text-arcana-gold/90">Como fica no balcão</p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {exemplos.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-arcana-border-dim px-3 py-1.5 font-crimson text-sm text-arcana-text"
            >
              <span className="truncate">{i.nome}</span>
              <span className="shrink-0 tabular-nums">
                <span className="text-arcana-text-dim line-through">{formatarReis(i.preco)}</span>{" "}
                <strong style={{ color: cor }}>{formatarReis(precoNaMesa(i.preco, nivel.multiplicador))}</strong>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {!compacto && (
        <div className="grid gap-4 sm:grid-cols-2">
          {REFERENCIAS_ECONOMIA.map((g) => (
            <div key={g.grupo} className="space-y-1.5">
              <p className="font-cinzel text-[10px] uppercase tracking-[0.28em] text-arcana-gold/90">{g.grupo}</p>
              <ul className="space-y-1">
                {g.itens.map((it) => (
                  <li key={it.nome} className="flex justify-between gap-2 font-crimson text-sm text-arcana-text">
                    <span>{it.nome}</span>
                    <span className="shrink-0 tabular-nums">
                      <strong style={{ color: cor }}>{formatarReis(comInflacao(it.valor, nivel.multiplicador))}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
