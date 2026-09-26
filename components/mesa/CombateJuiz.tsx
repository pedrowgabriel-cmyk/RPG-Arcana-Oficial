"use client";

import { useState, useTransition } from "react";
import { acaoIniciativa, rolarNaMesa, sacarIniciativa } from "@/app/dashboard/sessions/[id]/play/mesa-actions";
import { ANTECEDENTES, ATRIBUTOS } from "@/lib/character-creation/sacramento/rules";
import { deriveNpcStats, type Ndc } from "@/lib/rulesets/sacramento/npc-stats";
import { BONUS_DESCARTE, fichaMesa, type Iniciativa, type Rolagem, type TipoRolagem } from "@/lib/rulesets/sacramento/mesa";
import type { Character } from "@/lib/types";
import type { NpcCombate } from "./CenaJuiz";
import { CartaMini } from "./pecas";

const BTN = "rounded-lg border border-arcana-border px-2.5 py-1 font-cinzel text-[11px] text-arcana-text transition-colors hover:border-arcana-gold/60 disabled:opacity-40";

const TIPOS: { id: TipoRolagem; nome: string; dica: string }[] = [
  { id: "teste", nome: "Teste", dica: "1d6 + Antecedente (agir) ou Atributo (resistir) ≥ NA (padrão 6)" },
  { id: "ataque", nome: "Ataque", dica: "1d6 + Violência ≥ Defesa (5 aberto · 6 parcial · 7 completa · 3 surpreso); 6-6 / 1-1 crítico" },
  { id: "melhor2", nome: "Melhor de 2", dica: "Rola 2d6, fica com o maior + modificador" },
  { id: "sorte", nome: "Sorte", dica: "Par = sim · ímpar = não" },
  { id: "morte", nome: "Teste de Morte", dica: "1d6 puro: 1 ou 6 sobrevive (3 V), 2–5 morre; 1 por combate" },
  { id: "dor", nome: "Consequência de Dor", dica: "d6 na tabela de Dor" },
];

