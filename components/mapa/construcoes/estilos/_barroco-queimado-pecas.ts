// Peças dos estilos "barroco-queimado" (Sacramento) e "peste" (Desemboque):
// obra que envelhece a cor (fuligem e umidade), parede vazada com arcos e topo
// quebrado, torre barroca de coruchéu bulboso, mato, trepadeira, entulho e viga caída.

import * as THREE from "three";
import { bolha, preparar, ruido3, tubo } from "../../natureza/ferramentas";
import type { NomeMaterial } from "../../natureza/tipos";
import { bloco, naFace, Obra, telhado, type Face } from "../kit";

/**
 * Obra que, depois do tingir, escurece a cor: fuligem em manchas que sobem pela parede
 * e umidade no pé. Funciona com todas as peças do kit (janela, porta...), porque o kit
 * chama `por`.
 */
export class ObraVelha extends Obra {
  fuligem = 0;
  umidade = 0;
  private s: number;

  constructor(semente: number, fuligem = 0, umidade = 0) {
    super(semente);
    this.s = semente;
    this.fuligem = fuligem;
    this.umidade = umidade;
  }

  por(material: NomeMaterial, g: THREE.BufferGeometry, cor: THREE.ColorRepresentation, variacao = 0.06, sombraNoPe = 0.18) {
    const pg = preparar(g);
    super.por(material, pg, cor, variacao, sombraNoPe);
    if (this.fuligem > 0 || this.umidade > 0) envelhecer(pg, this.fuligem, this.umidade, this.s);
    return this;
  }

  /** Põe sem envelhecer (peça nova: tábua de reconstrução, lona, mato). */
  limpo(material: NomeMaterial, g: THREE.BufferGeometry, cor: THREE.ColorRepresentation, variacao = 0.06, sombraNoPe = 0.18) {
    const [f, u] = [this.fuligem, this.umidade];
    this.fuligem = this.umidade = 0;
    this.por(material, g, cor, variacao, sombraNoPe);
    [this.fuligem, this.umidade] = [f, u];
    return this;
  }
}

/** Escurece por vértice: fuligem em manchas, mais forte no alto; umidade no pé. */
export function envelhecer(g: THREE.BufferGeometry, fuligem: number, umidade: number, seed: number) {
  const p = g.attributes.position;
  const c = g.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const n = ruido3(x * 0.32 + 11, y * 0.42, z * 0.32 - 7, seed + 17);
    const mancha = Math.min(1, Math.max(0, (n - 0.22) * 2.2));
    const alto = 0.55 + 0.45 * Math.min(1, Math.max(0, y / 5));
    // Fundo de fumaça em tudo, manchas fortes por cima, mais escuro no alto.
    const n3 = ruido3(x * 1.1, y * 1.3, z * 1.1, seed + 41);
    let f = 1 - fuligem * (0.28 + 0.72 * Math.min(1, mancha * 0.8 + n3 * 0.35) * alto);
    const pe = 1 - Math.min(1, Math.max(0, y / 1.4));
    const n2 = ruido3(x * 0.6, y * 0.3, z * 0.6, seed + 29);
    f *= 1 - umidade * (pe * 0.7 + Math.max(0, n2 - 0.55) * 1.2);
    // Umidade puxa para o verde-oliva; fuligem para o preto puro.
    c.setXYZ(i, c.getX(i) * f * (1 - umidade * pe * 0.08), c.getY(i) * f, c.getZ(i) * f * (1 - umidade * pe * 0.18));
  }
  c.needsUpdate = true;
}

/** UV em metros (1 UV = 2 m) para geometria que nasceu com UV em metros. */
function uvEmMetros(g: THREE.BufferGeometry) {
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
  return g;
}

export type Vao = {
  u: number;
  /** Peitoril (0 = porta: abre o pé da parede). */
  y: number;
  w: number;
  /** Altura total, com o arco. */
  h: number;
  /** Flecha do arco: 0 = reto; w/2 = arco pleno; ~0.2·w = abatido. */
  flecha: number;
  /** Óculo: vão redondo de diâmetro w. */
  oculo?: boolean;
};

