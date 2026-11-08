// Ferramentas comuns do grupo "pedra": rocha facetada (granito/gnaisse mineiro),
// malha de paredão, pintura com líquen e escorrido, musgo nas reentrâncias e neve.
// UV: projeção em caixa por face (planar), em metros / escala.

import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { nevar, preparar, ruido3, sorteio, tingir } from "../ferramentas";
import type { NomeMaterial } from "../tipos";

export type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];

export const COR = {
  granito: "#8f887c",
  gnaisse: "#7b756b",
  lajedo: "#827b70",
  vermelha: "#9e5a3a",
  escura: "#2c2824",
  liquen: "#b0aa86",
  musgo: "#5f6c3a",
  capim: "#7d7a45",
  neve: "#eef2f4",
};

export type OpRocha = {
  raio: [number, number, number];
  detalhe: number;
  seed: number;
  /** Irregularidade do contorno (0..0.3). */
  rug?: number;
  /** Planos que lascam a pedra: dão as faces chatas do granito partido. */
  cortes?: number;
  forca?: number;
  /** Rachaduras: sulcos finos que atravessam a pedra. */
  rachas?: number;
  /** Altura de cada camada (m), 0 = sem estratos. */
  estratos?: number;
};

/** Rocha centrada na origem, ainda sem assentar. */
export function rocha(o: OpRocha) {
  const r = sorteio(o.seed);
  const g = new THREE.IcosahedronGeometry(1, o.detalhe);
  const p = g.attributes.position;
  const rug = o.rug ?? 0.12;
  const forca = o.forca ?? 0.7;
  const planos = Array.from({ length: o.cortes ?? 4 }, () => ({
    n: new THREE.Vector3(r() - 0.5, (r() - 0.35) * 1.4, r() - 0.5).normalize(),
    d: 0.55 + r() * 0.3,
  }));
  const rachas = Array.from({ length: o.rachas ?? 0 }, () => ({
    n: new THREE.Vector3(r() - 0.5, (r() - 0.5) * 0.5, r() - 0.5).normalize(),
    d: (r() - 0.5) * 0.7,
    w: 0.05 + r() * 0.04,
    fundo: 0.07 + r() * 0.06,
  }));
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const f = 1 + (ruido3(v.x * 1.7 + 3, v.y * 1.7, v.z * 1.7, o.seed) - 0.5) * 2 * rug + (ruido3(v.x * 5, v.y * 5, v.z * 5, o.seed + 3) - 0.5) * rug * 0.55;
    v.multiplyScalar(f);
    for (const pl of planos) {
      const s = v.dot(pl.n);
      if (s > pl.d) v.addScaledVector(pl.n, -(s - pl.d) * forca);
    }
    for (const c of rachas) {
      const s = Math.abs(v.dot(c.n) - c.d);
      if (s < c.w) v.multiplyScalar(1 - c.fundo * (1 - s / c.w));
    }
    v.set(v.x * o.raio[0], v.y * o.raio[1], v.z * o.raio[2]);
    if (o.estratos) {
      // Camadas: o pé de cada camada entra um pouco, a cabeça sai (beiral).
      const t = (v.y + 100) / o.estratos;
      const fr = t - Math.floor(t);
      const k = 1 - 0.07 * Math.max(0, 1 - fr / 0.3);
      v.x *= k;
      v.z *= k;
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  return g;
}

/** Projeção em caixa por triângulo: cada face pega o plano que mais a encara. */
export function uvCaixa(g: THREE.BufferGeometry, escala = 3) {
  const p = g.attributes.position;
  const uv: number[] = [];
  const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    const [ax, ay, az] = [Math.abs(n.x), Math.abs(n.y), Math.abs(n.z)];
    for (const q of [a, b, c]) {
      if (ay >= ax && ay >= az) uv.push(q.x / escala, q.z / escala);
      else if (ax >= az) uv.push(q.z / escala, q.y / escala);
      else uv.push(q.x / escala, q.y / escala);
    }
  }
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

/**
 * Assenta no chão (o que fica abaixo some na terra), recalcula normais e UV.
 * `liso`: normais suaves (matacão rolado); sem ele, faces chapadas (pedra lascada).
 */
export function acabar(g: THREE.BufferGeometry, escalaUv = 3, liso = false) {
  let s = g.index ? g.toNonIndexed() : g;
  const p = s.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) < -0.15) p.setY(i, -0.15);
  if (liso) {
    const so = new THREE.BufferGeometry();
    so.setAttribute("position", s.attributes.position);
    const m = mergeVertices(so, 1e-4);
    m.computeVertexNormals();
    s = m.toNonIndexed();
  } else {
    s.deleteAttribute("normal");
    s.computeVertexNormals();
  }
  uvCaixa(s, escalaUv);
  return preparar(s);
}

