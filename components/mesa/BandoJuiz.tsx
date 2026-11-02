"use client";

import { useState, useTransition } from "react";
import { ajustarFicha, ajustarItem, darItem, type AjusteFicha } from "@/app/dashboard/sessions/[id]/play/mesa-actions";
import { CAUSAS_DANO, type CausaDano } from "@/lib/rulesets/sacramento/efeitos";
import { lerInventario, type ItemInventario } from "@/lib/rulesets/sacramento/inventario";
import { CharacterDossier } from "@/components/campaign-story/CharacterDossier";
import { fichaMesa, nomeCarta } from "@/lib/rulesets/sacramento/mesa";
import type { Character, PartyCharacter } from "@/lib/types";
import { Ladrilhos, PainelDinheiro, PainelFicha, PainelEstado, PainelItens, PainelXp, type Painel } from "./FerramentasJuiz";
import { BarraVida, CartaMini, CirculosDor, Chip, RetratoEstado, TrilhaVida } from "./pecas";

const BTN = "arcana-btn-ghost arcana-btn-sm";
const ATALHOS_VIDA = [1, 2, 3, 5];

/** Arte da causa; enquanto a imagem não existir, mostra o emoji. */
function IconeCausa({ id, nome, emoji }: { id: string; nome: string; emoji: string }) {
  const [falhou, setFalhou] = useState(false);
  if (falhou) return <span aria-label={nome}>{emoji}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/story/uso/popups/dano-${id}.webp`} alt={nome} className="h-7 w-7 object-contain" onError={() => setFalhou(true)} />;
}

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
  const [painel, setPainel] = useState<Painel | null>("itens");
  const [causa, setCausa] = useState<CausaDano | undefined>(undefined);
  const inv = lerInventario(character.inventory);

  const aplicar = (a: AjusteFicha) =>
    start(async () => {
      const r = await ajustarFicha(sessionId, character.id, a);
      onMsg(r.ok ? { ok: true, texto: r.texto } : { ok: false, texto: r.error });
      onChange();
    });

  const dar = (itemId: string, quantidade: number, balas?: number) =>
    start(async () => {
      const r = await darItem(sessionId, character.id, itemId, quantidade, balas);
      onMsg(r.ok ? { ok: true, texto: r.texto } : { ok: false, texto: r.error });
      onChange();
    });

  const ajustar = (indice: number, item: ItemInventario, delta: number | "tudo") =>
    start(async () => {
      const r = await ajustarItem(sessionId, character.id, indice, item.id ?? item.nome ?? "", delta);
      onMsg(r.ok ? { ok: true, texto: r.texto } : { ok: false, texto: r.error });
      onChange();
    });

  return (
    <article className={`arcana-card space-y-3 p-3 ${f.morto ? "opacity-70" : ""} ${pending ? "animate-pulse" : ""}`}>
      {/* Faixa: foto, nome e vida. O resto abre no clique. */}
      <button type="button" aria-expanded={aberto} onClick={() => setAberto((v) => !v)} className="flex w-full items-center gap-3 rounded-xl text-left">
        <RetratoEstado character={character} ficha={f} className="h-32 w-32 shrink-0" mostrarRotulo={aberto} />
        <span className="min-w-0 flex-1 space-y-3">
          <span className="block truncate font-cinzel text-lg tracking-[0.06em] text-arcana-gold-bright">{character.name}</span>
          <BarraVida vida={f.vida} vidaMax={f.vidaMax} />
        </span>
        <span aria-hidden className={`shrink-0 pr-1 font-cinzel text-lg text-arcana-gold transition-transform ${aberto ? "rotate-180" : ""}`}>▾</span>
      </button>

      {aberto && (
        <div className="space-y-3 border-t border-arcana-border-dim pt-3">
          <p className="truncate font-crimson text-sm text-arcana-text">{jogador}</p>

          {/* Vida: toca no ponto para ir direto, ou usa os atalhos */}
          <TrilhaVida vida={f.vida} vidaMax={f.vidaMax} disabled={pending} onEscolher={(n) => (n < f.vida ? aplicar({ vida: n - f.vida, causa }) : aplicar({ vida: n - f.vida }))} />
          <div className="flex flex-wrap items-center gap-1">
            {ATALHOS_VIDA.map((n) => (
              <button key={n} className="arcana-btn-danger arcana-btn-sm disabled:opacity-40" disabled={pending || f.vida === 0} onClick={() => aplicar({ vida: -n, causa })}>−{n}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {ATALHOS_VIDA.map((n) => (
              <button key={n} className={BTN} disabled={pending || f.vida === f.vidaMax} onClick={() => aplicar({ vida: n })}>+{n}</button>
            ))}
            <button className={BTN} disabled={pending || f.vida === f.vidaMax} onClick={() => aplicar({ vida: f.vidaMax - f.vida })}>Curar tudo</button>
          </div>

          {/* Causa do dano: vira o popup na tela do jogador */}
          <div className="space-y-1">
            <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }} role="radiogroup" aria-label="Causa do dano">
              {CAUSAS_DANO.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={causa === c.id}
                  title={c.nome}
                  onClick={() => setCausa(causa === c.id ? undefined : c.id)}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${causa === c.id ? "border-red-300 bg-red-900/60" : "border-arcana-border"}`}
                >
                  <IconeCausa id={c.id} nome={c.nome} emoji={c.emoji} />
                </button>
              ))}
            </div>
            <p className="font-crimson text-xs text-arcana-text">
              Causa: <strong className="text-white">{CAUSAS_DANO.find((c) => c.id === causa)?.nome ?? "nenhuma"}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CirculosDor dor={f.dor} tamanho="sm" onClick={(n) => aplicar({ dor: n - f.dor, causa })} />
            <button className={BTN} disabled={pending || f.dor === 0} onClick={() => aplicar({ dor: -1 })}>−1 Dor</button>
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

          <Ladrilhos ficha={f} itens={inv.length} aberto={painel} onAbrir={setPainel} />
          {painel === "dinheiro" && <PainelDinheiro saldo={f.saldo} pending={pending} aplicar={aplicar} />}
          {painel === "xp" && <PainelXp xp={f.xp} pending={pending} aplicar={aplicar} />}
          {painel === "itens" && <PainelItens inventario={inv} pending={pending} onDar={dar} onAjustar={ajustar} />}
          {painel === "estado" && <PainelEstado ficha={f} pending={pending} aplicar={aplicar} />}
          {painel === "ficha" && <PainelFicha ficha={f} onDossie={() => setDossie(true)} />}
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
