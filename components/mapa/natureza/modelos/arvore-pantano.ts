// Árvore morta de pântano: tronco apodrecido e inclinado saindo do alagado,
// pé alargado com raízes aéreas em arco, galhos finos sem folha e barba de
// musgo pendurada. Algumas variações têm o topo quebrado em lascas.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { bolha, caminho, cartao, nevar, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, NomeMaterial, Nivel } from "../tipos";
import { apodrecer, manchar, suave } from "./_pantano-comum";

const MADEIRA = "#6b5d4f";
const MADEIRA_SECA = "#8c8274";
const QUEIMADA = "#29231f";
const LODO = "#3c4128";
const BARBA = "#aaae8e";
const BARBA_SECA = "#9c9474";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];
type Ramo = { pontos: THREE.Vector3[]; raios: number[] };

const em = (pts: THREE.Vector3[], t: number) => {
  const f = t * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  return pts[i].clone().lerp(pts[i + 1], f - i);
};

function esqueleto(r: () => number, altura: number, nivel: Nivel, quebrada: boolean) {
  const ramos: Ramo[] = [];
  const pontas: Ramo[] = [];
  const raio = Math.max(0.22, altura * 0.055);
  const inclina = 0.12 + r() * 0.35;
  const dir = r() * Math.PI * 2;
  const alto = altura * (quebrada ? 0.7 : 0.92);
  const topo = new THREE.Vector3(Math.cos(dir) * alto * inclina, alto, Math.sin(dir) * alto * inclina);
  // O tronco curva: sobe reto no pé e deita depois (pesou e afundou de um lado).
  const meio = new THREE.Vector3(Math.cos(dir) * alto * inclina * 0.25, alto * 0.5, Math.sin(dir) * alto * inclina * 0.25);
  const base = suave([new THREE.Vector3(0, -0.4, 0), new THREE.Vector3(0, alto * 0.15, 0), meio, topo], nivel === 0 ? 10 : 5);
  const tronco = base.map((p, i) => (i && i < base.length - 1 ? p.add(new THREE.Vector3(r() - 0.5, 0, r() - 0.5).multiplyScalar(raio * 0.5)) : p));
  const raios = tronco.map((p, i) => {
    const t = i / (tronco.length - 1);
    const pe = Math.max(0, 1 - Math.max(0, p.y) / 1.4);
    return raio * (1 - t * (quebrada ? 0.35 : 0.72)) * (1 + pe * pe * 0.9);
  });
  ramos.push({ pontos: tronco, raios });

  // Galhos: poucos, finos, tortos, uns subindo e outros caídos.
  const n = nivel === 0 ? 4 + Math.floor(r() * 3) : 3;
  for (let i = 0; i < n; i++) {
    const t = 0.45 + (i / n) * 0.5 + r() * 0.06;
    const de = em(tronco, Math.min(0.97, t));
    const raioDe = raio * (1 - t * 0.7);
    const a = dir + (i / n) * Math.PI * 2 + (r() - 0.5) * 1.2;
    const comp = altura * (0.18 + r() * 0.22) * (1.1 - t * 0.4);
    const sobe = r() < 0.3 ? -0.15 - r() * 0.3 : 0.3 + r() * 0.8;
    const ate = de.clone().add(new THREE.Vector3(Math.cos(a) * comp, comp * sobe, Math.sin(a) * comp));
    const pts = caminho(de, ate, nivel === 0 ? 5 : 3, comp * 0.25, r);
    const r0 = Math.min(raioDe * 0.55, 0.13);
    const ramo = { pontos: pts, raios: pts.map((_, k) => r0 * (1 - (k / (pts.length - 1)) * 0.85) + 0.012) };
    ramos.push(ramo);
    pontas.push(ramo);
    if (nivel > 0) continue;
    // Gravetos que saem do galho, quase sempre para cima.
    const sub = 1 + Math.floor(r() * 3);
    for (let s = 0; s < sub; s++) {
      const d2 = em(pts, 0.35 + r() * 0.5);
      const a2 = a + (r() - 0.5) * 2;
      const c2 = comp * (0.3 + r() * 0.35);
      const f2 = d2.clone().add(new THREE.Vector3(Math.cos(a2) * c2, c2 * (0.4 + r() * 0.9), Math.sin(a2) * c2));
      const p2 = caminho(d2, f2, 3, c2 * 0.3, r);
      const g = { pontos: p2, raios: p2.map((_, k) => r0 * 0.45 * (1 - k / p2.length) + 0.008) };
      ramos.push(g);
      pontas.push(g);
    }
  }
  return { ramos, pontas, tronco, raio, dir, topo, quebrada };
}

/** Raízes aéreas: arcos que saem do pé e mergulham no lodo em volta. */
function raizes(r: () => number, raio: number, nivel: Nivel) {
  const lista: Ramo[] = [];
  const n = nivel === 0 ? 5 + Math.floor(r() * 3) : 3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.7;
    const d = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const h = 0.35 + r() * 1.1;
    const longe = raio + 0.7 + r() * 1.6;
    const ctr = [
      d.clone().multiplyScalar(raio * 0.4).setY(h + 0.2),
      d.clone().multiplyScalar(raio + (longe - raio) * 0.35).setY(h + 0.05 + r() * 0.2),
      d.clone().multiplyScalar(raio + (longe - raio) * 0.8).add(new THREE.Vector3((r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4)).setY(h * 0.35),
      d.clone().multiplyScalar(longe).setY(-0.35),
    ];
    const pts = suave(ctr, nivel === 0 ? 7 : 3);
    const r0 = raio * (0.28 + r() * 0.12);
    lista.push({ pontos: pts, raios: pts.map((_, k) => r0 * (1 - (k / (pts.length - 1)) * 0.55)) });
  }
  return lista;
}