export function CombateJuiz({
  sessionId,
  iniciativa,
  characters,
  npcs,
  setNpcs,
}: {
  sessionId: string;
  iniciativa: Iniciativa | null;
  characters: Character[];
  npcs: (NpcCombate & { qtd: number })[];
  setNpcs: (n: (NpcCombate & { qtd: number })[]) => void;
}) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [fora, setFora] = useState<Set<string>>(new Set());
  const [capanga, setCapanga] = useState({ nome: "Capangas", ndc: 2, qtd: 3 });

  // Rolador
  const [tipo, setTipo] = useState<TipoRolagem>("teste");
  const [quem, setQuem] = useState<string>("juiz");
  const [base, setBase] = useState<string>("");
  const [mod, setMod] = useState(0);
  const [na, setNa] = useState(6);
  const [publico, setPublico] = useState(true);
  const [resultado, setResultado] = useState<Rolagem | null>(null);

  const vivos = characters.filter((c) => !fichaMesa(c).morto);
  const pjQuem = characters.find((c) => c.id === quem);
  const fQuem = pjQuem ? fichaMesa(pjQuem) : null;

  const acao = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setErro(null);
      const r = await fn();
      if (!r.ok) setErro(r.error ?? "Erro");
    });

  function sacar() {
    const participantes = [
      ...vivos
        .filter((c) => !fora.has(c.id))
        .map((c) => ({ id: c.id, nome: c.name, tipo: "pj" as const, nCartas: fichaMesa(c).derivados.cartasIniciativa ?? 1 })),
      ...npcs.map((n) => {
        const st = deriveNpcStats(n.tipo, n.ndc as Ndc);
        return {
          id: `npc-${n.id}`,
          nome: n.qtd > 1 ? `${n.nome} ×${n.qtd}` : n.nome,
          tipo: "npc" as const,
          nCartas: 1,
          ndc: n.ndc,
          vida: st.vida * n.qtd,
          vidaMax: st.vida * n.qtd,
        };
      }),
    ];
    acao(() => sacarIniciativa(sessionId, participantes));
  }

  function rolarAgora() {
    const rotuloBase =
      [...ATRIBUTOS, ...ANTECEDENTES].find((x) => x.id === base)?.nome ?? TIPOS.find((t) => t.id === tipo)!.nome;
    const nomeQuem = quem === "juiz" ? "Juiz" : (pjQuem?.name ?? npcs.find((n) => `npc-${n.id}` === quem)?.nome ?? "?");
    start(async () => {
      setErro(null);
      const r = await rolarNaMesa(sessionId, {
        tipo,
        rotulo: tipo === "teste" || tipo === "ataque" || tipo === "melhor2" ? rotuloBase : TIPOS.find((t) => t.id === tipo)!.nome,
        quem: nomeQuem,
        mod,
        na: tipo === "teste" || tipo === "ataque" || tipo === "melhor2" ? na : null,
        publico,
      });
      if (r.ok) setResultado(r.rolagem);
      else setErro(r.error);
    });
  }

  return (
    <div className="space-y-5">
      {erro && <p className="font-crimson text-sm text-red-300">{erro}</p>}

      {/* Iniciativa */}
      <section className="space-y-2 rounded-2xl border border-arcana-border-dim p-3">
        <div className="flex items-center justify-between">
          <p className="font-cinzel text-[10px] uppercase tracking-[0.28em] text-arcana-gold/90">Iniciativa por cartas</p>
          {iniciativa && <span className="font-cinzel text-sm text-arcana-gold-bright">Rodada {iniciativa.rodada}</span>}
        </div>

        {!iniciativa ? (
          <>
            <p className="font-crimson text-sm text-arcana-text">Cada um saca suas cartas e fica com a maior. A &gt; K &gt; Q &gt; J &gt; 10…; empate PJ × NPC, o NPC age antes (p. 78).</p>
            <div className="flex flex-wrap gap-1.5">
              {vivos.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFora((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })}
                  className={`rounded-full border px-2.5 py-1 font-crimson text-sm ${fora.has(c.id) ? "border-arcana-border text-arcana-text-dim line-through" : "border-arcana-gold/60 text-arcana-gold-bright"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {npcs.length > 0 && (
              <ul className="space-y-1">
                {npcs.map((n) => (
                  <li key={n.id} className="flex items-center justify-between gap-2 font-crimson text-sm text-arcana-text">
                    <span>⚔ {n.nome} · NdC {n.ndc} · {n.tipo}{n.qtd > 1 ? ` ×${n.qtd}` : ""}</span>
                    <button className={BTN} onClick={() => setNpcs(npcs.filter((x) => x.id !== n.id))}>✕</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <input className="arcana-input w-28 font-crimson text-sm" value={capanga.nome} onChange={(e) => setCapanga({ ...capanga, nome: e.target.value })} aria-label="Nome do grupo" />
              <label className="font-crimson text-sm text-arcana-text">
                NdC{" "}
                <select className="arcana-input font-crimson text-sm" value={capanga.ndc} onChange={(e) => setCapanga({ ...capanga, ndc: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="font-crimson text-sm text-arcana-text">
                ×{" "}
                <input type="number" min={1} max={12} className="arcana-input w-14 font-crimson text-sm" value={capanga.qtd} onChange={(e) => setCapanga({ ...capanga, qtd: Math.max(1, Number(e.target.value) || 1) })} />
              </label>
              <button className={BTN} onClick={() => setNpcs([...npcs, { id: crypto.randomUUID(), nome: capanga.nome || "Capangas", ndc: capanga.ndc, tipo: "comum", qtd: capanga.qtd }])}>
                + Inimigos
              </button>
            </div>
            <button className="arcana-btn-primary arcana-btn-sm" disabled={pending} onClick={sacar}>
              {pending ? "Embaralhando…" : "⚔️ Sacar iniciativa"}
            </button>
          </>
        ) : (
          <>
            <ol className="space-y-1.5">
              {iniciativa.ordem.map((c, i) => {
                const vez = i === iniciativa.vez;
                return (
                  <li
                    key={c.id}
                    className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${vez ? "border-arcana-gold-bright bg-arcana-gold/15 shadow-[0_0_14px_rgba(240,204,106,0.3)]" : "border-arcana-border-dim"}`}
                  >
                    <span className="flex gap-0.5">
                      {c.cartas.length > 1
                        ? c.cartas.map((k, j) => (
                            <span key={j} className={k === c.carta || (k.valor === c.carta.valor && k.naipe === c.carta.naipe) ? "" : "opacity-40"}>
                              <CartaMini carta={k} titulo="Escolher esta carta" onClick={() => acao(() => acaoIniciativa(sessionId, { tipo: "escolher", id: c.id, carta: j }))} />
                            </span>
                          ))
                        : <CartaMini carta={c.carta} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-cinzel text-sm ${c.tipo === "npc" ? "text-red-200" : "text-arcana-gold-bright"}`}>
                        {vez ? "▶ " : ""}
                        {c.nome}
                      </span>
                      {c.descarte && <span className="block font-crimson text-xs text-arcana-text">Descartou: {BONUS_DESCARTE[c.descarte as keyof typeof BONUS_DESCARTE]}</span>}
                      {c.tipo === "npc" && typeof c.vida === "number" && (
                        <span className="flex items-center gap-1 font-crimson text-xs text-arcana-text">
                          V {c.vida}/{c.vidaMax} · Def 5 · 1d6+{c.ndc}
                          <button className={BTN} onClick={() => acao(() => acaoIniciativa(sessionId, { tipo: "vidaNpc", id: c.id, delta: -1 }))}>−1</button>
                          <button className={BTN} onClick={() => acao(() => acaoIniciativa(sessionId, { tipo: "vidaNpc", id: c.id, delta: -3 }))}>−3</button>
                        </span>
                      )}
                    </span>
                    {!c.descarte && ["A", "K", "Q", "J"].includes(c.carta.valor) && (
                      <button className={BTN} title="Descartar a figura pelo bônus e ir para o fim da ordem" onClick={() => acao(() => acaoIniciativa(sessionId, { tipo: "descartar", id: c.id }))}>
                        Descartar
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="flex flex-wrap gap-2">
              <button className="arcana-btn-primary arcana-btn-sm" disabled={pending} onClick={() => acao(() => acaoIniciativa(sessionId, { tipo: "proximo" }))}>
                Próximo turno ▶
              </button>
              <button
                className="arcana-btn-ghost arcana-btn-sm"
                disabled={pending}
                onClick={() => { if (window.confirm("Encerrar o combate?")) acao(() => acaoIniciativa(sessionId, { tipo: "encerrar" })); }}
              >
                Encerrar combate
              </button>
            </div>
          </>
        )}
      </section>

      {/* Rolador */}
      <section className="space-y-3 rounded-2xl border border-arcana-border-dim p-3">
        <p className="font-cinzel text-[10px] uppercase tracking-[0.28em] text-arcana-gold/90">Rolar dados</p>
        <div className="flex flex-wrap gap-1.5">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.dica}
              onClick={() => { setTipo(t.id); setNa(t.id === "ataque" ? 5 : 6); }}
              className={`rounded-full border px-2.5 py-1 font-cinzel text-[10px] uppercase tracking-[0.12em] ${tipo === t.id ? "border-arcana-gold bg-arcana-gold/15 text-arcana-gold-bright" : "border-arcana-border text-arcana-text"}`}
            >
              {t.nome}
            </button>
          ))}
        </div>
        <p className="font-crimson text-sm italic text-arcana-text">{TIPOS.find((t) => t.id === tipo)?.dica}</p>

        <div className="flex flex-wrap items-center gap-2">
          <select className="arcana-input font-crimson text-sm" value={quem} onChange={(e) => { setQuem(e.target.value); setBase(""); setMod(0); }} aria-label="Quem rola">
            <option value="juiz">Juiz / NPC</option>
            {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {(tipo === "teste" || tipo === "ataque" || tipo === "melhor2") && (
            <>
              {fQuem && (
                <select
                  className="arcana-input font-crimson text-sm"
                  value={base}
                  onChange={(e) => {
                    setBase(e.target.value);
                    const v = fQuem.antecedentes[e.target.value] ?? fQuem.atributos[e.target.value] ?? 0;
                    setMod(v);
                  }}
                  aria-label="Antecedente ou atributo"
                >
                  <option value="">Modificador…</option>
                  <optgroup label="Antecedentes (agir)">
                    {ANTECEDENTES.map((a) => <option key={a.id} value={a.id}>{a.nome} {fQuem.antecedentes[a.id] ?? 0}</option>)}
                  </optgroup>
                  <optgroup label="Atributos (resistir)">
                    {ATRIBUTOS.map((a) => <option key={a.id} value={a.id}>{a.nome} {fQuem.atributos[a.id] ?? 0}</option>)}
                  </optgroup>
                </select>
              )}
              <label className="font-crimson text-sm text-arcana-text">
                Mod <input type="number" className="arcana-input w-14 font-crimson text-sm" value={mod} onChange={(e) => setMod(Number(e.target.value) || 0)} />
              </label>
              <label className="font-crimson text-sm text-arcana-text">
                {tipo === "ataque" ? "Defesa" : "NA"}{" "}
                <select className="arcana-input font-crimson text-sm" value={na} onChange={(e) => setNa(Number(e.target.value))}>
                  {(tipo === "ataque" ? [3, 5, 6, 7, 8] : [4, 5, 6, 7, 8, 9]).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </>
          )}
          <label className="flex items-center gap-1.5 font-crimson text-sm text-arcana-text">
            <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} className="accent-[#c9a84c]" />
            Jogadores veem
          </label>
        </div>
        <button className="arcana-btn-primary arcana-btn-sm" disabled={pending} onClick={rolarAgora}>🎲 Rolar</button>

        {resultado && (
          <div className={`rounded-xl border p-3 ${resultado.sucesso === true ? "border-emerald-400/60 bg-emerald-950/30" : resultado.sucesso === false ? "border-red-400/60 bg-red-950/30" : "border-arcana-gold/50"}`}>
            <p className="font-cinzel text-3xl tabular-nums text-white">{resultado.dados.join(" · ")}</p>
            <p className="font-crimson text-base text-arcana-text">{resultado.texto}</p>
          </div>
        )}
      </section>
    </div>
  );
}
