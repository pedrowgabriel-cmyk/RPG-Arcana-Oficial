"use client";

import { useState, useTransition } from "react";
import { definirCena } from "@/app/dashboard/sessions/[id]/play/mesa-actions";
import type { CenaAtual } from "@/lib/rulesets/sacramento/mesa";
import type {
  CampaignNpcData,
  CampaignPlaceData,
  CampaignSceneData,
} from "@/lib/rulesets/sacramento/types";
import type { CampaignElement } from "@/lib/types";

export type NpcCombate = { id: string; nome: string; ndc: number; tipo: "comum" | "especial" };

const BTN = "rounded-lg border border-arcana-border px-2.5 py-1 font-cinzel text-[11px] text-arcana-text transition-colors hover:border-arcana-gold/60 disabled:opacity-40";

function Campo({ rotulo, texto, segredo }: { rotulo: string; texto?: string; segredo?: boolean }) {
  if (!texto) return null;
  return (
    <p className="font-crimson text-sm text-arcana-text">
      <span className={`font-cinzel text-[10px] uppercase tracking-[0.18em] ${segredo ? "text-red-300" : "text-arcana-gold"}`}>
        {segredo ? "🔒 " : ""}
        {rotulo} ·{" "}
      </span>
      {texto}
    </p>
  );
}