function contornoDoVao(v: Vao, segmentos: number): THREE.Vector2[] {
  if (v.oculo) {
    const r = v.w / 2;
    return Array.from({ length: segmentos * 2 }, (_, k) => {
      const a = (k / (segmentos * 2)) * Math.PI * 2;
      return new THREE.Vector2(v.u + Math.cos(a) * r, v.y + r + Math.sin(a) * r);
    });
  }
  const meia = v.w / 2;
  const flecha = Math.min(v.flecha, meia);
  const nascente = v.y + v.h - flecha;
  const pts = [new THREE.Vector2(v.u - meia, v.y), new THREE.Vector2(v.u + meia, v.y)];
  if (flecha < 0.05) {
    pts.push(new THREE.Vector2(v.u + meia, v.y + v.h), new THREE.Vector2(v.u - meia, v.y + v.h));
    return pts;
  }
  const R = (meia * meia + flecha * flecha) / (2 * flecha);
  const cy = nascente + flecha - R;
  const t0 = Math.atan2(nascente - cy, meia);
  for (let k = 0; k <= segmentos; k++) {
    const t = t0 + ((Math.PI - 2 * t0) * k) / segmentos;
    pts.push(new THREE.Vector2(v.u + Math.cos(t) * R, cy + Math.sin(t) * R));
  }
  return pts;
}

/** Altura do perfil do topo em `u` (perfil de pontos da esquerda para a direita). */
function alturaNoPerfil(perfil: THREE.Vector2[], u: number) {
  for (let i = 1; i < perfil.length; i++) {
    if (u <= perfil[i].x) {
      const [a, b] = [perfil[i - 1], perfil[i]];
      const t = b.x - a.x < 1e-4 ? 1 : (u - a.x) / (b.x - a.x);
      return a.y + (b.y - a.y) * t;
    }
  }
  return perfil[perfil.length - 1].y;
}

/**
 * Perfil de topo quebrado: alturas entre `minimo` e `maximo` (fração de A), em degraus,
 * como alvenaria que caiu. `quebra` 0 = topo reto em A.
 */
export function perfilQuebrado(comprimento: number, A: number, quebra: number, r: () => number, cantos: [number, number] = [1, 1]) {
  const c = comprimento / 2;
  if (quebra <= 0) return [new THREE.Vector2(-c, A), new THREE.Vector2(c, A)];
  const n = Math.max(2, Math.round(comprimento / 1.6));
  const hs: number[] = [];
  let h = A * cantos[0];
  for (let i = 0; i <= n; i++) {
    if (i === 0) hs.push(h);
    else if (i === n) hs.push(A * cantos[1] * (1 - quebra * 0.25 * r()));
    else {
      h = Math.max(A * 0.15, Math.min(A, h + (r() - 0.55) * A * quebra * 0.9));
      hs.push(h);
    }
  }
  const pts: THREE.Vector2[] = [new THREE.Vector2(-c, hs[0])];
  for (let i = 1; i <= n; i++) {
    const u = -c + (i * comprimento) / n;
    const degrau = (comprimento / n) * (0.2 + r() * 0.4);
    if (i < n) {
      pts.push(new THREE.Vector2(u - degrau, hs[i - 1]));
      pts.push(new THREE.Vector2(u - degrau * 0.4, (hs[i - 1] + hs[i]) / 2 + (r() - 0.5) * 0.3));
      pts.push(new THREE.Vector2(u, hs[i]));
    } else pts.push(new THREE.Vector2(u, hs[i]));
  }
  return pts;
}

/**
 * Parede maciça com vãos (arcos, óculos, portas) e topo pelo `perfil`. Desenhada de
 * frente: u em x, y para cima, face externa em z = 0 e espessura para dentro (-z).
 * Vão que não cabe sob o topo quebrado é descartado (a parede caiu ali).
 * Devolve a geometria e os vãos que ficaram, para as molduras.
 */
