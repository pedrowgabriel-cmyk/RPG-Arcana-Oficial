"use client";

// Ferramentas do Juiz dentro do cartão do personagem: dinheiro, XP, itens,
// estado e ficha. Cada painel abre pelo seu ladrilho.

import { useMemo, useState } from "react";
import type { AjusteFicha } from "@/app/dashboard/sessions/[id]/play/mesa-actions";
import { CATALOGO, CATEGORIAS } from "@/lib/character-creation/sacramento/catalogo";
import { ANTECEDENTES, ATRIBUTOS } from "@/lib/character-creation/sacramento/rules";
import { formatarReis } from "@/lib/rulesets/sacramento/economia";
import { balasDaCaixa, cargaDe, nomeDoItem, reservaDe, type ItemInventario } from "@/lib/rulesets/sacramento/inventario";
import { usoDoItem, type Calibre } from "@/lib/rulesets/sacramento/itens-uso";
import { CONDICOES, type FichaMesa } from "@/lib/rulesets/sacramento/mesa";

const BTN = "arcana-btn-ghost arcana-btn-sm";
const ROTULO = "font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-text";
const ATALHOS_REIS = [1, 5, 10, 50, 100];
const ATALHOS_XP = [1, 2, 3, 5];

export type Painel = "dinheiro" | "xp" | "itens" | "estado" | "ficha";

const sem = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function Ladrilhos({
  ficha,
  itens,
  aberto,
  onAbrir,
}: {
  ficha: FichaMesa;
  itens: number;
  aberto: Painel | null;
  onAbrir: (p: Painel | null) => void;
}) {
  const lista: { id: Painel; valor: string; nome: string }[] = [
    { id: "dinheiro", valor: formatarReis(ficha.saldo), nome: "Dinheiro" },
    { id: "xp", valor: String(ficha.xp), nome: "XP" },
    { id: "itens", valor: String(itens), nome: "Itens" },
    { id: "estado", valor: String(ficha.condicoes.length), nome: "Estado" },
    { id: "ficha", valor: `Nv ${ficha.nivel}`, nome: "Ficha" },
  ];
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {lista.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-expanded={aberto === p.id}
          onClick={() => onAbrir(aberto === p.id ? null : p.id)}
          className={`arcana-tile ${aberto === p.id ? "arcana-tile-active" : ""}`}
        >
          <span className="max-w-full truncate font-cinzel text-sm font-bold tabular-nums text-arcana-gold-bright">{p.valor}</span>
          <span className="font-cinzel text-[10px] uppercase tracking-[0.12em]">{p.nome}</span>
        </button>
      ))}
    </div>
  );
}

export function PainelDinheiro({ saldo, pending, aplicar }: { saldo: number; pending: boolean; aplicar: (a: AjusteFicha) => void }) {
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const n = Math.abs(Number(valor)) || 0;
  const lancar = (sinal: 1 | -1) => {
    aplicar({ saldo: sinal * n, motivo: motivo.trim() || undefined });
    setValor("");
    setMotivo("");
  };
  return (
    <form
      className="arcana-gilded space-y-2.5 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (n > 0 && !pending) lancar(1);
      }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {ATALHOS_REIS.map((v) => (
          <button key={v} type="button" className={BTN} onClick={() => setValor(String(n + v))}>
            +{v}
          </button>
        ))}
        {n > 0 && (
          <button type="button" className="font-crimson text-sm text-arcana-text underline hover:text-arcana-gold-bright" onClick={() => setValor("")}>
            limpar
          </button>
        )}
      </div>
      <div className="grid grid-cols-[7rem_1fr] gap-1.5">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="réis"
          aria-label="Valor em réis"
          className="arcana-input font-crimson text-base"
        />
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo (opcional)"
          aria-label="Motivo"
          className="arcana-input font-crimson text-base"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button type="button" className="arcana-btn-danger arcana-btn-sm disabled:opacity-40" disabled={pending || n === 0 || n > saldo} onClick={() => lancar(-1)}>
          Cobrar
        </button>
        <button type="submit" className="arcana-btn-primary arcana-btn-sm disabled:opacity-40" disabled={pending || n === 0}>
          Dar {n > 0 ? formatarReis(n) : ""}
        </button>
      </div>
    </form>
  );
}

