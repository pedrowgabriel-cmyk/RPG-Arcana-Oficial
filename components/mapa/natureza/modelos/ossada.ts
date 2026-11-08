// Ossada de boi no sertão: crânio de testa larga com chifres curvos, espinha
// meio enterrada, costelas em arco saindo da areia, ossos de perna soltos.
// Osso velho: creme sujo, mais escuro onde encosta no chão e nos buracos.

import * as THREE from "three";
import { bolha, deformar, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, Nivel } from "../tipos";
import { bezier, degradeEmV, manchar, v3, type Lista, type V } from "./_deserto-comum";

const OSSO = "#e3d8bf";
const CHIFRE = "#9a8b74";
const AREIA = "#8f7558";

type Perfil = { cranio: boolean; espinha: boolean; soltas: number; pernas: number; chifreQuebrado: boolean; areia: number };
const PERFIS: Perfil[] = [
  { cranio: true, espinha: true, soltas: 0, pernas: 2, chifreQuebrado: false, areia: 2 }, // carcaça inteira
  { cranio: true, espinha: false, soltas: 2, pernas: 1, chifreQuebrado: false, areia: 1 }, // só o crânio e restos
  { cranio: false, espinha: true, soltas: 0, pernas: 1, chifreQuebrado: false, areia: 2 }, // gaiola de costelas
  { cranio: true, espinha: false, soltas: 5, pernas: 1, chifreQuebrado: true, areia: 1 }, // espalhada, chifre quebrado
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Crânio em espaço local: focinho para +z, testa (nuca) em -z, centro na origem. */
function cranio(nivel: Nivel, seed: number) {
  const g = bolha(1, nivel === 0 ? 2 : nivel === 1 ? 1 : 0, 0.05, seed);
  deformar(g, (v) => {
    const zn = v.z; // -1 nuca, +1 focinho
    const s = suave(-0.4, 1, zn);
    const w = lerp(0.105, 0.05, s) + 0.025 * Math.exp(-Math.pow((zn + 0.3) / 0.22, 2)); // órbitas saltam dos lados
    const h = lerp(0.115, 0.06, s) + 0.02 * Math.exp(-Math.pow((zn + 0.85) / 0.25, 2)); // nuca alta
    v.x *= w;
    v.y = Math.max(v.y * h, -h * 0.45); // fundo aberto e chato
    v.z *= 0.26;
    if (v.y > 0) v.y *= 1 - 0.25 * Math.pow(Math.abs(v.x) / w, 2); // testa arredondada nas bordas
  });
  tingir(g, OSSO, 0.14, seed, 0, 1);
  if (nivel < 2) {
    // Órbitas, buracos do nariz e o sulco da testa: só sombra, a textura completa depois.
    for (const lado of [-1, 1]) manchar(g, v3(lado * 0.12, 0.02, -0.08), 0.06, 0.8);
    manchar(g, v3(0, 0.0, 0.27), 0.06, 0.7);
    manchar(g, v3(0, 0.08, -0.05), 0.05, 0.25);
  }
  return g;
}

function chifre(lado: number, quebrado: boolean, nivel: Nivel, r: () => number) {
  const base = v3(lado * 0.1, 0.06, -0.23);
  const fora = v3(lado, 0, 0);
  const forma = 0.8 + r() * 0.4;
  const ctrl = [base, base.clone().addScaledVector(fora, 0.2 * forma).add(v3(0, -0.02, -0.04)), base.clone().addScaledVector(fora, 0.38 * forma).add(v3(0, 0.06, 0.02)), base.clone().addScaledVector(fora, 0.36 * forma).add(v3(0, 0.2 * forma, 0.14))];
  let pts = bezier(ctrl, nivel === 0 ? 7 : 2);
  if (quebrado) pts = pts.slice(0, Math.ceil(pts.length * 0.45));
  const raios = pts.map((_, k) => 0.042 * (1 - (k / pts.length) * (quebrado ? 0.4 : 0.85)));
  const g = tubo(pts, raios, nivel === 0 ? 6 : 3, nivel === 0);
  tingir(g, CHIFRE, 0.15, 3, 0, 1);
  return degradeEmV(g, 0.25, quebrado ? 0.1 : 0.5);
}

const modelo: Modelo = {
  id: "ossada",
  nome: "Ossada",
  variacoes: PERFIS.length,
  altura: [0.25, 0.55],
  raio: 1.1,
  estados: [],
  gerar(variacao, nivel: Nivel) {
    const pf = PERFIS[variacao % PERFIS.length];
    const r = sorteio(7400 + variacao * 89);
    const osso: THREE.BufferGeometry[] = [];
    const lista: Lista = [];
    const sujar = (g: THREE.BufferGeometry, s: number) => tingir(g, OSSO, 0.18, s, 0.45, 0.22);

    // Crânio: deitado de lado um pouco, meio afundado, girado para qualquer rumo.
    if (pf.cranio) {
      const grupo: THREE.BufferGeometry[] = [cranio(nivel, variacao)];
      if (nivel === 2) {
        for (const lado of [-1, 1]) grupo.push(tingir(tubo([v3(lado * 0.1, 0.05, -0.23), v3(lado * 0.3, 0.1, -0.23), v3(lado * 0.3, 0.3, -0.15)], [0.04, 0.03, 0.01], 3), CHIFRE, 0.1, 1));
      } else {
        grupo.push(chifre(-1, false, nivel, r), chifre(1, pf.chifreQuebrado, nivel, r));
      }
      const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler((r() - 0.5) * 0.25, r() * Math.PI * 2, (r() - 0.5) * 0.6));
      const desloca = pf.espinha ? v3(0.85, 0.035, 0.15) : v3(0, 0.035, 0);
      for (const g of grupo) {
        g.applyMatrix4(m).translate(desloca.x, desloca.y, desloca.z);
        lista.push({ material: "osso", geometria: g });
      }
      // Recolore a sombra do chão sem perder as manchas: escurece pela altura.
      for (const g of grupo) {
        const p = g.attributes.position;
        const c = g.attributes.color as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) {
          const f = 1 - 0.3 * (1 - Math.min(1, Math.max(0, p.getY(i) / 0.05)));
          c.setXYZ(i, c.getX(i) * f, c.getY(i) * f, c.getZ(i) * f);
        }
      }
    }

    // Espinha e costelas: a espinha corre pelo chão, as costelas sobem em arco.
    if (pf.espinha) {
      const giro = r() * 0.6 - 0.3;
      const rot = (p: V) => p.applyAxisAngle(v3(0, 1, 0), giro);
      const L = 1.3 + r() * 0.3;
      const espinha = bezier([v3(-L / 2, 0.0, 0), v3(0, 0.05, 0.08 * (r() - 0.5)), v3(L / 2, 0.01, 0.1)], nivel === 0 ? 6 : 2).map(rot);
      osso.push(sujar(tubo(espinha, espinha.map(() => 0.035), nivel === 0 ? 5 : 3), variacao));
      if (nivel === 0) {
        for (let i = 0; i < 11; i++) {
          const t = i / 10;
          const q = espinha[0].clone().lerp(espinha[espinha.length - 1], t);
          osso.push(sujar(bolha(0.045 + r() * 0.015, 0, 0.3, i, 0.8).translate(q.x, q.y + 0.03, q.z), i));
        }
      }
      const nCost = nivel === 0 ? 12 : nivel === 1 ? 8 : 2;
      for (let i = 0; i < nCost; i++) {
        const t = 0.15 + (i / Math.max(1, nCost - 1)) * 0.6;
        const raiz = espinha[0].clone().lerp(espinha[espinha.length - 1], t);
        const Rr = 0.3 + 0.16 * Math.sin(t * Math.PI) + (r() - 0.5) * 0.05;
        const quebrada = r() < 0.25;
        const tmax = quebrada ? 1.0 + r() * 0.5 : 1.9 + r() * 0.6;
        const cai = (r() - 0.5) * 0.35; // costela tombada para frente ou para trás
        const passos = nivel === 0 ? 5 : 2;
        const pts: V[] = [];
        for (let k = 0; k <= passos; k++) {
          const th = (k / passos) * tmax;
          pts.push(rot(v3(-0.12 * th + cai * Math.sin(th), Rr * Math.sin(th), Rr * (1 - Math.cos(th)))).add(raiz).setY(Rr * Math.sin(th) * 0.95 + 0.01));
        }
        const raios = pts.map((_, k) => 0.022 * (1 - (k / pts.length) * 0.45));
        osso.push(sujar(tubo(pts, raios, nivel === 0 ? 4 : 3), i + 20));
        // Do outro lado, a costela que ficou deitada e coberta de areia.
        if (nivel === 0 && r() < 0.6) {
          const deit = pts.map((p) => {
            const d = p.clone().sub(raiz);
            return raiz.clone().add(v3(d.x, 0, -d.z * 1.1)).setY(-0.005);
          });
          osso.push(sujar(tubo(deit.slice(0, 4), raios.slice(0, 4), 3), i + 40));
        }
      }
    }

    // Ossos de perna e costelas soltas, largados longe pelo urubu e pelo tempo.
    const nivelFino = nivel === 0;
    if (nivel < 2) {
      for (let i = 0; i < pf.pernas; i++) {
        const a = r() * Math.PI * 2;
        const centro = v3(Math.cos(a) * (0.5 + r() * 0.4), 0.02, Math.sin(a) * (0.5 + r() * 0.4));
        const d = v3(Math.cos(a + 1.3), 0.08, Math.sin(a + 1.3)).normalize().multiplyScalar(0.22 + r() * 0.06);
        const pts = [centro.clone().sub(d), centro.clone(), centro.clone().add(d)];
        osso.push(sujar(tubo(pts, [0.04, 0.024, 0.036], nivelFino ? 6 : 3), i + 60));
        if (nivelFino) for (const [k, ponta] of [pts[0], pts[2]].entries()) osso.push(sujar(bolha(0.05, 0, 0.35, i * 3 + k, 0.8).translate(ponta.x, ponta.y, ponta.z), i + 70));
      }
      for (let i = 0; i < pf.soltas; i++) {
        const a = r() * Math.PI * 2;
        const de = v3(Math.cos(a) * (0.3 + r() * 0.5), 0.015, Math.sin(a) * (0.3 + r() * 0.5));
        const rumo = a + (r() - 0.5) * 2;
        const comp = 0.35 + r() * 0.25;
        const pts = bezier([de, de.clone().add(v3(Math.cos(rumo) * comp * 0.5, 0.07, Math.sin(rumo) * comp * 0.5)), de.clone().add(v3(Math.cos(rumo + 0.6) * comp, 0.01, Math.sin(rumo + 0.6) * comp))], nivelFino ? 4 : 2);
        osso.push(sujar(tubo(pts, pts.map((_, k) => 0.02 * (1 - k * 0.08)), 3), i + 80));
      }
    }

    for (const g of osso) lista.push({ material: "osso", geometria: g });

    // Areia que o vento amontoou por cima: é o que faz parecer enterrada.
    if (nivel === 0) {
      for (let i = 0; i < pf.areia; i++) {
        const a = r() * Math.PI * 2;
        const monte = bolha(0.35 + r() * 0.2, 1, 0.3, variacao * 5 + i, 0.14).translate(Math.cos(a) * 0.35, -0.01, Math.sin(a) * 0.25);
        lista.push({ material: "terra", geometria: tingir(monte, AREIA, 0.12, i, 0.2, 0.05) });
      }
    }
    return pecas(lista);
  },
};

export default modelo;
