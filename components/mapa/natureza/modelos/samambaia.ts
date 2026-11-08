// Samambaia da mata: touceira de frondes arqueadas no chão úmido e o
// samambaiaçu, a samambaia de tronco, com a coroa de frondes lá em cima e a
// saia de folha morta pendurada. Variação par é touceira, ímpar é samambaiaçu.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { bolha, caminho, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, NomeMaterial, Nivel } from "../tipos";
import { escurecer, folhaArqueada, manchar, nevarFolhas, troncoComRelevo, v3 } from "./_mata-comum";

const VERDES = ["#5d7a3c", "#6a843f", "#557236", "#728a44"];
const SECAS = ["#a08550", "#9a7a46", "#b09358"];
const MORTA = "#7a5a38";
const TRONCO = "#3e3128";
const FIBRA = "#5a4632";
const QUEIMADA = "#221e1b";
const TERRA = "#4a3c2e";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];

/** Espinha da fronde: sai quase em pé e vai deitando até a ponta cair. */
function espinha(base: THREE.Vector3, azimute: number, elevacao: number, comprimento: number, queda: number, segs: number, r: () => number) {
  const pts = [base.clone()];
  let el = elevacao;
  let az = azimute;
  const passo = comprimento / segs;
  const p = base.clone();
  for (let i = 0; i < segs; i++) {
    p.add(v3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).multiplyScalar(passo));
    pts.push(p.clone());
    // A queda total não depende de quantos segmentos: o nível 2 curva igual ao 0.
    el -= queda * (0.6 + i * 0.35) * Math.pow(5 / segs, 1.6);
    az += (r() - 0.5) * 0.15;
  }
  return pts;
}

function frondes(
  r: () => number,
  base: THREE.Vector3,
  quantas: number,
  comprimento: [number, number],
  elevacao: [number, number],
  queda: number,
  nivel: Nivel,
  cores: string[],
  neve: number,
  seed: number,
) {
  const lista: THREE.BufferGeometry[] = [];
  const segs = nivel === 0 ? 5 : nivel === 1 ? 3 : 2;
  const giro0 = r() * Math.PI * 2;
  for (let i = 0; i < quantas; i++) {
    const az = giro0 + (i / quantas) * Math.PI * 2 * 1.618 * 2 + (r() - 0.5) * 0.5;
    // As de dentro (as últimas) são mais novas: mais curtas e mais em pé.
    const nova = i / quantas;
    const comp = comprimento[0] + (comprimento[1] - comprimento[0]) * (1 - nova * 0.6) * (0.75 + r() * 0.25);
    const el = elevacao[0] + (elevacao[1] - elevacao[0]) * (nova * 0.7 + r() * 0.3);
    const inicio = base.clone().add(v3((r() - 0.5) * 0.08, 0, (r() - 0.5) * 0.08));
    const pts = espinha(inicio, az, el, comp, queda * (0.8 + r() * 0.5) * (1.1 - nova * 0.4), segs, r);
    const f = folhaArqueada(pts, comp * (0.34 + r() * 0.08), ATLAS.fronde, nivel === 2 ? 0 : 0.14 + r() * 0.08, (r() - 0.5) * 0.5, nivel === 2);
    tingir(f, cores[Math.floor(r() * cores.length)], 0.18, seed + i, 0.45, base.y + comp * 0.6);
    // A ponta pega mais sol; o miolo da touceira é sombra.
    escurecer(f, (p) => 0.7 + 0.35 * Math.min(1, p.distanceTo(base) / comp));
    if (neve) nevarFolhas(f, neve, seed + i);
    lista.push(f);
  }
  return lista;
}