export function paredeVazada(comprimento: number, perfil: THREE.Vector2[], vaos: Vao[], espessura: number, segmentos = 4) {
  const c = comprimento / 2;
  const cabem = vaos.filter((v) => {
    if (v.u - v.w / 2 < -c + 0.35 || v.u + v.w / 2 > c - 0.35) return false;
    let menor = Infinity;
    for (const u of [v.u - v.w / 2 - 0.2, v.u, v.u + v.w / 2 + 0.2, ...perfil.filter((p) => Math.abs(p.x - v.u) < v.w / 2 + 0.2).map((p) => p.x)]) menor = Math.min(menor, alturaNoPerfil(perfil, u));
    return menor >= v.y + v.h + 0.3;
  });
  // Sem sobreposição: o primeiro que chegou fica.
  const vaosOk: Vao[] = [];
  for (const v of cabem) if (!vaosOk.some((o) => Math.abs(o.u - v.u) < (o.w + v.w) / 2 + 0.3 && !(o.y + o.h < v.y - 0.3 || v.y + v.h < o.y - 0.3))) vaosOk.push(v);
  const portas = vaosOk.filter((v) => v.y <= 0.01 && !v.oculo).sort((a, b) => a.u - b.u);
  const furos = vaosOk.filter((v) => v.y > 0.01 || v.oculo);
  const forma = new THREE.Shape();
  forma.moveTo(-c, 0);
  for (const pt of portas) {
    const cont = contornoDoVao(pt, segmentos);
    // Contorno da porta: sobe pela ombreira esquerda, passa pelo arco e desce pela direita.
    forma.lineTo(pt.u - pt.w / 2, 0);
    const alto = cont.slice(2).reverse();
    for (const q of alto) forma.lineTo(q.x, q.y);
    forma.lineTo(pt.u + pt.w / 2, 0);
  }
  forma.lineTo(c, 0);
  for (let i = perfil.length - 1; i >= 0; i--) forma.lineTo(perfil[i].x, Math.max(0.1, perfil[i].y));
  forma.closePath();
  for (const f of furos) forma.holes.push(new THREE.Path(contornoDoVao(f, segmentos)));
  const g = new THREE.ExtrudeGeometry(forma, { depth: espessura, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -espessura);
  return { geometria: uvEmMetros(g), vaos: vaosOk };
}

/** Moldura de cantaria em volta do vão (arco, ombreiras e peitoril), saliente da parede. */
export function molduraDoVao(v: Vao, largura = 0.22, saliencia = 0.1, segmentos = 4) {
  const fora: Vao = v.oculo
    ? { ...v, u: v.u, y: v.y - largura, w: v.w + largura * 2 }
    : { ...v, u: v.u, w: v.w + largura * 2, h: v.h + largura, flecha: v.flecha > 0.05 ? v.flecha + largura * 0.5 : 0 };
  const externo = contornoDoVao(fora, segmentos);
  const interno = contornoDoVao(v, segmentos);
  const forma = new THREE.Shape(externo);
  if (v.y <= 0.01 && !v.oculo) {
    // Porta: a moldura é um U invertido (sem soleira).
    forma.holes = [];
    const s = new THREE.Shape();
    const ext = externo.slice(2).reverse();
    const intr = interno.slice(2);
    s.moveTo(v.u - v.w / 2 - largura, 0);
    s.lineTo(v.u - v.w / 2, 0);
    for (const q of intr.slice().reverse()) s.lineTo(q.x, q.y);
    s.lineTo(v.u + v.w / 2, 0);
    s.lineTo(v.u + v.w / 2 + largura, 0);
    for (const q of ext.slice().reverse()) s.lineTo(q.x, q.y);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: saliencia, bevelEnabled: false, curveSegments: 1 });
    return uvEmMetros(g);
  }
  forma.holes.push(new THREE.Path(interno));
  const g = new THREE.ExtrudeGeometry(forma, { depth: saliencia, bevelEnabled: false, curveSegments: 1 });
  if (!v.oculo) g.translate(0, 0, 0);
  return uvEmMetros(g);
}

