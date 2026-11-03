"use client";

// Mapa ao vivo: mesma tela para o Juiz e para o celular do jogador.
// O movimento viaja por Broadcast (rota inteira de uma vez, cada aparelho anima
// sozinho); mapa_posicoes/mapa_estado guardam só o último estado para quem entra depois.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { ENERGIA_MAX, MEIOS, custoDaViagem, descontarPassos, pontoDeChegada, type Bloqueios, type Meio } from "@/lib/mapa/mundo";
import { LUGARES, LUGAR_INICIAL, carregarCidade, lugarPorId, mundoDoLugar } from "@/lib/mapa/lugares";
import type { Ponto } from "@/lib/mapa/tipos";
import { rotaEntreLugares } from "@/lib/mapa/viagem";
import { SEM_BLOQUEIOS, Zona } from "@/lib/mapa/zona";
import type { Pt } from "@/lib/mapa/geografia";
import { Cena3D } from "./cena3d";

type Figura = { id: string; nome: string; x: number; z: number; energia: number; zona: string };
type Viagem = { destino: string; rota: Ponto[] };

const BOTAO = "rounded-xl border border-arcana-border px-3 py-2 font-cinzel text-[11px] uppercase tracking-[0.12em] text-arcana-text hover:border-arcana-gold/60 disabled:opacity-70";
const PAINEL = "rounded-2xl border border-arcana-gold/40 bg-[rgb(12,10,16)] p-3 text-arcana-text";
const JOYSTICK_RAIO = 44;
const SEGUNDOS_DE_MARCHA = 8;
const RAIO_TROCA_DE_LUGAR = 30; // unidades do mapa
const VISTA_DO_LUGAR = 900;

function Joystick({ aoMudar }: { aoMudar: (x: number, z: number) => void }) {
  const [pino, setPino] = useState({ x: 0, y: 0 });
  const centro = useRef<{ x: number; y: number } | null>(null);

  function mover(e: React.PointerEvent) {
    if (!centro.current) return;
    const dx = e.clientX - centro.current.x;
    const dy = e.clientY - centro.current.y;
    const d = Math.hypot(dx, dy);
    const k = d > JOYSTICK_RAIO ? JOYSTICK_RAIO / d : 1;
    setPino({ x: dx * k, y: dy * k });
    aoMudar((dx * k) / JOYSTICK_RAIO, (dy * k) / JOYSTICK_RAIO);
  }
  function soltar() {
    centro.current = null;
    setPino({ x: 0, y: 0 });
    aoMudar(0, 0);
  }

  return (
    <div
      aria-label="Controle de movimento"
      className="relative h-28 w-28 touch-none rounded-full border-2 border-arcana-gold/70 bg-[rgba(12,10,16,0.75)]"
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.setPointerCapture(e.pointerId);
        centro.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        mover(e);
      }}
      onPointerMove={mover}
      onPointerUp={soltar}
      onPointerCancel={soltar}
    >
      <span
        className="absolute left-1/2 top-1/2 -ml-6 -mt-6 h-12 w-12 rounded-full bg-arcana-gold"
        style={{ transform: `translate(${pino.x}px, ${pino.y}px)` }}
      />
    </div>
  );
}