const modelo: Modelo = {
  id: "arvore-pantano",
  nome: "Árvore morta de pântano",
  variacoes: 5,
  altura: [5, 12],
  raio: 3,
  estados: ["neve", "seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(4100 + variacao * 131);
    const altura = 5 + r() * 7;
    const quebrada = variacao % 3 === 1;
    const cor = estado.queimada ? QUEIMADA : estado.seca ? MADEIRA_SECA : MADEIRA;
    const matMadeira: NomeMaterial = estado.queimada ? "carvao" : "casca";
    const sk = esqueleto(r, altura, nivel, quebrada);

    if (nivel === 2) {
      const lista: Lista = [];
      const t = [sk.tronco[0], em(sk.tronco, 0.5), sk.tronco[sk.tronco.length - 1]];
      lista.push({ material: matMadeira, geometria: tingir(tubo(t, [sk.raio * 1.8, sk.raio * 1.1, sk.raio * 0.6], 5), cor, 0.1, variacao, 0.4, 1.5) });
      for (const g of sk.pontas.slice(0, 2)) {
        const p = [g.pontos[0], g.pontos[g.pontos.length - 1]];
        lista.push({ material: matMadeira, geometria: tingir(tubo(p, [0.12, 0.04], 3), cor, 0.1, variacao) });
      }
      return pecas(lista);
    }

    const lista: Lista = [];
    const lados = nivel === 0 ? 9 : 5;
    const madeira: THREE.BufferGeometry[] = [];
    // Tronco apodrecido: perfil irregular, lodo e musgo no pé.
    const tronco = apodrecer(tubo(sk.ramos[0].pontos, sk.ramos[0].raios, lados, !quebrada), sk.raio * 0.28, 1.6, variacao);
    madeira.push(tronco);
    for (const g of sk.ramos.slice(1)) madeira.push(tubo(g.pontos, g.raios, g.raios[0] < 0.05 || nivel > 0 ? 3 : 5, true));
    for (const g of raizes(r, sk.raio, nivel)) madeira.push(apodrecer(tubo(g.pontos, g.raios, nivel === 0 ? 6 : 4), g.raios[0] * 0.2, 2.5, variacao + 3));

    // Topo quebrado: lascas pontudas em volta da boca do tronco.
    if (sk.quebrada) {
      const boca = sk.tronco[sk.tronco.length - 1];
      const rb = sk.ramos[0].raios[sk.ramos[0].raios.length - 1];
      const nl = nivel === 0 ? 5 : 3;
      for (let i = 0; i < nl; i++) {
        const a = (i / nl) * Math.PI * 2 + r() * 0.5;
        const de = boca.clone().add(new THREE.Vector3(Math.cos(a) * rb * 0.6, -0.05, Math.sin(a) * rb * 0.6));
        const ate = de.clone().add(new THREE.Vector3(Math.cos(a) * rb * 0.25, 0.3 + r() * 1.1, Math.sin(a) * rb * 0.25));
        madeira.push(tubo([de, ate], [rb * 0.42, 0.01], 3));
      }
    }

    for (const m of madeira) {
      tingir(m, cor, estado.seca ? 0.14 : 0.22, variacao, 0.4, 2.2);
      if (!estado.queimada) {
        manchar(m, estado.seca ? "#6e6656" : LODO, 1.3, 0.42, 0.75, variacao + 11, 2.6);
        manchar(m, estado.seca ? "#a39a88" : "#7a7262", 3, 0.66, 0.5, variacao + 13);
      } else {
        manchar(m, "#4a3a2c", 2.4, 0.62, 0.6, variacao + 13);
      }
      lista.push({ material: matMadeira, geometria: m });
    }

    // Tufos de musgo no pé, onde as raízes encontram o tronco.
    if (!estado.queimada && nivel === 0) {
      const nt = 3 + Math.floor(r() * 3);
      for (let i = 0; i < nt; i++) {
        const a = r() * Math.PI * 2;
        const d = sk.raio * (0.9 + r() * 0.6);
        const tufo = bolha(0.25 + r() * 0.3, 1, 0.35, variacao * 7 + i, 0.45).translate(Math.cos(a) * d, 0.05 + r() * 0.35, Math.sin(a) * d);
        lista.push({ material: "musgo", geometria: tingir(tufo, estado.seca ? "#6d6a4c" : "#46522e", 0.25, variacao + i, 0.4, 0.6) });
      }
    }

    // Barba de musgo pendurada nos galhos (cartões de capim de cabeça para baixo).
    if (!estado.queimada) {
      const porGalho = nivel === 0 ? (estado.seca ? 1 : 3) : 1;
      for (const g of sk.pontas) {
        for (let i = 0; i < porGalho; i++) {
          if (r() < 0.25) continue;
          const de = em(g.pontos, 0.2 + r() * 0.75);
          const comp = 0.7 + r() * (nivel === 0 ? 1.8 : 1.2);
          const larg = 0.16 + r() * 0.24;
          const a = r() * Math.PI;
          const c = de.clone().add(new THREE.Vector3(0, -comp * 0.45, 0));
          const card = cartao(c, larg, comp, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), Math.PI + (r() - 0.5) * 0.2, ATLAS.capim);
          tingir(card, estado.seca ? BARBA_SECA : BARBA, 0.25, variacao + 5);
          manchar(card, "#7c8262", 2, 0.55, 0.5, variacao + 17);
          lista.push({ material: "folhagem", geometria: card });
        }
      }
    }

    if (estado.neve && nivel === 0) {
      for (const m of madeira) lista.push({ material: "neve", geometria: nevar(m, estado.neve, 0.04) });
    }
    return pecas(lista);
  },
};

export default modelo;
