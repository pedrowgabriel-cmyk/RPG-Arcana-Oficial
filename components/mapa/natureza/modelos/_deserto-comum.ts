// Peças comuns do grupo deserto: coluna de cacto com costelas (mandacaru,
// xique-xique), curvas suaves e retoques de cor por vértice.

import * as THREE from "three";
import { preparar, tingir } from "../ferramentas";
import type { NomeMaterial } from "../tipos";

export type V = THREE.Vector3;
export type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];

export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Bézier de qualquer grau (de Casteljau), `n` intervalos: devolve n + 1 pontos. */
export function bezier(ctrl: V[], n: number): V[] {
  const pts: V[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let q = ctrl.map((c) => c.clone());
    while (q.length > 1) q = q.slice(1).map((c, k) => q[k].clone().lerp(c, t));
    pts.push(q[0]);
  }
  return pts;
}

/** Desvio suave nos pontos internos (as pontas ficam onde estão). */
export function tremer(pts: V[], quanto: number, r: () => number, soLado = false) {
  const d = new THREE.Vector3();
  return pts.map((p, i) => {
    if (i === 0) return p.clone();
    d.add(v3(r() - 0.5, soLado ? 0 : (r() - 0.5) * 0.4, r() - 0.5).multiplyScalar(quanto));
    return p.clone().add(d.clone().multiplyScalar(Math.sin((i / (pts.length - 1)) * Math.PI * 0.9)));
  });
}

export type OpcoesColuna = {
  /** Número de costelas. Abaixo de 3, vira tubo liso de `lisos` lados. */
  costelas: number;
  lisos?: number;
  /** Fundura do sulco entre costelas, fração do raio. */
  fundo: number;
  /** Anéis do topo arredondado (0 = ponta aberta). */
  domo: number;
  cor: THREE.ColorRepresentation;
  variacao: number;
  seed: number;
  sombra?: number;
  alturaDaSombra?: number;
  /** Quanto o sulco escurece e a aresta clareia. */
  sulco?: number;
  /** Cor da ponta (brotação nova, lã) e fração final do comprimento que ela ocupa. */
  corPonta?: THREE.ColorRepresentation;
  ponta?: number;
  /** Torção das costelas, em voltas por metro (cacto velho torce um pouco). */
  torcao?: number;
};

/**
 * Coluna de cacto: tubo com seção em estrela (costelas), topo em domo.
 * UV como o `tubo`: u dá a volta, v corre em metros / 2.
 */
