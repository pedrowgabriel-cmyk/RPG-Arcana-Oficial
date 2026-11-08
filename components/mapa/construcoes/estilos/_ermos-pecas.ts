// Peças dos ermos: tora roliça, parede de toras cruzadas, tabuado com mata-juntas, sacos de
// terra, cipó, fogueira, caixote, barril, lenha, cerca, escada e cobertura com neve.
// Tudo com UV em metros (1 unidade = 2 m), no referencial do prédio (fachada em +z).

import * as THREE from "three";
import { bolha, caminho, deformar, nevar, tubo } from "../../natureza/ferramentas";
import type { NomeMaterial } from "../../natureza/tipos";
import { aoLongo, bloco, empenas, naFace, Obra, telhado, type Face, type TipoTelhado } from "../kit";

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Tora roliça de `a` a `b`, com tampas (o topo cortado aparece nas quinas). */
export function tora(a: THREE.Vector3, b: THREE.Vector3, raio: number, lados = 6, tampas = true) {
  const len = Math.max(0.01, a.distanceTo(b));
  const g = new THREE.CylinderGeometry(raio, raio * 0.94, len, lados, 1, !tampas);
  const uv = g.attributes.uv;
  const torso = 2 * (lados + 1);
  for (let i = 0; i < uv.count; i++) {
    if (i < torso) uv.setXY(i, (uv.getX(i) * Math.PI * raio * 2) / 2, (uv.getY(i) * len) / 2);
    else uv.setXY(i, uv.getX(i) * raio, uv.getY(i) * raio);
  }
  const dir = b.clone().sub(a).normalize();
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir));
  const m = a.clone().add(b).multiplyScalar(0.5);
  return g.translate(m.x, m.y, m.z);
}

/** Esteio de pau roliço, do chão (ou de `y0`) até `y1`. */
export function esteio(obra: Obra, x: number, z: number, y0: number, y1: number, raio: number, cor: THREE.ColorRepresentation, material: NomeMaterial = "casca", inclina = 0) {
  obra.por(material, tora(V(x, y0, z), V(x + inclina, y1, z), raio, 6, true), cor, 0.1, 0.2);
}

/**
 * Parede de toras com as pontas cruzadas nas quinas (o desenho do rancho de serra).
 * O miolo, um pouco recuado, faz o barro entre as toras. As pontas ficam dentro da planta.
 */
export function paredeDeToras(
  obra: Obra,
  L: number,
  F: number,
  A: number,
  cores: { tora: THREE.ColorRepresentation; barro: THREE.ColorRepresentation },
  vao?: { largura: number; altura: number },
  raio = 0.2,
  r: () => number = () => 0.5,
) {
  const recuo = raio * 1.3;
  const [lx, lz] = [L / 2 - recuo, F / 2 - recuo];
  // Miolo (o barro entre as toras), um pouco para dentro.
  const Lm = L - recuo * 2 - raio * 0.6;
  const Fm = F - recuo * 2 - raio * 0.6;
  if (!vao) obra.por("reboco", bloco(Lm, A, Fm, 0, 0, 0), cores.barro, 0.08, 0.2);
  else {
    const e = 0.3;
    obra.por("reboco", bloco(Lm, A, e, 0, 0, -Fm / 2 + e / 2), cores.barro, 0.08, 0.2);
    for (const s of [-1, 1]) obra.por("reboco", bloco(e, A, Fm - e * 2, s * (Lm / 2 - e / 2), 0, 0), cores.barro, 0.08, 0.2);
    const lado = (Lm - vao.largura) / 2;
    for (const s of [-1, 1]) obra.por("reboco", bloco(lado, A, e, s * (vao.largura / 2 + lado / 2), 0, Fm / 2 - e / 2), cores.barro, 0.08, 0.2);
    obra.por("reboco", bloco(vao.largura, A - vao.altura, e, 0, vao.altura, Fm / 2 - e / 2), cores.barro, 0.08, 0.2);
  }
  const passo = raio * 1.9;
  const n = Math.max(2, Math.floor(A / passo));
  const cor = new THREE.Color(cores.tora);
  for (let i = 0; i < n; i++) {
    const tom = cor.clone().multiplyScalar(0.9 + r() * 0.2);
    const yf = raio + i * passo;
    const yl = yf + passo / 2;
    // Frente e fundos (em x), com o vão da porta cortando as de baixo.
    for (const s of [-1, 1]) {
      const z = s * lz;
      if (s > 0 && vao && yf - raio < vao.altura) {
        obra.por("casca", tora(V(-L / 2, yf, z), V(-vao.largura / 2, yf, z), raio, 5), tom, 0.08, 0);
        obra.por("casca", tora(V(vao.largura / 2, yf, z), V(L / 2, yf, z), raio, 5), tom, 0.08, 0);
      } else obra.por("casca", tora(V(-L / 2, yf, z), V(L / 2, yf, z), raio, 5), tom, 0.08, 0);
    }
    if (yl + raio > A + raio) continue;
    for (const s of [-1, 1]) obra.por("casca", tora(V(s * lx, yl, -F / 2), V(s * lx, yl, F / 2), raio, 5), tom, 0.08, 0);
  }
}

