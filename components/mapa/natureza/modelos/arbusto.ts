// Arbusto de campo, folha larga, 1 a 2,5 m: várias hastes tortas saindo de uma
// touça, abrindo em leque, com cachos de folha nas pontas e um miolo escuro que
// tapa o vazio de dentro. Mais largo no meio para baixo: peso visual no chão.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { bolha, caminho, cartao, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, Nivel, NomeMaterial } from "../tipos";
import { desviar } from "./_chao-comum";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];
type Haste = { pontos: THREE.Vector3[]; raios: number[]; ponta: THREE.Vector3 };

const CASCA = "#5e4c3b";
const QUEIMADA = "#2a2420";
const FOLHA = { viva: "#6f8a48", seca: "#a08a52", miolo: "#34401f", mioloSeco: "#5a4a2c" };

function hastes(r: () => number, h: number, larg: number, nivel: Nivel) {
  const lista: Haste[] = [];
  const n = nivel === 0 ? 5 + Math.floor(r() * 3) : 3;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + r() * 0.8;
    const pe = new THREE.Vector3((r() - 0.5) * 0.15, 0, (r() - 0.5) * 0.15);
    const alto = h * (0.55 + r() * 0.35);
    const abre = larg * (0.35 + r() * 0.3);
    const fim = new THREE.Vector3(Math.cos(ang) * abre, alto, Math.sin(ang) * abre);
    const pts = caminho(pe, fim, nivel === 0 ? 4 : 2, h * 0.18, r);
    const r0 = 0.018 + h * 0.012;
    lista.push({ pontos: pts, raios: pts.map((_, k) => r0 * (1 - (k / pts.length) * 0.7)), ponta: fim });
    if (nivel > 0) continue;
    // Raminhos laterais: o desenho rendado da borda.
    for (let s = 0; s < 2; s++) {
      const de = pts[1 + Math.floor(r() * (pts.length - 2))];
      const a2 = ang + (r() - 0.5) * 1.8;
      const comp = h * (0.18 + r() * 0.2);
      const ate = de.clone().add(new THREE.Vector3(Math.cos(a2) * comp, h * (0.08 + r() * 0.15), Math.sin(a2) * comp));
      const p2 = caminho(de, ate, 2, 0.06, r);
      lista.push({ pontos: p2, raios: p2.map((_, k) => r0 * 0.45 * (1 - (k / p2.length) * 0.7)), ponta: ate });
    }
  }
  return lista;
}