/** Põe uma parede vazada (e as molduras) numa face do prédio. */
export function porParede(
  obra: Obra,
  f: Face,
  L: number,
  F: number,
  perfil: THREE.Vector2[],
  vaos: Vao[],
  material: NomeMaterial,
  cor: THREE.ColorRepresentation,
  moldura?: { cor: THREE.ColorRepresentation; material?: NomeMaterial; largura?: number },
  espessura = 0.5,
) {
  const comp = f === "frente" || f === "fundos" ? L : F;
  const { geometria, vaos: ok } = paredeVazada(comp, perfil, vaos, espessura);
  obra.por(material, naFace(geometria, f, L, F, 0, 0), cor, 0.08, 0.25);
  if (moldura) for (const v of ok) obra.por(moldura.material ?? "cantaria", naFace(molduraDoVao(v, moldura.largura ?? 0.22), f, L, F, 0, 0), moldura.cor, 0.05, 0);
  return ok;
}

/** Faixa (cimalha, friso) só onde a parede ainda está inteira na altura `y`. */
export function frisoQuebrado(obra: Obra, f: Face, L: number, F: number, perfil: THREE.Vector2[], y: number, alto: number, saliencia: number, cor: THREE.ColorRepresentation, material: NomeMaterial = "cantaria", vaos: Vao[] = []) {
  // Porta corta o friso (o embasamento não pode fechar o vão).
  const portas = vaos.filter((v) => v.y <= 0.01 && !v.oculo && y < v.h);
  const comp = f === "frente" || f === "fundos" ? L : F;
  let ini: number | null = null;
  const passo = 0.4;
  const trechos: [number, number][] = [];
  for (let u = -comp / 2; u <= comp / 2 + 1e-3; u += passo) {
    const inteira = alturaNoPerfil(perfil, Math.min(u, comp / 2)) >= y + alto - 0.02 && !portas.some((v) => Math.abs(u - v.u) < v.w / 2 + 0.25);
    if (inteira && ini === null) ini = u;
    if ((!inteira || u + passo > comp / 2 + 1e-3) && ini !== null) {
      const fim = inteira ? comp / 2 : u - passo;
      if (fim - ini > 0.5) trechos.push([ini, fim]);
      ini = null;
    }
  }
  for (const [a, b] of trechos) obra.por(material, naFace(bloco(b - a + (Math.abs(a) >= comp / 2 - 0.01 || Math.abs(b) >= comp / 2 - 0.01 ? saliencia : 0), alto, saliencia, (a + b) / 2, 0, saliencia / 2), f, L, F, 0, y), cor, 0.05, 0);
}

/** Trepadeira: mancha de folhagem colada à parede, mais alta que larga. */
export function trepadeira(obra: Obra, f: Face, L: number, F: number, u: number, y0: number, altura: number, largura: number, seed: number, cor: THREE.ColorRepresentation = "#4b5b2e") {
  const g = bolha(1, 1, 0.45, seed, 1).scale(largura / 2, altura / 2, 0.22);
  obra.por("musgo", naFace(g.translate(0, altura / 2, 0.08), f, L, F, u, y0), cor, 0.18, 0.1);
  // Ramo que escorre até o chão.
  if (y0 > 0.5) obra.por("musgo", naFace(bolha(1, 0, 0.35, seed + 3, 1).scale(largura * 0.18, y0 / 2 + 0.3, 0.12).translate(0, y0 / 2, 0.06), f, L, F, u + (seed % 3) * 0.2, 0), cor, 0.15, 0);
}

/** Moita ou capim baixo. */
export function moita(obra: Obra, x: number, z: number, raio: number, altura: number, seed: number, cor: THREE.ColorRepresentation = "#55632f", detalhe = 1) {
  obra.por("musgo", bolha(1, detalhe, 0.5, seed, 1).scale(raio, altura, raio * 0.85).translate(x, altura * 0.55, z), cor, 0.2, 0.25);
}

