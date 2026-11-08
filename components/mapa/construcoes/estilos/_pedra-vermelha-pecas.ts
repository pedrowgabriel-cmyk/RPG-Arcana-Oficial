// Peças exclusivas da pedra vermelha (Araçuaí): parede com arcos de verdade (vão vazado),
// cantos arredondados, janela funda com sombra, parapeito de terraço, vigas aparentes,
// toldo listrado de feira, torre com sineira e cúpula. UV em metros, como o kit.

import * as THREE from "three";
import type { NomeMaterial } from "../../natureza/tipos";
import { aoLongo, bloco, malha, naFace, Obra, type Face } from "../kit";

const METROS_POR_UV = 2;

function escalarUV(g: THREE.BufferGeometry, su: number, sv: number) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}

/** Cilindro de pé no chão, UV em metros (volta e altura). */
export function cilindro(rTopo: number, rBase: number, h: number, lados = 8, aberto = false) {
  const g = new THREE.CylinderGeometry(rTopo, rBase, h, lados, 1, aberto);
  escalarUV(g, (Math.PI * (rTopo + rBase)) / METROS_POR_UV, h / METROS_POR_UV);
  return g.translate(0, h / 2, 0);
}

/** Meia esfera (cúpula), base em y = 0. */
export function cupula(r: number, lados = 8, aneis = 4) {
  const g = new THREE.SphereGeometry(r, lados, aneis, 0, Math.PI * 2, 0, Math.PI / 2);
  return escalarUV(g, (2 * Math.PI * r) / METROS_POR_UV, (Math.PI * r) / 2 / METROS_POR_UV);
}

/** Vão: centro `u`, largura `w`, altura da mola `h` e flecha do arco (0 = verga reta). */
export type Vao = { u: number; w: number; h: number; arco: number };

function contorno(p: THREE.Path, w: number, h: number, arco: number, y0 = 0) {
  p.moveTo(-w / 2, y0);
  p.lineTo(w / 2, y0);
  p.lineTo(w / 2, y0 + h);
  if (arco > 0.05) p.absellipse(0, y0 + h, w / 2, arco, 0, Math.PI, false, 0);
  else p.lineTo(-w / 2, y0 + h);
}

function extrudar(s: THREE.Shape, esp: number, segmentos = 4) {
  const g = new THREE.ExtrudeGeometry(s, { depth: esp, bevelEnabled: false, curveSegments: segmentos });
  return escalarUV(g, 1 / METROS_POR_UV, 1 / METROS_POR_UV);
}

/**
 * Parede de largura W e altura H com vãos que descem até o chão (porta, arcada),
 * extrudada de z = 0 a z = esp. O arco é recortado de verdade: dá para ver através.
 */
export function arqueada(W: number, H: number, vaos: Vao[], esp: number) {
  const s = new THREE.Shape();
  s.moveTo(-W / 2, 0);
  for (const v of [...vaos].sort((a, b) => a.u - b.u)) {
    const [a, b] = [v.u - v.w / 2, v.u + v.w / 2];
    s.lineTo(a, 0);
    s.lineTo(a, v.h);
    if (v.arco > 0.05) s.absellipse(v.u, v.h, v.w / 2, v.arco, Math.PI, 0, true, 0);
    else s.lineTo(b, v.h);
    s.lineTo(b, 0);
  }
  s.lineTo(W / 2, 0);
  s.lineTo(W / 2, H);
  s.lineTo(-W / 2, H);
  return extrudar(s, esp);
}

/** Perfil cheio (folha de porta, vidro escuro, nicho). */
export function perfil(w: number, h: number, arco: number, esp: number) {
  const s = new THREE.Shape();
  contorno(s, w, h, arco);
  return extrudar(s, esp, 3);
}

/** Só a face da frente do perfil (vão escuro no fundo da janela: o verso nunca aparece). */
export function chapa(w: number, h: number, arco: number) {
  const s = new THREE.Shape();
  contorno(s, w, h, arco);
  const g = new THREE.ShapeGeometry(s, 3);
  return escalarUV(g, 1 / METROS_POR_UV, 1 / METROS_POR_UV);
}

