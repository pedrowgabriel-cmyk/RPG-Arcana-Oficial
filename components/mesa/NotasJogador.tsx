"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { salvarNotas } from "@/app/play/[session_id]/actions";
import { notasDe, type CorNota, type Nota } from "@/lib/rulesets/sacramento/mesa";
import type { Character } from "@/lib/types";

const CORES: Record<CorNota, { nome: string; fundo: string; borda: string }> = {
  papel: { nome: "Papel", fundo: "rgba(40,34,44,0.9)", borda: "rgba(209,171,85,0.35)" },
  ouro: { nome: "Ouro", fundo: "rgba(92,72,24,0.55)", borda: "rgba(240,204,106,0.7)" },
  sangue: { nome: "Sangue", fundo: "rgba(110,24,24,0.5)", borda: "rgba(240,90,90,0.65)" },
  mato: { nome: "Mato", fundo: "rgba(28,80,52,0.5)", borda: "rgba(90,210,140,0.6)" },
  ceu: { nome: "Céu", fundo: "rgba(28,56,96,0.5)", borda: "rgba(110,170,240,0.6)" },
};

const novoId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()));

function quando(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Caderno do jogador: várias notas, busca, fixar, cores e salvamento automático.
 * O estado local é a fonte da verdade enquanto a tela está aberta — o polling da
 * ficha não sobrescreve o que está sendo digitado.
 */
export function NotasJogador({ sessionId, character }: { sessionId: string; character: Character }) {
  const [notas, setNotas] = useState<Nota[]>(() => notasDe(character));
  const [aberta, setAberta] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState<"salvo" | "salvando" | "erro" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendente = useRef<Nota[] | null>(null);

  // Salvamento automático com debounce; tenta de novo se falhar.
  const persistir = (lista: Nota[]) => {
    pendente.current = lista;
    setEstado("salvando");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const alvo = pendente.current;
      if (!alvo) return;
      const r = await salvarNotas(sessionId, character.id, alvo);
      if (pendente.current === alvo) {
        pendente.current = null;
        setEstado(r.ok ? "salvo" : "erro");
      }
    }, 700);
  };

  // Não perder a última digitação ao sair da aba.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pendente.current) void salvarNotas(sessionId, character.id, pendente.current);
    },
    [sessionId, character.id],
  );

  const atualizar = (fn: (l: Nota[]) => Nota[]) => {
    const next = fn(notas);
    setNotas(next);
    persistir(next);
  };

  const editar = (id: string, patch: Partial<Nota>) =>
    atualizar((l) => l.map((n) => (n.id === id ? { ...n, ...patch, atualizadaEm: new Date().toISOString() } : n)));

  function criar() {
    const n: Nota = { id: novoId(), titulo: "", texto: "", cor: "papel", fixada: false, atualizadaEm: new Date().toISOString() };
    atualizar((l) => [n, ...l]);
    setAberta(n.id);
  }

  function apagar(id: string) {
    if (!window.confirm("Apagar esta nota?")) return;
    atualizar((l) => l.filter((n) => n.id !== id));
    setAberta(null);
  }

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return [...notas]
      .filter((n) => !t || n.titulo.toLowerCase().includes(t) || n.texto.toLowerCase().includes(t))
      .sort((a, b) => Number(b.fixada) - Number(a.fixada) || b.atualizadaEm.localeCompare(a.atualizadaEm));
  }, [notas, busca]);

  const atual = notas.find((n) => n.id === aberta) ?? null;
  const idx = atual ? visiveis.findIndex((n) => n.id === atual.id) : -1;

  const selo =
    estado === "salvando" ? "Salvando…" : estado === "salvo" ? "✓ Salvo" : estado === "erro" ? "Erro ao salvar — tentando de novo ao editar" : null;

  /* ── Editor de uma nota ── */
  if (atual) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setAberta(null)} className="font-cinzel text-[11px] uppercase tracking-[0.2em] text-arcana-gold">
            ← Todas as notas
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={idx <= 0}
              onClick={() => setAberta(visiveis[idx - 1].id)}
              className="h-9 w-9 rounded-full border border-arcana-border font-cinzel text-arcana-text disabled:opacity-30"
              aria-label="Nota anterior"
            >
              ‹
            </button>
            <span className="w-14 text-center font-crimson text-sm tabular-nums text-arcana-text">
              {idx + 1}/{visiveis.length}
            </span>
            <button
              type="button"
              disabled={idx < 0 || idx >= visiveis.length - 1}
              onClick={() => setAberta(visiveis[idx + 1].id)}
              className="h-9 w-9 rounded-full border border-arcana-border font-cinzel text-arcana-text disabled:opacity-30"
              aria-label="Próxima nota"
            >
              ›
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border p-4 transition-colors" style={{ background: CORES[atual.cor].fundo, borderColor: CORES[atual.cor].borda }}>
          <input
            value={atual.titulo}
            onChange={(e) => editar(atual.id, { titulo: e.target.value })}
            placeholder="Título"
            maxLength={120}
            className="w-full bg-transparent font-cinzel text-xl tracking-[0.04em] text-white placeholder:text-white/35 focus:outline-none"
          />
          <textarea
            value={atual.texto}
            onChange={(e) => editar(atual.id, { texto: e.target.value })}
            placeholder="Anote aqui: pistas, nomes, dívidas, planos…"
            rows={14}
            autoFocus={!atual.texto}
            className="min-h-[40vh] w-full resize-y bg-transparent font-crimson text-lg leading-relaxed text-white placeholder:text-white/35 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(CORES) as CorNota[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => editar(atual.id, { cor: c })}
              title={CORES[c].nome}
              aria-label={`Cor ${CORES[c].nome}`}
              className={`h-8 w-8 rounded-full border-2 ${atual.cor === c ? "scale-110 ring-2 ring-white/60" : ""}`}
              style={{ background: CORES[c].fundo, borderColor: CORES[c].borda }}
            />
          ))}
          <button
            type="button"
            onClick={() => editar(atual.id, { fixada: !atual.fixada })}
            className={`rounded-full border px-3 py-1.5 font-cinzel text-[10px] uppercase tracking-[0.15em] ${atual.fixada ? "border-arcana-gold bg-arcana-gold/15 text-arcana-gold-bright" : "border-arcana-border text-arcana-text"}`}
          >
            📌 {atual.fixada ? "Fixada" : "Fixar"}
          </button>
          <button type="button" onClick={() => apagar(atual.id)} className="ml-auto rounded-full border border-red-400/50 px-3 py-1.5 font-cinzel text-[10px] uppercase tracking-[0.15em] text-red-200">
            Apagar
          </button>
        </div>
        <p className="font-crimson text-xs text-arcana-text-dim">
          {selo ?? `Editada ${quando(atual.atualizadaEm)}`} · só você vê suas notas
        </p>
      </div>
    );
  }

  /* ── Lista (quadro de notas) ── */
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar nas notas…"
          className="arcana-input min-w-0 flex-1 font-crimson text-sm"
        />
        <button type="button" onClick={criar} className="arcana-btn-primary shrink-0">
          + Nota
        </button>
      </div>
      {selo && <p className="font-crimson text-xs text-arcana-text-dim">{selo}</p>}

      {notas.length === 0 ? (
        <button
          type="button"
          onClick={criar}
          className="w-full rounded-2xl border border-dashed border-arcana-gold/40 p-8 text-center font-crimson text-base text-arcana-text"
        >
          Nenhuma nota ainda. Toque para anotar a primeira pista.
        </button>
      ) : (
        <ul className="columns-2 gap-2 sm:columns-3 [&>li]:mb-2">
          {visiveis.map((n) => (
            <li key={n.id} className="break-inside-avoid">
              <button
                type="button"
                onClick={() => setAberta(n.id)}
                className="block w-full rounded-2xl border p-3 text-left transition-transform active:scale-[0.98]"
                style={{ background: CORES[n.cor].fundo, borderColor: CORES[n.cor].borda }}
              >
                <p className="font-cinzel text-sm tracking-[0.04em] text-white">
                  {n.fixada && "📌 "}
                  {n.titulo || (n.texto ? "" : "Nota vazia")}
                </p>
                {n.texto && <p className="mt-1 line-clamp-6 whitespace-pre-line font-crimson text-sm leading-snug text-white/85">{n.texto}</p>}
                <p className="mt-2 font-crimson text-[11px] text-white/50">{quando(n.atualizadaEm)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {busca && visiveis.length === 0 && <p className="font-crimson text-sm text-arcana-text">Nada encontrado para “{busca}”.</p>}
    </div>
  );
}