/** Árvore nascida dentro da ruína: tronco torto e duas ou três copas. */
export function arvoreNaRuina(obra: Obra, x: number, z: number, altura: number, r: () => number, cor: THREE.ColorRepresentation = "#4a5a2c") {
  const incl = new THREE.Vector3((r() - 0.5) * 0.25, 1, (r() - 0.5) * 0.25).normalize();
  const pts = [0, 0.35, 0.7, 1].map((t) => new THREE.Vector3(x, 0, z).addScaledVector(incl, altura * 0.75 * t).add(new THREE.Vector3(Math.sin(t * 5) * 0.2, 0, 0)));
  obra.por("casca", tubo(pts, [0.22, 0.16, 0.11, 0.07], 6), "#4a3c2e", 0.1, 0);
  const topo = pts[pts.length - 1];
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const raio = altura * (0.22 + r() * 0.12);
    obra.por("musgo", bolha(1, 1, 0.4, Math.floor(r() * 1e5), 0.75).scale(raio, raio, raio).translate(topo.x + Math.cos(a) * raio * 0.6, topo.y + (r() - 0.3) * raio * 0.5, topo.z + Math.sin(a) * raio * 0.6), cor, 0.2, 0);
  }
}

/** Monte de entulho: pedra caída com alguns blocos soltos por cima. */
export function entulho(obra: Obra, x: number, z: number, w: number, d: number, h: number, cor: THREE.ColorRepresentation, r: () => number, material: NomeMaterial = "cantaria") {
  obra.por(material, bolha(1, 1, 0.35, Math.floor(r() * 1e5), 1).scale(w / 2, h, d / 2).translate(x, 0, z), cor, 0.15, 0.3);
  for (let i = 0; i < 3; i++) {
    const b = bloco(0.4 + r() * 0.5, 0.25 + r() * 0.2, 0.3 + r() * 0.4, 0, 0, 0).rotateY(r() * 3).rotateX((r() - 0.5) * 0.6);
    obra.por(material, b.translate(x + (r() - 0.5) * w * 0.8, h * 0.25, z + (r() - 0.5) * d * 0.8), cor, 0.12, 0);
  }
}

/** Viga caída: uma ponta no chão, a outra apoiada a `alto` metros. */
export function vigaCaida(obra: Obra, x: number, z: number, comprimento: number, giro: number, alto: number, cor: THREE.ColorRepresentation = "#2d2723", secao = 0.25) {
  const incl = Math.asin(Math.min(0.95, alto / comprimento));
  const g = bloco(comprimento, secao, secao, comprimento / 2, 0, 0).rotateZ(incl).rotateY(giro).translate(x, 0.05, z);
  obra.por("madeira-escura", g, cor, 0.12, 0);
}

/** Coruchéu bulboso (cebola barroca) por torno, com pináculo. */
export function corucheu(raio: number, altura: number, lados = 8) {
  const perfil = [
    [0.001, 0],
    [1.0, 0],
    [1.08, 0.12],
    [0.95, 0.35],
    [0.6, 0.6],
    [0.32, 0.78],
    [0.22, 0.86],
    [0.28, 0.9],
    [0.08, 1.0],
  ].map(([a, b]) => new THREE.Vector2(a * raio, b * altura));
  const g = new THREE.LatheGeometry(perfil, lados);
  return uvEmMetros(g);
}

export type CoresDaTorre = { fuste: string; cantaria: string; cupula: string; materialCupula?: NomeMaterial };

/**
 * Torre barroca: fuste com cunhais de cantaria, cornijas, sineira com quatro arcos,
 * coruchéu bulboso e cruz. `quebrada` (0..1) corta o fuste e tira a sineira.
 */