/** Moldura vazada: anel de largura `b` em volta de um vão w × h com arco. */
export function moldura(w: number, h: number, arco: number, b: number, esp: number) {
  const s = new THREE.Shape();
  contorno(s, w + b * 2, h + (arco > 0.05 ? b : b * 2), arco > 0.05 ? arco + b : 0, -b);
  const furo = new THREE.Path();
  contorno(furo, w, h, arco);
  s.holes.push(furo);
  return extrudar(s, esp, 3);
}

/** Frontão com topo curvo (igreja, fachada nobre), base em y = 0, extrudado em z. */
export function frontaoCurvo(W: number, base: number, flecha: number, esp: number) {
  const s = new THREE.Shape();
  s.moveTo(-W / 2, 0);
  s.lineTo(W / 2, 0);
  s.lineTo(W / 2, base);
  s.lineTo(W * 0.3, base);
  s.absellipse(0, base, W * 0.3, flecha, 0, Math.PI, false, 0);
  s.lineTo(-W / 2, base);
  return extrudar(s, esp);
}

/** Uma face do volume (pode estar deslocado da origem: sobrado recuado, pavilhão). */
export type Lado = { f: Face; L: number; F: number; dx?: number; dz?: number };

export function noLado(g: THREE.BufferGeometry, l: Lado, u: number, y: number, afasta = 0) {
  return naFace(g, l.f, l.L, l.F, u, y, afasta).translate(l.dx ?? 0, 0, l.dz ?? 0);
}

/** Arcos distribuídos ao longo de uma parede, com o do meio mais largo (passagem do jogador). */
export function arcosAoLongo(W: number, H: number, o: { central?: number; pilar: number; alvo: number }): Vao[] {
  const vaos: Vao[] = [];
  const c = o.central ?? 0;
  let topo = H - 0.6;
  if (c > 0) {
    const arco = Math.max(0, Math.min(c / 2, H - 3 - 0.5));
    vaos.push({ u: 0, w: c, h: 3, arco });
    topo = Math.min(topo, 3 + arco);
  }
  const trecho = (a: number, b: number) => {
    const S = b - a;
    if (S < 1.2) return;
    const k = Math.max(1, Math.round((S + o.pilar) / (o.alvo + o.pilar)));
    const aw = (S - (k - 1) * o.pilar) / k;
    const arco = Math.max(0, Math.min(aw / 2, topo - 1.9));
    for (let i = 0; i < k; i++) vaos.push({ u: a + aw / 2 + i * (aw + o.pilar), w: aw, h: topo - arco, arco });
  };
  if (c > 0) {
    trecho(c / 2 + o.pilar, W / 2 - o.pilar);
    trecho(-W / 2 + o.pilar, -c / 2 - o.pilar);
  } else trecho(-W / 2 + o.pilar, W / 2 - o.pilar);
  return vaos;
}

/**
 * Volume de pedra ou adobe com cantos arredondados (raio `rc`). Com `vao`, a fachada (+z)
 * é uma parede arqueada com o vão de passagem e o resto vira casca de 0,5 m.
 */
export function volume(obra: Obra, L: number, F: number, A: number, mat: NomeMaterial, cor: string, rc: number, o: { vao?: Vao; y0?: number; x?: number; z?: number } = {}) {
  const [y0, x, z, e] = [o.y0 ?? 0, o.x ?? 0, o.z ?? 0, 0.5];
  const r = rc < 0.05 ? 0 : Math.min(Math.max(rc, e * 0.6), L / 2 - 0.2, F / 2 - 0.2);
  if (!o.vao) {
    if (r === 0) obra.por(mat, bloco(L, A, F, x, y0, z), cor);
    else {
      obra.por(mat, bloco(L - 2 * r, A, F, x, y0, z), cor);
      obra.por(mat, bloco(L, A, F - 2 * r, x, y0, z), cor);
    }
  } else {
    const k = r === 0 ? e : r;
    obra.por(mat, bloco(r === 0 ? L : L - 2 * r, A, e, x, y0, z - F / 2 + e / 2), cor);
    for (const s of [-1, 1]) obra.por(mat, bloco(e, A, F - 2 * k, x + s * (L / 2 - e / 2), y0, z), cor);
    const W = r === 0 ? L : L - 2 * r;
    obra.por(mat, arqueada(W, A, [o.vao], e).translate(x, y0, z + F / 2 - e), cor);
  }
  if (r > 0) {
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      obra.por(mat, cilindro(r, r, A, 8).translate(x + sx * (L / 2 - r), y0, z + sz * (F / 2 - r)), cor);
    }
  }
}

