"use client";

import { useEffect, useMemo, useState } from "react";
import { HowItWorks } from "@/components/campaign-creation/Explainer";
import { PLAYER_GUIDES } from "@/lib/character-creation/sacramento/guidance";
import {
  CATALOGO,
  LOJAS,
  itemById,
  itemImagem,
  montariasCompradas,
  resumoCompras,
  precoNaMesa,
  type ItemCatalogo,
  type LojaInfo,
} from "@/lib/character-creation/sacramento/catalogo";
import { LIMITES_PADRAO, type LimitesCriacao } from "@/lib/character-creation/sacramento/rules";
import {
  FICHA_INICIAL,
  type SacramentoCreationData,
} from "@/lib/character-creation/sacramento/types";

type Props = {
  data: Partial<SacramentoCreationData>;
  onUpdate: (partial: Partial<SacramentoCreationData>) => void;
  /** Regras da mesa (dinheiro, lojas, itens). */
  limites?: LimitesCriacao;
  /** Avisa o wizard qual cenário de loja deve ambientar o painel do retrato. */
  onAmbient?: (imagem: string | null) => void;
};

const LABEL = "font-cinzel text-[10px] uppercase tracking-[0.3em] text-arcana-text-dim";

const fmt = (v: number) =>
  `$${Number.isInteger(v) ? v : v.toFixed(2).replace(".", ",")}`;

/** Retrato do vendedor com fallback de monograma enquanto a arte não chega. */
function SellerPortrait({ loja, size }: { loja: LojaInfo; size: string }) {
  const [failed, setFailed] = useState(false);
  if (loja.imagem && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={loja.imagem}
        alt={loja.vendedor}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${size} shrink-0 rounded-xl object-cover object-top`}
        style={{ background: "#090a11", border: "1px solid rgba(209,171,85,0.3)" }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${size} shrink-0 rounded-xl flex items-center justify-center font-cinzel text-arcana-gold`}
      style={{
        background: "radial-gradient(circle at 50% 30%, rgba(209,171,85,0.18), rgba(9,10,17,0.9))",
        border: "1px solid rgba(209,171,85,0.3)",
      }}
    >
      {loja.nome.charAt(0)}
    </span>
  );
}

function Stepper({
  q,
  nome,
  onChange,
}: {
  q: number;
  nome: string;
  onChange: (q: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => onChange(q - 1)}
        disabled={q === 0}
        aria-label={`Devolver ${nome}`}
        className="w-7 h-7 rounded-full font-cinzel text-sm text-arcana-text-dim hover:text-arcana-gold-bright disabled:opacity-25 transition-colors"
        style={{ border: "1px solid var(--color-arcana-border)", background: "rgba(8,8,15,0.5)" }}
      >
        −
      </button>
      <span
        className={[
          "w-6 text-center font-cinzel text-base",
          q > 0 ? "text-arcana-gold-bright" : "text-arcana-text-dim",
        ].join(" ")}
      >
        {q}
      </span>
      <button
        type="button"
        onClick={() => onChange(q + 1)}
        aria-label={`Comprar ${nome}`}
        className="w-7 h-7 rounded-full font-cinzel text-sm text-arcana-text-dim hover:text-arcana-gold-bright transition-colors"
        style={{ border: "1px solid var(--color-arcana-border)", background: "rgba(8,8,15,0.5)" }}
      >
        +
      </button>
    </div>
  );
}

