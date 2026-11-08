// Peças do estilo "porto" (Belo Horizonte) que o kit não tem: vãos leves (moldura +
// vidro numa face só), arco pleno, sacada e balaustrada baratas, pinha, cilindro e cúpula
// com UV em metros, e a cobertura por anéis (telhado curvo oriental, mansarda, lanternim).
// Tudo no referencial do prédio (fachada em +z), desenhado "de frente" e posto com naFace.

import * as THREE from "three";
import type { NomeMaterial } from "../../natureza/tipos";
import { bloco, malha, naFace, Obra, type Face } from "../kit";

const METROS_POR_UV = 2;

export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Retângulo de frente (normal +z), pé em `y`, centro em `x`, encostado em `z`. */
export function quad(w: number, h: number, x = 0, y = 0, z = 0) {
  return malha([v(x - w / 2, y, z), v(x + w / 2, y, z), v(x + w / 2, y + h, z), v(x - w / 2, y + h, z)], [0, 1, 2, 0, 2, 3]);
}

/** Meio disco de frente (bandeira, arco pleno, frontão curvo), centro da base em (x, y, z). */
export function meioDisco(r: number, x = 0, y = 0, z = 0, lados = 6) {
  const pts = [v(x, y, z)];
  for (let i = 0; i <= lados; i++) {
    const a = (i / lados) * Math.PI;
    pts.push(v(x + Math.cos(a) * r, y + Math.sin(a) * r, z));
  }
  const tris: number[] = [];
  for (let i = 1; i <= lados; i++) tris.push(0, i, i + 1);
  return malha(pts, tris);
}

/** Triângulo de frente (frontão), base em y, ápice `alto` acima. */
export function triangulo(w: number, alto: number, x = 0, y = 0, z = 0) {
  return malha([v(x - w / 2, y, z), v(x + w / 2, y, z), v(x, y + alto, z)], [0, 1, 2]);
}

/** Cilindro com UV em metros (chaminé redonda, coluna, farol, tanque). Pé em y. */
export function cilindro(raioBase: number, raioTopo: number, h: number, lados: number, x: number, y: number, z: number, tampa = false) {
  const g = new THREE.CylinderGeometry(raioTopo, raioBase, h, lados, 1, !tampa).toNonIndexed();
  const uv = g.attributes.uv;
  const volta = Math.PI * (raioBase + raioTopo);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * volta) / METROS_POR_UV, (uv.getY(i) * h) / METROS_POR_UV);
  return g.translate(x, y + h / 2, z);
}

/** Meia esfera (cúpula) com UV em metros, base em y. */
export function cupula(r: number, x: number, y: number, z: number, lados = 10, aneis = 4, achata = 1) {
  const g = new THREE.SphereGeometry(r, lados, aneis, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed();
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.PI * 2 * r) / METROS_POR_UV, (uv.getY(i) * Math.PI * r * 0.5) / METROS_POR_UV);
  g.scale(1, achata, 1);
  return g.translate(x, y, z);
}

export type Anel = { hx: number; hz: number; y: number; levanta?: number };

/**
 * Cobertura por anéis retangulares de 8 pontos (cantos e meios), do beiral para o topo.
 * Com `levanta` nos cantos sai o beiral arrebitado oriental; com anéis recuados, a mansarda.
 * `forro` desenha a face de baixo e a testeira só no primeiro trecho (o que se vê do chão).
 */
