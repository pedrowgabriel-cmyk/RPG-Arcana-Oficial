// Viagem entre lugares: só o Juiz parte, pelas estradas do mapa impresso.
// Dias por jornada são decisão de campanha (Doc 2 §10.9).

import { ROADS, type Pt } from "./geografia";
import { lugarPorId } from "./lugares";

export const KM_POR_DIA = { pe: 30, cavalo: 50 };
/** O mundo do jogo é comprimido; as distâncias contadas na mesa, não. */
const KM_DA_HISTORIA = 1;

const JUNCAO = 3;

type No = { p: Pt; arestas: { para: number; pts: Pt[]; km: number }[] };

function comprimento(pts: readonly Pt[]) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return d * KM_DA_HISTORIA;
}

function montarGrafo() {
  const nos: No[] = [];
  const noDe = (p: Pt) => {
    const i = nos.findIndex((n) => Math.hypot(n.p[0] - p[0], n.p[1] - p[1]) <= JUNCAO);
    return i >= 0 ? i : nos.push({ p, arestas: [] }) - 1;
  };
  for (const r of ROADS) {
    const [a, b] = [noDe(r.pts[0]), noDe(r.pts[r.pts.length - 1])];
    const km = comprimento(r.pts);
    nos[a].arestas.push({ para: b, pts: r.pts, km });
    nos[b].arestas.push({ para: a, pts: [...r.pts].reverse(), km });
  }
  return nos;
}

const GRAFO = montarGrafo();

function noMaisPerto(p: Pt) {
  let melhor = 0;
  let menor = Infinity;
  GRAFO.forEach((n, i) => {
    const d = Math.hypot(n.p[0] - p[0], n.p[1] - p[1]);
    if (d < menor) [melhor, menor] = [i, d];
  });
  return melhor;
}

export type RotaDeViagem = {
  /** Percurso em coordenadas do mapa impresso. */
  pts: Pt[];
  km: number;
  dias: { pe: number; cavalo: number };
};

/** Menor caminho pelas estradas; lugares fora da estrada ligam em linha reta à mais próxima. */
export function rotaEntreLugares(de: string, para: string): RotaDeViagem {
  const [a, b] = [lugarPorId(de), lugarPorId(para)];
  const [pa, pb]: [Pt, Pt] = [[a.mx, a.my], [b.mx, b.my]];
  const [ia, ib] = [noMaisPerto(pa), noMaisPerto(pb)];

  const dist = GRAFO.map(() => Infinity);
  const veio = GRAFO.map((): { de: number; pts: Pt[] } | null => null);
  const feito = GRAFO.map(() => false);
  dist[ia] = 0;
  for (;;) {
    let u = -1;
    GRAFO.forEach((_, i) => {
      if (!feito[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    });
    if (u < 0 || u === ib) break;
    feito[u] = true;
    for (const e of GRAFO[u].arestas) {
      if (dist[u] + e.km < dist[e.para]) {
        dist[e.para] = dist[u] + e.km;
        veio[e.para] = { de: u, pts: e.pts };
      }
    }
  }

  const trechos: Pt[][] = [];
  for (let c = ib; veio[c]; c = veio[c]!.de) trechos.unshift(veio[c]!.pts);
  // Sem ligação por estrada, a rota cai em linha reta: sertão aberto.
  const estrada = dist[ib] < Infinity ? trechos.flat() : [];
  const pts: Pt[] = [pa, ...estrada, pb];
  const km = Math.round(comprimento(pts));
  return { pts, km, dias: { pe: Math.max(1, Math.ceil(km / KM_POR_DIA.pe)), cavalo: Math.max(1, Math.ceil(km / KM_POR_DIA.cavalo)) } };
}
