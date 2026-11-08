// Peças exclusivas de Araguari (estilo mineração): viga entre dois pontos, roda de poço,
// fita de luto, lampião, vagonete com trilho, monte de carvão, chaminé suja, frontão
// barroco recortado e cúpula em bulbo. Tudo no referencial do prédio, UV em metros.

import * as THREE from "three";
import { bloco, caixa, malha, naFace, Obra, type Face } from "../kit";

const METROS_POR_UV = 2;
export const PRETO_LUTO = "#141312";

/** Viga quadrada de seção `e` ligando dois pontos (perna de cavalete, mão-francesa, cabo). */
export function viga(a: THREE.Vector3, b: THREE.Vector3, e: number) {
  const d = b.clone().sub(a);
  const g = caixa(e, d.length(), e);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  const m = a.clone().add(b).multiplyScalar(0.5);
  return g.translate(m.x, m.y, m.z);
}

/** Roda de poço (polia do cavalete) no plano yz, eixo em x. */
export function roda(obra: Obra, x: number, y: number, z: number, raio: number, cor: THREE.ColorRepresentation, raios = 4, lados = 12) {
  obra.por("ferro", new THREE.TorusGeometry(raio, Math.max(0.06, raio * 0.07), 4, lados).rotateY(Math.PI / 2).translate(x, y, z), cor, 0.04, 0);
  for (let i = 0; i < raios; i++) {
    const g = caixa(0.06, raio * 2, 0.08).rotateX((i * Math.PI) / raios);
    obra.por("ferro", g.translate(x, y, z), cor, 0.04, 0);
  }
  obra.por("ferro", new THREE.CylinderGeometry(raio * 0.14, raio * 0.14, 0.3, 6).rotateZ(Math.PI / 2).translate(x, y, z), cor, 0.04, 0);
}

/**
 * Fita de luto sobre um vão: faixa de crepe preto, laço no meio e duas pontas caídas.
 * `y` é o alto do vão; `w` a largura dele.
 */
export function luto(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number) {
  obra.por("lona", naFace(bloco(w + 0.3, 0.3, 0.04, 0, 0, 0.16), f, L, F, u, y + 0.1), PRETO_LUTO, 0.05, 0);
  // Laço: duas orelhas inclinadas e o nó.
  for (const s of [-1, 1]) obra.por("lona", naFace(caixa(0.6, 0.32, 0.05).rotateZ(s * 0.45).translate(s * 0.28, 0.26, 0.2), f, L, F, u, y), PRETO_LUTO, 0.05, 0);
  obra.por("lona", naFace(bloco(0.14, 0.18, 0.08, 0, 0.14, 0.2), f, L, F, u, y), PRETO_LUTO, 0.05, 0);
  // Pontas caídas do laço.
  for (const s of [-1, 1]) obra.por("lona", naFace(caixa(0.16, 1.1, 0.03).rotateZ(s * 0.14).translate(s * 0.14, -0.4, 0.2), f, L, F, u, y), PRETO_LUTO, 0.05, 0);
}

/** Crepe em festões ao longo de uma fachada (igreja, escritório): faixa com caídas em V. */
export function festoes(obra: Obra, L: number, F: number, y: number, comprimento: number, n: number) {
  const z = F / 2 + 0.32;
  const v = (x: number, yy: number, dz = 0) => new THREE.Vector3(x, yy, z + dz);
  const passo = comprimento / n;
  for (let i = 0; i < n; i++) {
    const x0 = -comprimento / 2 + i * passo;
    const x1 = x0 + passo;
    const pts = [v(x0, y), v(x1, y), v((x0 + x1) / 2, y - passo * 0.32), v(x0, y - 0.18), v(x1, y - 0.18)];
    obra.por("lona", malha(pts, [0, 3, 2, 0, 2, 1, 1, 2, 4]), PRETO_LUTO, 0.05, 0);
  }
  for (const s of [-1, 1]) obra.por("lona", bloco(0.25, 2.4, 0.04, s * (comprimento / 2), y - 2.4, z - 0.02), PRETO_LUTO, 0.05, 0);
}