export function cobertura(aneis: Anel[], fechar = true, forro = true, espessura = 0.16) {
  const pontos: THREE.Vector3[] = [];
  const tris: number[] = [];
  const anel = (a: Anel, dy = 0) => {
    const l = a.levanta ?? 0;
    const base = pontos.length;
    pontos.push(
      v(a.hx, a.y + l + dy, a.hz), v(0, a.y + dy, a.hz), v(-a.hx, a.y + l + dy, a.hz), v(-a.hx, a.y + dy, 0),
      v(-a.hx, a.y + l + dy, -a.hz), v(0, a.y + dy, -a.hz), v(a.hx, a.y + l + dy, -a.hz), v(a.hx, a.y + dy, 0),
    );
    return base;
  };
  const idx = aneis.map((a) => anel(a));
  for (let i = 0; i < idx.length - 1; i++) {
    for (let k = 0; k < 8; k++) {
      const [a, a2, b, b2] = [idx[i] + k, idx[i] + ((k + 1) % 8), idx[i + 1] + k, idx[i + 1] + ((k + 1) % 8)];
      tris.push(a, b, b2, a, b2, a2);
    }
  }
  const ultimo = aneis[aneis.length - 1];
  if (fechar && ultimo.hx > 0.05 && ultimo.hz > 0.05) {
    const c = pontos.length;
    pontos.push(v(0, ultimo.y, 0));
    const u = idx[idx.length - 1];
    for (let k = 0; k < 8; k++) tris.push(c, u + ((k + 1) % 8), u + k);
  }
  if (forro && aneis.length > 1) {
    const a0 = anel(aneis[0], -espessura);
    const a1 = anel(aneis[1], -espessura);
    for (let k = 0; k < 8; k++) {
      const [a, a2, b, b2] = [a0 + k, a0 + ((k + 1) % 8), a1 + k, a1 + ((k + 1) % 8)];
      tris.push(a, b2, b, a, a2, b2);
      // Testeira: a borda grossa do beiral.
      const [t, t2] = [idx[0] + k, idx[0] + ((k + 1) % 8)];
      tris.push(t, a2, a, t, t2, a2);
    }
  }
  return malha(pontos, tris);
}

/** Anéis do telhado curvo oriental: caimento côncavo e cantos levantados. */
export function aneisCurvos(L: number, F: number, base: number, alto: number, beiral: number, levanta: number, passos = 3): Anel[] {
  const mx = L >= F ? (L - F) / 2 : 0;
  const mz = F > L ? (F - L) / 2 : 0;
  const lista: Anel[] = [];
  for (let i = 0; i <= passos; i++) {
    const t = i / passos;
    lista.push({
      hx: L / 2 + beiral + (mx - L / 2 - beiral) * t,
      hz: F / 2 + beiral + (mz - F / 2 - beiral) * t,
      y: base + alto * (0.18 * t + 0.82 * t * t),
      levanta: levanta * (1 - t) * (1 - t),
    });
  }
  return lista;
}

export type OpcoesDeVao = {
  arco?: boolean;
  moldura?: THREE.ColorRepresentation;
  materialDaMoldura?: NomeMaterial;
  vidro?: THREE.ColorRepresentation;
  /** Material do miolo: vidro (janela), madeira (porta, janela fechada), lona (papel de arroz). */
  miolo?: NomeMaterial;
  veneziana?: THREE.ColorRepresentation;
  sobreverga?: "reta" | "triangulo" | "chave";
  grade?: boolean;
  peitoril?: boolean;
  /** Treliça de madeira (oriental) em vez de caixilho. */
  trelica?: THREE.ColorRepresentation;
};

/**
 * Vão leve: uma caixa de moldura e o miolo numa face só por cima (a moldura aparece em
 * volta). Janela de ~26 triângulos; com arco, ~38. Pé em `y`, centro em `u` da face.
 */
export function vao(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, h: number, o: OpcoesDeVao = {}) {
  const m = 0.13;
  const corM = o.moldura ?? "#ece4d2";
  const matM = o.materialDaMoldura ?? "reboco";
  const miolo = o.miolo ?? "vidro";
  const corV = o.vidro ?? (miolo === "vidro" ? "#262e33" : "#3a2a1e");
  const por = (mat: NomeMaterial, g: THREE.BufferGeometry, cor: THREE.ColorRepresentation, variacao = 0.04) => obra.por(mat, naFace(g, f, L, F, u, y), cor, variacao, 0);
  por(matM, bloco(w + m * 2, h + m, 0.08, 0, 0, 0.04), corM);
  por(miolo, quad(w, h, 0, 0, 0.085), corV, 0.06);
  if (o.arco) {
    por(matM, meioDisco(w / 2 + m, 0, h, 0.083), corM);
    por(miolo, meioDisco(w / 2, 0, h, 0.088), corV, 0.06);
  }
  const topo = o.arco ? h + w / 2 + m : h + m;
  if (o.peitoril !== false) por(matM, bloco(w + m * 3, 0.1, 0.2, 0, -0.1, 0.1), corM);
  if (o.sobreverga === "reta") por(matM, bloco(w + m * 4, 0.15, 0.18, 0, topo, 0.09), corM);
  else if (o.sobreverga === "triangulo") {
    por(matM, bloco(w + m * 4, 0.12, 0.18, 0, topo, 0.09), corM);
    por(matM, triangulo(w + m * 4, 0.42, 0, topo + 0.12, 0.17), corM);
  } else if (o.sobreverga === "chave") por(matM, bloco(0.26, 0.34, 0.14, 0, topo - 0.2, 0.08), corM);
  if (o.veneziana) {
    for (const lado of [-1, 1]) por("madeira", bloco(w / 2, h * 0.97, 0.05, lado * (w / 2 + m + w / 4), 0, 0.03), o.veneziana, 0.08);
  }
  if (o.grade) {
    const n = Math.max(3, Math.round(w / 0.17));
    for (let i = 1; i < n; i++) por("ferro", quad(0.035, h, -w / 2 + (i * w) / n, 0, 0.12), "#26231f", 0.02);
    por("ferro", quad(w, 0.04, 0, h * 0.5, 0.121), "#26231f", 0.02);
  }
  if (o.trelica) {
    for (const t of [-1 / 3, 1 / 3]) por("madeira-escura", quad(0.06, h, t * w, 0, 0.1), o.trelica, 0.04);
    for (const t of [0.33, 0.66]) por("madeira-escura", quad(w, 0.06, 0, t * h, 0.101), o.trelica, 0.04);
  }
}

