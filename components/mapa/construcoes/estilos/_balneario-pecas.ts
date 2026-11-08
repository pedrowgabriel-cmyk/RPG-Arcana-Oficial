// Peças exclusivas do balneário (Santo Ozório): lambrequim recortado, guarda-corpo de
// balaústres, galeria de madeira em todos os andares, porta-janela, barco, rede de pesca
// e cilindros com UV em metros. Tudo no referencial do kit: x ao longo da face, +z para fora.

import * as THREE from "three";
import { aoLongo, bloco, malha, naFace, Obra, telhado, type Face } from "../kit";
import type { NomeMaterial, Peca } from "../../natureza/tipos";
import type { PecasDoPredio } from "../tipos";

type Cor = THREE.ColorRepresentation;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Monta uma malha de dupla face (lambrequim, balaústre chato, rede, vela, casco). */
export function dupla(pts: THREE.Vector3[], idx: number[]) {
  const n = idx.length;
  const todos = [...idx];
  for (let i = 0; i < n; i += 3) todos.push(idx[i], idx[i + 2], idx[i + 1]);
  return malha(pts, todos);
}

/**
 * Lambrequim: faixa de madeira recortada de `a` até `b` (no plano z = 0), com os dentes
 * pendurados. forma 0 = dente pontudo, 1 = gota, 2 = dentes alternados longo/curto.
 */
export function franja(a: [number, number], b: [number, number], forma: number, dente = 0.38, banda = 0.16, duplo = false) {
  const pts: THREE.Vector3[] = [];
  const idx: number[] = [];
  const por = (p: THREE.Vector3[], tris: number[]) => {
    const o = pts.length;
    pts.push(...p);
    for (const t of tris) idx.push(o + t);
  };
  const [ax, ay] = a;
  const [bx, by] = b;
  por([V(ax, ay - banda, 0), V(bx, by - banda, 0), V(bx, by, 0), V(ax, ay, 0)], [0, 1, 2, 0, 2, 3]);
  const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / dente));
  const ponto = (t: number) => V(ax + (bx - ax) * t, ay + (by - ay) * t - banda, 0);
  for (let i = 0; i < n; i++) {
    const [s0, s1, m] = [ponto(i / n), ponto((i + 1) / n), ponto((i + 0.5) / n)];
    const h = dente * (forma === 2 && i % 2 ? 0.45 : 0.85);
    if (forma === 1) por([s0, s1, s1.clone().setY(s1.y - h * 0.45), m.clone().setY(m.y - h), s0.clone().setY(s0.y - h * 0.45)], [0, 4, 1, 1, 4, 2, 2, 4, 3]);
    else por([s0, m.clone().setY(m.y - h), s1], [0, 1, 2]);
  }
  // Face só para fora (quem vê é a rua); `duplo` para o que se vê dos dois lados.
  return duplo ? dupla(pts, idx) : malha(pts, idx);
}

/** Balaústres chatos, virados para fora: baratos, e de longe leem como torneados. */
export function balaustres(comp: number, y0: number, y1: number, passo: number, w = 0.09) {
  const n = Math.max(1, Math.floor(comp / passo));
  const pts: THREE.Vector3[] = [];
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = -comp / 2 + ((i + 0.5) * comp) / n;
    const o = pts.length;
    pts.push(V(x - w / 2, y0, 0), V(x + w / 2, y0, 0), V(x + w / 2, y1, 0), V(x - w / 2, y1, 0));
    idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  return malha(pts, idx);
}

/** Guarda-corpo: corrimão, travessa de baixo e balaústres, ao longo da face. */
export function guardaCorpo(obra: Obra, f: Face, L: number, F: number, u: number, y: number, afasta: number, comp: number, cor: Cor, passo = 0.5) {
  obra.por("madeira", naFace(bloco(comp, 0.08, 0.13, 0, 0.92, 0), f, L, F, u, y, afasta), cor, 0.05, 0);
  obra.por("madeira", naFace(bloco(comp, 0.07, 0.08, 0, 0.1, 0), f, L, F, u, y, afasta), cor, 0.05, 0);
  obra.por("madeira", naFace(balaustres(comp, 0.17, 0.92, passo), f, L, F, u, y, afasta), cor, 0.05, 0);
}