/** Fronde morta: pendurada para baixo, marrom, é a saia do samambaiaçu. */
function mortas(r: () => number, base: THREE.Vector3, quantas: number, comprimento: number, nivel: Nivel, seed: number) {
  const lista: THREE.BufferGeometry[] = [];
  for (let i = 0; i < quantas; i++) {
    const az = r() * Math.PI * 2;
    const pts = espinha(base.clone().add(v3(0, -0.05, 0)), az, -0.15 - r() * 0.3, comprimento * (0.7 + r() * 0.3), 0.35, nivel === 0 ? 4 : 2, r);
    const f = folhaArqueada(pts, comprimento * 0.3, ATLAS.fronde, 0.3, (r() - 0.5) * 1.2, nivel !== 0);
    lista.push(tingir(f, i % 2 ? MORTA : "#6a4e32", 0.2, seed + i, 0.3, base.y));
  }
  return lista;
}

/** Báculo: o broto enrolado que vai virar fronde. */
function baculo(base: THREE.Vector3, az: number, alto: number, r: () => number) {
  const pts: THREE.Vector3[] = [];
  const n = 7;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const a = t * Math.PI * 1.6;
    const raio = alto * 0.25 * (1 - t * 0.6);
    pts.push(base.clone().add(v3(Math.cos(az) * Math.sin(a) * raio, alto * 0.6 * t + Math.sin(a) * raio * (t > 0.5 ? 1 : 0.3), Math.sin(az) * Math.sin(a) * raio)));
  }
  const raioTubo = 0.012 + r() * 0.006;
  return tubo(pts, pts.map((_, k) => raioTubo * (1 + (k / n) * 0.8)), 3, true);
}

/** Toco de fronde queimada: só a raque preta, torta e curta. */
function raques(r: () => number, base: THREE.Vector3, quantas: number, comprimento: number) {
  const lista: THREE.BufferGeometry[] = [];
  for (let i = 0; i < quantas; i++) {
    const az = r() * Math.PI * 2;
    const pts = espinha(base.clone(), az, 0.6 + r() * 0.8, comprimento * (0.3 + r() * 0.6), 0.25, 3, r);
    lista.push(tingir(tubo(pts, pts.map((_, k) => 0.02 * (1 - k * 0.2)), 3, true), QUEIMADA, 0.2, i, 0.3, base.y + 0.5));
  }
  return lista;
}

