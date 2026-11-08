// Capim baixo: tufo rasteiro de 20 a 50 cm, o que forra o pasto e a beira da estrada.
// Usado aos milhares, então cada nível é mínimo: perto ~50 triângulos, longe 4.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { pecas, sorteio } from "../ferramentas";
import type { Modelo, NomeMaterial } from "../tipos";
import { degrade, desviar, lamina } from "./_chao-comum";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];

const COR = {
  viva: { pe: "#4f5a30", ponta: "#9fa060" },
  seca: { pe: "#6f5a35", ponta: "#d2b878" },
  neve: { pe: "#626050", ponta: "#e2e3dc" },
};

const modelo: Modelo = {
  id: "capim-baixo",
  nome: "Capim baixo",
  variacoes: 6,
  altura: [0.2, 0.5],
  raio: 0.25,
  estados: ["neve", "seca"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(5300 + variacao * 89);
    const neve = estado.neve ?? 0;
    const cor = estado.seca ? COR.seca : neve > 0 ? COR.neve : COR.viva;
    const h = (0.22 + r() * 0.28) * (1 - neve * 0.45);
    const largo = 0.1 + r() * 0.12;
    const deita = r() * Math.PI * 2;
    const lista: Lista = [];

    const cartoes = nivel === 0 ? 10 + Math.floor(r() * 4) : nivel === 1 ? 4 : 2;
    const segs = nivel === 0 ? 2 : 1;
    for (let i = 0; i < cartoes; i++) {
      const a = nivel === 2 ? (i / 2) * Math.PI + r() * 0.5 : r() * Math.PI * 2;
      const d = nivel === 2 ? 0 : Math.sqrt(r()) * largo * 0.5;
      const base = new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
      const alt = h * (0.7 + r() * 0.45);
      // Metade cai para o lado onde o tufo deitou: indivíduo, não bola.
      const inclina = r() < 0.5 ? deita + (r() - 0.5) * 1.4 : a;
      const curva = segs > 1 ? alt * (0.15 + r() * 0.45 + neve * 0.4) : 0;
      const g = lamina(base, a + (r() - 0.5), alt * (1 + r() * 0.5), alt, curva, ATLAS.capim, segs, 0.35, inclina).translate(0, -0.02, 0);
      lista.push({ material: "folhagem", geometria: degrade(g, desviar(cor.pe, r, 0.02, 0.15), desviar(cor.ponta, r, 0.03, 0.12), h, 0.12, variacao * 5 + i, 0.8) });
    }

    return pecas(lista);
  },
};

export default modelo;