/**
 * Tabuado: parede de tábua com mata-juntas. `torto` inclina e desalinha as ripas (casa podre);
 * as ripas pulam o vão da porta.
 */
export function tabuado(
  obra: Obra,
  L: number,
  F: number,
  A: number,
  cores: { tabua: THREE.ColorRepresentation; ripa: THREE.ColorRepresentation },
  r: () => number,
  vao?: { largura: number; altura: number },
  opcoes: { espaco?: number; torto?: number; material?: NomeMaterial; faces?: Face[] } = {},
) {
  const mat = opcoes.material ?? "madeira";
  const torto = opcoes.torto ?? 0;
  const e = 0.25;
  const pecas: THREE.BufferGeometry[] = [];
  if (!vao) pecas.push(bloco(L, A, F, 0, 0, 0));
  else {
    pecas.push(bloco(L, A, e, 0, 0, -F / 2 + e / 2));
    for (const s of [-1, 1]) pecas.push(bloco(e, A, F - e * 2, s * (L / 2 - e / 2), 0, 0));
    const lado = (L - vao.largura) / 2;
    for (const s of [-1, 1]) pecas.push(bloco(lado, A, e, s * (vao.largura / 2 + lado / 2), 0, F / 2 - e / 2));
    pecas.push(bloco(vao.largura, A - vao.altura, e, 0, vao.altura, F / 2 - e / 2));
  }
  for (const g of pecas) obra.por(mat, torto ? deformar(g, (v) => (v.x += v.y * torto * 0.04)) : g, cores.tabua, 0.1, 0.25);
  const espaco = opcoes.espaco ?? 1.1;
  const cor = new THREE.Color(cores.ripa);
  for (const f of opcoes.faces ?? (["frente", "fundos", "esquerda", "direita"] as Face[])) {
    const comp = f === "frente" || f === "fundos" ? L : F;
    for (const u of aoLongo(comp, Math.max(2, Math.floor(comp / espaco)), 0.15)) {
      if (f === "frente" && vao && Math.abs(u) < vao.largura / 2 + 0.1) continue;
      const h = A * (1 - (torto ? r() * 0.12 : 0));
      const g = naFace(bloco(0.1, h, 0.05, 0, 0, 0.025), f, L, F, u, 0);
      obra.por(mat, torto ? deformar(g, (v) => (v.x += v.y * torto * 0.04 + (r() - 0.5) * 0.02 * torto)) : g, cor.clone().multiplyScalar(0.85 + r() * 0.3), 0.08, 0);
    }
  }
}

/** Fileiras de sacos de terra ao longo de uma face, do lado de dentro da planta. */
export function sacos(obra: Obra, f: Face, L: number, F: number, comprimento: number, fileiras: number, r: () => number, cor: THREE.ColorRepresentation, vao = 0) {
  const comp = 1.3;
  for (let k = 0; k < fileiras; k++) {
    const desloca = (k % 2) * comp * 0.5;
    const n = Math.floor(comprimento / comp);
    for (let i = 0; i < n; i++) {
      const u = -comprimento / 2 + comp / 2 + i * comp + desloca - (k % 2 ? comp * 0.25 : 0);
      if (Math.abs(u) > comprimento / 2 - comp * 0.3) continue;
      if (vao && Math.abs(u) < vao / 2 + comp * 0.4) continue;
      const g = bloco(comp * (0.9 + r() * 0.08), 0.32, 0.6, 0, 0, -0.32);
      g.rotateY((r() - 0.5) * 0.12);
      obra.por("lona", naFace(g, f, L, F, u, k * 0.3), new THREE.Color(cor).multiplyScalar(0.85 + r() * 0.3), 0.1, 0.15);
    }
  }
}

/** Cipó subindo de `de` a `para`, com tufos de folha. */
export function cipo(obra: Obra, de: THREE.Vector3, para: THREE.Vector3, r: () => number, semente: number, folhas = 3) {
  const pts = caminho(de, para, 5, 0.5, r);
  obra.por("casca", tubo(pts, pts.map((_, i) => 0.07 - i * 0.008), 4), "#4c4a2c", 0.12, 0);
  for (let i = 0; i < folhas; i++) {
    const p = pts[1 + Math.floor(r() * (pts.length - 1))];
    obra.por("folhagem", bolha(0.35 + r() * 0.3, 0, 0.35, semente + i, 0.7).translate(p.x, p.y, p.z), r() < 0.5 ? "#3f5a2a" : "#4a6230", 0.15, 0);
  }
}