export type OpPintura = {
  variacao?: number;
  sombra?: number;
  alturaSombra?: number;
  liquen?: number;
  escorrido?: number;
  faixa?: (p: THREE.Vector3) => number;
};

/** Cor de pedra: variação grande e miúda, líquen claro em manchas, escorrido escuro vertical, pé escuro. */
export function pintar(g: THREE.BufferGeometry, cor: THREE.ColorRepresentation, seed: number, o: OpPintura = {}) {
  const base = new THREE.Color(cor);
  const liq = new THREE.Color(COR.liquen);
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const cores = g.attributes.color as THREE.BufferAttribute;
  const variacao = o.variacao ?? 0.14;
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const ny = n.getY(i);
    const k = 1 + (ruido3(v.x * 0.35, v.y * 0.35, v.z * 0.35, seed) - 0.5) * 2 * variacao + (ruido3(v.x * 2.6, v.y * 2.6, v.z * 2.6, seed + 1) - 0.5) * variacao * 0.8;
    const luz = ny < 0 ? 1 + ny * 0.32 : 0.92 + ny * 0.1;
    const chao = 1 - (o.sombra ?? 0.4) * (1 - Math.min(1, Math.max(0, v.y / (o.alturaSombra ?? 1))));
    const e = ruido3(v.x * 0.7, v.y * 0.06, v.z * 0.7, seed + 5);
    const esc = e > 0.58 ? ((e - 0.58) / 0.42) * (o.escorrido ?? 0.35) : 0;
    const l = ruido3(v.x * 0.9 + 7, v.y * 0.9, v.z * 0.9, seed + 9);
    const tl = l > 0.6 && ny > -0.2 ? Math.min(1, ((l - 0.6) / 0.25) * (o.liquen ?? 0.35)) : 0;
    c.copy(base).lerp(liq, tl).multiplyScalar(k * luz * chao * (1 - esc) * (o.faixa ? o.faixa(v) : 1));
    cores.setXYZ(i, c.r, c.g, c.b);
  }
  cores.needsUpdate = true;
  return g;
}

/** Musgo nas reentrâncias baixas: copia faces de lado/cima perto do chão, em manchas. */
export function musgo(g: THREE.BufferGeometry, seed: number, quanto: number, alturaMax: number, cor = COR.musgo, minNy = 0.05) {
  const p = g.attributes.position;
  const nn = g.attributes.normal;
  const uv = g.attributes.uv;
  const pos: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < p.count; i += 3) {
    const cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const ny = (nn.getY(i) + nn.getY(i + 1) + nn.getY(i + 2)) / 3;
    if (cy > alturaMax || cy < -0.05 || ny < minNy) continue;
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
    const cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    const chance = ruido3(cx * 0.9, cy * 0.9, cz * 0.9, seed + 21) * (1.25 - cy / alturaMax * 0.5);
    if (chance < 1 - quanto) continue;
    for (let k = 0; k < 3; k++) {
      pos.push(p.getX(i + k) + nn.getX(i + k) * 0.025, p.getY(i + k) + nn.getY(i + k) * 0.025, p.getZ(i + k) + nn.getZ(i + k) * 0.025);
      uvs.push(uv.getX(i + k), uv.getY(i + k));
    }
  }
  const s = new THREE.BufferGeometry();
  s.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  s.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  s.computeVertexNormals();
  return tingir(preparar(s), cor, 0.25, seed + 4, 0.3, 0.6);
}