export function CenaJuiz({
  sessionId,
  cenaAtual,
  elementos,
  onNpcCombate,
  onChange,
}: {
  sessionId: string;
  cenaAtual: CenaAtual | null;
  elementos: CampaignElement[];
  onNpcCombate: (n: NpcCombate) => void;
  onChange: () => void;
}) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [improviso, setImproviso] = useState({ titulo: "", lugar: "", descricao: "" });

  const cenas = elementos.filter((e) => e.kind === "scene");
  const lugares = elementos.filter((e) => e.kind === "place");
  const npcs = elementos.filter((e) => e.kind === "npc");
  const imagemDoLugar = (nome?: string) => {
    if (!nome) return undefined;
    const alvo = nome.toLowerCase();
    const l = lugares.find((p) => {
      const n = (p.data as CampaignPlaceData).nome?.toLowerCase() ?? "";
      return n && (alvo.includes(n) || n.includes(alvo));
    });
    return (l?.data as CampaignPlaceData | undefined)?.imagem;
  };

  const mostrar = (cena: CenaAtual | null) =>
    start(async () => {
      setErro(null);
      const r = await definirCena(sessionId, cena);
      if (!r.ok) setErro(r.error);
      onChange();
    });

  return (
    <div className="space-y-4">
      {/* Cena no ar */}
      <section className="overflow-hidden rounded-2xl border border-arcana-gold/40">
        {cenaAtual?.imagem && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cenaAtual.imagem} alt="" className="h-36 w-full object-cover" />
        )}
        <div className="space-y-1 bg-[rgba(12,10,16,0.92)] p-3">
          <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-arcana-gold">No ar para os jogadores</p>
          {cenaAtual ? (
            <>
              <p className="font-cinzel text-lg text-arcana-gold-bright">{cenaAtual.titulo}</p>
              {cenaAtual.lugar && <p className="font-crimson text-sm italic text-arcana-text">{cenaAtual.lugar}</p>}
              {cenaAtual.descricao && <p className="font-crimson text-base text-arcana-text">{cenaAtual.descricao}</p>}
              <button className={BTN} disabled={pending} onClick={() => mostrar(null)}>Tirar do ar</button>
            </>
          ) : (
            <p className="font-crimson text-base text-arcana-text">Nenhuma cena no ar.</p>
          )}
        </div>
      </section>
      {erro && <p className="font-crimson text-sm text-red-300">{erro}</p>}

      {/* Cenas preparadas no Hub de História */}
      <section className="space-y-2">
        <p className="font-cinzel text-[10px] uppercase tracking-[0.28em] text-arcana-gold/90">Cenas preparadas ({cenas.length})</p>
        {cenas.length === 0 && (
          <p className="font-crimson text-sm text-arcana-text">Crie cenas no Hub de História (ou use Tecer com IA) — elas aparecem aqui.</p>
        )}
        {cenas.map((el) => {
          const d = el.data as CampaignSceneData;
          const noAr = cenaAtual?.elementoId === el.id;
          return (
            <div key={el.id} className={`rounded-xl border p-2.5 ${noAr ? "border-arcana-gold bg-arcana-gold/10" : "border-arcana-border-dim"}`}>
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => setAberta(aberta === el.id ? null : el.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-cinzel text-sm text-arcana-text">{d.titulo}</p>
                  {d.lugar && <p className="truncate font-crimson text-xs text-arcana-text-dim">{d.lugar}</p>}
                </button>
                <button
                  className={noAr ? "arcana-btn-disabled arcana-btn-sm" : "arcana-btn-primary arcana-btn-sm"}
                  disabled={pending || noAr}
                  onClick={() =>
                    mostrar({ titulo: d.titulo, lugar: d.lugar, descricao: d.descricaoPublica, imagem: imagemDoLugar(d.lugar), elementoId: el.id })
                  }
                >
                  {noAr ? "No ar" : "Mostrar"}
                </button>
              </div>
              {aberta === el.id && (
                <div className="mt-2 space-y-1 border-t border-arcana-border-dim pt-2">
                  <Campo rotulo="Público" texto={d.descricaoPublica} />
                  <Campo rotulo="Participantes" texto={d.participantes} />
                  <Campo rotulo="Fatos verdadeiros" texto={d.fatosVerdadeiros} segredo />
                  <Campo rotulo="Segredos" texto={d.segredosDoJuiz} segredo />
                  <Campo rotulo="Rumores" texto={d.rumores} />
                  <Campo rotulo="Interativos" texto={d.elementosInterativos} />
                  <Campo rotulo="Testes possíveis" texto={d.testesPossiveis} />
                  <Campo rotulo="Consequências" texto={d.consequenciasPossiveis} />
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Cena improvisada */}
      <section className="space-y-2 rounded-xl border border-arcana-border-dim p-3">
        <p className="font-cinzel text-[10px] uppercase tracking-[0.28em] text-arcana-gold/90">Cena improvisada</p>
        <input className="arcana-input w-full font-crimson text-sm" placeholder="Título (ex.: Tiroteio no saloon)" value={improviso.titulo} onChange={(e) => setImproviso({ ...improviso, titulo: e.target.value })} />
        <input
          className="arcana-input w-full font-crimson text-sm"
          placeholder="Lugar"
          list="mesa-lugares"
          value={improviso.lugar}
          onChange={(e) => setImproviso({ ...improviso, lugar: e.target.value })}
        />
        <datalist id="mesa-lugares">
          {lugares.map((l) => (
            <option key={l.id} value={(l.data as CampaignPlaceData).nome} />
          ))}
        </datalist>
        <textarea className="arcana-input w-full font-crimson text-sm" rows={2} placeholder="O que os jogadores veem" value={improviso.descricao} onChange={(e) => setImproviso({ ...improviso, descricao: e.target.value })} />
        <button
          className={improviso.titulo.trim() ? "arcana-btn-primary arcana-btn-sm" : "arcana-btn-disabled arcana-btn-sm"}
          disabled={pending || !improviso.titulo.trim()}
          onClick={() => {
            mostrar({ titulo: improviso.titulo.trim(), lugar: improviso.lugar.trim() || undefined, descricao: improviso.descricao.trim() || undefined, imagem: imagemDoLugar(improviso.lugar) });
            setImproviso({ titulo: "", lugar: "", descricao: "" });
          }}
        >
          Mostrar aos jogadores
        </button>
      </section>

      {/* NPCs */}
      <section className="space-y-2">
        <p className="font-cinzel text-[10px] uppercase tracking-[0.28em] text-arcana-gold/90">NPCs da campanha ({npcs.length})</p>
        {npcs.map((el) => {
          const d = el.data as CampaignNpcData;
          const ndc = d.ficha?.ndc ?? 2;
          const tipo = d.ficha?.tipo ?? "comum";
          return (
            <details key={el.id} className="rounded-xl border border-arcana-border-dim p-2.5">
              <summary className="flex cursor-pointer items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="font-cinzel text-sm text-arcana-text">{d.nome}</span>
                  {d.ocupacao && <span className="font-crimson text-xs text-arcana-text-dim"> · {d.ocupacao}</span>}
                </span>
                <button
                  type="button"
                  className={BTN}
                  onClick={(e) => {
                    e.preventDefault();
                    onNpcCombate({ id: el.id, nome: d.nome, ndc, tipo });
                  }}
                >
                  ⚔ NdC {ndc}
                </button>
              </summary>
              <div className="mt-2 space-y-1">
                <Campo rotulo="Atitude" texto={d.atitude} />
                <Campo rotulo="Descrição" texto={d.descricao} />
                <Campo rotulo="Desejo" texto={d.desejo} />
                <Campo rotulo="Medo" texto={d.medo} />
                <Campo rotulo="Segredo" texto={d.segredo} segredo />
                <Campo rotulo="Agenda" texto={d.agenda} segredo />
                <Campo rotulo="Vínculos" texto={d.vinculos} />
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