/** Porta fechada leve: moldura, folha e, se `arco`, bandeira de vidro em cima. */
export function portaLeve(obra: Obra, f: Face, L: number, F: number, u: number, w: number, h: number, cor: THREE.ColorRepresentation, moldura: THREE.ColorRepresentation = "#ece4d2", arco = false, materialDaMoldura: NomeMaterial = "reboco") {
  const m = 0.15;
  const por = (mat: NomeMaterial, g: THREE.BufferGeometry, c: THREE.ColorRepresentation, variacao = 0.05) => obra.por(mat, naFace(g, f, L, F, u, 0), c, variacao, 0);
  por(materialDaMoldura, bloco(w + m * 2, h + m, 0.1, 0, 0, 0.05), moldura);
  por("madeira", bloco(w, h, 0.05, 0, 0, 0.1), cor, 0.08);
  // Almofadas: duas folhas com o rebaixo mais escuro.
  por("madeira", quad(0.05, h * 0.94, 0, 0, 0.126), "#1e1610");
  if (arco) {
    por(materialDaMoldura, meioDisco(w / 2 + m, 0, h, 0.103), moldura);
    por("vidro", meioDisco(w / 2 - 0.02, 0, h, 0.108), "#2a3236");
  }
}

/** Sacada barata: laje de cantaria, corrimão e barras de ferro numa face só. */
export function sacadaLeve(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, prof = 0.65, corFerro: THREE.ColorRepresentation = "#25221e", corLaje: THREE.ColorRepresentation = "#c9c0ae", espaco = 0.17) {
  const por = (mat: NomeMaterial, g: THREE.BufferGeometry, c: THREE.ColorRepresentation, variacao = 0.03) => obra.por(mat, naFace(g, f, L, F, u, y), c, variacao, 0);
  por("cantaria", bloco(w, 0.14, prof, 0, -0.14, prof / 2), corLaje);
  por("ferro", bloco(w, 0.05, 0.06, 0, 0.92, prof - 0.03), corFerro);
  for (const s of [-1, 1]) por("ferro", bloco(0.05, 0.05, prof, s * (w / 2 - 0.025), 0.92, prof / 2), corFerro);
  const n = Math.max(4, Math.round(w / espaco));
  for (let i = 0; i <= n; i++) por("ferro", quad(0.028, 0.92, -w / 2 + (i * w) / n, 0, prof - 0.02), corFerro, 0.02);
  por("ferro", quad(w, 0.05, 0, 0.12, prof - 0.015), corFerro, 0.02);
}

