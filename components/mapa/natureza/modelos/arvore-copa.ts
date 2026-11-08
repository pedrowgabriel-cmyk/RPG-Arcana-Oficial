// Árvore de copa larga (ipê, jatobá): tronco curto e torto que abre em galhos
// grossos, copa em cachos de folha. É a árvore de fazenda e de praça.
// Referência de qualidade para os outros modelos.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { bolha, caminho, cartao, nevar, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, NomeMaterial, Nivel } from "../tipos";

const CASCA = "#6a5644";
const QUEIMADA = "#2a2420";
const FOLHA_VIVA = "#7e9a52";
const FOLHA_SECA = "#b08a4a";

type Galho = { pontos: THREE.Vector3[]; raios: number[]; ponta: THREE.Vector3 };

/** Tronco e galhos: cada galho sai do anterior, afina e curva, até as pontas onde nasce a folha. */
function esqueleto(r: () => number, altura: number, nivel: Nivel) {
  const galhos: Galho[] = [];
  const topoDoTronco = new THREE.Vector3((r() - 0.5) * 0.8, altura * (0.38 + r() * 0.12), (r() - 0.5) * 0.8);
  const raioTronco = altura * 0.045;
  const tronco = caminho(new THREE.Vector3(0, 0, 0), topoDoTronco, nivel === 0 ? 6 : 3, 0.5, r);
  galhos.push({ pontos: tronco, raios: tronco.map((_, i) => raioTronco * (1.25 - (i / tronco.length) * 0.45)), ponta: topoDoTronco });

  const principais = nivel === 0 ? 4 + Math.floor(r() * 2) : 3;
  for (let i = 0; i < principais; i++) {
    const ang = (i / principais) * Math.PI * 2 + r() * 0.6;
    const abre = altura * (0.28 + r() * 0.14);
    const fim = topoDoTronco.clone().add(new THREE.Vector3(Math.cos(ang) * abre, altura * (0.22 + r() * 0.2), Math.sin(ang) * abre));
    const pts = caminho(topoDoTronco, fim, nivel === 0 ? 5 : 3, 0.6, r);
    const r0 = raioTronco * (0.55 + r() * 0.15);
    galhos.push({ pontos: pts, raios: pts.map((_, k) => r0 * (1 - (k / pts.length) * 0.7)), ponta: fim });
    if (nivel > 0) continue;
    // Galhos secundários: é deles que vem o desenho rendado da copa.
    for (let s = 0; s < 3; s++) {
      const de = pts[2 + Math.floor(r() * (pts.length - 3))];
      const a2 = ang + (r() - 0.5) * 1.6;
      const comp = altura * (0.12 + r() * 0.12);
      const ate = de.clone().add(new THREE.Vector3(Math.cos(a2) * comp, altura * (0.06 + r() * 0.12), Math.sin(a2) * comp));
      const p2 = caminho(de, ate, 3, 0.3, r);
      galhos.push({ pontos: p2, raios: p2.map((_, k) => r0 * 0.4 * (1 - (k / p2.length) * 0.8)), ponta: ate });
    }
  }
  return galhos;
}

/** Cachos de folha em volta das pontas: cartões cruzados, mais densos por cima. */
function copa(r: () => number, galhos: Galho[], altura: number, nivel: Nivel, seca: boolean) {
  const lista: THREE.BufferGeometry[] = [];
  const porPonta = nivel === 0 ? (seca ? 3 : 9) : 3;
  const tamanho = altura * (nivel === 0 ? 0.26 : 0.42);
  for (const g of galhos.slice(1)) {
    for (let i = 0; i < porPonta; i++) {
      const c = g.ponta.clone().add(new THREE.Vector3((r() - 0.5) * tamanho, (r() - 0.3) * tamanho * 0.6, (r() - 0.5) * tamanho));
      const normal = new THREE.Vector3(r() - 0.5, 0.35 + r() * 0.6, r() - 0.5).normalize();
      lista.push(cartao(c, tamanho * (0.9 + r() * 0.5), tamanho * (0.8 + r() * 0.4), normal, r() * Math.PI * 2, ATLAS.larga));
    }
  }
  return lista;
}

const modelo: Modelo = {
  id: "arvore-copa",
  nome: "Árvore de copa larga (ipê, jatobá)",
  variacoes: 4,
  altura: [7, 12],
  raio: 4,
  estados: ["neve", "seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(1000 + variacao * 97);
    const altura = 7 + r() * 5;
    const corDaMadeira = estado.queimada ? QUEIMADA : CASCA;

    // Longe: só a silhueta, um tronco e uma massa achatada.
    if (nivel === 2) {
      const pe = tubo([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, altura * 0.5, 0)], [altura * 0.05, altura * 0.04], 4);
      const lista: { material: NomeMaterial; geometria: THREE.BufferGeometry }[] = [{ material: "casca", geometria: tingir(pe, corDaMadeira, 0.1, variacao) }];
      if (!estado.queimada) {
        const massa = bolha(altura * 0.32, 0, 0.25, variacao, 0.62).translate(0, altura * 0.68, 0);
        lista.push({ material: estado.neve ? "neve" : "musgo", geometria: tingir(massa, estado.neve ? "#ffffff" : estado.seca ? FOLHA_SECA : FOLHA_VIVA, 0.12, variacao) });
      }
      return pecas(lista);
    }

    const galhos = esqueleto(r, altura, nivel);
    const lados = nivel === 0 ? 8 : 5;
    const madeira = galhos.map((g) => tingir(tubo(g.pontos, g.raios, g.raios[0] < 0.08 ? 4 : lados, true), corDaMadeira, 0.18, variacao, 0.35, 1.5));
    const lista: { material: NomeMaterial; geometria: THREE.BufferGeometry }[] = madeira.map((m) => ({ material: estado.queimada ? "carvao" : "casca", geometria: m }));
    if (!estado.queimada) {
      for (const f of copa(r, galhos, altura, nivel, !!estado.seca)) {
        // Folha de cima mais clara (sol), de dentro mais escura: volume sem textura.
        lista.push({ material: "folhagem", geometria: tingir(f, estado.seca ? FOLHA_SECA : FOLHA_VIVA, 0.22, variacao + 7, 0.5, altura * 0.95) });
      }
    }
    if (estado.neve && nivel === 0) {
      for (const m of madeira.slice(1)) lista.push({ material: "neve", geometria: nevar(m, estado.neve, 0.05) });
    }
    return pecas(lista);
  },
};

export default modelo;
