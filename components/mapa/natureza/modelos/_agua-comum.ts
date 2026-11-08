// Peças comuns da cachoeira e da corredeira: malha em grade, pintura por posição
// e normal, e pedra de rio (molhada embaixo, seca e com musgo em cima).

import * as THREE from "three";
import { bolha, deformar, preparar, ruido3 } from "../ferramentas";

/**
 * Malha em grade (nx × ny quadros). `f(i, j)` devolve o ponto e a UV.
 * A face da frente olha para (direção de i) × (direção de j): i em +x e j em +y
 * dá frente para +z. Chão com i em +x e j em +z olha para baixo: use `virar`.
 * Normais suaves por padrão; `facetado` para rocha de quina viva.
 */
export function grade(
  nx: number,
  ny: number,
  f: (i: number, j: number) => { p: THREE.Vector3; uv: [number, number] },
  { facetado = false, virar = false }: { facetado?: boolean; virar?: boolean } = {},
) {
  const pos: number[] = [];
  const uv: number[] = [];
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const o = f(i, j);
      pos.push(o.p.x, o.p.y, o.p.z);
      uv.push(o.uv[0], o.uv[1]);
    }
  }
  const idx: number[] = [];
  const w = nx + 1;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * w + i;
      const b = a + 1;
      const c = a + w;
      const d = c + 1;
      if (virar) idx.push(a, c, b, b, c, d);
      else idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  if (facetado) {
    // Rocha: faces chapadas, quinas vivas.
    const solta = g.toNonIndexed();
    solta.computeVertexNormals();
    return preparar(solta);
  }
  g.computeVertexNormals();
  return preparar(g);
}

/** Pinta vértice a vértice a partir da posição e da normal. */
export function pintar(g: THREE.BufferGeometry, f: (p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color) => void) {
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const cor = g.attributes.color as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const nn = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    nn.fromBufferAttribute(n, i);
    f(v, nn, c);
    cor.setXYZ(i, c.r, c.g, c.b);
  }
  cor.needsUpdate = true;
  return g;
}

const ROCHA = new THREE.Color("#7c7366");
const ROCHA_OCRE = new THREE.Color("#86694c");
const MOLHADA = new THREE.Color("#3a3833");
const LIMO = new THREE.Color("#4a5034");
const MUSGO = new THREE.Color("#5f6638");
const SECA_CLARA = new THREE.Color("#a39886");

/**
 * Cor de rocha à beira d'água: ocre e cinza em bandas, escura e com limo abaixo
 * de `molhadaAte` (altura no mundo), musgo no que olha para cima, mais escura no chão.
 */
export function corDeRocha(p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color, seed: number, molhadaAte: number, opcoes: { seca?: boolean; musgo?: number } = {}) {
  const banda = ruido3(p.x * 0.05, p.y * 0.45, p.z * 0.05, seed);
  const grao = (ruido3(p.x * 1.3, p.y * 1.3, p.z * 1.3, seed + 3) - 0.5) * 0.22;
  c.copy(ROCHA).lerp(ROCHA_OCRE, Math.max(0, banda - 0.45) * 1.4);
  if (opcoes.seca) c.lerp(SECA_CLARA, 0.35);
  const cima = Math.max(0, n.y);
  const musgo = (opcoes.musgo ?? 0.5) * Math.max(0, cima - 0.55) * 2.2 * ruido3(p.x * 0.4, p.y * 0.4, p.z * 0.4, seed + 9);
  c.lerp(MUSGO, Math.min(0.85, musgo));
  // Molhada: transição curta, com a linha d'água marcada.
  const molhado = 1 - Math.min(1, Math.max(0, (p.y - molhadaAte) / 0.35));
  c.lerp(MOLHADA, molhado * 0.75);
  c.lerp(LIMO, molhado * 0.3 * ruido3(p.x * 0.8, p.y * 2, p.z * 0.8, seed + 5));
  const chao = 0.62 + 0.38 * Math.min(1, Math.max(0, p.y / 1.2));
  c.multiplyScalar((1 + grao) * chao);
  return c;
}

/** Pedra de rio: bolha achatada e gasta pela água, assentada em `onde`. */
export function pedraDeRio(raio: number, detalhe: number, seed: number, onde: THREE.Vector3, achatar: number, giro: number, molhadaAte: number, opcoes: { seca?: boolean; musgo?: number } = {}) {
  const g = bolha(raio, detalhe, 0.22, seed, achatar);
  // Lado de cima mais chato (lixado pela água), base enterrada.
  deformar(g, (v) => {
    if (v.y > 0) v.y *= 0.85;
    v.x *= 1 + 0.25 * Math.sin(seed);
  });
  g.rotateY(giro);
  g.translate(onde.x, onde.y, onde.z);
  return pintar(g, (p, n, c) => corDeRocha(p, n, c, seed, molhadaAte, opcoes));
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const suave = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};