const modelo: Modelo = {
  id: "samambaia",
  nome: "Samambaia",
  variacoes: 6,
  altura: [0.8, 5],
  raio: 1.6,
  estados: ["neve", "seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(7300 + variacao * 53);
    const deTronco = variacao % 2 === 1;
    const neve = estado.neve ?? 0;
    const seca = !!estado.seca;
    const queimada = !!estado.queimada;
    const cores = seca ? SECAS : [VERDES[variacao % VERDES.length], VERDES[(variacao + 1) % VERDES.length]];
    const lista: Lista = [];
    let coroa = v3(0, 0.05, 0);

    if (deTronco) {
      // Samambaiaçu: tronco fibroso de cáudice, mais grosso no pé (massa de raiz).
      const alturaTronco = 1.4 + ((variacao >> 1) % 3) * 1.1 + r() * 0.8;
      const raio = 0.11 + r() * 0.05;
      const lean = v3((r() - 0.5) * 0.6, 0, (r() - 0.5) * 0.6);
      const curva = (y: number) => {
        const t = Math.max(0, y) / alturaTronco;
        return new THREE.Vector2(lean.x * t * t + Math.sin(t * 4 + variacao) * 0.05, lean.z * t * t);
      };
      if (nivel === 2) {
        const pe = tubo([v3(0, -0.1, 0), v3(lean.x, alturaTronco, lean.z)], [raio * 1.6, raio], 4);
        lista.push({ material: queimada ? "carvao" : "casca", geometria: tingir(pe, queimada ? QUEIMADA : TRONCO, 0.1, variacao) });
      } else {
        const tronco = troncoComRelevo(
          alturaTronco,
          (t) => raio * (1 + Math.max(0, 1 - t * 4) * 0.9 + t * 0.15),
          nivel === 0 ? 7 : 5,
          nivel === 0 ? 7 : 3,
          // Cicatrizes das frondes velhas: calombos em losango pelo tronco.
          (a, y) => 1 + (nivel === 0 ? Math.max(0, Math.sin(a * 3 + y * 9) * Math.sin(y * 7 - a)) * 0.22 : 0),
          curva,
        );
        tingir(tronco, queimada ? QUEIMADA : TRONCO, 0.2, variacao, 0.3, 1);
        if (!queimada) manchar(tronco, FIBRA, 1, 2.5, variacao, 0);
        lista.push({ material: queimada ? "carvao" : "casca", geometria: tronco });
      }
      const c = curva(alturaTronco);
      coroa = v3(c.x, alturaTronco, c.y);
      if (nivel === 0 && !queimada) {
        for (const m of mortas(r, coroa, 4 + Math.floor(r() * 3), 1.4 + r() * 0.5, nivel, variacao)) lista.push({ material: "folhagem", geometria: m });
      }
    } else if (nivel !== 2) {
      // Touceira: montinho de terra e folha podre de onde saem as frondes.
      const monte = bolha(0.28 + r() * 0.1, 1, 0.35, variacao, 0.22).translate(0, -0.03, 0);
      lista.push({ material: "terra", geometria: tingir(monte, queimada ? "#3b3632" : TERRA, 0.2, variacao, 0.4, 0.15) });
    }

    if (queimada) {
      for (const q of raques(r, coroa, nivel === 2 ? 3 : nivel === 1 ? 5 : 9, deTronco ? 1.4 : 0.8)) lista.push({ material: "carvao", geometria: q });
      return pecas(lista);
    }

    const quantas = deTronco ? (nivel === 0 ? 15 + Math.floor(r() * 4) : nivel === 1 ? 11 : 7) : nivel === 0 ? 16 + Math.floor(r() * 6) : nivel === 1 ? 8 : 5;
    const comprimento: [number, number] = deTronco ? [1.4 + r() * 0.4, 2.2 + r() * 0.6] : [0.6 + r() * 0.25, 1.1 + r() * 0.5];
    const elevacao: [number, number] = deTronco ? [0.25, 0.85] : [0.65, 1.25];
    const queda = (deTronco ? 0.2 : 0.24) * (seca ? 1.5 : 1);
    for (const f of frondes(r, coroa, seca ? Math.ceil(quantas * 0.7) : quantas, comprimento, elevacao, queda, nivel, cores, neve, variacao)) {
      lista.push({ material: "folhagem", geometria: f });
    }
    if (!deTronco && nivel === 0) {
      // Folhas velhas deitadas no chão em volta da touceira.
      for (const m of mortas(r, v3(0, 0.15, 0), 3, comprimento[1] * 0.9, nivel, variacao + 3)) lista.push({ material: "folhagem", geometria: m });
    }
    if (nivel === 0 && !seca) {
      for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
        const b = baculo(coroa.clone().add(v3((r() - 0.5) * 0.1, 0, (r() - 0.5) * 0.1)), r() * Math.PI * 2, deTronco ? 0.35 : 0.25, r);
        lista.push({ material: "casca", geometria: tingir(b, "#6f7a3e", 0.2, variacao, 0, 1) });
      }
    }
    if (deTronco && nivel === 0) {
      // Raízes aéreas na base, enroladas como um saiote.
      for (let i = 0; i < 4; i++) {
        const a = r() * Math.PI * 2;
        const pts = caminho(v3(Math.cos(a) * 0.15, 0.6 + r() * 0.4, Math.sin(a) * 0.15), v3(Math.cos(a) * 0.45, -0.05, Math.sin(a) * 0.45), 3, 0.1, r);
        lista.push({ material: "casca", geometria: tingir(tubo(pts, pts.map(() => 0.04), 4), TRONCO, 0.2, i, 0.3, 0.6) });
      }
    }
    return pecas(lista);
  },
};

export default modelo;
