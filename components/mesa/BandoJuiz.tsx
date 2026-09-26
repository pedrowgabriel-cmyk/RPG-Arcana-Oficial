"use client";

import { useState, useTransition } from "react";
import { ajustarFicha, type AjusteFicha } from "@/app/dashboard/sessions/[id]/play/mesa-actions";
import { CharacterDossier } from "@/components/campaign-story/CharacterDossier";
import { ANTECEDENTES, ATRIBUTOS } from "@/lib/character-creation/sacramento/rules";
import { CONDICOES, fichaMesa, nomeCarta } from "@/lib/rulesets/sacramento/mesa";
import { formatarReis } from "@/lib/rulesets/sacramento/economia";
import type { Character, PartyCharacter } from "@/lib/types";
import { BarraVida, CartaMini, CirculosDor, Chip, RetratoEstado } from "./pecas";

const BTN = "rounded-lg border border-arcana-border px-2 py-1 font-cinzel text-[11px] text-arcana-text transition-colors hover:border-arcana-gold/60 disabled:opacity-40";

function CartaoPJ({
  sessionId,
  character,
  jogador,
  onMsg,
  onChange,
}: {
  sessionId: string;
  character: Character;
  jogador: string;
  onMsg: (m: { ok: boolean; texto: string }) => void;
  onChange: () => void;
}) {
  const f = fichaMesa(character);
  const [pending, start] = useTransition();
  const [aberto, setAberto] = useState(false);
  const [dossie, setDossie] = useState(false);
  const [valor, setValor] = useState("");

  const aplicar = (a: AjusteFicha) =>
    start(async () => {
      const r = await ajustarFicha(sessionId, character.id, a);
      onMsg(r.ok ? { ok: true, texto: r.texto } : { ok: false, texto: r.error });
      onChange();
    });

  return (
    <article className={`arcana-card space-y-3 p-3 ${f.morto ? "opacity-70" : ""} ${pending ? "animate-pulse" : ""}`}>
      <div className="flex gap-3">
        <button type="button" onClick={() => setDossie(true)} title="Abrir dossiê" className="shrink-0">
          <RetratoEstado character={character} ficha={f} className="h-28 w-24" mostrarRotulo />
        </button>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-cinzel text-base tracking-[0.06em] text-arcana-gold-bright">{character.name}</p>
              <p className="truncate font-crimson text-sm text-arcana-text">
                {jogador} · Nv {f.nivel} · {f.xp} XP · {formatarReis(f.saldo)}
              </p>
            </div>
          </div>
          <BarraVida vida={f.vida} vidaMax={f.vidaMax} />
          <div className="flex flex-wrap items-center gap-1">
            <button className={BTN} disabled={pending} onClick={() => aplicar({ vida: -3 })}>−3 V</button>
            <button className={BTN} disabled={pending} onClick={() => aplicar({ vida: -1 })}>−1 V</button>
            <button className={BTN} disabled={pending} onClick={() => aplicar({ vida: 1 })}>+1 V</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CirculosDor dor={f.dor} tamanho="sm" onClick={(n) => aplicar({ dor: n - f.dor })} />
            <button className={BTN} disabled={pending || f.dor === 0} onClick={() => aplicar({ dor: -1 })}>−D</button>
          </div>
        </div>
      </div>

      {/* Sina */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-text">Sina</span>
        {f.sina.map((c, i) => (
          <CartaMini
            key={`${nomeCarta(c)}-${i}`}
            carta={c}
            titulo="Clique para gastar esta Sina"
            onClick={() => {
              if (window.confirm(`${character.name} gasta a Sina ${nomeCarta(c)}?`)) aplicar({ sina: "usar", indice: i });
            }}
          />
        ))}
        <button className={BTN} disabled={pending} onClick={() => aplicar({ sina: "dar" })} title="Concede uma Carta de Sina (máx. 2 por sessão, p. 94)">
          + Sina
        </button>
      </div>

      {/* Condições */}
      {f.condicoes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {f.condicoes.map((c) => (
            <button key={c} type="button" onClick={() => aplicar({ condicao: c, ativa: false })} title="Remover">
              <Chip tom={c === "Morto" || c === "Inconsciente" || c === "Sangrando" ? "perigo" : "neutro"}>{c} ✕</Chip>
            </button>
          ))}
        </div>
      )}

      <button type="button" onClick={() => setAberto((v) => !v)} className="w-full text-left font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-gold">
        {aberto ? "− Menos" : "+ Dinheiro, XP, condições, ficha"}
      </button>

      {aberto && (
        <div className="space-y-3 border-t border-arcana-border-dim pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-arcana-text">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="réis"
              className="arcana-input w-24 font-crimson text-sm"
            />
            <button className={BTN} disabled={pending || !Number(valor)} onClick={() => { aplicar({ saldo: Math.abs(Number(valor)) }); setValor(""); }}>Dar</button>
            <button className={BTN} disabled={pending || !Number(valor)} onClick={() => { aplicar({ saldo: -Math.abs(Number(valor)) }); setValor(""); }}>Cobrar</button>
            <span className="mx-1 text-arcana-border">|</span>
            <button className={BTN} disabled={pending} onClick={() => aplicar({ xp: 1 })}>+1 XP</button>
            <button className={BTN} disabled={pending || f.xp === 0} onClick={() => aplicar({ xp: -1 })}>−1 XP</button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              value=""
              onChange={(e) => e.target.value && aplicar({ condicao: e.target.value, ativa: true })}
              className="arcana-input font-crimson text-sm"
              aria-label="Adicionar condição"
            >
              <option value="">+ Condição…</option>
              {CONDICOES.filter((c) => !f.condicoes.includes(c.nome)).map((c) => (
                <option key={c.nome} value={c.nome}>
                  {c.nome} — {c.efeito}
                </option>
              ))}
            </select>
            <button className={BTN} disabled={pending} onClick={() => aplicar({ descansar: "comum" })} title="24 h: zera Dor e +2 V">Descanso</button>
            <button className={BTN} disabled={pending} onClick={() => aplicar({ descansar: "medico" })} title="24 h com médico: zera Dor e +3 V">Descanso médico</button>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-crimson text-sm text-arcana-text sm:grid-cols-4">
            {ATRIBUTOS.map((a) => (
              <span key={a.id}>{a.nome} <strong className="text-arcana-gold-bright">{f.atributos[a.id] ?? 0}</strong></span>
            ))}
            {ANTECEDENTES.map((a) => (
              <span key={a.id}>{a.nome} <strong className="text-arcana-gold-bright">{f.antecedentes[a.id] ?? 0}</strong></span>
            ))}
          </div>
          <p className="font-crimson text-sm text-arcana-text">
            AC {f.derivados.acoesCombate ?? "—"} · M {f.derivados.movimentos ?? "—"} · Defesa {f.derivados.defesa ?? 5} · Cartas de iniciativa {f.derivados.cartasIniciativa ?? 1}
          </p>
          <button className={BTN} onClick={() => setDossie(true)}>Abrir dossiê completo</button>
        </div>
      )}

      {dossie && (
        <CharacterDossier character={character as PartyCharacter} playerName={jogador} onClose={() => setDossie(false)} />
      )}
    </article>
  );
}

export function BandoJuiz({
  sessionId,
  characters,
  jogadores,
  onChange,
}: {
  sessionId: string;
  characters: Character[];
  jogadores: Record<string, string>;
  onChange: () => void;
}) {
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  return (
    <div className="space-y-3">
      {msg && (
        <p className={`rounded-xl border px-3 py-2 font-crimson text-sm ${msg.ok ? "border-emerald-500/40 text-emerald-200" : "border-red-500/40 text-red-200"}`}>
          {msg.texto}
        </p>
      )}
      {characters.length === 0 && (
        <p className="font-crimson text-base text-arcana-text">Nenhum personagem vinculado a esta mesa ainda.</p>
      )}
      {characters.map((c) => (
        <CartaoPJ key={c.id} sessionId={sessionId} character={c} jogador={jogadores[c.owner_id] ?? "Jogador"} onMsg={setMsg} onChange={onChange} />
      ))}
    </div>
  );
}
