// Ajudantes do grupo pântano (árvore morta, cogumelo gigante, taboa).

import * as THREE from "three";
import { ruido3 } from "../ferramentas";

/** Caminho suave passando pelos pontos de controle (raiz em arco, haste curva). */
export function suave(controles: THREE.Vector3[], passos: number) {
  return new THREE.CatmullRomCurve3(controles, false, "centripetal").getPoints(passos);
}

/**
 * Puxa a cor para `cor` em manchas de ruído (musgo no pé do tronco, pinta no chapéu).
 * `ate`: só abaixo dessa altura (Infinity = em toda parte). `limiar`: quanto maior, menos mancha.
 */
export function manchar(g: THREE.BufferGeometry, cor: THREE.ColorRepresentation, escala: number, limiar: number, forca: number, seed: number, ate = Infinity) {
  const c = new THREE.Color(cor);
  const p = g.attributes.position;
  const cores = g.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const n = ruido3(x * escala, y * escala, z * escala, seed) * 0.75 + ruido3(x * escala * 3, y * escala * 3, z * escala * 3, seed + 3) * 0.25;
    let t = Math.max(0, Math.min(1, (n - limiar) / 0.12)) * forca;
    if (ate !== Infinity) t *= Math.max(0, Math.min(1, (ate - y) / (ate * 0.5)));
    if (t <= 0) continue;
    cores.setXYZ(i, cores.getX(i) + (c.r - cores.getX(i)) * t, cores.getY(i) + (c.g - cores.getY(i)) * t, cores.getZ(i) + (c.b - cores.getZ(i)) * t);
  }
  cores.needsUpdate = true;
  return g;
}

/** Apodrece: empurra os vértices para os lados com ruído (tronco que não é cilindro). */
export function apodrecer(g: THREE.BufferGeometry, quanto: number, escala: number, seed: number) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const dx = (ruido3(x * escala, y * escala, z * escala, seed) - 0.5) * 2 * quanto;
    const dz = (ruido3(x * escala, y * escala, z * escala, seed + 9) - 0.5) * 2 * quanto;
    p.setXYZ(i, x + dx, y, z + dz);
  }
  g.computeVertexNormals();
  return g;
}

/** Vira as faces (troca a ordem dos vértices de cada triângulo): o outro lado de uma lâmina. */
export function avesso(g: THREE.BufferGeometry) {
  for (const nome of ["position", "uv", "color"]) {
    const at = g.attributes[nome] as THREE.BufferAttribute;
    const a = at.array as Float32Array;
    const t = at.itemSize;
    for (let i = 0; i < at.count; i += 3) {
      for (let c = 0; c < t; c++) {
        const x = a[(i + 1) * t + c];
        a[(i + 1) * t + c] = a[(i + 2) * t + c];
        a[(i + 2) * t + c] = x;
      }
    }
    at.needsUpdate = true;
  }
  g.computeVertexNormals();
  return g;
}