/** Orelhas-de-pau: fungos em prateleira grudados num esteio ou parede. */
export function orelhas(obra: Obra, x: number, y: number, z: number, n: number, r: () => number, semente: number, cor: THREE.ColorRepresentation = "#c8b48a") {
  for (let i = 0; i < n; i++) {
    const g = bolha(0.22 + r() * 0.18, 0, 0.2, semente + i, 0.35);
    obra.por("cogumelo", g.translate(x + (r() - 0.5) * 0.4, y + i * 0.35, z + (r() - 0.5) * 0.4), cor, 0.12, 0);
  }
}

/** Fogueira: roda de pedras, tições cruzados e o carvão no meio. */
export function fogueira(obra: Obra, x: number, z: number, r: () => number, semente: number) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    obra.por("pedra", bolha(0.22, 0, 0.3, semente + i, 0.7).translate(x + Math.cos(a) * 0.7, 0.1, z + Math.sin(a) * 0.7), "#6d6a62", 0.12, 0);
  }
  obra.por("carvao", bloco(1.0, 0.06, 1.0, x, 0, z), "#2a2420", 0.1, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI + r() * 0.4;
    obra.por("casca", tora(V(x - Math.cos(a) * 0.55, 0.08, z - Math.sin(a) * 0.55), V(x + Math.cos(a) * 0.55, 0.12, z + Math.sin(a) * 0.55), 0.07, 5), "#3a2c20", 0.1, 0);
  }
}

export function caixote(obra: Obra, x: number, y: number, z: number, lado: number, giro: number, cor: THREE.ColorRepresentation = "#7a6040") {
  obra.por("madeira", bloco(lado, lado * 0.75, lado * 0.8, 0, 0, 0).rotateY(giro).translate(x, y, z), cor, 0.1, 0);
  obra.por("madeira-escura", bloco(lado + 0.04, 0.06, lado * 0.8 + 0.04, 0, lado * 0.75 - 0.06, 0).rotateY(giro).translate(x, y, z), "#4a3826", 0.08, 0);
}

export function barril(obra: Obra, x: number, z: number, cor: THREE.ColorRepresentation = "#6a4e34", altura = 1.0) {
  obra.por("madeira", new THREE.CylinderGeometry(0.34, 0.3, altura, 8).translate(x, altura / 2, z), cor, 0.08, 0.1);
  for (const y of [0.2, altura - 0.2]) obra.por("ferro", new THREE.CylinderGeometry(0.355, 0.355, 0.05, 8, 1, true).translate(x, y, z), "#3a3632", 0.04, 0);
}

/** Pilha de lenha encostada (toras curtas de topo para fora). */
export function lenha(obra: Obra, x: number, z: number, comprimento: number, fileiras: number, r: () => number, giro = 0) {
  const raio = 0.16;
  const n = Math.max(2, Math.floor(comprimento / (raio * 2.1)));
  for (let k = 0; k < fileiras; k++) {
    for (let i = 0; i < n - (k % 2); i++) {
      const u = -comprimento / 2 + raio + i * raio * 2.1 + (k % 2) * raio;
      const p = V(u, raio + k * raio * 1.8, 0).applyAxisAngle(V(0, 1, 0), giro);
      const d = V(0, 0, 0.45).applyAxisAngle(V(0, 1, 0), giro);
      obra.por("casca", tora(p.clone().sub(d).add(V(x, 0, z)), p.clone().add(d).add(V(x, 0, z)), raio * (0.85 + r() * 0.3), 5), "#6a5038", 0.12, 0);
    }
  }
}

/** Cerca de pau a pique: mourões e duas ou três varas, de `a` a `b`. */
export function cerca(obra: Obra, a: THREE.Vector3, b: THREE.Vector3, r: () => number, cor: THREE.ColorRepresentation = "#5e4a36", varas = 2, altura = 1.3) {
  const len = a.distanceTo(b);
  const n = Math.max(1, Math.round(len / 2.4));
  for (let i = 0; i <= n; i++) {
    const p = a.clone().lerp(b, i / n);
    obra.por("casca", tora(V(p.x, 0, p.z), V(p.x + (r() - 0.5) * 0.08, altura + 0.15, p.z), 0.08, 5), cor, 0.12, 0.2);
  }
  for (let k = 0; k < varas; k++) {
    const y = altura * (0.4 + (k * 0.55) / Math.max(1, varas - 1));
    obra.por("casca", tora(V(a.x, y, a.z), V(b.x, y + (r() - 0.5) * 0.1, b.z), 0.05, 4, false), cor, 0.12, 0);
  }
}

