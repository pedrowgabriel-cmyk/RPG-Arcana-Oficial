// Peças comuns das palmeiras e árvores do calor (grupo "quentes"): estipe com
// anéis, fronde arqueada em fita dobrada, leque de buriti e casca enrugada.
// Tudo determinístico e com UV: casca com v pelo comprimento, folha em quadros do atlas.

import * as THREE from "three";
import type { Quadro } from "../atlas";
import { preparar, ruido3, tubo } from "../ferramentas";

const CIMA = new THREE.Vector3(0, 1, 0);

/** Curva suave por pontos de controle (Catmull-Rom), amostrada a cada `passo` metros. */
export function reamostrar(controle: THREE.Vector3[], passo: number) {
  const curva = new THREE.CatmullRomCurve3(controle, false, "centripetal");
  const total = curva.getLength();
  const n = Math.max(2, Math.round(total / passo));
  return curva.getSpacedPoints(n);
}

/**
 * Estipe de palmeira: tubo com cicatrizes de folha em anel a cada `anel` metros
 * (um anel saltado e mais escuro, outro liso). `raio(t)` vai da base (0) ao topo (1).
 */
export function estipe(
  controle: THREE.Vector3[],
  raio: (t: number) => number,
  anel: number,
  lados: number,
  cor: THREE.ColorRepresentation,
  seed: number,
  escuroDoAnel = 0.3,
) {
  const pts = reamostrar(controle, anel / 2);
  const raios = pts.map((_, i) => raio(i / (pts.length - 1)) * (i % 2 === 0 ? 1.035 : 0.985));
  const g = tubo(pts, raios, lados, true);
  const base = new THREE.Color(cor);
  const p = g.attributes.position;
  const uv = g.attributes.uv;
  const cores = g.attributes.color as THREE.BufferAttribute;
  const altura = pts[pts.length - 1].y;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const s = uv.getY(i) * 2; // metros ao longo do estipe
    const idx = Math.round(s / (anel / 2));
    const cicatriz = idx % 2 === 0 ? 1 - escuroDoAnel * (0.7 + ruido3(x * 3, y * 3, z * 3, seed) * 0.6) : 1;
    // Mancha de umidade embaixo, líquen claro em placas, topo mais novo e mais escuro.
    const mancha = 1 + (ruido3(x * 1.3, y * 0.5, z * 1.3, seed + 3) - 0.5) * 0.35;
    const chao = 0.62 + 0.38 * Math.min(1, y / 1.6);
    const topo = 1 - 0.18 * Math.max(0, (y / altura - 0.85) / 0.15);
    const f = cicatriz * mancha * chao * topo;
    cores.setXYZ(i, base.r * f, base.g * f, base.b * f * 0.97);
  }
  cores.needsUpdate = true;
  return { geometria: g, pontos: pts };
}

export type OpcoesFronde = {
  base: THREE.Vector3;
  /** Azimute em radianos. */
  ang: number;
  /** Elevação inicial em radianos (positivo sobe). */
  elev: number;
  comp: number;
  larg: number;
  /** Quanto a ponta cai, em radianos somados ao longo da fronde. */
  queda: number;
  segs: number;
  /** >0: folíolos pendem (V invertido); <0: folíolos sobem (V). */
  dobra: number;
  torcao?: number;
  /** 0..1: ponta rasgada/encolhida (fronde velha). */
  rasgo?: number;
  quadro: Quadro;
};

/** Fronde de palmeira: fita arqueada e dobrada no meio, com o quadro "fronde" do atlas. */
export function fronde(o: OpcoesFronde) {
  const pos: number[] = [];
  const uv: number[] = [];
  const linhas: { l: THREE.Vector3; c: THREE.Vector3; r: THREE.Vector3; t: number }[] = [];
  const p = o.base.clone();
  const passo = o.comp / o.segs;
  for (let i = 0; i <= o.segs; i++) {
    const t = i / o.segs;
    const e = o.elev - o.queda * Math.pow(t, 1.4);
    const dir = new THREE.Vector3(Math.cos(e) * Math.cos(o.ang), Math.sin(e), Math.cos(e) * Math.sin(o.ang));
    let lado = dir.clone().cross(CIMA);
    if (lado.lengthSq() < 1e-6) lado = new THREE.Vector3(1, 0, 0);
    lado.normalize().applyAxisAngle(dir, (o.torcao ?? 0) * t);
    const normal = lado.clone().cross(dir).normalize();
    const w = o.larg * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.95))) * (1 - (o.rasgo ?? 0) * t * 0.6) * 0.5;
    const cai = normal.clone().multiplyScalar(-o.dobra * w);
    linhas.push({ c: p.clone(), l: p.clone().addScaledVector(lado, -w).add(cai), r: p.clone().addScaledVector(lado, w).add(cai), t });
    p.addScaledVector(dir, passo);
  }
  const q = o.quadro;
  const U = (t: number) => q.u0 + (0.07 + 0.86 * t) * (q.u1 - q.u0);
  const V = (f: number) => q.v0 + f * (q.v1 - q.v0);
  for (let i = 0; i < linhas.length - 1; i++) {
    const [a, b] = [linhas[i], linhas[i + 1]];
    const [ua, ub] = [U(a.t), U(b.t)];
    // Metade de um lado (borda -> nervura) e do outro (nervura -> borda).
    pos.push(...a.l.toArray(), ...b.l.toArray(), ...a.c.toArray(), ...a.c.toArray(), ...b.l.toArray(), ...b.c.toArray());
    uv.push(ua, V(0.12), ub, V(0.12), ua, V(0.5), ua, V(0.5), ub, V(0.12), ub, V(0.5));
    pos.push(...a.c.toArray(), ...b.c.toArray(), ...a.r.toArray(), ...a.r.toArray(), ...b.c.toArray(), ...b.r.toArray());
    uv.push(ua, V(0.5), ub, V(0.5), ua, V(0.88), ua, V(0.88), ub, V(0.5), ub, V(0.88));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return { geometria: preparar(g), nervura: linhas.map((l) => l.c) };
}