export type EstiloDoParapeito = "liso" | "escalonado" | "orelhas" | "ameias";

/** Parapeito do terraço plano, com laje de terra batida dentro. */
export function parapeito(obra: Obra, L: number, F: number, y: number, alt: number, mat: NomeMaterial, cor: string, rc: number, estilo: EstiloDoParapeito, o: { x?: number; z?: number; laje?: string; coroa?: string } = {}) {
  const [x, z, t] = [o.x ?? 0, o.z ?? 0, 0.32];
  const r = rc < 0.05 ? 0 : Math.min(Math.max(rc, t * 0.6), L / 2 - 0.2, F / 2 - 0.2);
  const k = r === 0 ? t : r;
  for (const s of [-1, 1]) {
    obra.por(mat, bloco(r === 0 ? L : L - 2 * r, alt, t, x, y, z + s * (F / 2 - t / 2)), cor, 0.07, 0);
    obra.por(mat, bloco(t, alt, F - 2 * k, x + s * (L / 2 - t / 2), y, z), cor, 0.07, 0);
  }
  const cantos: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  if (r > 0) for (const [sx, sz] of cantos) obra.por(mat, cilindro(r, r, estilo === "orelhas" ? alt + 0.55 : alt, 8).translate(x + sx * (L / 2 - r), y, z + sz * (F / 2 - r)), cor, 0.07, 0);
  if (o.laje) obra.por("terra", bloco(L - 2 * Math.max(t, r * 0.7), 0.3, F - 2 * Math.max(t, r * 0.7), x, y - 0.22, z), o.laje, 0.1, 0);
  if (o.coroa) {
    for (const s of [-1, 1]) {
      obra.por("cantaria", bloco((r === 0 ? L : L - 2 * r) + 0.1, 0.12, t + 0.1, x, y + alt, z + s * (F / 2 - t / 2)), o.coroa, 0.05, 0);
      obra.por("cantaria", bloco(t + 0.1, 0.12, F - 2 * k, x + s * (L / 2 - t / 2), y + alt, z), o.coroa, 0.05, 0);
    }
  }
  const zf = z + F / 2 - t / 2;
  if (estilo === "escalonado") {
    obra.por(mat, bloco(L * 0.42, 0.45, t, x, y + alt, zf), cor, 0.07, 0);
    obra.por(mat, bloco(L * 0.2, 0.4, t, x, y + alt + 0.45, zf), cor, 0.07, 0);
  } else if (estilo === "ameias") {
    const n = Math.max(3, Math.round(L / 1.6));
    for (const u of aoLongo(L - 2 * k, n, 0.3)) obra.por(mat, bloco(0.55, 0.45, t, x + u, y + alt, zf), cor, 0.07, 0);
  } else if (estilo === "orelhas" && r > 0) {
    for (const [sx, sz] of cantos) obra.por(mat, cupula(r, 8, 2).scale(1, 0.6, 1).translate(x + sx * (L / 2 - r), y + alt + 0.55, z + sz * (F / 2 - r)), cor, 0.07, 0);
  }
}

export type OpcoesDaJanela = {
  arco?: number;
  moldura: string;
  materialDaMoldura?: NomeMaterial;
  /** Largura do aro em volta do vão. */
  aro?: number;
  /** Quanto o aro sai da parede (a sombra do vão). */
  fundura?: number;
  /** Grade de madeira (casa) ou de ferro (banco, cadeia). */
  grade?: { material: NomeMaterial; cor: string };
  /** Verga de madeira aparente por cima (adobe). */
  verga?: string;
};

