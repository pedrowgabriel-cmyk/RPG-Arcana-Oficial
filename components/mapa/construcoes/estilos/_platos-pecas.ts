// Peças do povo dos platôs (Celestes): pedra empilhada, madeira, palha em camadas, lona.
// Tudo no referencial do prédio (largura em x, fundo em z, fachada em +z, chão em y = 0),
// com UV em metros como o resto do kit.

import * as THREE from "three";
import { bloco, caixa, malha, naFace, Obra, telhado, type Face } from "../kit";
import type { NomeMaterial } from "../../natureza/tipos";

export type Cores = {
  pedra: string;
  pedraEscura: string;
  laje: string;
  madeira: string;
  madeiraEscura: string;
  palha: string;
  palhaVelha: string;
  /** Panos tingidos da casa (urucum, anil, açafrão, algodão cru...). */
  tecidos: string[];
};

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ESCURO = "#1d1611";

/** Mesmo tom, um pouco mais claro ou mais escuro: pedras vizinhas nunca iguais. */
export function tom(cor: string, r: () => number, amp = 0.08) {
  const c = new THREE.Color(cor);
  c.offsetHSL((r() - 0.5) * 0.02, 0, (r() - 0.5) * amp);
  return "#" + c.getHexString();
}

/** Peça de seção quadrada de `a` até `b` (esteio inclinado, mão-francesa, corda, mastro). */
export function viga(a: THREE.Vector3, b: THREE.Vector3, esp: number) {
  const d = b.clone().sub(a);
  const g = caixa(esp, d.length(), esp);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()));
  return g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

/**
 * Cone ou tronco de cone com espessura: o telhado redondo de palha, a tenda, o templo.
 * `r1 = 0` fecha em ponta; `r1 > 0` deixa o óculo aberto em cima.
 */
export function tronco(r0: number, r1: number, h: number, lados: number, y = 0, esp = 0.3, soCima = false, giro = 0) {
  const baixo: THREE.Vector3[] = [];
  const alto: THREE.Vector3[] = [];
  for (let i = 0; i < lados; i++) {
    const a = giro + (i / lados) * Math.PI * 2;
    baixo.push(V(Math.sin(a) * r0, y, Math.cos(a) * r0));
    if (r1 > 0) alto.push(V(Math.sin(a) * r1, y + h, Math.cos(a) * r1));
  }
  const pts = [...baixo, ...(r1 > 0 ? alto : [V(0, y + h, 0)])];
  const tris: number[] = [];
  for (let i = 0; i < lados; i++) {
    const j = (i + 1) % lados;
    if (r1 > 0) tris.push(i, j, lados + j, i, lados + j, lados + i);
    else tris.push(i, j, lados);
  }
  const out = [malha(pts, tris)];
  if (soCima) return out;
  const avesso = tris.map((_, i) => tris[i - (i % 3) + (2 - (i % 3))]);
  out.push(malha(pts.map((p) => p.clone().setY(p.y - esp)), avesso));
  const borda = [...baixo, ...baixo.map((p) => p.clone().setY(p.y - esp))];
  const bt: number[] = [];
  for (let i = 0; i < lados; i++) {
    const j = (i + 1) % lados;
    bt.push(i, lados + i, lados + j, i, lados + j, j);
  }
  out.push(malha(borda, bt));
  return out;
}

/** Cilindro com UV em metros, pé em y. */
export function cilindro(r: number, h: number, lados: number, x: number, y: number, z: number, tampa = false, rTopo = r) {
  const g = new THREE.CylinderGeometry(rTopo, r, h, lados, 1, !tampa).toNonIndexed();
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.PI * r) / 1, (uv.getY(i) * h) / 2);
  return g.translate(x, y + h / 2, z);
}

/**
 * Paredes de `y0` a `y0 + h`. Sem vão: volume maciço (barato). Com vão: oco, e a fachada
 * se abre no meio até `vao.altura` (o jogador entra).
 */
export function paredesY(obra: Obra, L: number, F: number, y0: number, h: number, mat: NomeMaterial, cor: string, vao?: { largura: number; altura: number }, dz = 0) {
  if (!vao) {
    obra.por(mat, bloco(L, h, F, 0, y0, dz), cor);
    return;
  }
  const e = 0.45;
  const topo = y0 + h;
  obra.por(mat, bloco(L, h, e, 0, y0, dz - F / 2 + e / 2), cor);
  for (const s of [-1, 1]) obra.por(mat, bloco(e, h, F - e * 2, s * (L / 2 - e / 2), y0, dz), cor);
  const abaixo = Math.min(topo, vao.altura) - y0;
  if (abaixo > 0) {
    const lado = (L - vao.largura) / 2;
    for (const s of [-1, 1]) obra.por(mat, bloco(lado, abaixo, e, s * (vao.largura / 2 + lado / 2), y0, dz + F / 2 - e / 2), cor);
  }
  const yb = Math.max(y0, vao.altura);
  if (topo > yb + 0.01) obra.por(mat, bloco(L, topo - yb, e, 0, yb, dz + F / 2 - e / 2), cor);
}