/** Balaustrada de platibanda: pilaretes, corrimão e balaústres numa face só (de rua). */
export function balaustrada(obra: Obra, f: Face, L: number, F: number, comprimento: number, y: number, h: number, cor: THREE.ColorRepresentation) {
  const por = (g: THREE.BufferGeometry, variacao = 0.04) => obra.por("reboco", naFace(g, f, L, F, 0, y), cor, variacao, 0);
  por(bloco(comprimento, 0.16, 0.42, 0, 0, -0.21));
  por(bloco(comprimento + 0.1, 0.16, 0.5, 0, h - 0.16, -0.21));
  const vaos = Math.max(1, Math.round(comprimento / 2.6));
  for (let i = 0; i <= vaos; i++) por(bloco(0.42, h, 0.46, -comprimento / 2 + (i * comprimento) / vaos, 0, -0.21));
  const n = Math.floor(comprimento / 0.3);
  for (let i = 0; i < n; i++) {
    const x = -comprimento / 2 + (i + 0.5) * (comprimento / n);
    por(quad(0.13, h - 0.32, x, 0.16, 0.0), 0.03);
  }
}

/** Pinha (urna) sobre pilarete de platibanda. */
export function pinha(obra: Obra, x: number, y: number, z: number, cor: THREE.ColorRepresentation) {
  obra.por("reboco", bloco(0.42, 0.22, 0.42, x, y, z), cor, 0.04, 0);
  const g = new THREE.OctahedronGeometry(0.24).scale(1, 1.5, 1).translate(x, y + 0.22 + 0.36, z);
  obra.por("reboco", g, cor, 0.04, 0);
}

/** Lanterna oriental de papel pendurada (vermelha ou amarela). */
export function lanterna(obra: Obra, x: number, y: number, z: number, cor: THREE.ColorRepresentation) {
  obra.por("lona", bloco(0.38, 0.5, 0.38, x, y, z).rotateY(0), cor, 0.06, 0);
  obra.por("madeira-escura", bloco(0.26, 0.06, 0.26, x, y + 0.5, z), "#2a1e16", 0.03, 0);
  obra.por("madeira-escura", bloco(0.26, 0.06, 0.26, x, y - 0.06, z), "#2a1e16", 0.03, 0);
  obra.por("ferro", bloco(0.02, 0.4, 0.02, x, y + 0.56, z), "#2a2622", 0.02, 0);
}

/** Rodapé (embasamento) em volta do prédio, aberto no vão de porta do entrável. */
export function rodape(obra: Obra, L: number, F: number, h: number, material: NomeMaterial, cor: THREE.ColorRepresentation, vaoDaPorta = 0) {
  const s = 0.05;
  if (!vaoDaPorta) {
    obra.por(material, bloco(L + s * 2, h, F + s * 2, 0, 0, 0), cor, 0.05, 0.3);
    return;
  }
  obra.por(material, bloco(L + s * 2, h, F - 0.2, 0, 0, -0.1 - s), cor, 0.05, 0.3);
  const lado = (L - vaoDaPorta) / 2;
  for (const k of [-1, 1]) obra.por(material, bloco(lado + s, h, 0.4, k * (vaoDaPorta / 2 + lado / 2 + s / 2), 0, F / 2 - 0.2 + s), cor, 0.05, 0.3);
}

/** Varanda de ferro fundido: laje, colunas finas, cobertura de zinco curva e lambrequim. */
export function varandaDeFerro(obra: Obra, telhado: Obra, f: Face, L: number, F: number, u: number, comprimento: number, prof: number, alto: number, cor: { ferro: THREE.ColorRepresentation; zinco: THREE.ColorRepresentation; lambrequim: THREE.ColorRepresentation; piso: THREE.ColorRepresentation }, livreNoMeio = false) {
  const por = (o: Obra, mat: NomeMaterial, g: THREE.BufferGeometry, c: THREE.ColorRepresentation, variacao = 0.04) => o.por(mat, naFace(g, f, L, F, u, 0), c, variacao, 0);
  por(obra, "cantaria", bloco(comprimento, 0.3, prof, 0, 0, prof / 2), cor.piso, 0.06);
  // Número ímpar de vãos: nunca há coluna no meio (a porta fica livre).
  let n = Math.max(1, Math.round(comprimento / 2.8));
  if (n % 2 === 0) n += 1;
  while (livreNoMeio && n > 1 && (comprimento - 0.3) / n < 4.6) n -= 2;
  for (let i = 0; i <= n; i++) {
    const x = -comprimento / 2 + 0.15 + (i * (comprimento - 0.3)) / n;
    por(obra, "ferro", cilindro(0.07, 0.07, alto, 5, x, 0.3, prof - 0.2), cor.ferro, 0.02);
  }
  por(obra, "ferro", bloco(comprimento, 0.14, 0.12, 0, alto + 0.3, prof - 0.2), cor.ferro, 0.02);
  // Zinco em curva suave: três faixas.
  const y0 = alto + 0.44;
  const pts = [v(-comprimento / 2, y0 + 0.75, 0), v(comprimento / 2, y0 + 0.75, 0)];
  const perfis: [number, number][] = [[prof * 0.45, y0 + 0.62], [prof * 0.8, y0 + 0.36], [prof + 0.15, y0]];
  for (const [z, y] of perfis) pts.push(v(-comprimento / 2, y, z), v(comprimento / 2, y, z));
  const tris: number[] = [];
  for (let i = 0; i < 3; i++) {
    const a = i * 2;
    tris.push(a, a + 2, a + 3, a, a + 3, a + 1);
  }
  por(telhado, "ferro", malha(pts, tris), cor.zinco, 0.08);
  por(obra, "madeira", quad(comprimento, 0.32, 0, y0 - 0.32, prof + 0.15), cor.lambrequim, 0.05);
}