/** Neve nas faces de cima (geometria própria). */
export function neve(g: THREE.BufferGeometry, quanto: number, seed: number, espessura = 0.06) {
  return tingir(nevar(g, quanto, espessura), COR.neve, 0.04, seed);
}

/** Neve só na cor (níveis de longe, sem gastar triângulo). */
export function neveNaCor(g: THREE.BufferGeometry, quanto: number) {
  const n = g.attributes.normal;
  const cores = g.attributes.color as THREE.BufferAttribute;
  const branco = new THREE.Color(COR.neve);
  const c = new THREE.Color();
  for (let i = 0; i < n.count; i++) {
    const t = Math.min(1, Math.max(0, (n.getY(i) - (1 - quanto * 0.8)) * 4));
    if (!t) continue;
    c.setRGB(cores.getX(i), cores.getY(i), cores.getZ(i)).lerp(branco, t);
    cores.setXYZ(i, c.r, c.g, c.b);
  }
  cores.needsUpdate = true;
  return g;
}

/** Acrescenta neve conforme o nível: geometria perto, só cor longe. */
export function comNeve(lista: Lista, quanto: number | undefined, nivel: number, seed: number, espessura = 0.06) {
  if (!quanto) return lista;
  const pedras = lista.filter((p) => p.material === "pedra" || p.material === "pedra-vermelha");
  if (nivel === 2) for (const p of pedras) neveNaCor(p.geometria, quanto);
  else for (const p of pedras) lista.push({ material: "neve", geometria: neve(p.geometria, quanto, seed, espessura) });
  return lista;
}

/**
 * Malha em grade: `ponto(i, j)` com i ao longo de x (0..nu) e j subindo pelo perfil (0..nv).
 * `balde` separa triângulos por material (índice). Devolve uma geometria por balde.
 */
export function malha(nu: number, nv: number, ponto: (i: number, j: number) => THREE.Vector3, baldes = 1, balde?: (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => number) {
  const P: THREE.Vector3[][] = [];
  for (let i = 0; i <= nu; i++) {
    const linha: THREE.Vector3[] = [];
    for (let j = 0; j <= nv; j++) linha.push(ponto(i, j));
    P.push(linha);
  }
  const pos: number[][] = Array.from({ length: baldes }, () => []);
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    const k = balde ? balde(a, b, c) : 0;
    pos[k].push(...a.toArray(), ...b.toArray(), ...c.toArray());
  };
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const [a, b, c, d] = [P[i][j], P[i + 1][j], P[i][j + 1], P[i + 1][j + 1]];
      // Diagonal alternada: a grade não fica com cara de grade.
      if ((i + j) % 2) {
        tri(a, b, c);
        tri(b, d, c);
      } else {
        tri(a, b, d);
        tri(a, d, c);
      }
    }
  const tampas = [P[0], P[nu]];
  return {
    geometrias: pos.map((ps) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(ps, 3));
      g.computeVertexNormals();
      return preparar(uvCaixa(g, 4));
    }),
    tampas,
  };
}

/** Fecha a ponta de um perfil (polígono no plano yz) com um leque, virado para `fora` (−1 ou 1 em x). */
export function tampa(perfil: THREE.Vector3[], fora: number) {
  const centro = perfil.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / perfil.length);
  const pos: number[] = [];
  const pts = [...perfil, perfil[0]];
  for (let k = 0; k < pts.length - 1; k++) {
    const [a, b] = [pts[k], pts[k + 1]];
    const n = a.clone().sub(centro).cross(b.clone().sub(centro));
    if (n.x * fora >= 0) pos.push(...centro.toArray(), ...a.toArray(), ...b.toArray());
    else pos.push(...centro.toArray(), ...b.toArray(), ...a.toArray());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return preparar(uvCaixa(g, 4));
}

export const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