export function PainelXp({ xp, pending, aplicar }: { xp: number; pending: boolean; aplicar: (a: AjusteFicha) => void }) {
  return (
    <div className="arcana-gilded flex flex-wrap items-center gap-1.5 p-3">
      {ATALHOS_XP.map((v) => (
        <button key={v} type="button" className={BTN} disabled={pending} onClick={() => aplicar({ xp: v })}>
          +{v} XP
        </button>
      ))}
      <button type="button" className="arcana-btn-danger arcana-btn-sm ml-auto disabled:opacity-40" disabled={pending || xp === 0} onClick={() => aplicar({ xp: -1 })}>
        −1 XP
      </button>
    </div>
  );
}

function LinhaInventario({
  item,
  pending,
  onAjustar,
}: {
  item: ItemInventario;
  pending: boolean;
  onAjustar: (delta: number | "tudo") => void;
}) {
  const uso = usoDoItem(item.id);
  const nome = nomeDoItem(item);
  const unico = uso?.tipo === "arma-fogo" || uso?.tipo === "porte";
  const qtd = uso?.tipo === "municao" ? `${balasDaCaixa(item)} balas` : unico ? null : `${item.quantidade ?? 1}×`;
  return (
    <li className="flex items-center gap-1.5 rounded-lg border border-arcana-border-dim px-2.5 py-1">
      <span className="min-w-0 flex-1 truncate font-crimson text-base text-white">{nome}</span>
      {qtd && <span className="shrink-0 font-cinzel text-xs tabular-nums text-arcana-gold-bright">{qtd}</span>}
      {!unico && (
        <>
          <button type="button" className={BTN} disabled={pending} onClick={() => onAjustar(-1)} aria-label={`Tirar um: ${nome}`}>−</button>
          <button type="button" className={BTN} disabled={pending} onClick={() => onAjustar(1)} aria-label={`Somar um: ${nome}`}>+</button>
        </>
      )}
      <button
        type="button"
        className="arcana-btn-danger arcana-btn-sm"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Tirar ${nome} do inventário?`)) onAjustar("tudo");
        }}
      >
        Tirar
      </button>
    </li>
  );
}

export function PainelItens({
  inventario,
  pending,
  onDar,
  onAjustar,
}: {
  inventario: ItemInventario[];
  pending: boolean;
  onDar: (itemId: string, quantidade: number, balas?: number) => void;
  onAjustar: (indice: number, item: ItemInventario, delta: number | "tudo") => void;
}) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]["id"] | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [qtd, setQtd] = useState(1);

  const lista = useMemo(() => {
    const q = sem(busca.trim());
    return CATALOGO.filter((i) => (!categoria || i.categoria === categoria) && (!q || sem(i.nome).includes(q)));
  }, [busca, categoria]);

  const item = itemId ? CATALOGO.find((i) => i.id === itemId) : undefined;
  const ehMunicao = !!item && usoDoItem(item.id)?.tipo === "municao";
  const maximo = ehMunicao ? 500 : 50;

  const armas = inventario.filter((i) => usoDoItem(i.id)?.tipo === "arma-fogo");
  const calibres = [...new Set(armas.map((i) => (usoDoItem(i.id) as { calibre: Calibre }).calibre))];

  const escolher = (id: string) => {
    setItemId(id);
    setQtd(usoDoItem(id)?.tipo === "municao" ? 6 : 1);
  };

  return (
    <div className="arcana-gilded space-y-2.5 p-3">
      {armas.length > 0 && (
        <p className="font-crimson text-sm text-arcana-text">
          {armas.map((a) => `${nomeDoItem(a)} ${cargaDe(a)}/${(usoDoItem(a.id) as { carga: number }).carga}`).join(" · ")}
          {calibres.map((c) => {
            const r = reservaDe(inventario, c);
            return ` · reserva ${c === "revolver" ? "rev." : c} ${r.porte + r.caixa}`;
          })}
        </p>
      )}
      <p className={ROTULO}>Inventário</p>
      {inventario.length === 0 ? (
        <p className="font-crimson text-base text-arcana-text">Sem itens.</p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
          {inventario.map((i, indice) => (
            <LinhaInventario key={`${i.id ?? i.nome}-${indice}`} item={i} pending={pending} onAjustar={(d) => onAjustar(indice, i, d)} />
          ))}
        </ul>
      )}
      <p className={`${ROTULO} border-t border-arcana-gold/30 pt-2.5`}>Adicionar</p>
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar item…"
        aria-label="Buscar item"
        className="arcana-input w-full font-crimson text-base"
      />
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {[{ id: null, nome: "Todos" }, ...CATEGORIAS].map((c) => (
          <button
            key={c.id ?? "todos"}
            type="button"
            aria-pressed={categoria === c.id}
            onClick={() => setCategoria(c.id)}
            className={`${categoria === c.id ? "arcana-chip-active" : "arcana-chip"} shrink-0 px-3 py-1 font-crimson text-sm`}
          >
            {c.nome}
          </button>
        ))}
      </div>
      <ul className="max-h-52 space-y-1 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
        {lista.map((i) => (
          <li key={i.id}>
            <button
              type="button"
              aria-pressed={itemId === i.id}
              onClick={() => escolher(i.id)}
              className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors ${itemId === i.id ? "border-arcana-gold-bright bg-arcana-gold/20" : "border-arcana-border-dim hover:border-arcana-gold/60"}`}
            >
              <span className="block font-cinzel text-xs text-arcana-gold-bright">{i.nome}</span>
              {i.nota && <span className="block font-crimson text-sm text-arcana-text">{i.nota}</span>}
            </button>
          </li>
        ))}
        {lista.length === 0 && <li className="font-crimson text-sm text-arcana-text">Nenhum item com esse nome.</li>}
      </ul>
      {item && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-arcana-gold/30 pt-2.5">
          <button type="button" className={BTN} disabled={qtd <= 1} onClick={() => setQtd((v) => Math.max(1, v - 1))} aria-label="Menos">
            −
          </button>
          <span className="min-w-[4.5rem] text-center font-cinzel text-sm tabular-nums text-white">
            {qtd} {ehMunicao ? "balas" : "un."}
          </span>
          <button type="button" className={BTN} disabled={qtd >= maximo} onClick={() => setQtd((v) => Math.min(maximo, v + 1))} aria-label="Mais">
            +
          </button>
          <button
            type="button"
            className="arcana-btn-primary arcana-btn-sm ml-auto disabled:opacity-40"
            disabled={pending}
            onClick={() => onDar(item.id, ehMunicao ? 0 : qtd, ehMunicao ? qtd : undefined)}
          >
            Dar {item.nome}
          </button>
        </div>
      )}
    </div>
  );
}