/** Lampião de ferro na parede, com vidro aceso (âmbar). */
export function lampiao(obra: Obra, f: Face, L: number, F: number, u: number, y: number) {
  obra.por("ferro", naFace(bloco(0.05, 0.05, 0.45, 0, 0.3, 0.22), f, L, F, u, y), "#232120", 0.03, 0);
  obra.por("vidro", naFace(bloco(0.2, 0.3, 0.2, 0, 0, 0.45), f, L, F, u, y), "#e2a24a", 0.05, 0);
  obra.por("ferro", naFace(bloco(0.26, 0.06, 0.26, 0, 0.3, 0.45), f, L, F, u, y), "#232120", 0.03, 0);
}

/** Chaminé de tijolo com a boca preta de fuligem. */
export function chamineSuja(obra: Obra, x: number, z: number, base: number, altura: number, largura = 0.6) {
  obra.por("tijolo", bloco(largura, altura, largura, x, base, z), "#5c4237", 0.1, 0);
  obra.por("tijolo", bloco(largura + 0.15, 0.15, largura + 0.15, x, base + altura - 0.5, z), "#4a3630", 0.1, 0);
  obra.por("tijolo", bloco(largura + 0.02, 0.35, largura + 0.02, x, base + altura - 0.35, z), "#1e1b19", 0.06, 0);
}

/** Chaminé redonda alta de casa de máquinas, afunilando. */
export function chamineAlta(obra: Obra, x: number, z: number, altura: number, raio = 0.9) {
  obra.por("tijolo", bloco(raio * 2.6, 1.6, raio * 2.6, x, 0, z), "#4e3a32", 0.08, 0.2);
  obra.por("tijolo", new THREE.CylinderGeometry(raio * 0.7, raio, altura - 1.6, 8, 1, true).translate(x, 1.6 + (altura - 1.6) / 2, z), "#5c4034", 0.1, 0);
  obra.por("tijolo", new THREE.CylinderGeometry(raio * 0.85, raio * 0.78, 0.6, 8, 1, true).translate(x, altura - 0.3, z), "#1c1918", 0.05, 0);
}

/** Monte de carvão (cone torto e baixo). */
export function monteDeCarvao(obra: Obra, x: number, z: number, raio: number, altura: number, giro = 0) {
  const g = new THREE.ConeGeometry(raio, altura, 7, 1).rotateY(giro).scale(1, 1, 0.8).translate(x, altura / 2 - 0.05, z);
  obra.por("carvao", g, "#1d1c1b", 0.12, 0);
}

/** Trilho de mina (dois trilhos e dormentes) de `z0` a `z1` em x. */
export function trilho(obra: Obra, x: number, z0: number, z1: number, cor = "#3a3430") {
  const c = Math.abs(z1 - z0);
  const zc = (z0 + z1) / 2;
  for (const s of [-1, 1]) obra.por("ferro", bloco(0.07, 0.1, c, x + s * 0.35, 0.12, zc), cor, 0.05, 0);
  for (let i = 0; i < Math.floor(c / 0.9); i++) obra.por("madeira-escura", bloco(1.1, 0.12, 0.18, x, 0, Math.min(z0, z1) + 0.4 + i * 0.9), "#2e2620", 0.1, 0);
}

/** Vagonete de ferro cheio de carvão, sobre o trilho. */
export function vagonete(obra: Obra, x: number, z: number, giro = 0) {
  const g = (geo: THREE.BufferGeometry) => geo.rotateY(giro).translate(x, 0, z);
  obra.por("ferro", g(bloco(0.95, 0.7, 1.4, 0, 0.35, 0)), "#3b3632", 0.08, 0);
  obra.por("carvao", g(bloco(0.85, 0.2, 1.3, 0, 1.0, 0)), "#1a1918", 0.1, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) obra.por("ferro", g(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 6).rotateZ(Math.PI / 2).translate(sx * 0.42, 0.22, sz * 0.45)), "#222", 0.04, 0);
}

