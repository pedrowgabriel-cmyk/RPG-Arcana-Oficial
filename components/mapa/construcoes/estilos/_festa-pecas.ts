// Peças exclusivas do estilo "festa" (Bom Fim): bandeirinhas, lambrequim recortado,
// balcão corrido de tábua, janela leve com venezianas, lampião, barraca de feira,
// passarela de tábua sobre a lama e mansarda afrancesada. Tudo no referencial do prédio.

import * as THREE from "three";
import { juntar } from "../../natureza/ferramentas";
import type { NomeMaterial } from "../../natureza/tipos";
import { bloco, malha, naFace, Obra, telhado, type Face } from "../kit";

type Cor = THREE.ColorRepresentation;
export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Retângulo plano de frente (+z), pé em y = 0. Com `duasFaces`, aparece dos dois lados. */
export function quad(w: number, h: number, duasFaces = false) {
  return malha([v(-w / 2, 0, 0), v(w / 2, 0, 0), v(w / 2, h, 0), v(-w / 2, h, 0)], duasFaces ? [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
}

/** Triângulos soltos (lista de trincas de pontos), dos dois lados. */
function trincas(pts: THREE.Vector3[], duasFaces = true) {
  const idx: number[] = [];
  for (let i = 0; i < pts.length; i += 3) {
    idx.push(i, i + 1, i + 2);
    if (duasFaces) idx.push(i, i + 2, i + 1);
  }
  return malha(pts, idx);
}

/** Anel de faixas em volta das paredes (barrado, lama, cimalha) com vão na frente: não fecha a porta nem tampa o interior. */
export function faixa(obra: Obra, L: number, F: number, y: number, h: number, material: NomeMaterial, cor: Cor, saliencia = 0.04, vaoNaFrente = 0, variacao = 0.06, sombra = 0) {
  const s = saliencia;
  const e = 0.12;
  obra.por(material, bloco(L + s * 2, h, e, 0, y, -F / 2 - s + e / 2), cor, variacao, sombra);
  for (const lado of [-1, 1]) obra.por(material, bloco(e, h, F + s * 2 - e * 2, lado * (L / 2 + s - e / 2), y, 0), cor, variacao, sombra);
  if (vaoNaFrente <= 0) obra.por(material, bloco(L + s * 2, h, e, 0, y, F / 2 + s - e / 2), cor, variacao, sombra);
  else {
    const resto = (L + s * 2 - vaoNaFrente) / 2;
    for (const lado of [-1, 1]) obra.por(material, bloco(resto, h, e, lado * (vaoNaFrente / 2 + resto / 2), y, F / 2 + s - e / 2), cor, variacao, sombra);
  }
}

export type OpcoesJanela = { moldura: Cor; veneziana?: Cor; materialDaMoldura?: NomeMaterial; grade?: boolean; floreira?: Cor; vidro?: Cor };

/** Janela leve: moldura saliente, vidraça, peitoril e venezianas pintadas abertas (≈ 30 triângulos). */
export function janelaFesta(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, h: number, o: OpcoesJanela) {
  const m = 0.13;
  const mat = o.materialDaMoldura ?? "reboco";
  obra.por(mat, naFace(bloco(w + m * 2, h + m * 2, 0.08, 0, -m, 0.04), f, L, F, u, y), o.moldura, 0.05, 0);
  obra.por("vidro", naFace(quad(w, h).translate(0, 0, 0.085), f, L, F, u, y), o.vidro ?? "#2b3336", 0.05, 0);
  obra.por(mat, naFace(bloco(w + m * 2 + 0.12, 0.08, 0.2, 0, -m - 0.08, 0.1), f, L, F, u, y), o.moldura, 0.05, 0);
  if (o.veneziana) {
    for (const lado of [-1, 1]) obra.por("madeira", naFace(quad(w / 2, h * 0.98).translate(lado * (w / 2 + m + w / 4 + 0.02), 0, 0.03), f, L, F, u, y), o.veneziana, 0.1, 0);
  }
  if (o.grade) {
    const barras = Math.max(3, Math.round(w / 0.18));
    for (let i = 1; i < barras; i++) obra.por("ferro", naFace(quad(0.035, h).translate(-w / 2 + (i * w) / barras, 0, 0.12), f, L, F, u, y), "#2a2826", 0.02, 0);
    obra.por("ferro", naFace(bloco(w, 0.04, 0.04, 0, h * 0.5, 0.12), f, L, F, u, y), "#2a2826", 0.02, 0);
  }
  if (o.floreira) {
    obra.por("madeira", naFace(bloco(w + 0.1, 0.24, 0.3, 0, -m - 0.34, 0.15), f, L, F, u, y), "#5e4630", 0.1, 0);
    obra.por("folhagem", naFace(bloco(w, 0.2, 0.24, 0, -m - 0.12, 0.15), f, L, F, u, y), o.floreira, 0.2, 0);
  }
}

/** Guarda-corpo de tábua recortada (balaústres chatos, como nos sobrados do interior). */
export function balaustrada(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, afasta: number, cor: Cor, altura = 0.95) {
  for (const g of guardaCorpo(w, altura)) obra.por("madeira", naFace(g.translate(0, 0, afasta), f, L, F, u, y), cor, 0.08, 0);
}

/** As geometrias do guarda-corpo, de frente em z = 0 e pé em y = 0 (para girar à mão). */
export function guardaCorpo(w: number, altura = 0.95) {
  const n = Math.max(2, Math.round(w / 0.24));
  const gs = Array.from({ length: n }, (_, i) => quad(0.09, altura - 0.2, true).translate(-w / 2 + ((i + 0.5) * w) / n, 0.12, 0));
  return [bloco(w, 0.09, 0.12, 0, altura - 0.09, 0), bloco(w, 0.08, 0.08, 0, 0.04, 0), juntar(gs)];
}

/** Balcão corrido de madeira sobre mãos-francesas, com guarda-corpo. */
export function balcaoCorrido(obra: Obra, f: Face, L: number, F: number, comprimento: number, y: number, profundidade: number, cor: Cor) {
  obra.por("madeira", naFace(bloco(comprimento, 0.16, profundidade, 0, y - 0.16, profundidade / 2), f, L, F, 0, 0), cor, 0.1, 0);
  balaustrada(obra, f, L, F, 0, y, comprimento, profundidade - 0.06, cor);
  for (const lado of [-1, 1]) obra.por("madeira", naFace(bloco(0.08, 0.95, profundidade - 0.1, lado * (comprimento / 2 - 0.04), y, profundidade / 2 - 0.05), f, L, F, 0, 0), cor, 0.08, 0);
  const n = Math.max(2, Math.round(comprimento / 2.6) + 1);
  for (let i = 0; i < n; i++) {
    const u = -comprimento / 2 + 0.3 + (i * (comprimento - 0.6)) / (n - 1);
    const len = profundidade * 1.25;
    const mao = bloco(0.1, 0.1, len, 0, -0.05, 0).rotateX(-Math.PI / 4).translate(u, y - 0.16 - (len * 0.707) / 2, (len * 0.707) / 2);
    obra.por("madeira", naFace(mao, f, L, F, 0, 0), cor, 0.08, 0);
  }
}

/** Lambrequim: faixa de tábua recortada em dentes sob o beiral, pintada de branco. */
export function lambrequim(obra: Obra, f: Face, L: number, F: number, comprimento: number, y: number, afasta: number, cor: Cor = "#ece5d2") {
  const pts: THREE.Vector3[] = [];
  const x0 = -comprimento / 2;
  const x1 = comprimento / 2;
  pts.push(v(x0, y - 0.14, 0), v(x1, y - 0.14, 0), v(x1, y, 0), v(x0, y - 0.14, 0), v(x1, y, 0), v(x0, y, 0));
  const n = Math.max(3, Math.round(comprimento / 0.3));
  for (let i = 0; i < n; i++) {
    const a = x0 + (i * comprimento) / n;
    const b = x0 + ((i + 1) * comprimento) / n;
    pts.push(v(a, y - 0.14, 0), v((a + b) / 2, y - 0.36, 0), v(b, y - 0.14, 0));
  }
  // Os dentes ficam na frente; a trinca vira para os dois lados.
  obra.por("madeira", naFace(trincas(pts.map((p) => p.clone())), f, L, F, 0, 0, afasta), cor, 0.06, 0);
}

/** Cachorros: pontas dos caibros aparecendo sob o beiral largo, inclinadas com o telhado. */
export function cachorros(obra: Obra, f: Face, L: number, F: number, comprimento: number, yNaParede: number, beiral: number, inclinacao: number, cor: Cor) {
  const n = Math.max(3, Math.round(comprimento / 0.85));
  const ang = Math.atan(inclinacao);
  for (let i = 0; i < n; i++) {
    const u = -comprimento / 2 + 0.2 + (i * (comprimento - 0.4)) / (n - 1);
    const len = beiral + 0.05;
    const g = bloco(0.1, 0.13, len, 0, -0.13, len / 2).rotateX(ang).translate(u, yNaParede, 0);
    obra.por("madeira", naFace(g, f, L, F, 0, 0), cor, 0.08, 0);
  }
}

export const CORES_DAS_BANDEIRAS = ["#c4433a", "#e0b23c", "#3d78ae", "#4f9a5b", "#e9e2cf", "#c66d98", "#e07a32"];

/** Cordão de bandeirinhas de festa entre dois pontos, com barriga. */
export function bandeirinhas(obra: Obra, a: THREE.Vector3, b: THREE.Vector3, r: () => number, queda = 0.5, espaco = 0.48) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  dir.normalize();
  const n = Math.max(3, Math.floor(len / espaco));
  const ponto = (t: number) => a.clone().lerp(b, t).add(v(0, -queda * 4 * t * (1 - t), 0));
  const cordao: THREE.Vector3[] = [];
  const passos = Math.max(2, Math.min(8, Math.round(len / 2)));
  for (let k = 0; k < passos; k++) {
    const [p0, p1] = [ponto(k / passos), ponto((k + 1) / passos)];
    const [q0, q1] = [p0.clone().setY(p0.y - 0.03), p1.clone().setY(p1.y - 0.03)];
    cordao.push(p0, p1, q1, p0, q1, q0);
  }
  obra.por("lona", trincas(cordao), "#3a3028", 0.02, 0);
  const porCor: THREE.Vector3[][] = CORES_DAS_BANDEIRAS.map(() => []);
  const desvio = Math.floor(r() * CORES_DAS_BANDEIRAS.length);
  for (let i = 0; i < n; i++) {
    const p = ponto((i + 0.5) / n);
    const k = (i * 3 + desvio + (r() < 0.25 ? 1 : 0)) % CORES_DAS_BANDEIRAS.length;
    porCor[k].push(p.clone().addScaledVector(dir, -0.15), p.clone().addScaledVector(dir, 0.15), p.clone().add(v(0, -0.36, 0)));
  }
  porCor.forEach((pts, k) => {
    if (pts.length) obra.por("lona", trincas(pts), CORES_DAS_BANDEIRAS[k], 0.06, 0);
  });
}

/** Lampião de parede num braço de ferro. */
export function arandela(obra: Obra, f: Face, L: number, F: number, u: number, y: number) {
  obra.por("ferro", naFace(bloco(0.06, 0.06, 0.5, 0, 0, 0.25), f, L, F, u, y), "#2a2826", 0.02, 0);
  obra.por("vidro", naFace(bloco(0.24, 0.34, 0.24, 0, -0.38, 0.46), f, L, F, u, y), "#f0c25a", 0.08, 0);
  obra.por("ferro", naFace(bloco(0.32, 0.07, 0.32, 0, -0.05, 0.46), f, L, F, u, y), "#2a2826", 0.02, 0);
}

/** Lampião pendurado (varanda, coreto, barracão). */
export function lampiaoPendurado(obra: Obra, x: number, y: number, z: number) {
  obra.por("ferro", bloco(0.03, 0.35, 0.03, x, y - 0.35, z), "#2a2826", 0.02, 0);
  obra.por("vidro", bloco(0.22, 0.3, 0.22, x, y - 0.68, z), "#f0c25a", 0.08, 0);
  obra.por("ferro", bloco(0.3, 0.06, 0.3, x, y - 0.4, z), "#2a2826", 0.02, 0);
}

/** Poste de lampião de rua. */
export function poste(obra: Obra, x: number, z: number, altura = 3.1) {
  obra.por("cantaria", bloco(0.34, 0.4, 0.34, x, 0, z), "#8a8274", 0.06, 0.2);
  obra.por("ferro", bloco(0.11, altura, 0.11, x, 0.4, z), "#2a2826", 0.03, 0);
  obra.por("vidro", bloco(0.34, 0.46, 0.34, x, altura + 0.4, z), "#f0c25a", 0.08, 0);
  obra.por("ferro", bloco(0.46, 0.08, 0.46, x, altura + 0.86, z), "#2a2826", 0.02, 0);
}

/** Barril (água da chuva, cachaça, chope). */
export function barril(obra: Obra, x: number, z: number, raio = 0.32, altura = 0.85, cor: Cor = "#6a4a2c", y = 0) {
  obra.por("madeira", new THREE.CylinderGeometry(raio * 0.92, raio * 0.92, altura, 8).translate(x, y + altura / 2, z), cor, 0.1, 0.2);
  obra.por("ferro", new THREE.CylinderGeometry(raio, raio, 0.06, 8, 1, true).translate(x, y + altura * 0.8, z), "#3a3632", 0.03, 0);
}

/** Passarela de tábua sobre a lama, na frente do prédio. */
export function passarela(obra: Obra, L: number, F: number, profundidade: number, cor: Cor) {
  obra.por("madeira", bloco(L, 0.1, profundidade, 0, 0.18, F / 2 + profundidade / 2), cor, 0.14, 0);
  for (const s of [-1, 1]) obra.por("madeira-escura", bloco(L, 0.18, 0.16, 0, 0, F / 2 + profundidade / 2 + s * (profundidade / 2 - 0.15)), "#3e2e20", 0.1, 0.3);
}

/** Barraca de feira: quatro esteios, balcão com caixotes e lona listrada caindo para a frente. */
export function barraca(obra: Obra, x: number, z: number, w: number, d: number, lona: Cor, r: () => number, alto = 2.5) {
  const z0 = z - d / 2;
  const z1 = z + d / 2;
  for (const [px, pz, h] of [
    [x - w / 2, z0, alto],
    [x + w / 2, z0, alto],
    [x - w / 2, z1, alto - 0.4],
    [x + w / 2, z1, alto - 0.4],
  ] as const) {
    obra.por("madeira", bloco(0.09, h, 0.09, px, 0, pz), "#5a4028", 0.1, 0);
  }
  obra.por("madeira", bloco(w - 0.1, 0.85, 0.55, x, 0, z1 - 0.35), "#7a5a3a", 0.12, 0.3);
  const k = Math.max(3, Math.round(w / 0.55));
  const listras: [THREE.Vector3[], THREE.Vector3[]] = [[], []];
  for (let i = 0; i < k; i++) {
    const [a, b] = [x - w / 2 - 0.1 + (i * (w + 0.2)) / k, x - w / 2 - 0.1 + ((i + 1) * (w + 0.2)) / k];
    const [p0, p1, p2, p3] = [v(a, alto + 0.05, z0 - 0.15), v(b, alto + 0.05, z0 - 0.15), v(b, alto - 0.35, z1 + 0.35), v(a, alto - 0.35, z1 + 0.35)];
    listras[i % 2].push(p3, p2, p1, p3, p1, p0, p3, p1, p2, p3, p0, p1);
    // Babado na frente.
    listras[i % 2].push(v(a, alto - 0.35, z1 + 0.35), v(b, alto - 0.35, z1 + 0.35), v(b, alto - 0.6, z1 + 0.37), v(a, alto - 0.35, z1 + 0.35), v(b, alto - 0.6, z1 + 0.37), v(a, alto - 0.6, z1 + 0.37));
  }
  obra.por("lona", malha(listras[0], listras[0].map((_, i) => i)), lona, 0.1, 0);
  obra.por("lona", malha(listras[1], listras[1].map((_, i) => i)), "#e6dcc2", 0.1, 0);
  // Caixotes com abóbora, couve, tomate, milho.
  const produtos = ["#d9822b", "#5f8a3a", "#b23a2a", "#d8b440", "#7a4a8a"];
  const n = Math.max(2, Math.floor(w / 0.6));
  for (let i = 0; i < n; i++) {
    const px = x - w / 2 + 0.35 + (i * (w - 0.7)) / Math.max(1, n - 1);
    obra.por("madeira", bloco(0.48, 0.2, 0.4, px, 0.85, z1 - 0.35), "#9a7a52", 0.12, 0);
    obra.por("folhagem", bloco(0.42, 0.14, 0.34, px, 1.02, z1 - 0.35), produtos[Math.floor(r() * produtos.length)], 0.18, 0);
  }
  lampiaoPendurado(obra, x, alto - 0.15, z);
}

/** Toldo de lona listrada sobre a porta ou a vitrine. */
export function toldoListrado(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, prof: number, cor: Cor) {
  const k = Math.max(3, Math.round(w / 0.5));
  const listras: [THREE.Vector3[], THREE.Vector3[]] = [[], []];
  for (let i = 0; i < k; i++) {
    const [a, b] = [-w / 2 + (i * w) / k, -w / 2 + ((i + 1) * w) / k];
    const [p0, p1, p2, p3] = [v(a, 0.6, 0), v(b, 0.6, 0), v(b, 0, prof), v(a, 0, prof)];
    listras[i % 2].push(p3, p2, p1, p3, p1, p0, p3, p1, p2, p3, p0, p1);
    listras[i % 2].push(v(a, 0, prof), v(b, 0, prof), v(b, -0.28, prof + 0.02), v(a, 0, prof), v(b, -0.28, prof + 0.02), v(a, -0.28, prof + 0.02));
  }
  obra.por("lona", naFace(malha(listras[0], listras[0].map((_, i) => i)), f, L, F, u, y, 0.05), cor, 0.1, 0);
  obra.por("lona", naFace(malha(listras[1], listras[1].map((_, i) => i)), f, L, F, u, y, 0.05), "#e6dcc2", 0.1, 0);
}

/**
 * Mansarda afrancesada: água íngreme saindo do alto da parede, recuada `recuo` no topo,
 * e um telhado baixo de quatro águas por cima.
 */
export function mansarda(L: number, F: number, base: number, h: number, recuo: number, beiral = 0.3) {
  const [Lo, Fo, Li, Fi] = [L / 2 + beiral, F / 2 + beiral, L / 2 - recuo, F / 2 - recuo];
  const topo = base + h;
  const fora = [v(-Lo, base, Fo), v(Lo, base, Fo), v(Lo, base, -Fo), v(-Lo, base, -Fo)];
  const dentro = [v(-Li, topo, Fi), v(Li, topo, Fi), v(Li, topo, -Fi), v(-Li, topo, -Fi)];
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    pts.push(fora[i], fora[j], dentro[j], fora[i], dentro[j], dentro[i]);
  }
  const lados = malha(pts, pts.map((_, i) => i));
  return [lados, ...telhado("quatro-aguas", Li * 2, Fi * 2, topo, Math.min(Li, Fi) * 0.35, 0.12, 0.12)];
}