export function torreBarroca(obra: Obra, x: number, z: number, lado: number, alturaDoFuste: number, cores: CoresDaTorre, r: () => number, quebrada = 0, materialFuste: NomeMaterial = "reboco") {
  const c = cores;
  if (quebrada > 0) {
    // Fuste partido: quatro paredes de alturas diferentes, sem sineira.
    const h = alturaDoFuste * (1 - quebrada * 0.6);
    for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
      const perfil = perfilQuebrado(lado, h, 0.5 + quebrada * 0.4, r);
      const ok = paredeVazada(lado, perfil, [{ u: 0, y: h * 0.55, w: lado * 0.32, h: lado * 0.55, flecha: lado * 0.16 }], 0.45);
      obra.por(materialFuste, naFace(ok.geometria, f, lado, lado, 0, 0).translate(x, 0, z), c.fuste, 0.08, 0.25);
    }
    for (const [sx, sz] of [
      [-1, 1],
      [1, 1],
    ])
      obra.por("cantaria", bloco(0.42, h * (0.55 + r() * 0.4), 0.42, x + sx * (lado / 2 - 0.15), 0, z + sz * (lado / 2 - 0.15)), c.cantaria, 0.06, 0.2);
    vigaCaida(obra, x + lado * 0.1, z, lado * 0.9, r() * 3, h * 0.7);
    return h;
  }
  const s = 0.42;
  obra.por(materialFuste, bloco(lado, alturaDoFuste, lado, x, 0, z), c.fuste, 0.08, 0.25);
  for (const [px, pz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ])
    obra.por("cantaria", bloco(s, alturaDoFuste, s, x + px * (lado / 2 - s / 2 + 0.04), 0, z + pz * (lado / 2 - s / 2 + 0.04)), c.cantaria, 0.05, 0.2);
  // Janelinha e relógio (óculo) na frente do fuste.
  obra.por("vidro", bloco(lado * 0.28, lado * 0.5, 0.05, x, alturaDoFuste * 0.55, z + lado / 2 + 0.01), "#1e1c1a", 0.04, 0);
  obra.por("cantaria", bloco(lado + 0.35, 0.35, lado + 0.35, x, alturaDoFuste, z), c.cantaria, 0.05, 0);
  // Sineira vazada: quatro paredes com arco pleno.
  const hs = lado * 1.05;
  const y0 = alturaDoFuste + 0.35;
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
    const perfil = [new THREE.Vector2(-lado / 2, hs), new THREE.Vector2(lado / 2, hs)];
    const { geometria } = paredeVazada(lado, perfil, [{ u: 0, y: 0.5, w: lado * 0.46, h: hs * 0.72, flecha: lado * 0.23 }], 0.4);
    obra.por(materialFuste, naFace(geometria, f, lado, lado, 0, 0).translate(x, y0, z), c.fuste, 0.06, 0);
  }
  obra.por("ferro", new THREE.CylinderGeometry(lado * 0.14, lado * 0.2, lado * 0.3, 7, 1).translate(x, y0 + hs * 0.55, z), "#5e4424", 0.05, 0);
  const topo = y0 + hs;
  obra.por("cantaria", bloco(lado + 0.3, 0.3, lado + 0.3, x, topo, z), c.cantaria, 0.05, 0);
  // Pináculos nos cantos.
  for (const [px, pz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ])
    obra.por("cantaria", new THREE.ConeGeometry(0.2, 0.9, 5).translate(x + px * (lado / 2 - 0.05), topo + 0.75, z + pz * (lado / 2 - 0.05)), c.cantaria, 0.05, 0);
  const altC = lado * 1.25;
  obra.por(c.materialCupula ?? "telha-escura", corucheu(lado * 0.42, altC).translate(x, topo + 0.3, z), c.cupula, 0.08, 0);
  const y = topo + 0.3 + altC;
  obra.por("ferro", bloco(0.08, 1.3, 0.08, x, y - 0.1, z), "#2c2a28", 0.02, 0);
  obra.por("ferro", bloco(0.65, 0.08, 0.08, x, y + 0.75, z), "#2c2a28", 0.02, 0);
  return y + 1.2;
}

