// Ferramentas de modelagem para os modelos da natureza. Tudo determinístico:
// a mesma variação gera sempre a mesma árvore, em qualquer aparelho.
//
// Todas as geometrias saem não indexadas, com position, normal, uv e color,
// para `juntar` funcionar sem conferência.

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Quadro } from "./atlas";
import type { NomeMaterial, Peca } from "./tipos";

export function sorteio(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruído 3D suave em [0, 1], para deformar e tingir sem emendas. */
export function ruido3(x: number, y: number, z: number, seed = 0) {
  const h = (i: number, j: number, k: number) => {
    let n = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 2147483647 & 0xffff) + seed * 1013;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const [i, j, k] = [Math.floor(x), Math.floor(y), Math.floor(z)];
  const [u, v, w] = [x - i, y - j, z - k].map((t) => t * t * (3 - 2 * t));
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(h(i, j, k), h(i + 1, j, k), u), l(h(i, j + 1, k), h(i + 1, j + 1, k), u), v),
    l(l(h(i, j, k + 1), h(i + 1, j, k + 1), u), l(h(i, j + 1, k + 1), h(i + 1, j + 1, k + 1), u), v),
    w,
  );
}

/** Deixa a geometria no formato comum: não indexada, com normal, uv e cor branca. */
export function preparar(geo: THREE.BufferGeometry) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.attributes.color) g.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
  for (const nome of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(nome)) g.deleteAttribute(nome);
  return g;
}

/** Junta pedaços do mesmo material numa geometria só. */
export function juntar(lista: THREE.BufferGeometry[]) {
  return mergeGeometries(lista.map(preparar), false)!;
}

/** Agrupa por material e junta: o formato que `Modelo.gerar` devolve. */
export function pecas(lista: { material: NomeMaterial; geometria: THREE.BufferGeometry }[]): Peca[] {
  const por = new Map<NomeMaterial, THREE.BufferGeometry[]>();
  for (const p of lista) por.set(p.material, [...(por.get(p.material) ?? []), p.geometria]);
  return [...por].map(([material, gs]) => ({ material, geometria: juntar(gs) }));
}

/**
 * Tubo ao longo de um caminho: tronco, galho, raiz, cipó. `raios` acompanha `pontos`.
 * UV: u dá a volta, v corre em metros / 2 (a textura de casca repete pelo comprimento).
 */