/** Janela pequena e funda: aro grosso com vão escuro lá dentro, como num muro de 60 cm. */
export function janelaFunda(obra: Obra, l: Lado, u: number, y: number, w: number, h: number, o: OpcoesDaJanela) {
  const arco = o.arco ?? 0;
  const [b, fundo] = [o.aro ?? 0.16, o.fundura ?? 0.22];
  obra.por("vidro", noLado(chapa(w, h, arco), l, u, y, 0.02), "#18120e", 0.04, 0);
  obra.por(o.materialDaMoldura ?? "cantaria", noLado(moldura(w, h, arco, b, fundo), l, u, y), o.moldura, 0.06, 0);
  if (o.grade) {
    const n = Math.max(2, Math.round(w / 0.22));
    for (let i = 1; i < n; i++) obra.por(o.grade.material, noLado(bloco(0.05, h + arco * 0.7, 0.05, -w / 2 + (i * w) / n, 0, fundo * 0.6), l, u, y), o.grade.cor, 0.04, 0);
  }
  if (o.verga) obra.por("madeira-escura", noLado(bloco(w + b * 2 + 0.5, 0.2, 0.3, 0, h + (arco > 0.05 ? arco + b : b), 0.1), l, u, y), o.verga, 0.1, 0);
}

/** Porta funda com aro, folha de madeira pintada e degrau de pedra. */
export function portaFunda(obra: Obra, l: Lado, u: number, w: number, h: number, arco: number, o: { folha: string; moldura: string; materialDaMoldura?: NomeMaterial; caiado?: string; aberta?: boolean; y?: number }) {
  const b = 0.24;
  const y = o.y ?? 0;
  obra.por(o.materialDaMoldura ?? "cantaria", noLado(arqueada(w + b * 2, h + arco + b, [{ u: 0, w, h, arco }], 0.24), l, u, y), o.moldura, 0.06, 0);
  if (o.aberta) {
    for (const s of [-1, 1]) {
      const folha = bloco(0.08, h * 0.97, w / 2 - 0.1, 0, 0, -w / 4);
      folha.translate(s * (w / 2 - 0.1), 0, -0.4);
      obra.por("madeira", noLado(folha, l, u, y), o.folha, 0.08, 0);
    }
  } else {
    obra.por("madeira", noLado(perfil(w, h, arco, 0.06), l, u, y), o.folha, 0.08, 0);
    obra.por("ferro", noLado(bloco(0.08, 0.08, 0.1, w * 0.3, h * 0.48, 0.06), l, u, y), "#2c2a28", 0.02, 0);
  }
  if (o.caiado) obra.por("reboco", noLado(bloco(w + 1.3, h + arco + 0.6, 0.03, 0, 0, 0), l, u, y), o.caiado, 0.05, 0);
  obra.por("cantaria", noLado(bloco(w + 0.7, 0.16, 0.55, 0, 0, 0.27), l, u, y), "#9c6a52", 0.08, 0.3);
}

/** Pontas de vigas de madeira saindo da parede logo abaixo do terraço. */
export function vigas(obra: Obra, l: Lado, y: number, cor: string, passo = 0.95) {
  const comp = l.f === "frente" || l.f === "fundos" ? l.L : l.F;
  const n = Math.max(2, Math.floor(comp / passo));
  for (const u of aoLongo(comp, n, 0.45)) obra.por("madeira-escura", noLado(bloco(0.18, 0.18, 0.5, 0, 0, 0.25), l, u, y), cor, 0.12, 0);
}

/** Calha de madeira que joga a água do terraço para a rua. */
export function gargula(obra: Obra, l: Lado, u: number, y: number, cor: string) {
  obra.por("madeira-escura", noLado(bloco(0.22, 0.16, 0.85, 0, 0, 0.42), l, u, y), cor, 0.1, 0);
}

