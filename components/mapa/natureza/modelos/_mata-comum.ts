// Ferramentas do grupo "mata" (árvore gigante, samambaia, árvore seca, árvore
// queimada): folha arqueada com quadro do atlas, placa de casca soltando,
// lascas de galho quebrado, tronco com relevo e ajustes de cor por vértice.

import * as THREE from "three";
import type { Quadro } from "../atlas";
import { preparar, ruido3, tubo } from "../ferramentas";

export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function geometria(pos: number[], uv: number[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return preparar(g);
}

/**
 * Folha comprida que acompanha uma espinha curva (fronde de samambaia, folha de
 * bromélia). Cada anel tem esquerda, nervura e direita; `dobra` baixa as bordas
 * (a folha cai dos dois lados da nervura). UV: u corre pelo comprimento do quadro,
 * v atravessa a folha, nervura no meio.
 */
export function folhaArqueada(espinha: THREE.Vector3[], largura: number, quadro: Quadro, dobra = 0.15, giro = 0, simples = false) {
  const pos: number[] = [];
  const uv: number[] = [];
  const n = espinha.length;
  const L: THREE.Vector3[] = [];
  const M: THREE.Vector3[] = [];
  const R: THREE.Vector3[] = [];
  const us: number[] = [];
  const vm: number[] = [];
  const du = quadro.u1 - quadro.u0;
  const dv = quadro.v1 - quadro.v0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const p = espinha[i];
    const tan = (i < n - 1 ? espinha[i + 1].clone().sub(p) : p.clone().sub(espinha[i - 1])).normalize();
    const lado = new THREE.Vector3(0, 1, 0).cross(tan);
    if (lado.lengthSq() < 1e-5) lado.set(1, 0, 0);
    lado.normalize().applyAxisAngle(tan, giro);
    const cima = tan.clone().cross(lado).normalize();
    // A folha estreita na ponta e na base: quem desenha é o quadro, mas a dobra acompanha.
    const meia = largura / 2;
    const cai = cima.clone().multiplyScalar(-largura * dobra * (0.4 + t));
    L.push(p.clone().addScaledVector(lado, meia).add(cai));
    M.push(p.clone());
    R.push(p.clone().addScaledVector(lado, -meia).add(cai));
    us.push(quadro.u0 + du * (0.08 + 0.84 * t));
    vm.push(quadro.v0 + dv * (0.5 + 0.08 * Math.sin(t * Math.PI)));
  }
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, ua: number[], ub: number[], uc: number[], ud: number[]) => {
    pos.push(...a.toArray(), ...c.toArray(), ...b.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray());
    uv.push(...ua, ...uc, ...ub, ...ub, ...uc, ...ud);
  };
  for (let i = 0; i < n - 1; i++) {
    if (simples) {
      quad(L[i], R[i], L[i + 1], R[i + 1], [us[i], quadro.v1], [us[i], quadro.v0], [us[i + 1], quadro.v1], [us[i + 1], quadro.v0]);
      continue;
    }
    quad(L[i], M[i], L[i + 1], M[i + 1], [us[i], quadro.v1], [us[i], vm[i]], [us[i + 1], quadro.v1], [us[i + 1], vm[i + 1]]);
    quad(M[i], R[i], M[i + 1], R[i + 1], [us[i], vm[i]], [us[i], quadro.v0], [us[i + 1], vm[i + 1]], [us[i + 1], quadro.v0]);
  }
  return geometria(pos, uv);
}

/**
 * Placa de casca descolando do tronco: tira curva encostada na superfície, com uma
 * ponta se soltando. Devolve a face de fora e a de dentro (madeira clara), porque o
 * material da casca só desenha a frente.
 */
export function placaDeCasca(eixo: THREE.Vector3, radial: THREE.Vector3, raio: number, largura: number, altura: number, solta: number, r: () => number) {
  const cima = new THREE.Vector3(0, 1, 0);
  const rad = radial.clone().setY(0).normalize();
  const tang = cima.clone().cross(rad).normalize();
  const fora: number[] = [];
  const dentro: number[] = [];
  const uvF: number[] = [];
  const uvD: number[] = [];
  const colunas = 3;
  const linhas = 3;
  const arco = largura / raio;
  const pontoEm = (c: number, l: number) => {
    const a = (c / colunas - 0.5) * arco;
    const y = (l / linhas - 0.5) * altura;
    // A ponta de baixo (ou de cima) se descola e enrola para fora.
    const t = l / linhas;
    const afasta = raio * 1.04 + solta * Math.pow(t, 2) * (0.8 + r() * 0.1);
    return eixo
      .clone()
      .addScaledVector(rad, Math.cos(a) * afasta)
      .addScaledVector(tang, Math.sin(a) * afasta)
      .addScaledVector(cima, y);
  };
  const grade: THREE.Vector3[][] = [];
  for (let c = 0; c <= colunas; c++) {
    grade.push([]);
    for (let l = 0; l <= linhas; l++) grade[c].push(pontoEm(c, l));
  }
  for (let c = 0; c < colunas; c++) {
    for (let l = 0; l < linhas; l++) {
      const [a, b, d, e] = [grade[c][l], grade[c + 1][l], grade[c][l + 1], grade[c + 1][l + 1]];
      const [ua, ub, va, vb] = [c / colunas, (c + 1) / colunas, (l / linhas) * altura * 0.5, ((l + 1) / linhas) * altura * 0.5];
      fora.push(...a.toArray(), ...b.toArray(), ...d.toArray(), ...b.toArray(), ...e.toArray(), ...d.toArray());
      uvF.push(ua, va, ub, va, ua, vb, ub, va, ub, vb, ua, vb);
      // Face de dentro um fio para trás, com a volta invertida.
      const recuo = (p: THREE.Vector3) => p.clone().addScaledVector(rad, -0.012);
      dentro.push(...recuo(a).toArray(), ...recuo(d).toArray(), ...recuo(b).toArray(), ...recuo(b).toArray(), ...recuo(d).toArray(), ...recuo(e).toArray());
      uvD.push(ua, va, ua, vb, ub, va, ub, va, ua, vb, ub, vb);
    }
  }
  return { fora: geometria(fora, uvF), dentro: geometria(dentro, uvD) };
}

