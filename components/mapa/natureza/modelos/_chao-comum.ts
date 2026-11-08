// Ferramentas do grupo "chao" (capim, arbusto, flores): lâmina curva de folhagem
// e tinta em degradê da base para a ponta. Tudo barato: estes modelos vão aos milhares.

import * as THREE from "three";
import type { Quadro } from "../atlas";
import { preparar, ruido3 } from "../ferramentas";

/**
 * Cartão de capim em pé e curvo: base no chão, arqueia para `inclina` (radianos no plano),
 * abre em leque para cima. `segs` fatias na altura (1 = cartão reto, 2 tris por fatia).
 * UV: o quadro inteiro, v da base (v0) à ponta (v1).
 */
export function lamina(
  base: THREE.Vector3,
  angulo: number,
  largura: number,
  altura: number,
  curva: number,
  quadro: Quadro,
  segs: number,
  abre = 0.35,
  inclina = angulo,
) {
  const lado = new THREE.Vector3(-Math.sin(angulo), 0, Math.cos(angulo));
  const queda = new THREE.Vector3(Math.cos(inclina), 0, Math.sin(inclina));
  const pos: number[] = [];
  const uv: number[] = [];
  const linha = (s: number) => {
    // Arco: sai quase reto e cai na ponta; a altura encolhe um pouco com a queda.
    const centro = base.clone().addScaledVector(queda, curva * s * s);
    centro.y = base.y + altura * s * (1 - 0.35 * (curva / Math.max(altura, 0.01)) * s * s);
    const l = largura * (1 - abre + abre * 2 * s) * 0.5;
    return [centro.clone().addScaledVector(lado, -l), centro.clone().addScaledVector(lado, l)];
  };
  const v = (s: number) => quadro.v0 + s * (quadro.v1 - quadro.v0);
  for (let i = 0; i < segs; i++) {
    const [s0, s1] = [i / segs, (i + 1) / segs];
    const [a, b] = linha(s0);
    const [c, d] = linha(s1);
    pos.push(...a.toArray(), ...b.toArray(), ...c.toArray(), ...c.toArray(), ...b.toArray(), ...d.toArray());
    uv.push(quadro.u0, v(s0), quadro.u1, v(s0), quadro.u0, v(s1), quadro.u0, v(s1), quadro.u1, v(s0), quadro.u1, v(s1));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return preparar(g);
}

/**
 * Tinta em degradê: `base` no pé, `ponta` em cima (capim verde embaixo, palha na ponta),
 * com mancha suave de ruído para cada indivíduo parecer outro.
 */
export function degrade(
  g: THREE.BufferGeometry,
  base: THREE.ColorRepresentation,
  ponta: THREE.ColorRepresentation,
  altura: number,
  variacao: number,
  seed: number,
  curva = 1,
) {
  const [cb, cp, c] = [new THREE.Color(base), new THREE.Color(ponta), new THREE.Color()];
  const p = g.attributes.position;
  const cores = g.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const t = Math.pow(Math.min(1, Math.max(0, y / altura)), curva);
    const n = (ruido3(x * 2.3 + 11, y * 2.3, z * 2.3, seed) - 0.5) * 2 * variacao;
    c.copy(cb).lerp(cp, t);
    cores.setXYZ(i, c.r * (1 + n), c.g * (1 + n), c.b * (1 + n * 0.7));
  }
  cores.needsUpdate = true;
  return g;
}

/** Desvia a cor um pouco em matiz, saturação e luz: cada lâmina com o seu tom. */
export function desviar(cor: THREE.ColorRepresentation, r: () => number, matiz = 0.02, luz = 0.08) {
  const c = new THREE.Color(cor);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h + (r() - 0.5) * 2 * matiz, Math.max(0, hsl.s + (r() - 0.5) * 0.12), Math.max(0, hsl.l * (1 + (r() - 0.5) * 2 * luz)));
  return c;
}

export function misturar(a: THREE.ColorRepresentation, b: THREE.ColorRepresentation, t: number) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}