/** Quatro vigas em volta (frechal, cinta entre a pedra e a madeira): não tapa o interior. */
export function cinta(obra: Obra, L: number, F: number, y: number, h: number, mat: NomeMaterial, cor: string, sai = 0.08, dz = 0) {
  const e = 0.24;
  for (const s of [-1, 1]) {
    obra.por(mat, bloco(L + sai * 2, h, e, 0, y, dz + s * (F / 2 + sai - e / 2)), cor, 0.08, 0);
    obra.por(mat, bloco(e, h, F + sai * 2 - e * 2, s * (L / 2 + sai - e / 2), y, dz), cor, 0.08, 0);
  }
}

/** Parede redonda em gomos; com `vao`, deixa a abertura em +z e põe verga acima de 3 m. */
export function paredeRedonda(obra: Obra, R: number, y0: number, h: number, esp: number, lados: number, mat: NomeMaterial, cor: string, r: () => number, vao?: number) {
  const comp = 2 * R * Math.sin(Math.PI / lados) + 0.06;
  for (let k = 0; k < lados; k++) {
    const t = ((k + 0.5) / lados) * Math.PI * 2;
    const [cx, cz] = [Math.sin(t) * (R - esp / 2), Math.cos(t) * (R - esp / 2)];
    const noVao = vao !== undefined && cz > 0 && Math.abs(cx) - comp / 2 < vao / 2;
    const y = noVao ? Math.max(y0, 3) : y0;
    const hh = y0 + h - y;
    if (hh <= 0.05) continue;
    obra.por(mat, bloco(comp, hh, esp, 0, 0, 0).rotateY(t).translate(cx, y, cz), tom(cor, r, 0.05));
  }
}

/** Pedras de canto travadas, alternando o comprido: o jeito de empilhar sem argamassa. */
export function quinas(obra: Obra, L: number, F: number, y0: number, h: number, cor: string, r: () => number, dz = 0) {
  const n = Math.max(1, Math.round(h / 0.55));
  const hh = h / n;
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    for (let i = 0; i < n; i++) {
      const comprido = (i + (sx * sz > 0 ? 0 : 1)) % 2 === 0;
      const [w, d] = comprido ? [0.85, 0.45] : [0.45, 0.85];
      obra.por("pedra", bloco(w, hh - 0.05, d, sx * (L / 2 - w / 2 + 0.07), y0 + i * hh + 0.02, dz + sz * (F / 2 - d / 2 + 0.07)), tom(cor, r, 0.12), 0.08, 0);
    }
  }
}

/** Pedras salientes espalhadas na face: lê "pedra empilhada" de longe, antes da textura. */
export function pedrasSoltas(obra: Obra, f: Face, L: number, F: number, y0: number, h: number, n: number, cor: string, r: () => number, dz = 0) {
  const comp = f === "frente" || f === "fundos" ? L : F;
  const total = Math.max(n, Math.round((comp * h) / 5));
  for (let i = 0; i < total; i++) {
    const w = 0.35 + r() * 0.5;
    const u = (r() - 0.5) * (comp - w - 1.2);
    const y = y0 + 0.15 + r() * Math.max(0.1, h - 0.6);
    obra.por("pedra", naFace(bloco(w, 0.2 + r() * 0.16, 0.09, 0, 0, 0.03), f, L, F, u, y).translate(0, 0, dz), tom(cor, r, 0.14), 0.06, 0);
  }
}

export type OpcoesDeVao = { postigo?: boolean; cortina?: string; verga?: "pedra" | "madeira"; dz?: number };