/** Lucarna (janelinha de telhado) com telhadinho de duas águas, na frente. */
export function lucarna(obra: Obra, t: Obra, x: number, y: number, z: number, cor: Cor, telha: Cor, moldura: Cor) {
  const w = 1.2;
  const h = 1.5;
  const d = 1.3;
  obra.por("reboco", bloco(w, h, d, x, y, z - d / 2), cor, 0.05, 0);
  janelaFesta(obra, "frente", 0, z * 2, x, y + 0.25, 0.7, 1.0, { moldura });
  for (const g of telhado("duas-aguas", d, w, y + h, 0.6, 0.12, 0.08)) t.por("telha-escura", g.rotateY(Math.PI / 2).translate(x, 0, z - d / 2), telha, 0.08, 0);
  const tri = malha([v(-w / 2, 0, 0), v(w / 2, 0, 0), v(0, 0.6, 0)], [0, 1, 2]);
  obra.por("reboco", tri.translate(x, y + h, z), cor, 0.05, 0);
}

/** Sacada de ferro leve: laje de cantaria, corrimão e barras chatas (≈ 50 triângulos). */
export function sacadaLeve(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, corFerro: Cor = "#2a2826") {
  const prof = 0.7;
  obra.por("cantaria", naFace(bloco(w, 0.15, prof, 0, 0, prof / 2), f, L, F, u, y), "#bdb4a2", 0.04, 0);
  obra.por("ferro", naFace(bloco(w, 0.05, 0.05, 0, 0.95, prof - 0.03), f, L, F, u, y), corFerro, 0.02, 0);
  const n = Math.max(4, Math.round(w / 0.28));
  const gs = Array.from({ length: n + 1 }, (_, i) => quad(0.03, 0.8, true).translate(-w / 2 + (i * w) / n, 0.15, prof - 0.03));
  obra.por("ferro", naFace(juntar(gs), f, L, F, u, y), corFerro, 0.02, 0);
}
