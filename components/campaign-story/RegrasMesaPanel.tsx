"use client";

// Regras de criação de personagem da mesa (sessions.settings.regrasCriacao).
// O wizard esconde o que está vetado e o servidor revalida tudo ao salvar a ficha.

import { useMemo, useState } from "react";
import { salvarRegrasCriacao } from "@/app/dashboard/sessions/[id]/edit/actions";
import { CATALOGO, LOJAS } from "@/lib/character-creation/sacramento/catalogo";
import { HABILIDADES } from "@/lib/character-creation/sacramento/habilidades";
import { LIMITES_PADRAO, type LimitesCriacao } from "@/lib/character-creation/sacramento/rules";
import type { Nivel } from "@/lib/character-creation/sacramento/types";
import { GhostButton, GoldButton, hintClass, labelClass } from "./ui";

const NIVEIS: Nivel[] = [1, 2, 3, 4, 5, 6];

function Bloco({ titulo, dica, children }: { titulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <section className="arcana-card space-y-3 p-5">
      <div className="space-y-1">
        <p className={labelClass}>{titulo}</p>
        {dica && <p className={hintClass}>{dica}</p>}
      </div>
      {children}
    </section>
  );
}

function Pilula({
  ativo,
  onClick,
  children,
  title,
  perigo,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  perigo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={ativo}
      className={[
        "rounded-full border px-3 py-1.5 font-cinzel text-[10px] uppercase tracking-[0.16em] transition-colors",
        ativo
          ? perigo
            ? "border-red-400/70 bg-red-950/50 text-red-200"
            : "border-arcana-gold bg-arcana-gold/15 text-arcana-gold-bright"
          : "border-arcana-border text-arcana-text hover:border-arcana-gold/60",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function BuscaItem({ excluir, onPick, placeholder }: { excluir: Set<string>; onPick: (id: string) => void; placeholder: string }) {
  const [termo, setTermo] = useState("");
  const resultados = useMemo(() => {
    const t = termo.trim().toLowerCase();
    if (t.length < 2) return [];
    return CATALOGO.filter((i) => i.nome.toLowerCase().includes(t) && !excluir.has(i.id)).slice(0, 6);
  }, [termo, excluir]);
  return (
    <div className="relative">
      <input
        type="text"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder={placeholder}
        className="arcana-input w-full font-crimson text-sm"
      />
      {resultados.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-arcana-border bg-[#0f0d16] shadow-xl">
          {resultados.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => {
                onPick(i.id);
                setTermo("");
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left font-crimson text-sm text-arcana-text hover:bg-arcana-gold/10"
            >
              <span>{i.nome}</span>
              <span className="text-arcana-text-dim">${i.preco}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RegrasMesaPanel({ sessionId, initial }: { sessionId: string; initial: LimitesCriacao }) {
  const [regras, setRegras] = useState<LimitesCriacao>(initial);
  const [salvo, setSalvo] = useState<LimitesCriacao>(initial);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; texto: string } | null>(null);

  const set = (partial: Partial<LimitesCriacao>) => {
    setFeedback(null);
    setRegras((r) => ({ ...r, ...partial }));
  };
  const alterado = JSON.stringify(regras) !== JSON.stringify(salvo);

  const nomeItem = (id: string) => CATALOGO.find((i) => i.id === id)?.nome ?? id;
  const bloqueados = new Set(regras.itensBloqueados);
  const iniciais = new Set(regras.itensIniciais.map((i) => i.id));

  const toggleLoja = (id: string) => {
    const atual = regras.lojasPermitidas ?? LOJAS.map((l) => l.id);
    const nova = atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id];
    // Todas marcadas = null (libera tudo, inclusive lojas futuras).
    set({ lojasPermitidas: nova.length === LOJAS.length ? null : nova });
  };
  const toggleHabilidade = (id: string) =>
    set({
      habilidadesBloqueadas: regras.habilidadesBloqueadas.includes(id)
        ? regras.habilidadesBloqueadas.filter((x) => x !== id)
        : [...regras.habilidadesBloqueadas, id],
    });

  async function salvar() {
    setSalvando(true);
    setFeedback(null);
    try {
      const r = await salvarRegrasCriacao(sessionId, regras);
      if (r.ok) {
        setSalvo(regras);
        setFeedback({ ok: true, texto: "Regras salvas — valem para os próximos personagens." });
      } else {
        setFeedback({ ok: false, texto: r.error });
      }
    } catch {
      setFeedback({ ok: false, texto: "Não foi possível salvar. Tente de novo." });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="font-crimson text-base text-arcana-text">
        O que o jogador pode escolher ao criar o personagem desta campanha. O criador esconde o que
        estiver vetado e o servidor confere tudo ao salvar. Sem mudanças, vale o livro: nível 1, $200,
        todas as lojas e habilidades.
      </p>

      <Bloco titulo="Nível" dica="Nível com que a ficha nasce e o teto que o jogador pode escolher.">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-24 font-crimson text-sm text-arcana-text">Inicial</span>
            {NIVEIS.map((n) => (
              <Pilula
                key={n}
                ativo={regras.nivelInicial === n}
                onClick={() => set({ nivelInicial: n, nivelMaximo: Math.max(n, regras.nivelMaximo) as Nivel })}
              >
                {n}
              </Pilula>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-24 font-crimson text-sm text-arcana-text">Máximo</span>
            {NIVEIS.map((n) => (
              <Pilula
                key={n}
                ativo={regras.nivelMaximo === n}
                onClick={() => set({ nivelMaximo: n, nivelInicial: Math.min(n, regras.nivelInicial) as Nivel })}
              >
                {n}
              </Pilula>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-3 font-crimson text-base text-arcana-text">
            <input
              type="checkbox"
              checked={regras.nivelTravado}
              onChange={(e) => set({ nivelTravado: e.target.checked })}
              className="h-4 w-4 accent-[#c9a84c]"
            />
            Travar no nível inicial (o jogador não escolhe)
          </label>
        </div>
      </Bloco>

      <div className="grid gap-5 sm:grid-cols-2">
        <Bloco titulo="Dinheiro inicial" dica="Valor de tabela para as compras da criação (o livro dá $200, p. 52). A régua de Economia multiplica este valor e os preços juntos.">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-cinzel text-lg text-arcana-gold-bright">$</span>
            <input
              type="number"
              min={0}
              max={100000}
              value={regras.dinheiroInicial}
              onChange={(e) => set({ dinheiroInicial: Math.max(0, Number(e.target.value) || 0) })}
              className="arcana-input w-28 font-crimson text-base"
            />
            {[100, 200, 500].map((v) => (
              <Pilula key={v} ativo={regras.dinheiroInicial === v} onClick={() => set({ dinheiroInicial: v })}>
                ${v}
              </Pilula>
            ))}
          </div>
        </Bloco>

        <Bloco titulo="Personagens por jogador" dica="Quantos personagens cada convidado pode criar nesta campanha.">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <Pilula key={n} ativo={regras.personagensPorJogador === n} onClick={() => set({ personagensPorJogador: n })}>
                {n}
              </Pilula>
            ))}
          </div>
        </Bloco>
      </div>

      <Bloco titulo="Lojas abertas" dica="Lojas fechadas somem da cidade na hora das compras.">
        <div className="flex flex-wrap gap-2">
          {LOJAS.map((l) => (
            <Pilula
              key={l.id}
              ativo={!regras.lojasPermitidas || regras.lojasPermitidas.includes(l.id)}
              onClick={() => toggleLoja(l.id)}
              title={l.vendedor}
            >
              {l.nome}
            </Pilula>
          ))}
        </div>
      </Bloco>

      <Bloco titulo="Habilidades vetadas" dica="Toque para vetar. Vetadas ficam em vermelho e somem do criador.">
        {(["combate", "profissao"] as const).map((cat) => (
          <div key={cat} className="space-y-2">
            <p className="font-crimson text-sm italic text-arcana-text">{cat === "combate" ? "Combate" : "Profissão"}</p>
            <div className="flex flex-wrap gap-2">
              {HABILIDADES.filter((h) => h.categoria === cat).map((h) => (
                <Pilula
                  key={h.id}
                  perigo
                  ativo={regras.habilidadesBloqueadas.includes(h.id)}
                  onClick={() => toggleHabilidade(h.id)}
                  title={h.resumo}
                >
                  {regras.habilidadesBloqueadas.includes(h.id) ? "✕ " : ""}
                  {h.nome}
                </Pilula>
              ))}
            </div>
          </div>
        ))}
      </Bloco>

      <div className="grid gap-5 sm:grid-cols-2">
        <Bloco titulo="Itens proibidos" dica="Ninguém compra estes itens nesta mesa.">
          <BuscaItem
            placeholder="Buscar item para proibir…"
            excluir={bloqueados}
            onPick={(id) => set({ itensBloqueados: [...regras.itensBloqueados, id] })}
          />
          <div className="flex flex-wrap gap-2">
            {regras.itensBloqueados.map((id) => (
              <Pilula
                key={id}
                perigo
                ativo
                onClick={() => set({ itensBloqueados: regras.itensBloqueados.filter((x) => x !== id) })}
                title="Liberar"
              >
                ✕ {nomeItem(id)}
              </Pilula>
            ))}
          </div>
        </Bloco>

        <Bloco titulo="Equipamento da mesa" dica="Todo personagem ganha de graça, sem descontar do dinheiro.">
          <BuscaItem
            placeholder="Buscar item para dar a todos…"
            excluir={iniciais}
            onPick={(id) => set({ itensIniciais: [...regras.itensIniciais, { id, quantidade: 1 }] })}
          />
          <ul className="space-y-2">
            {regras.itensIniciais.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 rounded-xl border border-arcana-border px-3 py-1.5">
                <span className="font-crimson text-base text-arcana-text">{nomeItem(i.id)}</span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Diminuir ${nomeItem(i.id)}`}
                    onClick={() =>
                      set({
                        itensIniciais: regras.itensIniciais
                          .map((x) => (x.id === i.id ? { ...x, quantidade: x.quantidade - 1 } : x))
                          .filter((x) => x.quantidade > 0),
                      })
                    }
                    className="h-7 w-7 rounded-full border border-arcana-border font-cinzel text-arcana-text hover:border-arcana-gold"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-cinzel text-arcana-gold-bright">{i.quantidade}</span>
                  <button
                    type="button"
                    aria-label={`Aumentar ${nomeItem(i.id)}`}
                    onClick={() =>
                      set({
                        itensIniciais: regras.itensIniciais.map((x) =>
                          x.id === i.id ? { ...x, quantidade: Math.min(99, x.quantidade + 1) } : x,
                        ),
                      })
                    }
                    className="h-7 w-7 rounded-full border border-arcana-border font-cinzel text-arcana-text hover:border-arcana-gold"
                  >
                    +
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Bloco>
      </div>

      {/* Barra de salvar grudada no rodapé enquanto houver mudança */}
      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-xl border border-arcana-gold/30 bg-[rgba(12,10,16,0.96)] px-4 py-3">
        <GoldButton onClick={() => void salvar()} disabled={salvando || !alterado}>
          {salvando ? "Salvando…" : alterado ? "Salvar regras" : "Regras salvas"}
        </GoldButton>
        <GhostButton onClick={() => set(LIMITES_PADRAO)} disabled={salvando}>
          Voltar ao livro
        </GhostButton>
        {feedback && (
          <p className={`font-crimson text-sm ${feedback.ok ? "text-emerald-300" : "text-red-300"}`}>{feedback.texto}</p>
        )}
      </div>
    </div>
  );
}
