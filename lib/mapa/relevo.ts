// Altura do chão. O continente vem de public/mapa/continente.bin; dentro de um
// lugar ele recebe detalhe (recorte real de Minas ou ruído), cortes de rua,
// fundação de prédio, água e feições feitas à mão. Na borda volta ao continente,
// para a malha do lugar encostar na do mapa sem degrau.

import { CONT_ALTURA, CONT_LARGURA, CONT_PASSO, RECORTES, RECORTE_LADO } from "./dados-relevo";
import type { Chao, Cidade, XZ } from "./tipos";

const PASSO_MINIMO = 6;
const PONTOS_MAXIMOS = 512;
const DESNIVEL_DE_RIO = 8;
const INICIO_DA_EMENDA = 0.8;
const ALTITUDE_DE_COSTA = 30;
const AMPLITUDE: Record<Chao, number> = { campo: 16, lama: 12, areia: 26, neve: 60, cinzas: 16, carvao: 22, umido: 8, pedra: 34 };

let continente: Int16Array | null = null;
let carregando: Promise<void> | null = null;
const recortes = new Map<string, Int16Array>();

export function lerBin(b: { buffer: ArrayBufferLike; byteOffset: number; byteLength: number }) {
  return new Int16Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
}

export function definirContinente(a: Int16Array) {
  continente = a;
}

export function carregarContinente() {
  carregando ??= fetch("/mapa/continente.bin")
    .then((r) => r.arrayBuffer())
    .then((b) => {
      continente = new Int16Array(b);
    });
  return carregando;
}

export async function carregarRecorte(id: string) {
  if (!RECORTES[id]) return null;
  if (!recortes.has(id)) recortes.set(id, new Int16Array(await (await fetch(`/mapa/relevo/${id}.bin`)).arrayBuffer()));
  return recortes.get(id)!;
}

export function dadosDoContinente() {
  if (!continente) throw new Error("Continente não carregado");
  return continente;
}

/** Altitude em metros num ponto do mapa impresso. */
export function altitudeContinente(mx: number, my: number) {
  const a = dadosDoContinente();
  const fx = Math.max(0, Math.min(CONT_LARGURA - 1.001, mx / CONT_PASSO));
  const fy = Math.max(0, Math.min(CONT_ALTURA - 1.001, my / CONT_PASSO));
  const [i, j] = [Math.floor(fx), Math.floor(fy)];
  const [u, v] = [fx - i, fy - j];
  const k = j * CONT_LARGURA + i;
  return (
    a[k] * (1 - u) * (1 - v) + a[k + 1] * u * (1 - v) + a[k + CONT_LARGURA] * (1 - u) * v + a[k + CONT_LARGURA + 1] * u * v
  );
}

const suave = (a: number, b: number, v: number) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function ruido(x: number, y: number, seed: number) {
  const h = (i: number, j: number) => {
    let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + seed * 1013;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const [i, j] = [Math.floor(x), Math.floor(y)];
  const [fx, fy] = [x - i, y - j];
  const [u, v] = [fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)];
  return h(i, j) * (1 - u) * (1 - v) + h(i + 1, j) * u * (1 - v) + h(i, j + 1) * (1 - u) * v + h(i + 1, j + 1) * u * v;
}

function fbm(x: number, y: number, seed: number, oitavas: number) {
  let [s, a, t] = [0, 0.5, 0];
  for (let o = 0; o < oitavas; o++) {
    s += a * ruido(x, y, seed + o);
    t += a;
    x *= 2.03;
    y *= 2.03;
    a *= 0.5;
  }
  return s / t - 0.5;
}

function aoSegmento(x: number, z: number, a: XZ, b: XZ) {
  const [dx, dz] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}

function noPoligono(x: number, z: number, pts: readonly XZ[]) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    if (pts[i][1] > z !== pts[j][1] > z && x < ((pts[j][0] - pts[i][0]) * (z - pts[i][1])) / (pts[j][1] - pts[i][1]) + pts[i][0]) d = !d;
  }
  return d;
}

export class Relevo {
  readonly n: number;
  readonly passo: number;
  readonly raio: number;
  readonly h: Float32Array;
  readonly bases = new Map<string, number>();
  readonly fundacoes = new Map<string, number>();
  /** Nível de cada área de água, na ordem de cidade.areas. */
  readonly niveis = new Map<number, number>();

  constructor(raio: number) {
    this.raio = raio;
    this.n = Math.min(PONTOS_MAXIMOS, Math.ceil((raio * 2) / PASSO_MINIMO));
    this.passo = (raio * 2) / this.n;
    this.h = new Float32Array((this.n + 1) * (this.n + 1));
  }

  celula(i: number, j: number) {
    return j * (this.n + 1) + i;
  }