const modelo: Modelo = {
  id: "arbusto",
  nome: "Arbusto",
  variacoes: 5,
  altura: [1, 2.5],
  raio: 1.2,
  estados: ["neve", "seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(6100 + variacao * 113);
    const h = 1 + r() * 1.5;
    const larg = h * (0.75 + r() * 0.35);
    const neve = estado.neve ?? 0;
    const seca = !!estado.seca;
    const corFolha = seca ? FOLHA.seca : neve > 0 ? new THREE.Color(FOLHA.viva).lerp(new THREE.Color("#8d9478"), neve * 0.5) : FOLHA.viva;
    // Miolo deslocado: a moita nunca é redonda.
    const desloc = new THREE.Vector3((r() - 0.5) * larg * 0.25, 0, (r() - 0.5) * larg * 0.25);
    const lista: Lista = [];

    if (nivel === 2) {
      if (estado.queimada) {
        const g = tubo([new THREE.Vector3(), new THREE.Vector3(0, h * 0.6, 0)], [0.04, 0.02], 3);
        return pecas([{ material: "carvao", geometria: tingir(g, QUEIMADA, 0.1, variacao) }]);
      }
      // Longe: miolo escuro baixo e quatro cartões grandes de folha em volta.
      const miolo = bolha(larg * 0.32, 0, 0.3, variacao, 0.9).translate(desloc.x, h * 0.36, desloc.z);
      lista.push({ material: "musgo", geometria: tingir(miolo, seca ? FOLHA.mioloSeco : FOLHA.miolo, 0.15, variacao, 0.4, h) });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + r() * 0.6;
        const c = new THREE.Vector3(desloc.x + Math.cos(a) * larg * 0.15, h * (0.5 + r() * 0.15), desloc.z + Math.sin(a) * larg * 0.15);
        const n = new THREE.Vector3(Math.cos(a), 0.5 + r() * 0.5, Math.sin(a)).normalize();
        lista.push({ material: "folhagem", geometria: tingir(cartao(c, larg * 0.95, h * 0.95, n, r() * 6.28, ATLAS.larga), corFolha, 0.15, variacao, 0.5, h) });
      }
      if (neve > 0) lista.push({ material: "neve", geometria: tingir(bolha(larg * 0.35, 0, 0.3, variacao + 1, 0.3).translate(desloc.x, h * 0.8, desloc.z), "#f2f4f5", 0.04, variacao) });
      return pecas(lista);
    }

    const galhos = hastes(r, h, larg, nivel);
    const corMadeira = estado.queimada ? QUEIMADA : CASCA;
    for (const g of galhos) {
      const pts = g.pontos.map((p) => p.clone().add(desloc.clone().multiplyScalar(p.y / h)));
      g.ponta.add(desloc.clone().multiplyScalar(g.ponta.y / h));
      const lados = g.raios[0] < 0.015 || nivel > 0 ? 3 : 4;
      lista.push({ material: estado.queimada ? "carvao" : "casca", geometria: tingir(tubo(pts, g.raios, lados), corMadeira, 0.18, variacao, 0.35, 0.6) });
    }
    if (estado.queimada) return pecas(lista);

    // Miolo: massa escura e baixa que dá corpo e sombra por dentro.
    if (!seca || nivel === 0) {
      const miolo = bolha(larg * 0.3, nivel === 0 ? 1 : 0, 0.35, variacao + 2, Math.min(1, (h * 0.32) / (larg * 0.3))).translate(desloc.x * 0.6, h * 0.36, desloc.z * 0.6);
      lista.push({ material: "musgo", geometria: tingir(miolo, seca ? FOLHA.mioloSeco : FOLHA.miolo, 0.15, variacao, 0.5, h * 0.8) });
    }

    // Cachos de folha nas pontas e no meio das hastes: volume embaixo, borda rendada em cima.
    const porPonta = nivel === 0 ? (seca ? 2 : 6) : 4;
    const tam = h * (nivel === 0 ? 0.42 : 0.55);
    const neveCachos: THREE.Vector3[] = [];
    for (const g of galhos) {
      const pm = g.pontos[Math.floor(g.pontos.length * 0.6)];
      const meio = pm.clone().add(desloc.clone().multiplyScalar(pm.y / h));
      const centros = nivel === 0 && g.raios[0] > 0.02 && !seca ? [g.ponta, g.ponta, meio] : [g.ponta];
      for (let i = 0; i < porPonta * centros.length; i++) {
        const de = centros[i % centros.length];
        const c = de.clone().add(new THREE.Vector3((r() - 0.5) * tam, (r() - 0.5) * tam * 0.6, (r() - 0.5) * tam));
        c.y = Math.max(c.y, tam * 0.4);
        // Cartões em todas as direções, com leve preferência para cima: sem pratos chatos.
        const normal = new THREE.Vector3(r() - 0.5, 0.15 + r() * 0.6, r() - 0.5).normalize();
        const f = cartao(c, tam * (0.8 + r() * 0.5), tam * (0.7 + r() * 0.4), normal, r() * Math.PI * 2, ATLAS.larga);
        // Geada: as folhas de cima clareiam com a neve.
        const cor = desviar(corFolha, r, 0.025, 0.12).lerp(new THREE.Color("#dfe4e2"), neve * 0.55 * Math.min(1, c.y / h));
        lista.push({ material: "folhagem", geometria: tingir(f, cor, 0.2, variacao + 7, 0.55, h) });
        if (i < centros.length && de === g.ponta && c.y > h * 0.55) neveCachos.push(c);
      }
    }

    if (neve > 0) {
      // Bolos de neve assentados no alto dos cachos (o chão nevado é do terreno).
      for (const c of neveCachos.slice(0, nivel === 0 ? 6 : 2)) {
        const s = bolha(tam * (0.18 + neve * 0.17), 0, 0.3, variacao + Math.round(c.x * 100), 0.4).translate(c.x, c.y + tam * 0.05, c.z);
        lista.push({ material: "neve", geometria: tingir(s, "#f0f3f4", 0.05, variacao) });
      }
    }
    return pecas(lista);
  },
};

export default modelo;