/** Tesouras queimadas e o que sobrou do telhado (Sacramento) ou ripado exposto. */
export function telhadoQueimado(obra: Obra, L: number, F: number, A: number, alto: number, inteiro: number, r: () => number, cores: { telha: string; viga: string }, eixo: "x" | "z" = "x") {
  // Cumeeira paralela a `eixo`. Desenha em x e gira se for em z.
  const [CL, CF] = eixo === "x" ? [L, F] : [F, L];
  const gira = (g: THREE.BufferGeometry) => (eixo === "x" ? g : g.rotateY(Math.PI / 2));
  const xc = -CL / 2 + CL * inteiro;
  if (inteiro > 0.05) {
    // Parte que ficou: duas águas só sobre [-CL/2, xc].
    const comp = xc + CL / 2;
    for (const g of telhado("duas-aguas", comp, CF, A, alto, 0.45).slice(0, 2)) obra.por("telha", gira(g.translate(-CL / 2 + comp / 2 - 0.0, 0, 0)), cores.telha, 0.14, 0);
  }
  // Caibros carbonizados no resto, alguns faltando, alguns partidos no meio.
  for (let x = Math.max(xc + 0.4, -CL / 2 + 0.3); x <= CL / 2 - 0.2; x += 0.9 + r() * 0.3) {
    if (r() < 0.3) continue;
    for (const s of [-1, 1]) {
      if (r() < 0.25) continue;
      const de = new THREE.Vector3(x, A, s * (CF / 2 + 0.2));
      const para = de.clone().lerp(new THREE.Vector3(x, A + alto, 0), r() < 0.3 ? 0.4 + r() * 0.4 : 1);
      obra.por("madeira-escura", gira(caibro(de, para)), cores.viga, 0.12, 0);
    }
  }
  const fimCumeeira = r() < 0.5 ? CL / 2 : xc + (CL / 2 - xc) * (0.4 + r() * 0.4);
  if (fimCumeeira - xc > 0.5) obra.por("madeira-escura", gira(bloco(fimCumeeira - Math.max(xc, -CL / 2), 0.22, 0.22, (fimCumeeira + Math.max(xc, -CL / 2)) / 2, A + alto - 0.2, 0)), cores.viga, 0.1, 0);
  // Frechal (viga do topo das paredes) dos dois lados.
  for (const s of [-1, 1]) obra.por("madeira-escura", gira(bloco(CL, 0.2, 0.2, 0, A - 0.05, s * (CF / 2 - 0.25))), cores.viga, 0.1, 0);
}

/** Peça de madeira de seção quadrada entre dois pontos. */
export function caibro(de: THREE.Vector3, para: THREE.Vector3, secao = 0.15) {
  const g = bloco(secao, secao, de.distanceTo(para), 0, -secao / 2, 0);
  g.lookAt(para.clone().sub(de));
  return g.translate((de.x + para.x) / 2, (de.y + para.y) / 2, (de.z + para.z) / 2);
}

/**
 * Frontão barroco: cornija reta nos cantos, curva em S subindo até um topo com
 * pequena ponta, `alto` metros acima de A. Às vezes um lado caiu.
 */
export function frontao(L: number, A: number, alto: number, r: () => number): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const n = 14;
  const quebrado = r() < 0.35;
  for (let i = 0; i <= n; i++) {
    const u = -L / 2 + (i * L) / n;
    const t = Math.abs(u) / (L / 2);
    let y: number;
    if (t > 0.72) y = A + 0.2;
    else if (t > 0.18) {
      const k = (0.72 - t) / 0.54;
      y = A + 0.2 + alto * (0.5 - 0.5 * Math.cos(k * Math.PI)) * 0.85;
    } else y = A + 0.2 + alto * 0.85 + (0.18 - t) * alto * 0.9;
    if (quebrado && u > L * 0.05) y = Math.max(A * 0.75, y - (u / L) * alto * 2.4 - r() * 0.6);
    pts.push(new THREE.Vector2(u, y));
  }
  return pts;
}