export function MapaAoVivo({
  sessionId,
  eu,
  bando = [],
  juiz = false,
  embutido = false,
  onFechar,
}: {
  sessionId: string;
  /** Personagem do jogador. O Juiz não anda: abre sem `eu`. */
  eu?: { id: string; nome: string };
  /** Personagens da mesa (o Juiz lê todos; o jogador recebe do mapa). */
  bando?: { id: string; nome: string }[];
  juiz?: boolean;
  /** Dentro da coluna da mesa, em vez de tela cheia. */
  embutido?: boolean;
  onFechar?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const cena = useRef<Cena3D | null>(null);
  const canal = useRef<RealtimeChannel | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const [figuras, setFiguras] = useState<Record<string, Figura>>({});
  const [bloqueios, setBloqueios] = useState<Bloqueios>(SEM_BLOQUEIOS);
  const [viagem, setViagem] = useState<Viagem | null>(null);
  const [meio, setMeio] = useState<Meio>("pe");
  const [aviso, setAviso] = useState("");
  const [painelAberto, setPainelAberto] = useState(false);
  const [zonaAberta, setZonaAberta] = useState<Zona | null>(null);
  const [destino, setDestino] = useState("");
  const [grupo, setGrupo] = useState<string[]>([]);
  const [marchando, setMarchando] = useState(false);

  const figurasRef = useRef(figuras);
  const bloqueiosRef = useRef(bloqueios);
  const acumulado = useRef(0);
  const ultimoEnvio = useRef(0);
  const gravacao = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zonas = useRef(new Map<string, Zona>());
  const abrindo = useRef("");

  /** Carrega o lugar sob demanda; a última ordem vence se o Juiz passear rápido. */
  const abrirLugar = useCallback(async (id: string) => {
    abrindo.current = id;
    let zona = zonas.current.get(id);
    if (!zona) {
      zona = new Zona(await carregarCidade(id));
      zonas.current.set(id, zona);
    }
    if (abrindo.current !== id || !cena.current) return null;
    cena.current.abrirLugar(zona);
    cena.current.zona = zona;
    setZonaAberta(zona);
    return zona;
  }, []);

  useEffect(() => {
    figurasRef.current = figuras;
    cena.current?.sincronizar(Object.values(figuras));
    if (eu && cena.current) cena.current.podeAndar = (figuras[eu.id]?.energia ?? 0) > 0;
  }, [figuras, eu]);
  useEffect(() => {
    bloqueiosRef.current = bloqueios;
    cena.current?.definirBloqueios(bloqueios);
  }, [bloqueios]);

  const guardar = useCallback(
    (f: Figura) => {
      void supabase
        .from("mapa_posicoes")
        .upsert({ character_id: f.id, session_id: sessionId, nome: f.nome, x: f.x, z: f.z, energia: f.energia, zona: f.zona, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) setAviso("Posição não salva: rode as migrations 009 e 010 no Supabase.");
        });
    },
    [supabase, sessionId],
  );

  const enviar = useCallback((event: string, payload: Record<string, unknown>) => {
    void canal.current?.send({ type: "broadcast", event, payload });
  }, []);

  useEffect(() => {
    if (!canvas.current) return;
    const c = new Cena3D(canvas.current, eu?.id ?? null, juiz);
    cena.current = c;
    c.aoTocar = (ponto) => {
      if (!eu) return;
      const zona = c.zona;
      const de = c.posicao(eu.id);
      if (!de || !zona) return;
      const predio = zona.predioNoPonto(ponto.x, ponto.z);
      if (predio && !predio.entravel) return setAviso(`${predio.nome}: não dá para entrar aqui.`);
      if (predio && bloqueiosRef.current.entrada.includes(predio.id)) return setAviso(`${predio.nome} está trancado.`);
      const destino = predio ? { x: predio.x, z: predio.z } : ponto;
      if (Math.hypot(destino.x, destino.z) >= zona.cidade.raio - 1) return setAviso("Daqui em diante, só com o Juiz guiando a viagem.");
      const rota = zona.calcularRota(de, destino, bloqueiosRef.current);
      if (!rota) return setAviso("Não há caminho até ali.");
      setAviso("");
      setViagem({ destino: predio?.nome ?? "este ponto", rota });
    };
    c.aoAndar = (id, x, z, unidades) => {
      const atual = figurasRef.current[id];
      if (!atual) return;
      acumulado.current += unidades;
      const agora = performance.now();
      if (agora - ultimoEnvio.current < 200) return;
      ultimoEnvio.current = agora;
      const { gasto, sobra } = descontarPassos(acumulado.current);
      acumulado.current = sobra;
      const novo = { ...atual, x, z, energia: Math.max(0, atual.energia - gasto) };
      figurasRef.current = { ...figurasRef.current, [id]: novo };
      setFiguras((f) => ({ ...f, [id]: novo }));
      enviar("pos", novo);
      if (gravacao.current) clearTimeout(gravacao.current);
      gravacao.current = setTimeout(() => guardar(novo), 1000);
    };

    let vivo = true;
    void (async () => {
      const [{ data: linhas, error }, { data: estado }] = await Promise.all([
        supabase.from("mapa_posicoes").select("character_id,nome,x,z,energia,zona").eq("session_id", sessionId),
        supabase.from("mapa_estado").select("bloqueios").eq("session_id", sessionId).maybeSingle(),
      ]);
      if (!vivo) return;
      if (error) setAviso("Mapa sem memória: rode as migrations 009 e 010 no Supabase.");
      const salvo: Record<string, Figura> = {};
      for (const l of linhas ?? []) {
        salvo[l.character_id] = { id: l.character_id, nome: l.nome, x: l.x, z: l.z, energia: l.energia, zona: l.zona };
      }
      const novos = [...bando, ...(eu ? [eu] : [])].filter((p) => !salvo[p.id]);
      const inicial = novos.length ? await carregarCidade(LUGAR_INICIAL) : null;
      for (const p of [...bando, ...(eu ? [eu] : [])]) {
        salvo[p.id] = salvo[p.id]
          ? { ...salvo[p.id], nome: p.nome }
          : { id: p.id, nome: p.nome, ...pontoDeChegada(p.id, inicial!.chegada), energia: ENERGIA_MAX, zona: LUGAR_INICIAL };
      }
      if (!vivo) return;
      const primeira = (eu ? salvo[eu.id] : Object.values(salvo)[0])?.zona ?? LUGAR_INICIAL;
      await abrirLugar(primeira);
      setFiguras((atuais) => ({ ...salvo, ...atuais }));
      if (estado?.bloqueios) setBloqueios(estado.bloqueios as Bloqueios);
      if (eu && salvo[eu.id]) c.centrar(salvo[eu.id].x, salvo[eu.id].z, 60);
      else c.centrar(0, 0, VISTA_DO_LUGAR);
    })();

    const ch = supabase
      .channel(`mapa-${sessionId}`)
      .on("broadcast", { event: "pos" }, ({ payload }) => {
        const f = payload as Figura;
        const local = f.id === eu?.id;
        setFiguras((t) => ({ ...t, [f.id]: local ? { ...t[f.id], energia: f.energia } : f }));
        if (local) return;
        c.sincronizar([f]);
        c.teleportar(f.id, f.x, f.z);
      })
      .on("broadcast", { event: "rota" }, ({ payload }) => {
        const r = payload as Figura & { rota: Ponto[]; velocidade: number };
        setFiguras((t) => ({ ...t, [r.id]: { id: r.id, nome: r.nome, x: r.x, z: r.z, energia: r.energia, zona: r.zona } }));
        c.sincronizar([r]);
        c.percorrer(r.id, r.rota, r.velocidade);
      })
      .on("broadcast", { event: "bloqueios" }, ({ payload }) => setBloqueios(payload as Bloqueios))
      .on("broadcast", { event: "viagem" }, ({ payload }) => {
        const v = payload as { ids: string[]; destino: string; pts: Pt[] };
        void receberViagem(v.ids, v.destino, v.pts);
      })
      .subscribe();
    canal.current = ch;

    return () => {
      vivo = false;
      if (gravacao.current) clearTimeout(gravacao.current);
      void supabase.removeChannel(ch);
      c.destruir();
      cena.current = null;
    };
    // Cena e canal vivem uma vez por abertura do mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, eu?.id, juiz]);

  function partir() {
    if (!viagem || !eu) return;
    const atual = figuras[eu.id];
    if (!atual) return;
    const { custo, podeIr } = custoDaViagem(viagem.rota, meio, atual.energia);
    if (!podeIr) return;
    const fim = viagem.rota[viagem.rota.length - 1];
    const novo = { ...atual, x: fim.x, z: fim.z, energia: atual.energia - custo };
    const velocidade = MEIOS[meio].metrosPorSegundo;
    setFiguras((f) => ({ ...f, [eu.id]: novo }));
    enviar("rota", { ...novo, rota: viagem.rota, velocidade });
    cena.current?.percorrer(eu.id, viagem.rota, velocidade, () => guardar(novo));
    setViagem(null);
  }

  function ajustarEnergia(id: string, delta: number) {
    const f = figuras[id];
    if (!f) return;
    const novo = { ...f, energia: Math.min(ENERGIA_MAX, Math.max(0, f.energia + delta)) };
    setFiguras((t) => ({ ...t, [id]: novo }));
    enviar("pos", novo);
    guardar(novo);
  }

  function alternarBloqueio(tipo: keyof Bloqueios, predioId: string) {
    const lista = bloqueios[tipo];
    const novo = { ...bloqueios, [tipo]: lista.includes(predioId) ? lista.filter((p) => p !== predioId) : [...lista, predioId] };
    setBloqueios(novo);
    enviar("bloqueios", novo);
    void supabase
      .from("mapa_estado")
      .upsert({ session_id: sessionId, bloqueios: novo, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) setAviso("Bloqueio não salvo: rode a migration 009 no Supabase.");
      });
  }

  /** Marcha vista por todos; quem viaja chega ao destino. O jogador acompanha o próprio lugar. */
  async function receberViagem(ids: string[], destinoId: string, pts: Pt[]) {
    const c = cena.current;
    if (!c) return;
    setMarchando(true);
    c.podeAndar = false;
    const novaZona = zonas.current.get(destinoId) ?? new Zona(await carregarCidade(destinoId));
    zonas.current.set(destinoId, novaZona);
    c.marchar(ids, pts, SEGUNDOS_DE_MARCHA, () => {
      void (async () => {
        const vou = !eu || ids.includes(eu.id);
        if (vou) await abrirLugar(destinoId);
        const chegadas: Figura[] = [];
        for (const id of ids) {
          const f = figurasRef.current[id];
          if (!f) continue;
          const novo = { ...f, ...pontoDeChegada(id, novaZona.cidade.chegada), zona: destinoId };
          chegadas.push(novo);
          c.colocar(id, destinoId, novo.x, novo.z);
        }
        setFiguras((t) => ({ ...t, ...Object.fromEntries(chegadas.map((f) => [f.id, f])) }));
        setMarchando(false);
        if (!vou) return;
        const minha = eu ? chegadas.find((f) => f.id === eu.id) : null;
        c.centrar(minha?.x ?? novaZona.cidade.chegada.x, minha?.z ?? novaZona.cidade.chegada.z, minha ? 60 : VISTA_DO_LUGAR);
        if (juiz) for (const f of chegadas) guardar(f);
      })();
    });
  }

  function partirComOBando() {
    const origem = grupo.length ? figuras[grupo[0]]?.zona : null;
    if (!origem || !destino || destino === origem) return;
    const pts = rotaEntreLugares(origem, destino).pts;
    enviar("viagem", { ids: grupo, destino, pts });
    void receberViagem(grupo, destino, [...pts]);
    setPainelAberto(false);
    setGrupo([]);
  }

  useEffect(() => {
    if (!juiz) return;
    let espera: ReturnType<typeof setTimeout> | null = null;
    const c = cena.current;
    if (!c) return;
    c.aoOlhar = (mx, my) => {
      if (espera) clearTimeout(espera);
      espera = setTimeout(() => {
        const perto = LUGARES.find((l) => Math.hypot(l.mx - mx, l.my - my) < RAIO_TROCA_DE_LUGAR);
        if (perto && perto.id !== c.zona?.cidade.id) void abrirLugar(perto.id);
      }, 300);
    };
    return () => {
      if (espera) clearTimeout(espera);
      c.aoOlhar = undefined;
    };
  }, [juiz, abrirLugar, zonaAberta]);

  useEffect(() => {
    if (!eu) return;
    const teclas = new Set<string>();
    const aplicar = () => {
      if (!cena.current) return;
      cena.current.entrada = {
        x: (teclas.has("d") ? 1 : 0) - (teclas.has("a") ? 1 : 0),
        z: (teclas.has("s") ? 1 : 0) - (teclas.has("w") ? 1 : 0),
      };
    };
    const baixa = (e: KeyboardEvent) => {
      teclas.add(e.key.toLowerCase());
      aplicar();
    };
    const sobe = (e: KeyboardEvent) => {
      teclas.delete(e.key.toLowerCase());
      aplicar();
    };
    window.addEventListener("keydown", baixa);
    window.addEventListener("keyup", sobe);
    return () => {
      window.removeEventListener("keydown", baixa);
      window.removeEventListener("keyup", sobe);
    };
  }, [eu]);

  const minhaEnergia = eu ? figuras[eu.id]?.energia ?? 0 : 0;
  const custo = viagem ? custoDaViagem(viagem.rota, meio, minhaEnergia) : null;
  const entraveis = zonaAberta?.entraveis ?? [];
  const origemDoGrupo = grupo.length ? figuras[grupo[0]]?.zona : null;
  const grupoJunto = grupo.every((id) => figuras[id]?.zona === origemDoGrupo);
  const previa = origemDoGrupo && destino && destino !== origemDoGrupo ? rotaEntreLugares(origemDoGrupo, destino) : null;

  return (
    <div className={embutido ? "relative h-full min-h-[22rem] overflow-hidden rounded-2xl border border-arcana-gold/30" : "arcana-scene fixed inset-0 z-[200] overflow-hidden"}>
      <div className="absolute inset-0">
        <canvas ref={canvas} className="block h-full w-full" />
      </div>

      <header className="pointer-events-none absolute left-3 right-3 top-3 flex flex-wrap items-start justify-between gap-2">
        <div className={`${PAINEL} pointer-events-auto shrink-0`}>
          <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-arcana-gold">{zonaAberta?.cidade.nome ?? "…"}</p>
          {marchando && <p className="mt-1 font-crimson text-sm text-white">O bando está na estrada…</p>}
          {eu && (
            <div className="mt-1 w-40">
              <p className="font-cinzel text-[10px] uppercase tracking-[0.15em] text-arcana-text">
                Energia {Math.round(minhaEnergia)}/{ENERGIA_MAX}
              </p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/60">
                <div className="h-full rounded-full bg-arcana-gold" style={{ width: `${minhaEnergia}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="pointer-events-auto ml-auto flex flex-wrap justify-end gap-2">
          <button className={`${BOTAO} bg-[rgba(12,10,16,0.92)]`} onClick={() => cena.current?.zoom(0.75)} aria-label="Aproximar">＋</button>
          <button className={`${BOTAO} bg-[rgba(12,10,16,0.92)]`} onClick={() => cena.current?.zoom(1.35)} aria-label="Afastar">－</button>
          {juiz && <button className={`${BOTAO} bg-[rgba(12,10,16,0.92)]`} onClick={() => setPainelAberto((v) => !v)}>Mestre</button>}
          {onFechar && <button className={`${BOTAO} bg-[rgba(12,10,16,0.92)]`} onClick={onFechar}>Fechar</button>}
        </div>
      </header>

      {aviso && (
        <p className={`${PAINEL} absolute left-1/2 top-32 w-max max-w-[90vw] -translate-x-1/2 font-crimson text-sm`} role="status">
          {aviso}
        </p>
      )}

      {eu && (
        <div className="absolute bottom-6 left-4">
          <Joystick
            aoMudar={(x, z) => {
              if (cena.current) cena.current.entrada = { x, z };
            }}
          />
        </div>
      )}

      {viagem && custo && (
        <div className={`${PAINEL} absolute bottom-6 right-4 w-[min(20rem,calc(100vw-10rem))]`}>
          <p className="font-cinzel text-xs uppercase tracking-[0.12em] text-arcana-gold-bright">Ir até {viagem.destino}</p>
          <div className="mt-2 flex gap-2">
            {(Object.keys(MEIOS) as Meio[]).map((m) => (
              <button key={m} className={`${BOTAO} flex-1 ${meio === m ? "border-arcana-gold bg-arcana-gold font-bold !text-black" : ""}`} onClick={() => setMeio(m)}>
                {MEIOS[m].rotulo}
              </button>
            ))}
          </div>
          <p className="mt-2 font-crimson text-sm">
            {Math.round(custo.metros)} m · {custo.minutos} min · <strong>{custo.custo} de energia</strong>
          </p>
          {!custo.podeIr && <p className="font-crimson text-sm text-red-300">Energia insuficiente.</p>}
          <div className="mt-2 flex gap-2">
            <button className={`${BOTAO} flex-1`} onClick={() => setViagem(null)}>Cancelar</button>
            <button className="flex-1 rounded-xl bg-arcana-gold px-3 py-2 font-cinzel text-[11px] font-bold uppercase tracking-[0.12em] !text-black disabled:opacity-70" disabled={!custo.podeIr} onClick={partir}>
              Ir
            </button>
          </div>
        </div>
      )}

      {juiz && painelAberto && (
        <aside className={`${PAINEL} absolute bottom-4 right-4 top-20 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto`}>
          <h2 className="font-cinzel text-xs uppercase tracking-[0.2em] text-arcana-gold-bright">Bando</h2>
          <ul className="mt-2 space-y-2">
            {Object.values(figuras).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 font-crimson text-sm">
                <button className="truncate text-left underline-offset-2 hover:underline" onClick={() => {
                  const p = cena.current?.posicao(f.id);
                  if (p) cena.current?.centrar(p.x, p.z, 45);
                }}>
                  {f.nome} · {Math.round(f.energia)}
                </button>
                <span className="flex shrink-0 gap-1">
                  <button className={BOTAO} onClick={() => ajustarEnergia(f.id, -10)} aria-label={`Tirar energia de ${f.nome}`}>−10</button>
                  <button className={BOTAO} onClick={() => ajustarEnergia(f.id, 10)} aria-label={`Dar energia a ${f.nome}`}>+10</button>
                  <button className={BOTAO} onClick={() => ajustarEnergia(f.id, ENERGIA_MAX)}>Cheia</button>
                </span>
              </li>
            ))}
          </ul>
          <h2 className="mt-4 font-cinzel text-xs uppercase tracking-[0.2em] text-arcana-gold-bright">Viagem</h2>
          <ul className="mt-2 space-y-1">
            {Object.values(figuras).map((f) => (
              <li key={f.id}>
                <label className="flex items-center gap-2 font-crimson text-sm">
                  <input
                    type="checkbox"
                    checked={grupo.includes(f.id)}
                    onChange={() => setGrupo((g) => (g.includes(f.id) ? g.filter((i) => i !== f.id) : [...g, f.id]))}
                  />
                  <span className="truncate">{f.nome} · {lugarPorId(f.zona).nome}</span>
                </label>
              </li>
            ))}
          </ul>
          <select value={destino} onChange={(e) => setDestino(e.target.value)} aria-label="Destino da viagem" className="arcana-input mt-2 w-full font-crimson text-base">
            <option value="">Escolher destino…</option>
            {LUGARES.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
          {previa && (
            <p className="mt-2 font-crimson text-sm">
              {previa.km} km · {previa.dias.cavalo} dias a cavalo · {previa.dias.pe} dias a pé
            </p>
          )}
          {!grupoJunto && <p className="mt-2 font-crimson text-sm text-red-300">Só parte junto quem está no mesmo lugar.</p>}
          <button className={`${BOTAO} mt-2 w-full`} disabled={!previa || !grupoJunto || marchando} onClick={partirComOBando}>
            Partir com o bando
          </button>

          <h2 className="mt-4 font-cinzel text-xs uppercase tracking-[0.2em] text-arcana-gold-bright">Ir ver</h2>
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              cena.current?.olharMundo(mundoDoLugar(e.target.value), VISTA_DO_LUGAR);
            }}
            aria-label="Olhar um lugar"
            className="arcana-input mt-2 w-full font-crimson text-base"
          >
            <option value="">Escolher lugar…</option>
            {LUGARES.map((l) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>

          <h2 className="mt-4 font-cinzel text-xs uppercase tracking-[0.2em] text-arcana-gold-bright">Lugares de {zonaAberta?.cidade.nome}</h2>
          <ul className="mt-2 space-y-2">
            {entraveis.map((p) => (
              <li key={p.id} className="font-crimson text-sm">
                <p>{p.nome}</p>
                <span className="mt-1 flex gap-1">
                  <button className={`${BOTAO} flex-1 ${bloqueios.entrada.includes(p.id) ? "border-red-400 text-red-200" : ""}`} onClick={() => alternarBloqueio("entrada", p.id)}>
                    {bloqueios.entrada.includes(p.id) ? "Trancado" : "Trancar"}
                  </button>
                  <button className={`${BOTAO} flex-1 ${bloqueios.vista.includes(p.id) ? "border-red-400 text-red-200" : ""}`} onClick={() => alternarBloqueio("vista", p.id)}>
                    {bloqueios.vista.includes(p.id) ? "Escondido" : "Esconder"}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}