export function coluna(pontos: V[], raios: number[], o: OpcoesColuna) {
  const comCostela = o.costelas >= 3 && o.fundo > 0;
  const lados = comCostela ? o.costelas * 2 : (o.lisos ?? 6);
  // Domo: anéis extras além do último ponto, encolhendo.
  const P = pontos.map((p) => p.clone());
  const R = [...raios];
  if (o.domo > 0) {
    const fim = P[P.length - 1];
    const dir = fim.clone().sub(P[P.length - 2]).normalize();
    const r0 = R[R.length - 1];
    for (let j = 1; j <= o.domo; j++) {
      const t = j / o.domo;
      P.push(fim.clone().addScaledVector(dir, r0 * 0.75 * Math.sin((t * Math.PI) / 2)));
      R.push(Math.max(r0 * 0.04, r0 * Math.cos((t * Math.PI) / 2)));
    }
  }
  const aneis: V[][] = [];
  const vs: number[] = [];
  let comp = 0;
  let normalAnterior = v3(1, 0, 0);
  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    const dir = (i < P.length - 1 ? P[i + 1].clone().sub(p) : p.clone().sub(P[i - 1])).normalize();
    if (i) comp += p.distanceTo(P[i - 1]);
    const lado = normalAnterior.clone().sub(dir.clone().multiplyScalar(normalAnterior.dot(dir)));
    if (lado.lengthSq() < 1e-6) lado.set(0, 0, 1).cross(dir);
    lado.normalize();
    normalAnterior = lado;
    const outro = dir.clone().cross(lado).normalize();
    const giro = comp * (o.torcao ?? 0) * Math.PI * 2;
    const anel: V[] = [];
    for (let k = 0; k <= lados; k++) {
      const a = (k / lados) * Math.PI * 2 + giro;
      const rr = R[i] * (comCostela && k % 2 === 1 ? 1 - o.fundo : 1);
      anel.push(p.clone().addScaledVector(lado, Math.cos(a) * rr).addScaledVector(outro, Math.sin(a) * rr));
    }
    aneis.push(anel);
    vs.push(comp);
  }
  const pos: number[] = [];
  const uv: number[] = [];
  const sulco: number[] = [];
  const frac: number[] = [];
  const total = comp || 1;
  for (let i = 0; i < aneis.length - 1; i++) {
    for (let k = 0; k < lados; k++) {
      const [a, b, c, d] = [aneis[i][k], aneis[i][k + 1], aneis[i + 1][k], aneis[i + 1][k + 1]];
      const [ua, ub] = [k / lados, (k + 1) / lados];
      const [va, vb] = [vs[i] / 2, vs[i + 1] / 2];
      pos.push(...a.toArray(), ...c.toArray(), ...b.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray());
      uv.push(ua, va, ua, vb, ub, va, ub, va, ua, vb, ub, vb);
      const [sa, sb] = [comCostela && k % 2 === 1 ? 1 : 0, comCostela && (k + 1) % 2 === 1 ? 1 : 0];
      sulco.push(sa, sa, sb, sb, sa, sb);
      const [fa, fb] = [vs[i] / total, vs[i + 1] / total];
      frac.push(fa, fb, fa, fa, fb, fb);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const pronto = preparar(g);
  tingir(pronto, o.cor, o.variacao, o.seed, o.sombra ?? 0, o.alturaDaSombra ?? 1);
  const cores = pronto.attributes.color as THREE.BufferAttribute;
  const cp = o.corPonta !== undefined ? new THREE.Color(o.corPonta) : null;
  const ponta = o.ponta ?? 0.12;
  const s = o.sulco ?? 0.25;
  const c = new THREE.Color();
  for (let i = 0; i < cores.count; i++) {
    c.setRGB(cores.getX(i), cores.getY(i), cores.getZ(i));
    c.multiplyScalar(sulco[i] ? 1 - s : 1 + s * 0.3);
    if (cp) {
      const t = Math.min(1, Math.max(0, (frac[i] - (1 - ponta)) / ponta));
      c.lerp(cp, t * t * 0.85);
    }
    cores.setXYZ(i, c.r, c.g, c.b);
  }
  cores.needsUpdate = true;
  return pronto;
}

/** Escurece (ou clareia, com quanto < 0) ao longo de v: ponta de chifre, galho que afina. */
export function degradeEmV(g: THREE.BufferGeometry, vMax: number, quanto: number) {
  const uv = g.attributes.uv;
  const cores = g.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < cores.count; i++) {
    const t = Math.min(1, uv.getY(i) / vMax);
    const f = 1 - quanto * t * t;
    cores.setXYZ(i, cores.getX(i) * f, cores.getY(i) * f, cores.getZ(i) * f);
  }
  cores.needsUpdate = true;
  return g;
}

/** Escurece em volta de um ponto (órbita do crânio, buraco do nariz, sulco). */
export function manchar(g: THREE.BufferGeometry, centro: V, raio: number, quanto: number) {
  const p = g.attributes.position;
  const cores = g.attributes.color as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const d = v.distanceTo(centro) / raio;
    if (d >= 1) continue;
    const f = 1 - quanto * (1 - d * d);
    cores.setXYZ(i, cores.getX(i) * f, cores.getY(i) * f, cores.getZ(i) * f);
  }
  cores.needsUpdate = true;
  return g;
}
