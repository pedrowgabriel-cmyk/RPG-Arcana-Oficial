// Ferramentas do grupo "frio" (pinheiro, araucária, arbusto de altitude):
// cartão com eixos dados, laje de neve assentada sobre galho, neve pintada por
// vértice para os níveis de longe, sombra por dentro da copa e inclinação de vento.

import * as THREE from "three";
import type { Quadro } from "../atlas";
import { preparar, ruido3 } from "../ferramentas";

export type Lista = { material: import("../tipos").NomeMaterial; geometria: THREE.BufferGeometry }[];

export const CIMA = new THREE.Vector3(0, 1, 0);
const BRANCO_NEVE = [0.9, 0.93, 0.96];

/**
 * Cartão de folhagem com eixos explícitos (meia largura `u`, meia altura `v`).
 * `normal` é a luz que a folha recebe: apontar para fora e para cima da copa dá
 * volume macio. A face da frente é virada para o mesmo lado da normal.
 */
export function quad(centro: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, quadro: Quadro, normal: THREE.Vector3) {
  const n = normal.clone().normalize();
  const uu = u.clone().cross(v).dot(n) < 0 ? u.clone().negate() : u;
  const a = centro.clone().sub(uu).sub(v);
  const b = centro.clone().add(uu).sub(v);
  const c = centro.clone().add(uu).add(v);
  const d = centro.clone().sub(uu).add(v);
  const pos = [a, b, c, a, c, d].flatMap((p) => p.toArray());
  const uv = [quadro.u0, quadro.v0, quadro.u1, quadro.v0, quadro.u1, quadro.v1, quadro.u0, quadro.v0, quadro.u1, quadro.v1, quadro.u0, quadro.v1];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(Array.from({ length: 6 }, () => n.toArray()).flat(), 3));
  return preparar(g);
}

/**
 * Laje de neve deitada ao longo de um galho: crista no meio, bordas caindo.
 * `larguras` é a meia largura em cada ponto (pontas finas fecham a laje).
 */