/** Frontão barroco recortado, com volutas, extrudado. `base` é a altura do pé; centro em x = 0. */
export function frontao(largura: number, alto: number, profundidade = 0.5) {
  const w = largura / 2;
  const s = new THREE.Shape();
  s.moveTo(-w, 0);
  s.lineTo(w, 0);
  s.lineTo(w, 0.9);
  s.quadraticCurveTo(w * 0.62, 0.95, w * 0.5, alto * 0.42);
  s.quadraticCurveTo(w * 0.38, alto * 0.62, w * 0.24, alto * 0.7);
  s.quadraticCurveTo(w * 0.22, alto + 0.6, 0, alto + 0.9);
  s.quadraticCurveTo(-w * 0.22, alto + 0.6, -w * 0.24, alto * 0.7);
  s.quadraticCurveTo(-w * 0.38, alto * 0.62, -w * 0.5, alto * 0.42);
  s.quadraticCurveTo(-w * 0.62, 0.95, -w, 0.9);
  s.lineTo(-w, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: profundidade, bevelEnabled: false, curveSegments: 4 });
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / METROS_POR_UV, uv.getY(i) / METROS_POR_UV);
  return g;
}

/** Cúpula em bulbo (pinha) para a torre da matriz. */
export function bulbo(lado: number, lados = 8) {
  const r = lado / 2;
  const perfil = [
    [r * 1.05, 0],
    [r * 1.12, 0.35],
    [r * 0.95, r * 0.9],
    [r * 0.45, r * 1.5],
    [0.14, r * 1.85],
    [0.22, r * 2.0],
    [0.01, r * 2.2],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(perfil, lados);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.PI * lado) / METROS_POR_UV, (uv.getY(i) * r * 2.4) / METROS_POR_UV);
  return g;
}

/** Escorrido de fuligem e chuva descendo do peitoril. */
export function escorrido(obra: Obra, f: Face, L: number, F: number, u: number, yTopo: number, w: number, h: number, cor: THREE.ColorRepresentation) {
  if (h <= 0.2) return;
  obra.por("reboco", naFace(bloco(w, h, 0.02, 0, 0, 0.012), f, L, F, u, yTopo - h), cor, 0.18, 0);
}

/** Anel de painéis verticais (parede de lona do circo), em duas cores alternadas, com vão em +z. */
export function anelDeLona(raio: number, y0: number, y1: number, n: number, vaoMeio: number, cores: [THREE.ColorRepresentation, THREE.ColorRepresentation], obra: Obra, dupla = true) {
  const d = (Math.PI * 2) / n;
  const pts: THREE.Vector3[][] = [[], []];
  const tris: number[][] = [[], []];
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI + i * d;
    const a1 = a0 + d;
    const meio = (a0 + a1) / 2;
    if (Math.abs(meio) < vaoMeio) continue;
    const k = i % 2;
    const b = pts[k].length;
    const p = (a: number, y: number) => new THREE.Vector3(Math.sin(a) * raio, y, Math.cos(a) * raio);
    pts[k].push(p(a0, y0), p(a1, y0), p(a1, y1), p(a0, y1));
    tris[k].push(b, b + 1, b + 2, b, b + 2, b + 3);
    if (dupla) tris[k].push(b, b + 2, b + 1, b, b + 3, b + 2);
  }
  for (const k of [0, 1]) if (tris[k].length) obra.por("lona", malha(pts[k], tris[k]), cores[k], 0.08, 0);
}

/** Cobertura cônica listrada (de r0 em y0 até r1 em y1), duas cores alternadas. */
export function coneListrado(r0: number, y0: number, r1: number, y1: number, n: number, cores: [THREE.ColorRepresentation, THREE.ColorRepresentation], obra: Obra, dupla = true, material: "lona" = "lona") {
  const d = (Math.PI * 2) / n;
  const pts: THREE.Vector3[][] = [[], []];
  const tris: number[][] = [[], []];
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI + i * d;
    const a1 = a0 + d;
    const k = i % 2;
    const b = pts[k].length;
    const p = (a: number, r: number, y: number) => new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
    pts[k].push(p(a0, r0, y0), p(a1, r0, y0), p(a1, r1, y1), p(a0, r1, y1));
    tris[k].push(b, b + 1, b + 2, b, b + 2, b + 3);
    if (dupla) tris[k].push(b, b + 2, b + 1, b, b + 3, b + 2);
  }
  for (const k of [0, 1]) obra.por(material, malha(pts[k], tris[k]), cores[k], 0.08, 0);
}
