// Capim alto de cerrado (barba-de-bode, capim-flecha): touceira de 1 a 1,8 m,
// lâminas que arqueiam para fora e pendões finos passando por cima com a semente
// na ponta. Verde-oliva no pé, palha na ponta; na seca vira dourado.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { pecas, sorteio, tubo } from "../ferramentas";
import type { Modelo, NomeMaterial } from "../tipos";
import { degrade, desviar, lamina } from "./_chao-comum";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];

const COR = {
  viva: { pe: "#5f6a40", ponta: "#b3ab68", haste: "#9a9160", semente: "#b08c6a" },
  seca: { pe: "#6e5631", ponta: "#dcc27e", haste: "#c9ad6c", semente: "#9a7448" },
  neve: { pe: "#626050", ponta: "#e4e4dc", haste: "#b5aa88", semente: "#7c6650" },
};

const modelo: Modelo = {
  id: "capim-alto",
  nome: "Capim alto",
  variacoes: 5,
  altura: [1, 1.8],
  raio: 0.6,
  estados: ["neve", "seca"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(4200 + variacao * 131);
    const neve = estado.neve ?? 0;
    const cor = estado.seca ? COR.seca : neve > 0 ? COR.neve : COR.viva;
    // Neve pesa: a touceira encolhe e deita.
    const h = (1 + r() * 0.8) * (1 - neve * 0.35);
    const largo = 0.22 + r() * 0.2;
    // Touceira que cresceu torta: o vento deitou tudo um pouco para um lado.
    const ventoAng = r() * Math.PI * 2;
    const vento = new THREE.Vector3(Math.cos(ventoAng), 0, Math.sin(ventoAng)).multiplyScalar(0.06 + r() * 0.12);
    const lista: Lista = [];

    if (nivel === 2) {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI + r() * 0.4;
        const g = lamina(new THREE.Vector3(), a, h * 1.05, h, 0, ATLAS.capim, 1, 0.3);
        lista.push({ material: "folhagem", geometria: degrade(g, cor.pe, cor.ponta, h, 0.1, variacao) });
      }
      return pecas(lista);
    }

    const cartoes = nivel === 0 ? 16 + Math.floor(r() * 6) : 7;
    const segs = nivel === 0 ? 3 : 1;
    for (let i = 0; i < cartoes; i++) {
      // Os de fora são mais baixos e arqueiam mais; os de dentro sobem retos.
      const fora = i / cartoes;
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * largo * 0.5;
      const base = new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
      const alt = h * (1.05 - fora * 0.4) * (0.85 + r() * 0.3);
      const curva = alt * (0.08 + fora * 0.35 + r() * 0.12 + neve * 0.3);
      const giro = a + (r() - 0.5) * 1.2;
      const g = lamina(base, giro, alt * (0.75 + r() * 0.25), alt, curva, ATLAS.capim, segs, 0.15, a);
      // Pé enterrado uns centímetros: a borda de baixo do cartão some no chão.
      g.translate(vento.x * (alt / h), -0.05, vento.z * (alt / h));
      const pe = desviar(cor.pe, r, 0.02, 0.15);
      const ponta = desviar(cor.ponta, r, 0.025, 0.12);
      lista.push({ material: "folhagem", geometria: degrade(g, pe, ponta, h, 0.14, variacao * 7 + i, 0.55) });
    }

    // Pendões: hastes finas acima da folha, com a semente engrossando na ponta.
    const pendoes = nivel === 0 ? 4 + Math.floor(r() * 5) : 2;
    if (neve <= 0.6) {
      for (let i = 0; i < pendoes; i++) {
        const a = r() * Math.PI * 2;
        const d = r() * largo * 0.3;
        const alt = h * (1.15 + r() * 0.3);
        const pe = new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
        const lean = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(alt * (0.06 + r() * 0.16)).add(vento.clone().multiplyScalar(1.6));
        const passos = nivel === 0 ? 5 : 2;
        const pts: THREE.Vector3[] = [];
        for (let k = 0; k <= passos; k++) {
          const t = k / passos;
          pts.push(pe.clone().addScaledVector(lean, t * t).setY(alt * t));
        }
        // Semente: o último terço engorda (espiga) e afina na ponta.
        const raios = pts.map((_, k) => {
          const t = k / passos;
          if (nivel > 0) return t < 0.6 ? 0.006 : 0.012;
          return t < 0.62 ? 0.006 - t * 0.003 : t < 0.98 ? 0.008 + Math.sin(((t - 0.62) / 0.38) * Math.PI) * 0.007 : 0.002;
        });
        const g = tubo(pts, raios, 3);
        lista.push({ material: "casca-clara", geometria: degrade(g, cor.haste, cor.semente, alt, 0.12, variacao + i, 3) });
      }
    }

    return pecas(lista);
  },
};

export default modelo;