export function laje(pontos: THREE.Vector3[], larguras: number[], espessura: number, seed: number) {
  const linhas: THREE.Vector3[][] = [];
  const vs: number[] = [];
  let comp = 0;
  for (let i = 0; i < pontos.length; i++) {
    const p = pontos[i];
    const dir = i < pontos.length - 1 ? pontos[i + 1].clone().sub(p) : p.clone().sub(pontos[i - 1]);
    const lado = dir.clone().cross(CIMA);
    if (lado.lengthSq() < 1e-6) lado.set(1, 0, 0);
    lado.normalize();
    if (i) comp += p.distanceTo(pontos[i - 1]);
    vs.push(comp / 2);
    const w = larguras[i];
    const h = espessura * (0.6 + ruido3(p.x * 2.3, p.y * 2.3, p.z * 2.3, seed) * 0.8) * (w > 0.001 ? 1 : 0.2);
    const cai = w * 0.4;
    linhas.push([
      p.clone().addScaledVector(lado, w).addScaledVector(CIMA, -cai),
      p.clone().addScaledVector(lado, w * 0.55).addScaledVector(CIMA, h * 0.75),
      p.clone().addScaledVector(CIMA, h),
      p.clone().addScaledVector(lado, -w * 0.55).addScaledVector(CIMA, h * 0.75),
      p.clone().addScaledVector(lado, -w).addScaledVector(CIMA, -cai),
    ]);
  }
  const pos: number[] = [];
  const uv: number[] = [];
  for (let i = 0; i < linhas.length - 1; i++) {
    for (let k = 0; k < 4; k++) {
      const [a, b, c, d] = [linhas[i][k], linhas[i][k + 1], linhas[i + 1][k], linhas[i + 1][k + 1]];
      pos.push(...a.toArray(), ...c.toArray(), ...b.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray());
      const [ua, ub] = [k / 4, (k + 1) / 4];
      uv.push(ua, vs[i], ua, vs[i + 1], ub, vs[i], ub, vs[i], ua, vs[i + 1], ub, vs[i + 1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return preparar(g);
}

/** Neve pintada na cor: faces viradas para cima clareiam até o branco. Para longe e para geada na folha. */
export function polvilhar(g: THREE.BufferGeometry, neve: number, forca = 1) {
  if (neve <= 0) return g;
  const n = g.attributes.normal;
  const c = g.attributes.color as THREE.BufferAttribute;
  const limite = 1 - neve * 0.85;
  const total = Math.min(1, neve * 1.6) * forca;
  for (let i = 0; i < n.count; i++) {
    const w = Math.min(1, Math.max(0, (n.getY(i) - limite) / 0.3)) * total;
    c.setXYZ(i, c.getX(i) + (BRANCO_NEVE[0] - c.getX(i)) * w, c.getY(i) + (BRANCO_NEVE[1] - c.getY(i)) * w, c.getZ(i) + (BRANCO_NEVE[2] - c.getZ(i)) * w);
  }
  c.needsUpdate = true;
  return g;
}

/** Escurece o que está perto do eixo (miolo da copa). `raio(y)` é o raio da copa naquela altura. */
export function escurecerDentro(g: THREE.BufferGeometry, raio: (y: number) => number, forca: number, cx = 0, cz = 0) {
  const p = g.attributes.position;
  const c = g.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const d = Math.hypot(p.getX(i) - cx, p.getZ(i) - cz);
    const f = 1 - forca * (1 - Math.min(1, Math.max(0, d / Math.max(0.2, raio(p.getY(i))))));
    c.setXYZ(i, c.getX(i) * f, c.getY(i) * f, c.getZ(i) * f);
  }
  c.needsUpdate = true;
  return g;
}

/** Face virada para baixo fica mais escura: oclusão barata para massas e moitas. */
export function luzDeCima(g: THREE.BufferGeometry, forca: number) {
  const n = g.attributes.normal;
  const c = g.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) {
    const f = 1 - forca * (0.5 - n.getY(i) * 0.5);
    c.setXYZ(i, c.getX(i) * f, c.getY(i) * f, c.getZ(i) * f);
  }
  c.needsUpdate = true;
  return g;
}

/** Inclinação de vento: empurra para `vento` mais quanto mais alto. Não mexe nas normais. */
export function inclinar(g: THREE.BufferGeometry, vento: THREE.Vector3, quanto: number, altura: number, expoente = 1.6) {
  if (quanto <= 0) return g;
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = Math.pow(Math.max(0, p.getY(i)) / altura, expoente) * quanto * altura;
    p.setXYZ(i, p.getX(i) + vento.x * t, p.getY(i), p.getZ(i) + vento.z * t);
  }
  p.needsUpdate = true;
  return g;
}

/** Cone/tronco de cone fechado, com relevo de ruído. Massa interna de conífera e silhueta de longe. */
export function cone(raioBase: number, raioTopo: number, y0: number, y1: number, lados: number, aneis: number, rugosidade: number, seed: number) {
  const g = new THREE.CylinderGeometry(raioTopo, raioBase, y1 - y0, lados, aneis, false);
  g.translate(0, (y0 + y1) / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const f = 1 + (ruido3(x * 0.8 + 3, y * 0.8, z * 0.8, seed) - 0.5) * 2 * rugosidade;
    p.setXYZ(i, x * f, y, z * f);
  }
  g.computeVertexNormals();
  return preparar(g);
}

/** Variação de tom por indivíduo, sem sair da família de cor. */
export function tom(base: string, r: () => number, matiz = 0.02, sat = 0.06, luz = 0.05) {
  return new THREE.Color(base).offsetHSL((r() - 0.5) * matiz, (r() - 0.5) * sat, (r() - 0.5) * luz);
}

/** Curva de Bézier quadrática amostrada: galho que sai reto e sobe na ponta. */
export function bezier(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, passos: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= passos; i++) {
    const t = i / passos;
    pts.push(
      a
        .clone()
        .multiplyScalar((1 - t) * (1 - t))
        .addScaledVector(b, 2 * (1 - t) * t)
        .addScaledVector(c, t * t),
    );
  }
  return pts;
}