export type OpcoesLeque = {
  centro: THREE.Vector3;
  /** Direção para onde o leque abre (do pecíolo para fora). */
  fora: THREE.Vector3;
  raio: number;
  /** Abertura total em radianos. */
  abertura: number;
  segsAng: number;
  segsRaio: number;
  /** Altura do plissado, fração do raio. */
  plissado: number;
  /** Quanto as pontas caem, fração do raio. */
  queda: number;
  /** Giro do plano do leque em volta de `fora`, em radianos. */
  rolar?: number;
  quadro: Quadro;
};

/** Leque de folha costapalmada (buriti): setor plissado em sanfona com pontas caídas. Quadro "capim": lâminas radiais. */
export function leque(o: OpcoesLeque) {
  const fora = o.fora.clone().normalize();
  let lado = fora.clone().cross(CIMA);
  if (lado.lengthSq() < 1e-6) lado = new THREE.Vector3(1, 0, 0);
  lado.normalize().applyAxisAngle(fora, o.rolar ?? 0);
  const normal = lado.clone().cross(fora).normalize();
  const grade: THREE.Vector3[][] = [];
  for (let a = 0; a <= o.segsAng; a++) {
    const fa = a / o.segsAng;
    const th = (fa - 0.5) * o.abertura;
    const linha: THREE.Vector3[] = [];
    for (let k = 0; k <= o.segsRaio; k++) {
      const rho = (k / o.segsRaio) * o.raio * (k === 0 ? 0.05 : 1);
      const plis = (a % 2 === 0 ? 1 : -1) * o.plissado * rho;
      const ptq = Math.pow(rho / o.raio, 2.2) * o.queda * o.raio * (0.5 + 0.5 * Math.abs(Math.sin(th)));
      linha.push(
        o.centro.clone()
          .addScaledVector(fora, Math.cos(th) * rho)
          .addScaledVector(lado, Math.sin(th) * rho)
          .addScaledVector(normal, plis)
          .add(new THREE.Vector3(0, -ptq, 0)),
      );
    }
    grade.push(linha);
  }
  const q = o.quadro;
  const U = (fa: number) => q.u0 + (0.12 + 0.76 * fa) * (q.u1 - q.u0);
  const V = (fr: number) => q.v0 + (0.02 + 0.93 * fr) * (q.v1 - q.v0);
  const pos: number[] = [];
  const uv: number[] = [];
  for (let a = 0; a < o.segsAng; a++) {
    for (let k = 0; k < o.segsRaio; k++) {
      const [p00, p01, p10, p11] = [grade[a][k], grade[a][k + 1], grade[a + 1][k], grade[a + 1][k + 1]];
      const [u0, u1, v0, v1] = [U(a / o.segsAng), U((a + 1) / o.segsAng), V(k / o.segsRaio), V((k + 1) / o.segsRaio)];
      pos.push(...p00.toArray(), ...p10.toArray(), ...p01.toArray(), ...p01.toArray(), ...p10.toArray(), ...p11.toArray());
      uv.push(u0, v0, u1, v0, u0, v1, u0, v1, u1, v0, u1, v1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return preparar(g);
}

/** Casca grossa e cortiçosa: desloca cada vértice por ruído (função só da posição: não abre emendas). */
export function enrugar(g: THREE.BufferGeometry, amplitude: number, frequencia: number, seed: number) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const f = frequencia;
    const dx = (ruido3(x * f, y * f * 0.5, z * f, seed) - 0.5) * 2 * amplitude;
    const dz = (ruido3(x * f, y * f * 0.5, z * f, seed + 11) - 0.5) * 2 * amplitude;
    const dy = (ruido3(x * f, y * f, z * f, seed + 23) - 0.5) * amplitude * 0.4;
    p.setXYZ(i, x + dx, y + dy, z + dz);
  }
  g.computeVertexNormals();
  return g;
}

/** Escurece por vértice abaixo de uma altura e por dentro de um raio (oclusão de copa barata). */
export function ocluir(g: THREE.BufferGeometry, centro: THREE.Vector3, raio: number, forca: number) {
  const p = g.attributes.position;
  const c = g.attributes.color as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const d = Math.hypot(p.getX(i) - centro.x, (p.getY(i) - centro.y) * 1.3, p.getZ(i) - centro.z) / raio;
    const f = 1 - forca * Math.max(0, 1 - d);
    c.setXYZ(i, c.getX(i) * f, c.getY(i) * f, c.getZ(i) * f);
  }
  c.needsUpdate = true;
  return g;
}
