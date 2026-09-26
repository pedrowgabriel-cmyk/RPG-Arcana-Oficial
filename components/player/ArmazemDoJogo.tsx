"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { comprarNoArmazem } from "@/app/play/[session_id]/actions";
import {
  CATALOGO,
  LOJAS,
  itemImagem,
  precoNaMesa,
  type ItemCatalogo,
} from "@/lib/character-creation/sacramento/catalogo";
import { limitesComEconomia } from "@/lib/character-creation/sacramento/rules";
import { economiaDaMesa, formatarReis } from "@/lib/rulesets/sacramento/economia";
import type { Character, Session } from "@/lib/types";

/**
 * Armazém da partida (Sacramento). Os preços seguem a economia VIGENTE da mesa,
 * que chega em tempo real pela session — se o Juiz mexer na régua, o balcão muda na hora.
 */
export function ArmazemDoJogo({
  session,
  character,
  onDone,
}: {
  session: Session;
  character: Character;
  onDone?: () => void;
}) {
  const limites = useMemo(() => limitesComEconomia(session.settings), [session.settings]);
  const economia = economiaDaMesa(session.settings);
  const mult = limites.multiplicadorPrecos;

  const lojas = LOJAS.filter((l) => !limites.lojasPermitidas || limites.lojasPermitidas.includes(l.id));
  const [lojaId, setLojaId] = useState(lojas[0]?.id ?? "");
  const [busca, setBusca] = useState("");
  const [qtd, setQtd] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();
  const [comprando, setComprando] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  // Aviso visual quando o Juiz muda a economia com o armazém aberto.
  const multAnterior = useRef(mult);
  const [mudouAgora, setMudouAgora] = useState<"subiu" | "caiu" | null>(null);
  useEffect(() => {
    if (multAnterior.current === mult) return;
    setMudouAgora(mult > multAnterior.current ? "subiu" : "caiu");
    multAnterior.current = mult;
    const t = setTimeout(() => setMudouAgora(null), 6000);
    return () => clearTimeout(t);
  }, [mult]);

  const saldo =
    typeof (character.stats as { saldo?: number } | null)?.saldo === "number"
      ? (character.stats as { saldo: number }).saldo
      : character.gold;

  const loja = lojas.find((l) => l.id === lojaId) ?? lojas[0];
  const termo = busca.trim().toLowerCase();
  const categoriasAbertas = new Set(lojas.flatMap((l) => l.categorias));
  const itens: ItemCatalogo[] = CATALOGO.filter(
    (i) => !limites.itensBloqueados.includes(i.id) && categoriasAbertas.has(i.categoria),
  ).filter((i) => (termo ? i.nome.toLowerCase().includes(termo) : loja?.categorias.includes(i.categoria)));

  function comprar(item: ItemCatalogo) {
    const q = qtd[item.id] ?? 1;
    setComprando(item.id);
    setMsg(null);
    startTransition(async () => {
      const r = await comprarNoArmazem(session.id, character.id, item.id, q);
      setComprando(null);
      if (!r.ok) {
        setMsg({ ok: false, texto: r.error });
        return;
      }
      setQtd((prev) => ({ ...prev, [item.id]: 1 }));
      onDone?.();
      setMsg({ ok: true, texto: `${q}× ${item.nome} no alforje por ${formatarReis(r.pago)}. Sobrou ${formatarReis(r.saldo)}.` });
    });
  }

  if (lojas.length === 0) {
    return <p className="font-crimson text-base text-arcana-text">O Juiz fechou todas as lojas desta mesa.</p>;
  }

  return (
    <div className="space-y-4 text-arcana-text">
      {/* Economia vigente + saldo */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={`rounded-xl border px-3 py-2 transition-all ${mudouAgora ? "border-arcana-gold-bright shadow-[0_0_20px_rgba(240,204,106,0.45)]" : "border-arcana-border"}`}
        >
          <p className="font-cinzel text-[11px] uppercase tracking-[0.18em] text-arcana-gold-bright">
            {economia.emoji} {economia.nome} · ×{mult.toLocaleString("pt-BR")}
          </p>
          <p className="font-crimson text-sm italic">“{economia.fala}”</p>
        </div>
        <div className="text-right">
          <p className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-text-dim">Seu saldo</p>
          <p className="font-cinzel text-2xl tabular-nums text-arcana-gold-bright">{formatarReis(saldo)}</p>
        </div>
      </div>

      {mudouAgora && (
        <p className="rounded-xl border border-arcana-gold/60 bg-arcana-gold/10 px-3 py-2 font-crimson text-base text-arcana-gold-bright">
          {mudouAgora === "subiu" ? "📈 Os preços acabaram de subir!" : "📉 Os preços acabaram de cair!"}
        </p>
      )}

      {/* Lojas */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {lojas.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              setLojaId(l.id);
              setBusca("");
            }}
            className={[
              "shrink-0 rounded-full border px-3 py-1.5 font-cinzel text-[10px] uppercase tracking-[0.15em]",
              l.id === loja?.id && !termo
                ? "border-arcana-gold bg-arcana-gold/15 text-arcana-gold-bright"
                : "border-arcana-border text-arcana-text",
            ].join(" ")}
          >
            {l.nome}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Procurar em todas as lojas…"
        className="arcana-input w-full font-crimson text-sm"
      />

      {loja && !termo && <p className="font-crimson text-sm italic">{loja.vendedor}: “{loja.fala}”</p>}

      {msg && (
        <p className={`font-crimson text-sm ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.texto}</p>
      )}

      <ul className="space-y-2">
        {itens.map((item) => {
          const unit = precoNaMesa(item.preco, mult);
          const q = qtd[item.id] ?? 1;
          const total = Math.round(unit * q * 100) / 100;
          const semDinheiro = total > saldo;
          return (
            <li key={item.id} className="flex items-center gap-3 rounded-xl border border-arcana-border-dim bg-[rgba(12,10,16,0.7)] p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={itemImagem(item.id)} alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain" loading="lazy" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-cinzel text-sm tracking-[0.05em] text-arcana-text">{item.nome}</p>
                {item.nota && <p className="truncate font-crimson text-xs text-arcana-text-dim">{item.nota}</p>}
                <p className="font-crimson text-sm tabular-nums">
                  {mult !== 1 && <span className="mr-1 text-arcana-text-dim line-through">{formatarReis(item.preco)}</span>}
                  <strong className="text-arcana-gold-bright">{formatarReis(unit)}</strong>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Menos ${item.nome}`}
                    onClick={() => setQtd((p) => ({ ...p, [item.id]: Math.max(1, q - 1) }))}
                    className="h-7 w-7 rounded-full border border-arcana-border font-cinzel text-arcana-text"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-cinzel text-sm tabular-nums">{q}</span>
                  <button
                    type="button"
                    aria-label={`Mais ${item.nome}`}
                    onClick={() => setQtd((p) => ({ ...p, [item.id]: Math.min(20, q + 1) }))}
                    className="h-7 w-7 rounded-full border border-arcana-border font-cinzel text-arcana-text"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => comprar(item)}
                  disabled={pending || semDinheiro}
                  className={semDinheiro || pending ? "arcana-btn-disabled arcana-btn-sm" : "arcana-btn-primary arcana-btn-sm"}
                >
                  {comprando === item.id ? "…" : semDinheiro ? "Sem réis" : `Comprar ${formatarReis(total)}`}
                </button>
              </div>
            </li>
          );
        })}
        {itens.length === 0 && <li className="font-crimson text-base">Nada por aqui.</li>}
      </ul>
    </div>
  );
}