/** Janela sem vidro: vão escuro, verga grossa passando dos lados, peitoril de pedra, postigo escorado ou pano. */
export function vao(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, h: number, c: Cores, o: OpcoesDeVao = {}) {
  const dz = o.dz ?? 0;
  const por = (mat: NomeMaterial, g: THREE.BufferGeometry, cor: string, v = 0.08) => obra.por(mat, naFace(g, f, L, F, u, y).translate(0, 0, dz), cor, v, 0);
  por("madeira-escura", bloco(w, h, 0.05, 0, 0, 0.01), ESCURO, 0.03);
  if (o.verga === "pedra") por("pedra", bloco(w + 0.7, 0.24, 0.24, 0, h, 0.08), c.laje, 0.06);
  else por("madeira", bloco(w + 0.7, 0.2, 0.2, 0, h, 0.07), c.madeiraEscura, 0.1);
  por("pedra", bloco(w + 0.3, 0.14, 0.26, 0, -0.14, 0.09), c.pedraEscura, 0.06);
  for (const s of [-1, 1]) por("madeira", bloco(0.1, h, 0.1, s * (w / 2 + 0.05), 0, 0.05), c.madeira);
  if (o.postigo) {
    // Postigo de tábua preso em cima e escorado para fora, como aba.
    const g = bloco(w + 0.1, h * 0.85, 0.06, 0, -h * 0.85, 0).rotateX(-0.75).translate(0, h, 0.14);
    por("madeira", g, c.madeira, 0.1);
    por("madeira", viga(V(0, 0.02, 0.12), V(0, h - 0.62 * h, 0.14 + 0.55 * h), 0.04), c.madeiraEscura);
  } else if (o.cortina) {
    por("lona", bloco(w * 0.94, h * 0.62, 0.03, 0, h * 0.38, 0.06), o.cortina, 0.1);
  }
}

/** Porta: vão escuro (ou aberto) com ombreiras, verga de tronco, soleira de pedra e pano pendurado. */
export function entrada(obra: Obra, f: Face, L: number, F: number, u: number, w: number, h: number, c: Cores, o: { aberta?: boolean; cortina?: string; dz?: number; y?: number } = {}) {
  const dz = o.dz ?? 0;
  const y = o.y ?? 0;
  const por = (mat: NomeMaterial, g: THREE.BufferGeometry, cor: string, v = 0.08) => obra.por(mat, naFace(g, f, L, F, u, y).translate(0, 0, dz), cor, v, 0);
  if (!o.aberta) por("madeira-escura", bloco(w, h, 0.05, 0, 0, 0.01), ESCURO, 0.03);
  for (const s of [-1, 1]) por("madeira", bloco(0.2, h, 0.2, s * (w / 2 + 0.1), 0, 0.08), c.madeira);
  por("madeira", bloco(w + 1.0, 0.3, 0.28, 0, h, 0.1), c.madeiraEscura, 0.1);
  por("pedra", bloco(w + 0.6, 0.12, 0.6, 0, -0.02, 0.25), c.laje, 0.06);
  if (o.cortina) {
    if (o.aberta) for (const s of [-1, 1]) por("lona", bloco(0.45, h * 0.88, 0.05, s * (w / 2 - 0.3), h * 0.12, 0.12), o.cortina, 0.1);
    else por("lona", bloco(w * 0.96, h * 0.72, 0.04, 0, h * 0.28, 0.07), o.cortina, 0.1);
  }
}

/** Degraus de pedra saindo da face (de `y0` até `y0 + altura`), cada pedra num tom. */
export function degraus(obra: Obra, f: Face, L: number, F: number, u: number, w: number, altura: number, prof: number, cor: string, r: () => number, y0 = 0, dz = 0) {
  const n = Math.max(1, Math.round(altura / 0.25));
  const hs = altura / n;
  for (let i = 0; i < n; i++) {
    obra.por("pedra", naFace(bloco(w - i * 0.1, (n - i) * hs, prof, (r() - 0.5) * 0.1, 0, i * prof + prof / 2), f, L, F, u, y0).translate(0, 0, dz), tom(cor, r, 0.12), 0.06, 0.1);
  }
}

/** Varal: dois esteios, corda com barriga e panos tingidos. */
export function varal(obra: Obra, a: [number, number], b: [number, number], y0: number, altura: number, c: Cores, r: () => number) {
  const [pa, pb] = [V(a[0], y0 + altura, a[1]), V(b[0], y0 + altura, b[1])];
  for (const p of [pa, pb]) obra.por("madeira", bloco(0.12, altura + 0.15, 0.12, p.x, y0, p.z), c.madeiraEscura, 0.1, 0);
  const meio = pa.clone().lerp(pb, 0.5).setY(y0 + altura - 0.18);
  obra.por("madeira", viga(pa, meio, 0.025), "#c9bb9a", 0.04, 0);
  obra.por("madeira", viga(meio, pb, 0.025), "#c9bb9a", 0.04, 0);
  const comp = pa.distanceTo(pb);
  const giro = Math.atan2(-(pb.z - pa.z), pb.x - pa.x);
  const n = Math.max(1, Math.floor(comp / 1.05));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const w = 0.5 + r() * 0.4;
    const h = 0.5 + r() * 0.7;
    const barriga = 0.18 * (1 - Math.abs(t - 0.5) * 2);
    const p = pa.clone().lerp(pb, t);
    obra.por("lona", bloco(w, h, 0.03, 0, -h, 0).rotateY(giro).translate(p.x, p.y - barriga, p.z), c.tecidos[Math.floor(r() * c.tecidos.length)], 0.1, 0);
  }
}