export function PainelEstado({ ficha, pending, aplicar }: { ficha: FichaMesa; pending: boolean; aplicar: (a: AjusteFicha) => void }) {
  return (
    <div className="arcana-gilded space-y-2.5 p-3">
      <p className={ROTULO}>Marcar condição</p>
      <div className="flex flex-wrap gap-1">
        {CONDICOES.filter((c) => !ficha.condicoes.includes(c.nome)).map((c) => (
          <button
            key={c.nome}
            type="button"
            disabled={pending}
            title={c.efeito}
            onClick={() => aplicar({ condicao: c.nome, ativa: true })}
            className="arcana-chip px-2.5 py-1 font-crimson text-sm"
          >
            {c.nome}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 border-t border-arcana-gold/30 pt-2.5">
        <button type="button" className={BTN} disabled={pending} onClick={() => aplicar({ descansar: "comum" })} title="24 h: zera Dor e +2 V">
          Descanso
        </button>
        <button type="button" className={BTN} disabled={pending} onClick={() => aplicar({ descansar: "medico" })} title="24 h com médico: zera Dor e +3 V">
          Descanso médico
        </button>
      </div>
    </div>
  );
}

export function PainelFicha({ ficha, onDossie }: { ficha: FichaMesa; onDossie: () => void }) {
  return (
    <div className="arcana-gilded space-y-2.5 p-3">
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-crimson text-sm text-arcana-text sm:grid-cols-4">
        {ATRIBUTOS.map((a) => (
          <span key={a.id}>{a.nome} <strong className="text-arcana-gold-bright">{ficha.atributos[a.id] ?? 0}</strong></span>
        ))}
        {ANTECEDENTES.map((a) => (
          <span key={a.id}>{a.nome} <strong className="text-arcana-gold-bright">{ficha.antecedentes[a.id] ?? 0}</strong></span>
        ))}
      </div>
      <p className="font-crimson text-sm text-arcana-text">
        AC {ficha.derivados.acoesCombate ?? "—"} · M {ficha.derivados.movimentos ?? "—"} · Defesa {ficha.derivados.defesa ?? 5} · Cartas de iniciativa {ficha.derivados.cartasIniciativa ?? 1}
      </p>
      <button type="button" className={BTN} onClick={onDossie}>
        Abrir dossiê completo
      </button>
    </div>
  );
}