export type Acabamento = {
  madeira: Cor;
  telha: Cor;
  telhaMat: NomeMaterial;
  forma: number;
  dente: number;
  piso?: Cor;
};

export type OpGaleria = {
  comp: number;
  prof: number;
  pav: number;
  /** Altura do pavimento. */
  H: number;
  /** Centro da galeria ao longo da face. */
  u?: number;
  /** Abertura sem esteio e sem guarda-corpo no meio (porta de entrar, escada). */
  vao?: number;
  /** Guarda-corpo também no térreo. */
  terreo?: boolean;
  passo?: number;
};

/**
 * Galeria de madeira em todos os andares: assoalho, esteios corridos do chão ao beiral,
 * guarda-corpo de balaústres nos altos, lambrequim sob cada piso e cobertura de uma água
 * (vai em `t`, some com o telhado). É a cara do balneário.
 */
export function galeria(obra: Obra, t: Obra, f: Face, L: number, F: number, o: OpGaleria, ac: Acabamento) {
  const { comp, prof, pav, H } = o;
  const u = o.u ?? 0;
  const topo = pav * H - 0.45;
  const at = (g: THREE.BufferGeometry, cor: Cor, mat: NomeMaterial = "madeira", v = 0.07) => obra.por(mat, naFace(g, f, L, F, u, 0, 0), cor, v, 0);
  at(bloco(comp, 0.3, prof, 0, 0, prof / 2), ac.piso ?? "#8f8068", "madeira", 0.1);
  for (let k = 1; k < pav; k++) {
    at(bloco(comp, 0.2, prof, 0, k * H - 0.2, prof / 2), ac.madeira);
    guardaCorpo(obra, f, L, F, u, k * H, prof - 0.12, comp - 0.1, ac.madeira, o.passo);
    for (const s of [-1, 1]) at(bloco(0.09, 0.08, prof - 0.2, s * (comp / 2 - 0.06), k * H + 0.92, prof / 2 - 0.1), ac.madeira);
  }
  const abre = (o.vao ?? 0) / 2;
  if (o.terreo) {
    const trecho = comp / 2 - abre - 0.2;
    if (abre > 0 && trecho > 0.8) for (const s of [-1, 1]) guardaCorpo(obra, f, L, F, u + s * (comp / 2 - trecho / 2), 0.3, prof - 0.12, trecho, ac.madeira, o.passo);
    else if (abre === 0) guardaCorpo(obra, f, L, F, u, 0.3, prof - 0.12, comp - 0.1, ac.madeira, o.passo);
  }
  const n = Math.max(2, Math.round(comp / 3.1) + 1);
  for (const x of aoLongo(comp, n, 0.1)) {
    if (abre > 0 && Math.abs(x) < abre + 0.1) continue;
    at(bloco(0.16, topo - 0.3, 0.16, x, 0.3, prof - 0.14), ac.madeira);
    // Mãos-francesas no alto do esteio, ao longo da viga.
    for (const s of [-1, 1]) at(bloco(0.07, 0.6, 0.07, 0, -0.3, 0).rotateZ(-s * 0.75).translate(x + s * 0.42, topo - 0.12, prof - 0.14), ac.madeira);
  }
  for (let k = 1; k <= pav; k++) {
    const y = k === pav ? topo : k * H - 0.2;
    at(franja([-comp / 2, y], [comp / 2, y], ac.forma, ac.dente).translate(0, 0, prof - 0.04), ac.madeira, "madeira", 0.04);
  }
  for (const g of telhado("uma-agua", comp, prof, topo, 0.45, 0.3, 0.1)) t.por(ac.telhaMat, naFace(g.translate(0, 0, prof / 2), f, L, F, u, 0, 0), ac.telha, 0.1, 0);
}