export function tubo(pontos: THREE.Vector3[], raios: number[], lados = 7, fechar = false) {
  const pos: number[] = [];
  const uv: number[] = [];
  let comprimento = 0;
  const aneis: THREE.Vector3[][] = [];
  const vs: number[] = [];
  let normalAnterior = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i < pontos.length; i++) {
    const p = pontos[i];
    const dir = (i < pontos.length - 1 ? pontos[i + 1].clone().sub(p) : p.clone().sub(pontos[i - 1])).normalize();
    if (i) comprimento += p.distanceTo(pontos[i - 1]);
    // Moldura que gira pouco de um anel para o outro: o tubo não torce.
    const lado = normalAnterior.clone().sub(dir.clone().multiplyScalar(normalAnterior.dot(dir)));
    if (lado.lengthSq() < 1e-6) lado.set(0, 0, 1).cross(dir);
    lado.normalize();
    normalAnterior = lado;
    const outro = dir.clone().cross(lado).normalize();
    const anel: THREE.Vector3[] = [];
    for (let k = 0; k <= lados; k++) {
      const a = (k / lados) * Math.PI * 2;
      anel.push(p.clone().addScaledVector(lado, Math.cos(a) * raios[i]).addScaledVector(outro, Math.sin(a) * raios[i]));
    }
    aneis.push(anel);
    vs.push(comprimento / 2);
  }
  for (let i = 0; i < aneis.length - 1; i++) {
    for (let k = 0; k < lados; k++) {
      const [a, b, c, d] = [aneis[i][k], aneis[i][k + 1], aneis[i + 1][k], aneis[i + 1][k + 1]];
      const [ua, ub] = [k / lados, (k + 1) / lados];
      pos.push(...a.toArray(), ...c.toArray(), ...b.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray());
      uv.push(ua, vs[i], ua, vs[i + 1], ub, vs[i], ub, vs[i], ua, vs[i + 1], ub, vs[i + 1]);
    }
  }
  if (fechar) {
    const fim = aneis[aneis.length - 1];
    const centro = pontos[pontos.length - 1];
    for (let k = 0; k < lados; k++) {
      pos.push(...centro.toArray(), ...fim[k].toArray(), ...fim[k + 1].toArray());
      uv.push(0.5, 0.5, 0, 0, 1, 0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return preparar(g);
}

/** Caminho curvo e irregular de `de` até `para`, para troncos e galhos não ficarem retos. */
export function caminho(de: THREE.Vector3, para: THREE.Vector3, passos: number, torto: number, r: () => number) {
  const pts: THREE.Vector3[] = [];
  const desvio = new THREE.Vector3();
  for (let i = 0; i <= passos; i++) {
    const t = i / passos;
    if (i && i < passos) desvio.add(new THREE.Vector3(r() - 0.5, (r() - 0.5) * 0.3, r() - 0.5).multiplyScalar(torto));
    pts.push(de.clone().lerp(para, t).add(desvio.clone().multiplyScalar(Math.sin(t * Math.PI))));
  }
  return pts;
}

/** Bolha irregular: pedra, copa de silhueta, moita. UV esférica. */
export function bolha(raio: number, detalhe: number, rugosidade: number, seed: number, achatar = 1) {
  const g = new THREE.IcosahedronGeometry(raio, detalhe);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const uv: number[] = [];
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const f = 1 + (ruido3(n.x * 2.2, n.y * 2.2, n.z * 2.2, seed) - 0.5) * 2 * rugosidade + (ruido3(n.x * 6, n.y * 6, n.z * 6, seed + 1) - 0.5) * rugosidade * 0.6;
    v.multiplyScalar(f);
    v.y *= achatar;
    p.setXYZ(i, v.x, v.y, v.z);
    uv.push(0.5 + Math.atan2(n.z, n.x) / (Math.PI * 2), 0.5 + Math.asin(Math.max(-1, Math.min(1, n.y))) / Math.PI);
  }
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return preparar(g);
}

/**
 * Cartão de folhagem: quadrado com um quadro do atlas, virado para `normal`.
 * Use vários cruzados para volume; é assim que árvore de jogo ganha copa cheia.
 */
export function cartao(centro: THREE.Vector3, largura: number, altura: number, normal: THREE.Vector3, giro: number, quadro: Quadro) {
  const g = new THREE.PlaneGeometry(largura, altura);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, quadro.u0 + uv.getX(i) * (quadro.u1 - quadro.u0), quadro.v0 + uv.getY(i) * (quadro.v1 - quadro.v0));
  g.rotateZ(giro);
  g.lookAt(normal);
  g.translate(centro.x, centro.y, centro.z);
  return preparar(g);
}

/**
 * Tinge por vértice: cor base com variação suave no espaço e sombra perto do chão
 * (oclusão barata, que é metade do "bem feito").
 */
export function tingir(g: THREE.BufferGeometry, cor: THREE.ColorRepresentation, variacao: number, seed: number, sombraNoChao = 0, alturaDaSombra = 1) {
  const c = new THREE.Color(cor);
  const p = g.attributes.position;
  const cores = g.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const n = (ruido3(x * 0.7, y * 0.7, z * 0.7, seed) - 0.5) * 2 * variacao;
    const chao = 1 - sombraNoChao * (1 - Math.min(1, Math.max(0, y / alturaDaSombra)));
    cores.setXYZ(i, c.r * (1 + n) * chao, c.g * (1 + n) * chao, c.b * (1 + n * 0.8) * chao);
  }
  cores.needsUpdate = true;
  return g;
}

/** Deforma vértice a vértice (vento parado, inclinação, achatamento). */
export function deformar(g: THREE.BufferGeometry, f: (v: THREE.Vector3) => void) {
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    f(v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Neve: copia as faces viradas para cima e sobe um pouco. Cobre `quanto` das faces. */
export function nevar(g: THREE.BufferGeometry, quanto: number, espessura = 0.06) {
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const uv = g.attributes.uv;
  const pos: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < p.count; i += 3) {
    const ny = (n.getY(i) + n.getY(i + 1) + n.getY(i + 2)) / 3;
    if (ny < 1 - quanto * 0.75) continue;
    for (let k = 0; k < 3; k++) {
      pos.push(p.getX(i + k) + n.getX(i + k) * espessura, p.getY(i + k) + n.getY(i + k) * espessura, p.getZ(i + k) + n.getZ(i + k) * espessura);
      uvs.push(uv.getX(i + k), uv.getY(i + k));
    }
  }
  const s = new THREE.BufferGeometry();
  s.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  s.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  s.computeVertexNormals();
  return preparar(s);
}

export function triangulos(lista: Peca[]) {
  return lista.reduce((s, p) => s + p.geometria.attributes.position.count / 3, 0);
}