/** Escada de mão encostada na face. */
export function escadaDeMao(obra: Obra, f: Face, L: number, F: number, u: number, altura: number, cor: THREE.ColorRepresentation = "#6a5038") {
  const incl = 0.25;
  const g: THREE.BufferGeometry[] = [];
  for (const s of [-0.25, 0.25]) g.push(tora(V(s, 0, incl * altura + 0.1), V(s, altura, 0.1), 0.04, 4, false));
  for (let y = 0.3; y < altura; y += 0.35) g.push(bloco(0.5, 0.04, 0.05, 0, y, incl * (altura - y) + 0.1));
  for (const x of g) obra.por("madeira", naFace(x, f, L, F, u, 0), cor, 0.1, 0);
}

/** Porta de tábua com batente de madeira (a moldura do kit é de reboco). */
export function portaDeTabua(obra: Obra, f: Face, L: number, F: number, u: number, w: number, h: number, cor: THREE.ColorRepresentation, aberta = false, y = 0) {
  const m = 0.14;
  for (const [bw, bh, bx, by] of [
    [w + m * 2, m * 1.4, 0, h],
    [m, h, -w / 2 - m / 2, 0],
    [m, h, w / 2 + m / 2, 0],
  ] as const) {
    obra.por("madeira-escura", naFace(bloco(bw, bh, 0.12, bx, by, 0.06), f, L, F, u, y), "#3a2c1e", 0.06, 0);
  }
  if (aberta) return;
  obra.por("madeira", naFace(bloco(w, h, 0.06, 0, 0, 0.03), f, L, F, u, y), cor, 0.1, 0);
  for (const yy of [h * 0.2, h * 0.75]) obra.por("madeira", naFace(bloco(w * 0.95, 0.12, 0.05, 0, yy, 0.08), f, L, F, u, y), cor, 0.1, 0);
}

/**
 * Cobertura de prédio. `empenaNaFrente` gira a duas-águas para a cumeeira correr de frente
 * para os fundos (o oitão olha para a rua). `neve` de 0 a 1 assenta neve nas águas.
 */
export function cobertura(
  t: Obra,
  material: NomeMaterial,
  cor: THREE.ColorRepresentation,
  tipo: TipoTelhado,
  L: number,
  F: number,
  base: number,
  alto: number,
  o: { beiral?: number; espessura?: number; empenaNaFrente?: boolean; neve?: number; x?: number; z?: number } = {},
) {
  const beiral = o.beiral ?? 0.6;
  const esp = o.espessura ?? 0.18;
  const girar = o.empenaNaFrente && tipo === "duas-aguas";
  const gs = girar ? telhado(tipo, F, L, base, alto, beiral, esp).map((g) => g.rotateY(Math.PI / 2)) : telhado(tipo, L, F, base, alto, beiral, esp);
  for (const g of gs) t.por(material, g.translate(o.x ?? 0, 0, o.z ?? 0), cor, 0.12, 0);
  if (o.neve) t.por("neve", nevar(gs[0], o.neve, 0.1), "#eef1f4", 0.03, 0);
}

/** Oitões (triângulos de parede) da duas-águas; com `empenaNaFrente`, na frente e nos fundos. */
export function oitoes(obra: Obra, material: NomeMaterial, cor: THREE.ColorRepresentation, L: number, F: number, base: number, alto: number, empenaNaFrente: boolean, x = 0, z = 0) {
  const gs = empenaNaFrente ? empenas(F, L, base, alto).map((g) => g.rotateY(Math.PI / 2)) : empenas(L, F, base, alto);
  for (const g of gs) obra.por(material, g.translate(x, 0, z), cor, 0.1, 0);
}

/** Bandeira de lona num mastro (cruz de socorro, flâmula de bando). */
export function bandeira(obra: Obra, x: number, z: number, altura: number, cor: THREE.ColorRepresentation, cruz?: THREE.ColorRepresentation) {
  obra.por("casca", tora(V(x, 0, z), V(x, altura, z), 0.06, 5), "#4a3a2a", 0.1, 0);
  const g = deformar(bloco(1.6, 1.0, 0.03, x + 0.82, altura - 1.1, z), (v) => (v.z += Math.sin((v.x - x) * 2.2) * 0.12));
  obra.por("lona", g, cor, 0.1, 0);
  if (cruz) {
    obra.por("lona", bloco(0.9, 0.2, 0.05, x + 0.82, altura - 0.7, z + Math.sin(0.82 * 2.2) * 0.12), cruz, 0.05, 0);
    obra.por("lona", bloco(0.22, 0.7, 0.05, x + 0.82, altura - 0.95, z + Math.sin(0.82 * 2.2) * 0.12), cruz, 0.05, 0);
  }
}