/** Toldo de feira listrado, em lona, com duas varas na frente. */
export function toldoListrado(obra: Obra, l: Lado, u: number, y: number, w: number, prof: number, cores: [string, string], varas = true) {
  const n = Math.max(2, Math.round(w / 0.9));
  const fw = w / n;
  for (let i = 0; i < n; i++) {
    const cu = u - w / 2 + fw / 2 + i * fw;
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const g = malha([v(-fw / 2, 0.7, 0), v(fw / 2, 0.7, 0), v(fw / 2, 0, prof), v(-fw / 2, 0, prof)], [0, 3, 2, 0, 2, 1, 0, 1, 2, 0, 2, 3]);
    obra.por("lona", noLado(g, l, cu, y, 0.05), cores[i % 2], 0.1, 0);
    obra.por("lona", noLado(bloco(fw, 0.32, 0.02, 0, -0.32, prof + 0.05), l, cu, y), cores[(i + 1) % 2], 0.1, 0);
  }
  if (varas) for (const s of [-1, 1]) obra.por("madeira", noLado(bloco(0.1, y, 0.1, s * (w / 2 - 0.1), 0, prof + 0.02), l, u, 0), "#5a4028", 0.1, 0.2);
}

/** Ramada: latada de caibros com cobertura de palha ou lona, em esteios de madeira. */
export function ramada(obra: Obra, l: Lado, u: number, w: number, prof: number, alt: number, cobertura: { material: NomeMaterial; cor: string }) {
  const n = Math.max(2, Math.round(w / 3));
  for (const e of aoLongo(w, n, 0.15)) obra.por("madeira", noLado(bloco(0.18, alt, 0.18, e, 0, prof - 0.15), l, u, 0), "#5a4028", 0.12, 0.2);
  obra.por("madeira", noLado(bloco(w, 0.2, 0.2, 0, alt, prof - 0.15), l, u, 0), "#4e3826", 0.1, 0);
  for (const e of aoLongo(w, Math.max(3, Math.round(w / 0.8)), 0.1)) obra.por("madeira-escura", noLado(bloco(0.1, 0.1, prof + 0.2, 0, alt + 0.2, prof / 2), l, u + e, 0), "#4a3222", 0.1, 0);
  obra.por(cobertura.material, noLado(bloco(w - 0.3, 0.12, prof - 0.2, 0, alt + 0.3, prof / 2), l, u, 0), cobertura.cor, 0.15, 0);
}

/** Escada de mão encostada na parede, do chão ao terraço. */
export function escadaDeMao(obra: Obra, l: Lado, u: number, alt: number) {
  const inclina = 0.22;
  const g: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) g.push(bloco(0.08, alt + 0.9, 0.08, s * 0.25, 0, 0));
  for (let y = 0.35; y < alt; y += 0.4) g.push(bloco(0.5, 0.05, 0.05, 0, y, 0));
  for (const p of g) obra.por("madeira", noLado(p.rotateX(-inclina).translate(0, 0, Math.sin(inclina) * alt + 0.1), l, u, 0), "#6a5038", 0.12, 0);
}

/** Pote de barro (moringa, talha). */
export function pote(obra: Obra, x: number, y: number, z: number, h: number, cor: string) {
  obra.por("terra", cilindro(h * 0.3, h * 0.42, h * 0.7, 7).translate(x, y, z), cor, 0.1, 0);
  obra.por("terra", cilindro(h * 0.18, h * 0.3, h * 0.3, 7).translate(x, y + h * 0.7, z), cor, 0.1, 0);
}

/**
 * Anel de quatro paredes arqueadas (sineira, mercado coberto, caixa d'água em arcos).
 * `vaos` recebe a largura de cada parede e devolve os vãos dela.
 */