  altura(x: number, z: number) {
    const fx = Math.max(0, Math.min(this.n - 0.001, (x + this.raio) / this.passo));
    const fz = Math.max(0, Math.min(this.n - 0.001, (z + this.raio) / this.passo));
    const [i, j] = [Math.floor(fx), Math.floor(fz)];
    const [u, v] = [fx - i, fz - j];
    const k = this.celula(i, j);
    const l = this.n + 1;
    return this.h[k] * (1 - u) * (1 - v) + this.h[k + 1] * u * (1 - v) + this.h[k + l] * (1 - u) * v + this.h[k + l + 1] * u * v;
  }

  /** Tangente da encosta: 1 = 45°. */
  inclinacao(x: number, z: number) {
    const p = this.passo;
    return Math.hypot(this.altura(x + p, z) - this.altura(x - p, z), this.altura(x, z + p) - this.altura(x, z - p)) / (2 * p);
  }

  baseDe(id: string) {
    return this.bases.get(id) ?? 0;
  }

  /** Aplica `f` nas células a até `alcance` da caixa dada. */
  varrer(x0: number, z0: number, x1: number, z1: number, f: (k: number, x: number, z: number) => void) {
    const lim = (v: number) => Math.max(0, Math.min(this.n, v));
    const [i0, i1] = [lim(Math.floor((x0 + this.raio) / this.passo)), lim(Math.ceil((x1 + this.raio) / this.passo))];
    const [j0, j1] = [lim(Math.floor((z0 + this.raio) / this.passo)), lim(Math.ceil((z1 + this.raio) / this.passo))];
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) f(this.celula(i, j), i * this.passo - this.raio, j * this.passo - this.raio);
    }
  }
}

function amostrarRecorte(dem: Int16Array, lado: number, x: number, z: number) {
  const m = RECORTE_LADO - 1;
  const fx = Math.max(0, Math.min(m - 0.001, (x / lado + 0.5) * m));
  const fz = Math.max(0, Math.min(m - 0.001, (z / lado + 0.5) * m));
  const [i, j] = [Math.floor(fx), Math.floor(fz)];
  const [u, v] = [fx - i, fz - j];
  const k = j * RECORTE_LADO + i;
  const q = dem[k] * (1 - u) * (1 - v) + dem[k + 1] * u * (1 - v) + dem[k + RECORTE_LADO] * (1 - u) * v + dem[k + RECORTE_LADO + 1] * u * v;
  return q / 10;
}