/** Retângulo chato virado para +z (vidro, folha de veneziana): 2 triângulos. */
export function quadro(w: number, h: number, x = 0, y = 0) {
  return malha([V(x - w / 2, y, 0), V(x + w / 2, y, 0), V(x + w / 2, y + h, 0), V(x - w / 2, y + h, 0)], [0, 1, 2, 0, 2, 3]);
}

/** Porta-janela de abrir para a galeria: moldura, vão escuro e duas folhas de veneziana. */
export function portaJanela(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, h: number, moldura: Cor, veneziana: Cor) {
  obra.por("madeira", naFace(bloco(w + 0.26, h + 0.16, 0.06, 0, -0.03, 0), f, L, F, u, y, 0), moldura, 0.04, 0);
  obra.por("vidro", naFace(quadro(w, h), f, L, F, u, y, 0.065), "#263034", 0.04, 0);
  for (const s of [-1, 1]) obra.por("madeira", naFace(quadro(w / 2, h, s * (w / 2 + 0.14 + w / 4)), f, L, F, u, y, 0.03), veneziana, 0.08, 0);
}

/** Janela barata (laterais e fundos): moldura e vidro. */
export function janelaBarata(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, h: number, moldura: Cor) {
  obra.por("reboco", naFace(bloco(w + 0.24, h + 0.24, 0.06, 0, -0.12, 0), f, L, F, u, y, 0), moldura, 0.04, 0);
  obra.por("vidro", naFace(quadro(w, h), f, L, F, u, y, 0.065), "#263034", 0.04, 0);
}

/** Cilindro (ou tronco de cone) com UV em metros. */
export function cilindro(rTopo: number, rBase: number, h: number, lados: number, aberto = true) {
  const g = new THREE.CylinderGeometry(rTopo, rBase, h, lados, 1, aberto).toNonIndexed();
  const uv = g.attributes.uv;
  const volta = Math.PI * (rTopo + rBase);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * volta) / 2, (uv.getY(i) * h) / 2);
  return g.translate(0, h / 2, 0);
}