export function anel(obra: Obra, x: number, y: number, z: number, Lx: number, Lz: number, H: number, esp: number, vaos: (W: number, frente: boolean) => Vao[], mat: NomeMaterial, cor: string) {
  const ladoZ = Lz - esp * 2;
  obra.por(mat, arqueada(Lx, H, vaos(Lx, true), esp).translate(x, y, z + Lz / 2 - esp), cor);
  obra.por(mat, arqueada(Lx, H, vaos(Lx, false), esp).rotateY(Math.PI).translate(x, y, z - Lz / 2 + esp), cor);
  obra.por(mat, arqueada(ladoZ, H, vaos(ladoZ, false), esp).rotateY(Math.PI / 2).translate(x + Lx / 2 - esp, y, z), cor);
  obra.por(mat, arqueada(ladoZ, H, vaos(ladoZ, false), esp).rotateY(-Math.PI / 2).translate(x - Lx / 2 + esp, y, z), cor);
}

/** Torre de pedra em dois corpos, sineira de arcos e cúpula com lanterna (ou ameias). */
export function torreDePedra(obra: Obra, x: number, z: number, lado: number, altura: number, cores: { pedra: string; arenito: string; cupula: string }, topo: "cupula" | "ameias", mat: NomeMaterial = "pedra-vermelha") {
  const hs = Math.max(2.4, lado * 0.95);
  const h1 = (altura - hs) * 0.58;
  const h2 = altura - hs - h1;
  const l2 = lado * 0.86;
  obra.por(mat, bloco(lado, h1, lado, x, 0, z), cores.pedra);
  obra.por("cantaria", bloco(lado + 0.2, 0.3, lado + 0.2, x, h1, z), cores.arenito, 0.05, 0);
  obra.por(mat, bloco(l2, h2, l2, x, h1 + 0.3, z), cores.pedra);
  const ys = h1 + 0.3 + h2;
  obra.por("cantaria", bloco(l2 + 0.25, 0.3, l2 + 0.25, x, ys, z), cores.arenito, 0.05, 0);
  const wArco = l2 * 0.5;
  anel(obra, x, ys + 0.3, z, l2, l2, hs, 0.32, (W) => [{ u: 0, w: Math.min(wArco, W - 0.7), h: hs * 0.5, arco: Math.min(wArco, W - 0.7) / 2 }], mat, cores.pedra);
  obra.por("ferro", bloco(l2 * 0.3, l2 * 0.32, l2 * 0.3, x, ys + 0.3 + hs * 0.35, z), "#6a4a22", 0.05, 0);
  const yt = ys + 0.3 + hs;
  obra.por("cantaria", bloco(l2 + 0.35, 0.35, l2 + 0.35, x, yt, z), cores.arenito, 0.05, 0);
  if (topo === "cupula") {
    obra.por(mat, cilindro(l2 * 0.42, l2 * 0.44, 0.5, 10).translate(x, yt + 0.35, z), cores.pedra);
    obra.por("terra", cupula(l2 * 0.44, 10, 4).translate(x, yt + 0.85, z), cores.cupula, 0.08, 0);
    obra.por(mat, cilindro(0.22, 0.26, 0.7, 6).translate(x, yt + 0.85 + l2 * 0.42, z), cores.pedra, 0.06, 0);
    obra.por("ferro", bloco(0.07, 1.0, 0.07, x, yt + 1.55 + l2 * 0.42, z), "#2c2a28", 0.02, 0);
    obra.por("ferro", bloco(0.5, 0.07, 0.07, x, yt + 2.2 + l2 * 0.42, z), "#2c2a28", 0.02, 0);
  } else {
    for (const u of aoLongo(l2, 3, 0.3)) {
      obra.por(mat, bloco(0.5, 0.55, 0.3, x + u, yt + 0.35, z + l2 / 2 - 0.15), cores.pedra, 0.07, 0);
      obra.por(mat, bloco(0.5, 0.55, 0.3, x + u, yt + 0.35, z - l2 / 2 + 0.15), cores.pedra, 0.07, 0);
      obra.por(mat, bloco(0.3, 0.55, 0.5, x + l2 / 2 - 0.15, yt + 0.35, z + u), cores.pedra, 0.07, 0);
      obra.por(mat, bloco(0.3, 0.55, 0.5, x - l2 / 2 + 0.15, yt + 0.35, z + u), cores.pedra, 0.07, 0);
    }
  }
}