/**
 * Palha em camadas: duas ou três mantas, cada uma subindo e encolhendo sobre a de baixo,
 * com a beirada grossa à mostra. A cumeeira leva um rolo de palha mais velha.
 */
export function palha(t: Obra, tipo: "quatro-aguas" | "duas-aguas", L: number, F: number, base: number, H: number, c: Cores, r: () => number, camadas = 2, beiral = 0.9, dz = 0) {
  const meia = tipo === "duas-aguas" ? F / 2 : Math.min(L, F) / 2;
  const passo = H * 0.32;
  for (let k = 0; k < camadas; k++) {
    const dy = k * passo;
    const dx = (dy * (meia + beiral)) / H;
    const [l, f] = tipo === "duas-aguas" ? [L - k * 0.25, F - dx * 2] : [L - dx * 2, F - dx * 2];
    const cor = tom(k % 2 ? c.palha : c.palhaVelha, r, 0.06);
    for (const g of telhado(tipo, l, f, base + dy + k * 0.1, H - dy, beiral, 0.42 - k * 0.08)) t.por("palha", g.translate(0, 0, dz), cor, 0.14, 0);
  }
  const topo = base + H + (camadas - 1) * 0.1;
  if (tipo === "duas-aguas") t.por("palha", bloco(L + beiral * 2 + 0.2, 0.26, 0.42, 0, topo - 0.2, dz), c.palhaVelha, 0.12, 0);
  else if (Math.abs(L - F) > 0.3) {
    const comp = Math.abs(L - F) + 0.8;
    t.por("palha", L > F ? bloco(comp, 0.26, 0.4, 0, topo - 0.2, dz) : bloco(0.4, 0.26, comp, 0, topo - 0.2, dz), c.palhaVelha, 0.12, 0);
  }
}

/** Telhado cônico de palha em camadas, com pináculo de madeira e topete amarrado. */
export function conePalha(t: Obra, R: number, base: number, H: number, c: Cores, r: () => number, camadas = 2, lados = 12, x = 0, z = 0) {
  const passo = H * 0.3;
  const giro = r() * Math.PI;
  for (let k = 0; k < camadas; k++) {
    const dy = k * passo;
    const rr = R * (1 - dy / H);
    const cor = tom(k % 2 ? c.palha : c.palhaVelha, r, 0.06);
    for (const g of tronco(rr, 0, H - dy, lados, base + dy + k * 0.1, 0.42 - k * 0.08, false, giro)) t.por("palha", g.translate(x, 0, z), cor, 0.14, 0);
  }
  const topo = base + H + (camadas - 1) * 0.1;
  t.por("palha", cilindro(0.35, 0.5, 6, x, topo - 0.45, z, true, 0.12), c.palhaVelha, 0.1, 0);
  t.por("madeira", bloco(0.1, 0.9, 0.1, x, topo - 0.1, z), c.madeiraEscura, 0.1, 0);
}

/** Corrimão: esteios e uma travessa entre dois pontos, à altura `y`. */
export function guardaCorpo(obra: Obra, a: [number, number], b: [number, number], y: number, c: Cores, altura = 0.95) {
  const [pa, pb] = [V(a[0], y, a[1]), V(b[0], y, b[1])];
  const n = Math.max(1, Math.round(pa.distanceTo(pb) / 1.6));
  for (let i = 0; i <= n; i++) {
    const p = pa.clone().lerp(pb, i / n);
    obra.por("madeira", bloco(0.12, altura, 0.12, p.x, y, p.z), c.madeira, 0.1, 0);
  }
  obra.por("madeira", viga(pa.clone().setY(y + altura), pb.clone().setY(y + altura), 0.1), c.madeira, 0.08, 0);
  obra.por("madeira", viga(pa.clone().setY(y + altura * 0.5), pb.clone().setY(y + altura * 0.5), 0.06), c.madeiraEscura, 0.08, 0);
}