/** Lascas na ponta de um galho quebrado: farpas finas saindo do toco. */
export function lascas(fim: THREE.Vector3, dir: THREE.Vector3, raio: number, r: () => number, quantas = 3) {
  const lista: THREE.BufferGeometry[] = [];
  const d = dir.clone().normalize();
  const lado = new THREE.Vector3(0, 1, 0).cross(d);
  if (lado.lengthSq() < 1e-5) lado.set(1, 0, 0);
  lado.normalize();
  const outro = d.clone().cross(lado).normalize();
  for (let i = 0; i < quantas; i++) {
    const a = (i / quantas) * Math.PI * 2 + r() * 1.2;
    const base = fim.clone().addScaledVector(lado, Math.cos(a) * raio * 0.55).addScaledVector(outro, Math.sin(a) * raio * 0.55).addScaledVector(d, -raio * 0.3);
    const ponta = base.clone().addScaledVector(d, raio * (1.2 + r() * 2.5)).addScaledVector(lado, Math.cos(a) * raio * 0.3 * r());
    lista.push(tubo([base, ponta], [raio * (0.28 + r() * 0.15), raio * 0.02], 3));
  }
  return lista;
}

/**
 * Tronco com relevo: tubo reto em pé, deformado no raio por `relevo(ângulo, y)`
 * (sulcos, sapopemba, cicatriz de fogo) e depois curvado por `curva(y)`.
 * Os anéis ficam densos o bastante para o relevo aparecer.
 */
export function troncoComRelevo(
  altura: number,
  raio: (t: number) => number,
  lados: number,
  aneis: number,
  relevo: (angulo: number, y: number, t: number) => number,
  curva: (y: number) => THREE.Vector2,
  fechar = true,
) {
  const pts: THREE.Vector3[] = [];
  const rs: number[] = [];
  for (let i = 0; i <= aneis; i++) {
    const t = i / aneis;
    pts.push(new THREE.Vector3(0, t * altura, 0));
    rs.push(raio(t));
  }
  // Começa um pouco abaixo do chão para não aparecer fresta.
  pts[0].y = -0.25;
  const g = tubo(pts, rs, lados, fechar);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const d = Math.hypot(x, z);
    let [nx, nz] = [x, z];
    if (d > 1e-5) {
      const f = relevo(Math.atan2(z, x), y, Math.max(0, y) / altura);
      nx = x * f;
      nz = z * f;
    }
    const c = curva(y);
    p.setXYZ(i, nx + c.x, y, nz + c.y);
  }
  g.computeVertexNormals();
  return g;
}

/** Mistura a cor de cada vértice com `cor`, no peso que `peso` devolver (0 a 1). */
export function misturar(g: THREE.BufferGeometry, cor: THREE.ColorRepresentation, peso: (p: THREE.Vector3, normal: THREE.Vector3) => number) {
  const c = new THREE.Color(cor);
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const cores = g.attributes.color as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const nn = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    nn.fromBufferAttribute(n, i);
    const w = Math.min(1, Math.max(0, peso(v, nn)));
    if (!w) continue;
    cores.setXYZ(i, cores.getX(i) + (c.r - cores.getX(i)) * w, cores.getY(i) + (c.g - cores.getY(i)) * w, cores.getZ(i) + (c.b - cores.getZ(i)) * w);
  }
  cores.needsUpdate = true;
  return g;
}

/** Escurece cada vértice pelo fator que `fator` devolver (1 = igual). */
export function escurecer(g: THREE.BufferGeometry, fator: (p: THREE.Vector3) => number) {
  const p = g.attributes.position;
  const cores = g.attributes.color as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const f = fator(v);
    cores.setXYZ(i, cores.getX(i) * f, cores.getY(i) * f, cores.getZ(i) * f);
  }
  cores.needsUpdate = true;
  return g;
}

/** Neve em folha de cartão: clareia o que olha para cima (dos dois lados). */
export function nevarFolhas(g: THREE.BufferGeometry, neve: number, seed: number) {
  return misturar(g, "#e8edf0", (p, n) => {
    const cima = Math.abs(n.y);
    const mancha = ruido3(p.x * 0.9, p.y * 0.9, p.z * 0.9, seed);
    return neve * (cima * 1.25 - 0.15) * (0.55 + mancha * 0.7);
  });
}

/** Musgo e líquen em manchas, mais nas faces de cima e perto do chão úmido. */
export function manchar(g: THREE.BufferGeometry, cor: THREE.ColorRepresentation, quanto: number, escala: number, seed: number, cimaConta = 0.5) {
  return misturar(g, cor, (p, n) => {
    const m = ruido3(p.x * escala, p.y * escala * 0.6, p.z * escala, seed);
    return (m - 0.55) * 3.2 * quanto * (1 - cimaConta + cimaConta * Math.max(0, n.y + 0.3));
  });
}