export function gerarRelevo(cidade: Cidade, mx: number, my: number, dem: Int16Array | null) {
  const r = new Relevo(cidade.raio);
  const { raio, h } = r;
  const base = new Float32Array(h.length);
  const recorte = RECORTES[cidade.id];
  const amp = AMPLITUDE[cidade.chao];
  const km = 1000;

  r.varrer(-raio, -raio, raio, raio, (k, x, z) => {
    const c = altitudeContinente(mx + x / km, my + z / km);
    base[k] = c;
    // O continente já traz a região real: aqui entra o recorte fino, na mesma referência.
    const relevo = dem ? amostrarRecorte(dem, recorte.lado, x, z) - recorte.altitudeBase : c + fbm(x / 520, z / 520, 7, 4) * amp * 2;
    // Rugosidade que a base de 30 m não enxerga.
    h[k] = c <= 0 ? c : relevo + fbm(x / 60, z / 60, 3, 3) * (dem ? 5 : amp * 0.25);
  });

  for (const f of cidade.feicoes ?? []) {
    if (f.tipo === "dolina") {
      r.varrer(f.x - f.raio, f.z - f.raio, f.x + f.raio, f.z + f.raio, (k, x, z) => {
        h[k] -= (1 - suave(0.15, 1, Math.hypot(x - f.x, z - f.z) / f.raio)) * f.fundo;
      });
    } else if (f.tipo === "vocoroca") {
      const xs = f.pts.map((p) => p[0]);
      const zs = f.pts.map((p) => p[1]);
      const m = f.largura * 2.5;
      r.varrer(Math.min(...xs) - m, Math.min(...zs) - m, Math.max(...xs) + m, Math.max(...zs) + m, (k, x, z) => {
        let d = Infinity;
        for (let i = 1; i < f.pts.length; i++) d = Math.min(d, aoSegmento(x, z, f.pts[i - 1], f.pts[i]));
        const irregular = 1 + fbm(x / 40, z / 40, 9, 2);
        h[k] -= (1 - suave(f.largura * 0.3, f.largura * irregular * 1.3, d)) * f.fundo;
      });
    }
  }

  // Água: o nível é a menor margem; a terra desce até ela.
  cidade.areas.forEach((a, indice) => {
    if (a.tipo !== "agua") return;
    const xs = a.pts.map((p) => p[0]);
    const zs = a.pts.map((p) => p[1]);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    // Mar é a água que encosta no nível do mar do continente, não a que é grande.
    const grande = a.pts.some(([x, z]) => altitudeContinente(mx + x / km, my + z / km) < ALTITUDE_DE_COSTA);
    const margem = grande ? 620 : 40;
    let nivel = Infinity;
    let topo = -Infinity;
    for (let i = 0; i < a.pts.length; i++) {
      const [x, z] = a.pts[i];
      if (Math.hypot(x, z) >= raio) continue;
      const y = r.altura(x, z);
      nivel = Math.min(nivel, y);
      topo = Math.max(topo, y);
    }
    // Rio desce com o terreno: só afunda o leito, sem espelho d'água plano.
    if (!grande && topo - nivel > DESNIVEL_DE_RIO) {
      r.varrer(x0, z0, x1, z1, (k, x, z) => {
        if (noPoligono(x, z, a.pts)) h[k] -= 2.2;
      });
      return;
    }
    if (grande) nivel = 0;
    else if (!Number.isFinite(nivel)) nivel = r.altura((x0 + x1) / 2, (z0 + z1) / 2);
    // O mar já é desenhado pelo oceano do continente.
    if (!grande) r.niveis.set(indice, nivel);
    r.varrer(x0 - margem, z0 - margem, x1 + margem, z1 + margem, (k, x, z) => {
      if (noPoligono(x, z, a.pts)) {
        h[k] = nivel - (grande ? 9 : 2.5);
        return;
      }
      let d = Infinity;
      for (let i = 0, j = a.pts.length - 1; i < a.pts.length; j = i++) d = Math.min(d, aoSegmento(x, z, a.pts[j], a.pts[i]));
      if (d < margem) h[k] = nivel + 1.2 + (h[k] - nivel - 1.2) * suave(0, margem, d);
    });
  });

  // Ruas: greide suavizado, com corte no morro e aterro na baixada.
  for (const rua of cidade.ruas) {
    const trilho = rua.piso === "trilho";
    const amostras: { x: number; z: number; y: number }[] = [];
    for (let i = 1; i < rua.pts.length; i++) {
      const [a, b] = [rua.pts[i - 1], rua.pts[i]];
      const passos = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8));
      for (let s = 0; s <= passos; s++) {
        const [x, z] = [a[0] + ((b[0] - a[0]) * s) / passos, a[1] + ((b[1] - a[1]) * s) / passos];
        amostras.push({ x, z, y: r.altura(x, z) });
      }
    }
    const janela = trilho ? 24 : 7;
    const greide = amostras.map((_, i) => {
      let [s, c] = [0, 0];
      for (let j = Math.max(0, i - janela); j <= Math.min(amostras.length - 1, i + janela); j++) {
        s += amostras[j].y;
        c++;
      }
      return s / c;
    });
    const nucleo = rua.largura / 2 + 2;
    const alcance = nucleo + (trilho ? 26 : 16);
    amostras.forEach((p, i) => {
      if (i % 2) return;
      r.varrer(p.x - alcance, p.z - alcance, p.x + alcance, p.z + alcance, (k, x, z) => {
        const t = 1 - suave(nucleo, alcance, Math.hypot(x - p.x, z - p.z));
        if (t > 0) h[k] += (greide[i] - h[k]) * t * 0.7;
      });
    });
  }

  for (const f of cidade.feicoes ?? []) {
    if (f.tipo === "gruta") r.bases.set(`gruta-${f.nome}`, r.altura(f.x, f.z));
  }

  // Prédios: terreiro plano; o que sobrar de desnível vira fundação de pedra.
  for (const p of cidade.predios) {
    const y = r.altura(p.x, p.z);
    const [mw, md] = [p.largura / 2 + 2, p.fundo / 2 + 2];
    const borda = 9;
    r.varrer(p.x - mw - borda, p.z - md - borda, p.x + mw + borda, p.z + md + borda, (k, x, z) => {
      const d = Math.max(Math.abs(x - p.x) - mw, Math.abs(z - p.z) - md, 0);
      h[k] += (y - h[k]) * (1 - suave(0, borda, d));
    });
    r.bases.set(p.id, y);
  }
  for (const p of cidade.predios) {
    const y = r.bases.get(p.id)!;
    const [w, d] = [p.largura / 2, p.fundo / 2];
    const menor = Math.min(r.altura(p.x - w, p.z - d), r.altura(p.x + w, p.z - d), r.altura(p.x - w, p.z + d), r.altura(p.x + w, p.z + d));
    r.fundacoes.set(p.id, Math.max(0, y - menor) + 0.6);
  }

  // Borda: encosta exatamente no continente.
  r.varrer(-raio, -raio, raio, raio, (k, x, z) => {
    const t = suave(raio * INICIO_DA_EMENDA, raio * 0.98, Math.hypot(x, z));
    h[k] += (base[k] + (base[k] > 0 ? 1 : 0) - h[k]) * t;
  });
  return r;
}