/** Canoa/baleeira de pescador: casco de tábua com bancos. `virado` = emborcado na areia. */
export function barco(obra: Obra, x: number, y: number, z: number, giro: number, comp: number, cor: Cor, virado = false) {
  const b = comp * 0.19;
  const h = comp * 0.13;
  const borda = (s: number) => [V(comp / 2, h * 1.18, 0), V(comp * 0.22, h, s * b * 0.88), V(-comp * 0.2, h * 0.96, s * b), V(-comp / 2, h * 1.02, s * b * 0.7)];
  const quilha = [V(comp / 2 - 0.12, h * 0.4, 0), V(comp * 0.22, 0, 0), V(-comp * 0.2, 0, 0), V(-comp / 2, h * 0.18, 0)];
  const pts: THREE.Vector3[] = [];
  const idx: number[] = [];
  for (const s of [-1, 1]) {
    const bb = borda(s);
    for (let i = 0; i < 3; i++) {
      const o = pts.length;
      pts.push(bb[i], bb[i + 1], quilha[i + 1], quilha[i]);
      idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
  }
  const o = pts.length;
  pts.push(borda(-1)[3], borda(1)[3], quilha[3]);
  idx.push(o, o + 1, o + 2);
  const casco = dupla(pts, idx);
  const ajustar = (g: THREE.BufferGeometry) => {
    if (virado) g.scale(1, -1, 1).translate(0, h * 1.18, 0);
    return g.rotateY(giro).translate(x, y, z);
  };
  obra.por("madeira", ajustar(casco), cor, 0.1, 0);
  // Friso da borda, escuro, que separa casco e alto.
  for (const s of [-1, 1]) {
    const [p1, p2] = [borda(s)[1], borda(s)[2]];
    const seg = bloco(p1.distanceTo(p2), 0.08, 0.08, 0, -0.04, 0);
    seg.rotateY(-Math.atan2(p2.z - p1.z, p2.x - p1.x)).translate((p1.x + p2.x) / 2, p1.y, (p1.z + p2.z) / 2);
    obra.por("madeira-escura", ajustar(seg), "#3a2e24", 0.08, 0);
  }
  if (!virado) {
    for (const bx of [-0.15, 0.2]) obra.por("madeira", ajustar(bloco(0.26, 0.06, b * 1.7, comp * bx, h * 0.62, 0)), "#7a6248", 0.08, 0);
    // Remo deitado sobre os bancos.
    obra.por("madeira", ajustar(bloco(comp * 0.7, 0.05, 0.08, -comp * 0.05, h * 0.7, b * 0.35)), "#9a8262", 0.08, 0);
  }
}

/** Rede estendida entre dois esteios, com barriga no meio (dupla face). */
export function rede(obra: Obra, a: THREE.Vector3, b: THREE.Vector3, alto: number, queda: number, cor: Cor, seed: number) {
  const cols = 5;
  const pts: THREE.Vector3[] = [];
  const idx: number[] = [];
  const d = b.clone().sub(a);
  const lateral = V(-d.z, 0, d.x).normalize();
  for (let i = 0; i <= cols; i++) {
    const t = i / cols;
    const p = a.clone().lerp(b, t);
    const barriga = Math.sin(t * Math.PI);
    const onda = Math.sin(seed + i * 1.7) * 0.07;
    pts.push(p.clone().setY(alto - barriga * 0.12), p.clone().setY(alto - queda * 0.5 - barriga * 0.25).addScaledVector(lateral, onda + barriga * 0.08), p.clone().setY(alto - queda - barriga * 0.35).addScaledVector(lateral, -onda));
  }
  for (let i = 0; i < cols; i++) {
    for (let k = 0; k < 2; k++) {
      const [p, q] = [i * 3 + k, (i + 1) * 3 + k];
      idx.push(p, q, q + 1, p, q + 1, p + 1);
    }
  }
  obra.por("lona", dupla(pts, idx), cor, 0.14, 0);
  for (const p of [a, b]) obra.por("madeira", bloco(0.12, alto + 0.15, 0.12, p.x, 0, p.z), "#6a5642", 0.1, 0);
  obra.por("madeira", bloco(0.06, 0.06, 0.06, 0, 0, 0).scale(d.length() / 0.06, 1, 1).rotateY(-Math.atan2(d.z, d.x)).translate((a.x + b.x) / 2, alto, (a.z + b.z) / 2), "#6a5642", 0.1, 0);
}

/** Barril de salga/peixe. */
export function barril(obra: Obra, x: number, z: number, h = 0.95, cor: Cor = "#7a5a3a", y = 0) {
  obra.por("madeira", cilindro(h * 0.36, h * 0.36, h, 8, false).translate(x, y, z), cor, 0.1, 0);
  for (const a of [0.18, 0.78]) obra.por("ferro", cilindro(h * 0.385, h * 0.385, 0.06, 8).translate(x, y + h * a, z), "#3a3632", 0.04, 0);
}

/** Desloca todas as peças (para montar um corpo menor que a planta). */
export function deslocar(r: PecasDoPredio, dx: number, dy: number, dz: number): PecasDoPredio {
  for (const lista of [r.corpo, r.telhado, r.interior]) for (const p of lista as Peca[]) p.geometria.translate(dx, dy, dz);
  return r;
}

export function somar(...rs: PecasDoPredio[]): PecasDoPredio {
  return { corpo: rs.flatMap((r) => r.corpo), telhado: rs.flatMap((r) => r.telhado), interior: rs.flatMap((r) => r.interior) };
}

/** Prisma de seção triangular (frontão, empena grossa) com face na frente e atrás. */
export function prisma(pts2: [number, number][], z0: number, z1: number) {
  const pts: THREE.Vector3[] = [];
  const idx: number[] = [];
  const [a, b, c] = pts2;
  pts.push(V(a[0], a[1], z1), V(b[0], b[1], z1), V(c[0], c[1], z1), V(a[0], a[1], z0), V(b[0], b[1], z0), V(c[0], c[1], z0));
  idx.push(0, 1, 2, 3, 5, 4);
  // Lados de cima (b→c e c→a).
  idx.push(1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0);
  return malha(pts, idx);
}