export default function StepCompras({ data, onUpdate, onAmbient, limites: limitesProp }: Props) {
  const ficha = data.ficha ?? FICHA_INICIAL;
  const compras = useMemo(() => ficha.compras ?? [], [ficha.compras]);
  // Limites da campanha (regras da mesa; padrão libera tudo).
  const limites = limitesProp ?? LIMITES_PADRAO;
  const lojasVisiveis = LOJAS.filter(
    (l) => !limites.lojasPermitidas || limites.lojasPermitidas.includes(l.id),
  );
  const [lojaId, setLojaId] = useState<string>(lojasVisiveis[0]?.id ?? LOJAS[0].id);
  const [busca, setBusca] = useState("");
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  const setQuantidade = (id: string, quantidade: number) => {
    const outras = compras.filter((c) => c.id !== id);
    const novas = quantidade > 0 ? [...outras, { id, quantidade }] : outras;
    onUpdate({ ficha: { ...ficha, compras: novas } });
  };

  const qty = (id: string) => compras.find((c) => c.id === id)?.quantidade ?? 0;
  const resumo = useMemo(
    () => resumoCompras(compras, limites.dinheiroInicial, limites.multiplicadorPrecos),
    [compras, limites.dinheiroInicial, limites.multiplicadorPrecos],
  );
  const precoDe = (preco: number) => precoNaMesa(preco, limites.multiplicadorPrecos);
  const animais = montariasCompradas(compras);
  const totalItens = compras.reduce((n, c) => n + c.quantidade, 0);

  const loja = lojasVisiveis.find((l) => l.id === lojaId) ?? lojasVisiveis[0] ?? LOJAS[0];

  // Quantos itens do alforje saíram de cada loja (badge nas fachadas).
  const itensPorLoja = (l: LojaInfo) =>
    compras.reduce((n, c) => {
      const item = itemById(c.id);
      return item && l.categorias.includes(item.categoria) ? n + c.quantidade : n;
    }, 0);

  // A cena da loja ativa ambienta o painel do retrato.
  useEffect(() => {
    onAmbient?.(loja.imagem ?? null);
    return () => onAmbient?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loja.imagem]);

  // Esc fecha o carrinho.
  useEffect(() => {
    if (!carrinhoAberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCarrinhoAberto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [carrinhoAberto]);

  const termo = busca.trim().toLowerCase();
  const catalogoLiberado = CATALOGO.filter((i) => !limites.itensBloqueados.includes(i.id));
  const visiveis: ItemCatalogo[] = termo
    ? catalogoLiberado.filter((i) => i.nome.toLowerCase().includes(termo))
    : catalogoLiberado.filter((i) => loja.categorias.includes(i.categoria));

  const carrinho = compras
    .map((c) => ({ ...c, item: itemById(c.id) }))
    .filter((c) => c.item)
    .sort((a, b) => a.item!.nome.localeCompare(b.item!.nome));

  const estourou = resumo.saldo < 0;
  const semEspaco = resumo.espacoUsado > resumo.capacidade;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="hidden lg:block">
        <HowItWorks guide={PLAYER_GUIDES.compras} />
      </div>

      {/* Painel fixo: orçamento, espaço e acesso ao alforje */}
      <div
        className="sticky top-0 z-30 rounded-2xl px-4 py-3 flex items-center gap-4"
        style={{
          background: "rgba(15,15,26,0.9)",
          backdropFilter: "blur(20px) saturate(1.4)",
          border: "1px solid rgba(209,171,85,0.3)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
        }}
      >
        <div className="flex-1 grid grid-cols-3 gap-3 text-center">
          <div>
            <p
              className={[
                "font-cinzel text-xl leading-none",
                estourou ? "text-arcana-danger" : "text-arcana-gold-bright",
              ].join(" ")}
            >
              {fmt(resumo.saldo)}
            </p>
            <p className="font-cinzel text-[10px] uppercase tracking-[0.12em] text-arcana-text-dim mt-1">
              Saldo
            </p>
          </div>
          <div>
            <p
              className={[
                "font-cinzel text-xl leading-none",
                semEspaco ? "text-arcana-danger" : "text-arcana-gold-bright",
              ].join(" ")}
            >
              {resumo.espacoUsado} / {resumo.capacidade}
            </p>
            <p className="font-cinzel text-[10px] uppercase tracking-[0.12em] text-arcana-text-dim mt-1">
              Espaços
            </p>
          </div>
          <div>
            <p className="font-cinzel text-xl leading-none text-arcana-gold-bright">
              {resumo.armasProntas} / {resumo.limiteArmasProntas}
            </p>
            <p className="font-cinzel text-[10px] uppercase tracking-[0.12em] text-arcana-text-dim mt-1">
              Armas prontas
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCarrinhoAberto(true)}
          disabled={totalItens === 0}
          className={totalItens > 0 ? "arcana-btn-primary arcana-btn-sm" : "arcana-btn-disabled arcana-btn-sm"}
        >
          Alforje{totalItens > 0 ? ` · ${totalItens}` : ""}
        </button>
      </div>

      {limites.itensIniciais.length > 0 && (
        <p className="font-crimson text-sm italic text-arcana-text-dim">
          Cortesia do Juiz — todo personagem desta mesa já começa com:{" "}
          <span className="text-arcana-gold-bright">
            {limites.itensIniciais
              .map((i) => `${itemById(i.id)?.nome ?? i.id}${i.quantidade > 1 ? ` ×${i.quantidade}` : ""}`)
              .join(", ")}
          </span>
          .
        </p>
      )}

      {animais.length > 0 && (
        <p className="font-crimson text-sm italic text-arcana-gold-bright">
          {animais.length === 1
            ? `${animais[0] === "cavalo" ? "Cavalo" : "Mula"} no alforje — a próxima etapa é batizar e configurar sua montaria.`
            : `${animais.length} animais no alforje — a próxima etapa é batizar e configurar cada montaria.`}
        </p>
      )}
      {resumo.avisos.map((a) => (
        <p key={a} className="font-crimson text-sm italic text-arcana-danger">
          {a}
        </p>
      ))}

      {/* Rua das lojas */}
      <div className="space-y-3">
        <span className={LABEL}>As lojas do vilarejo</span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {lojasVisiveis.map((l) => {
            const active = !termo && l.id === lojaId;
            const naLoja = itensPorLoja(l);
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setLojaId(l.id);
                  setBusca("");
                }}
                aria-pressed={active}
                className={[
                  "relative rounded-xl border p-1.5 flex flex-col items-center gap-1.5 transition-all duration-150",
                  active
                    ? "border-arcana-gold/70 bg-arcana-gold/[0.08]"
                    : naLoja > 0
                      ? "border-arcana-gold/40 bg-arcana-gold/[0.04] hover:border-arcana-gold/60"
                      : "border-arcana-border bg-arcana-surface/60 hover:border-arcana-gold/40",
                ].join(" ")}
                style={active ? { boxShadow: "0 0 16px rgba(209,171,85,0.2)" } : undefined}
              >
                {naLoja > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 z-10 min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-cinzel text-[10px] font-bold"
                    style={{
                      background: "linear-gradient(180deg, #f0cc6a, #bd9540)",
                      color: "#1c1206",
                      border: "1px solid rgba(255,235,180,0.7)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.6), 0 0 10px rgba(209,171,85,0.35)",
                    }}
                    aria-label={`${naLoja} itens comprados nesta loja`}
                  >
                    {naLoja}
                  </span>
                )}
                <SellerPortrait loja={l} size="w-full aspect-square text-2xl" />
                <span
                  className={[
                    "min-h-[2.6em] flex items-center font-cinzel text-[10px] uppercase tracking-[0.06em] leading-tight text-center px-0.5",
                    active ? "text-arcana-gold-bright" : "text-arcana-text-dim",
                  ].join(" ")}
                >
                  {l.nome}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Balcão da loja ativa — cena grande do vendedor */}
      {!termo &&
        (loja.imagem ? (
          <div
            key={loja.id}
            className="balcao relative h-56 sm:h-64 rounded-2xl overflow-hidden"
            style={{
              border: "1px solid rgba(209,171,85,0.35)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.55), 0 0 22px rgba(209,171,85,0.1)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={loja.imagem}
              alt={loja.vendedor}
              className="balcao-img absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: "center 22%" }}
            />
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(11,11,20,0.82), rgba(11,11,20,0.3) 45%, rgba(11,11,20,0.1) 70%), linear-gradient(0deg, rgba(11,11,20,0.85), transparent 45%)",
              }}
            />
            <div className="absolute inset-x-5 bottom-4">
              <h4
                className="font-cinzel text-lg sm:text-xl uppercase tracking-[0.2em] text-arcana-gold-bright"
                style={{ textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}
              >
                {loja.nome}
              </h4>
              <p
                className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-text mt-0.5"
                style={{ textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}
              >
                {loja.vendedor}
              </p>
              <p
                className="font-crimson text-lg italic text-arcana-text leading-snug mt-1.5 max-w-[85%]"
                style={{ textShadow: "0 2px 8px rgba(0,0,0,0.95)" }}
              >
                “{loja.fala}”
              </p>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{
              background: "linear-gradient(135deg, rgba(38,19,24,0.85), rgba(27,27,42,0.72) 70%)",
              border: "1px solid rgba(209,171,85,0.3)",
            }}
          >
            <SellerPortrait loja={loja} size="w-20 h-20 text-3xl" />
            <div className="min-w-0">
              <h4 className="font-cinzel text-sm uppercase tracking-[0.2em] text-arcana-gold-bright">
                {loja.nome}
              </h4>
              <p className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-arcana-text-dim mt-0.5">
                {loja.vendedor}
              </p>
              <p className="font-crimson text-base italic text-arcana-text leading-snug mt-1.5">
                “{loja.fala}”
              </p>
            </div>
          </div>
        ))}

      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar em todas as lojas…"
        className="arcana-input w-full font-crimson text-base"
      />

      {/* Vitrine — cards com a arte em destaque */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map((item) => {
          const q = qty(item.id);
          return (
            <div
              key={item.id}
              className={[
                "relative rounded-xl border overflow-hidden transition-colors flex flex-col",
                q > 0
                  ? "border-arcana-gold/60 bg-arcana-gold/[0.05]"
                  : "border-arcana-border bg-arcana-surface/60 hover:border-arcana-gold/35",
              ].join(" ")}
              style={q > 0 ? { boxShadow: "0 0 16px rgba(209,171,85,0.12)" } : undefined}
            >
              <div
                className="relative flex items-center justify-center py-3"
                style={{ background: "#0b0b14" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={itemImagem(item.id)}
                  alt=""
                  width={112}
                  height={112}
                  loading="lazy"
                  className="h-28 w-28 object-contain"
                />
                {q > 0 && (
                  <span
                    className="absolute top-2 right-2 min-w-5 h-5 px-1 rounded-full flex items-center justify-center font-cinzel text-[10px] font-bold"
                    style={{
                      background: "linear-gradient(180deg, #f0cc6a, #bd9540)",
                      color: "#1c1206",
                      border: "1px solid rgba(255,235,180,0.7)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
                    }}
                  >
                    {q}
                  </span>
                )}
              </div>
              <div className="flex flex-col flex-1 px-3 pt-2 pb-2.5 gap-1">
                <p className="font-cinzel text-[11px] uppercase tracking-[0.1em] text-arcana-text leading-snug">
                  {item.nome}
                </p>
                {item.nota && (
                  <p className="font-cinzel text-[10px] uppercase tracking-[0.06em] text-arcana-gold leading-snug">
                    {item.nota}
                  </p>
                )}
                <p
                  className="font-crimson text-[13px] italic text-arcana-text-dim leading-snug line-clamp-2"
                  title={item.descricao}
                >
                  {item.descricao}
                </p>
                <div className="mt-auto pt-1.5 flex items-center justify-between gap-2">
                  <span className="font-cinzel text-sm text-arcana-gold-bright">
                    {fmt(precoDe(item.preco))}
                    <span className="ml-1.5 font-cinzel text-[10px] uppercase tracking-[0.08em] text-arcana-text-dim">
                      {item.espaco === null ? "—" : item.espaco} esp
                    </span>
                  </span>
                  <Stepper q={q} nome={item.nome} onChange={(n) => setQuantidade(item.id, n)} />
                </div>
              </div>
            </div>
          );
        })}
        {visiveis.length === 0 && (
          <p className="font-crimson text-sm italic text-arcana-text-dim py-4 text-center sm:col-span-2 lg:col-span-3">
            Nada encontrado com esse nome.
          </p>
        )}
      </div>

      {/* Carrinho — gaveta lateral */}
      {carrinhoAberto && (
        <>
          <button
            type="button"
            aria-label="Fechar alforje"
            onClick={() => setCarrinhoAberto(false)}
            className="fixed inset-0 z-40 cursor-default"
            style={{ background: "rgba(5,5,10,0.6)", backdropFilter: "blur(2px)" }}
          />
          <aside
            className="alforje-drawer fixed inset-y-0 right-0 z-50 w-[380px] max-w-[92vw] flex flex-col"
            role="dialog"
            aria-label="Alforje"
            style={{
              background: "rgba(15,15,26,0.97)",
              backdropFilter: "blur(24px) saturate(1.4)",
              borderLeft: "1px solid rgba(209,171,85,0.35)",
              boxShadow: "-12px 0 48px rgba(0,0,0,0.6)",
            }}
          >
            <div
              className="shrink-0 px-5 py-4 flex items-center justify-between gap-3"
              style={{ borderBottom: "1px solid rgba(209,171,85,0.25)" }}
            >
              <div>
                <h4 className="font-cinzel text-sm uppercase tracking-[0.25em] text-arcana-gold-bright">
                  Alforje
                </h4>
                <p className="font-crimson text-sm italic text-arcana-text-dim mt-0.5">
                  {totalItens} {totalItens === 1 ? "item" : "itens"} · {fmt(resumo.custoTotal)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCarrinhoAberto(false)}
                className="arcana-btn-ghost arcana-btn-sm"
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {carrinho.length === 0 && (
                <p className="font-crimson text-sm italic text-arcana-text-dim py-6 text-center">
                  O alforje está vazio.
                </p>
              )}
              {carrinho.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-arcana-border bg-arcana-surface/60 px-3 py-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={itemImagem(c.id)}
                    alt=""
                    width={44}
                    height={44}
                    loading="lazy"
                    className="h-11 w-11 shrink-0 rounded-lg object-contain"
                    style={{ background: "#0b0b14", border: "1px solid var(--color-arcana-border-dim)" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-crimson text-sm text-arcana-text leading-tight truncate">
                      {c.item!.nome}
                    </p>
                    <p className="font-cinzel text-[10px] uppercase tracking-[0.08em] text-arcana-text-dim mt-0.5">
                      {fmt(precoDe(c.item!.preco))} cada · {fmt(precoDe(c.item!.preco) * c.quantidade)}
                    </p>
                  </div>
                  <Stepper
                    q={c.quantidade}
                    nome={c.item!.nome}
                    onChange={(n) => setQuantidade(c.id, n)}
                  />
                  <button
                    type="button"
                    onClick={() => setQuantidade(c.id, 0)}
                    aria-label={`Tirar ${c.item!.nome} do alforje`}
                    className="shrink-0 font-cinzel text-[11px] text-arcana-text-dim hover:text-arcana-danger transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div
              className="shrink-0 px-5 py-4 space-y-1"
              style={{ borderTop: "1px solid rgba(209,171,85,0.25)" }}
            >
              <div className="flex justify-between font-crimson text-sm text-arcana-text-dim">
                <span>Gasto</span>
                <span>{fmt(resumo.custoTotal)}</span>
              </div>
              <div className="flex justify-between font-cinzel text-base">
                <span className="uppercase tracking-[0.15em] text-arcana-text">Saldo</span>
                <span className={estourou ? "text-arcana-danger" : "text-arcana-gold-bright"}>
                  {fmt(resumo.saldo)}
                </span>
              </div>
              <p className="font-crimson text-xs italic text-arcana-text-dim pt-1">
                Preço máximo da tabela, sem barganha (p. 52). O saldo vira seu dinheiro na
                campanha.
              </p>
            </div>
          </aside>
        </>
      )}

      <style jsx>{`
        .balcao {
          animation: balcaoIn 380ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes balcaoIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .balcao-img {
          animation: kenburns 16s ease-in-out infinite alternate;
          will-change: transform;
        }
        @keyframes kenburns {
          from {
            transform: scale(1) translateY(0);
          }
          to {
            transform: scale(1.08) translateY(-2%);
          }
        }
        .alforje-drawer {
          animation: drawerIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes drawerIn {
          from {
            transform: translateX(40px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .balcao,
          .balcao-img,
          .alforje-drawer {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