/** Escada de mão: dois banzos e travessas, de `a` (chão) a `b` (topo). */
export function escadaDeMao(obra: Obra, a: THREE.Vector3, b: THREE.Vector3, largura: number, c: Cores, espaco = 0.42) {
  const d = b.clone().sub(a);
  const lado = V(-d.z, 0, d.x).normalize().multiplyScalar(largura / 2);
  if (lado.lengthSq() < 1e-6) lado.set(largura / 2, 0, 0);
  for (const s of [-1, 1]) obra.por("madeira", viga(a.clone().addScaledVector(lado, s), b.clone().addScaledVector(lado, s), 0.09), c.madeira, 0.1, 0);
  const n = Math.floor(d.length() / espaco);
  for (let i = 1; i < n; i++) {
    const p = a.clone().lerp(b, i / n);
    obra.por("madeira", viga(p.clone().sub(lado), p.clone().add(lado), 0.06), c.madeiraEscura, 0.1, 0);
  }
}

/** Escada de tábua encostada na fachada, subindo em x de `x0` até a altura `h`. */
export function escadaDeTabua(obra: Obra, x0: number, z: number, h: number, sentido: 1 | -1, c: Cores, largura = 0.9) {
  const n = Math.max(3, Math.round(h / 0.3));
  const piso = 0.32;
  for (let i = 0; i < n; i++) {
    obra.por("madeira", bloco(piso + 0.04, 0.07, largura, x0 + sentido * (i * piso + piso / 2), ((i + 1) * h) / n - 0.07, z), c.madeira, 0.1, 0);
  }
  const [a, b] = [V(x0, 0, z + largura / 2), V(x0 + sentido * n * piso, h, z + largura / 2)];
  obra.por("madeira", viga(a, b, 0.12), c.madeiraEscura, 0.1, 0);
  obra.por("madeira", viga(a.clone().setZ(z - largura / 2), b.clone().setZ(z - largura / 2), 0.12), c.madeiraEscura, 0.1, 0);
  // Esteio sob o meio do lance e corrimão do lado de fora.
  obra.por("madeira", bloco(0.14, h / 2, 0.14, x0 + (sentido * n * piso) / 2, 0, z + largura / 2), c.madeiraEscura, 0.1, 0);
  obra.por("madeira", viga(a.clone().setY(1.0), b.clone().setY(h + 1.0), 0.07), c.madeira, 0.08, 0);
}

/** Pote de barro e cesto de palha: miudeza perto da porta. */
export function pote(obra: Obra, x: number, z: number, r: () => number) {
  const h = 0.5 + r() * 0.35;
  obra.por("tijolo", cilindro(0.26, h, 7, x, 0, z, true, 0.17), tom("#8f5a3c", r, 0.1), 0.08, 0.2);
}

export function cesto(obra: Obra, x: number, z: number, c: Cores, r: () => number) {
  obra.por("palha", cilindro(0.3, 0.45 + r() * 0.2, 7, x, 0, z, true, 0.38), c.palhaVelha, 0.1, 0.2);
}

/** Lenha empilhada encostada numa face. */
export function lenha(obra: Obra, f: Face, L: number, F: number, u: number, c: Cores, r: () => number) {
  const w = 1.4 + r() * 1.2;
  obra.por("madeira-escura", naFace(bloco(w, 0.9 + r() * 0.4, 0.55, 0, 0, 0.32), f, L, F, u, 0), tom(c.madeiraEscura, r, 0.1), 0.14, 0.2);
  obra.por("palha", naFace(bloco(w + 0.3, 0.12, 0.8, 0, 1.3, 0.35), f, L, F, u, 0), c.palhaVelha, 0.1, 0);
}

/** Bandeira comprida pendurada de um mastro (os panos que o vento do platô carrega). */
export function flamula(obra: Obra, x: number, z: number, altura: number, cor: string, c: Cores, r: () => number, comprimento = 3) {
  obra.por("madeira", cilindro(0.09, altura, 5, x, 0, z, false, 0.06), c.madeiraEscura, 0.1, 0.1);
  obra.por("madeira", bloco(0.9, 0.07, 0.07, x + 0.4, altura - 0.25, z), c.madeiraEscura, 0.1, 0);
  const g = bloco(0.75, comprimento, 0.03, 0, -comprimento, 0).rotateZ((r() - 0.5) * 0.08);
  obra.por("lona", g.translate(x + 0.45, altura - 0.2, z), cor, 0.12, 0);
}