/**
 * Perfil (de +x para -x, por cima) extrudado de `zf` para trás `d`: frontão triangular,
 * curvo, ático, empena escalonada. Face da frente em leque a partir de (0, y0).
 */
export function perfilExtrudado(perfil: [number, number][], y0: number, zf: number, d: number) {
  const n = perfil.length;
  const pts: THREE.Vector3[] = [v(0, y0, zf), v(0, y0, zf - d)];
  for (const [x, y] of perfil) pts.push(v(x, y0 + y, zf));
  for (const [x, y] of perfil) pts.push(v(x, y0 + y, zf - d));
  const f = (i: number) => 2 + i;
  const b = (i: number) => 2 + n + i;
  const tris: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    tris.push(0, f(i), f(i + 1));
    tris.push(1, b(i + 1), b(i));
    tris.push(f(i), b(i), b(i + 1), f(i), b(i + 1), f(i + 1));
  }
  return malha(pts, tris);
}

/** Perfil de meio arco achatado (frontão curvo, bandeira de portão). */
export function perfilArco(w: number, alto: number, lados = 6): [number, number][] {
  return Array.from({ length: lados + 1 }, (_, i) => {
    const a = (i / lados) * Math.PI;
    return [Math.cos(a) * (w / 2), Math.sin(a) * alto] as [number, number];
  });
}

/** Disco de frente (óculo, relógio): dois meios discos. */
export function disco(obra: Obra, material: NomeMaterial, f: Face, L: number, F: number, u: number, y: number, raio: number, cor: THREE.ColorRepresentation, afasta = 0.1, lados = 6) {
  obra.por(material, naFace(meioDisco(raio, 0, 0, afasta, lados), f, L, F, u, y), cor, 0.03, 0);
  obra.por(material, naFace(meioDisco(raio, 0, 0, afasta, lados).rotateZ(Math.PI), f, L, F, u, y), cor, 0.03, 0);
}

/** Abóbada de berço com eixo em z (a curva aparece na fachada), beiral `b`. */
export function abobada(L: number, F: number, base: number, flecha: number, b = 0.4, lados = 8) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= lados; i++) {
    const x = -L / 2 - b + ((L + 2 * b) * i) / lados;
    const y = base + flecha * Math.sin((Math.PI * i) / lados);
    pts.push(v(x, y, F / 2 + b), v(x, y, -F / 2 - b));
  }
  const tris: number[] = [];
  for (let i = 0; i < lados; i++) {
    const [a, bb, a2, b2] = [i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 3];
    tris.push(a, a2, b2, a, b2, bb);
  }
  return malha(pts, tris);
}

/** Tímpano da abóbada (meia-lua na fachada), virado para +z em zf. */
export function timpano(L: number, base: number, flecha: number, zf: number, lados = 8, paraTras = false) {
  const pts = [v(0, base, zf)];
  for (let i = 0; i <= lados; i++) pts.push(v(-L / 2 + (L * i) / lados, base + flecha * Math.sin((Math.PI * i) / lados), zf));
  const tris: number[] = [];
  for (let i = 1; i <= lados; i++) tris.push(...(paraTras ? [0, i, i + 1] : [0, i + 1, i]));
  return malha(pts, tris);
}
