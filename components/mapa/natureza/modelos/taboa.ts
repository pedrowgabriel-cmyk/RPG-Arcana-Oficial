// Touceira de taboa e junco de brejo: folhas longas em leque (cartões do atlas
// "capim"), hastes finas com a espiga marrom de veludo e a ponta seca por cima,
// e junco roliço em tufos. Cada variação mistura as duas de um jeito.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { bolha, caminho, cartao, nevar, pecas, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, NomeMaterial } from "../tipos";
import { manchar, suave } from "./_pantano-comum";

const FOLHA = "#869758";
const FOLHA_SECA = "#b39c66";
const HASTE = "#7c8450";
const HASTE_SECA = "#a8915e";
const ESPIGA = "#5a3a24";
const JUNCO = "#6c7a42";
const QUEIMADA = "#2a2622";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];

const modelo: Modelo = {
  id: "taboa",
  nome: "Taboa e junco",
  variacoes: 5,
  altura: [1.2, 2.6],
  raio: 1.2,
  estados: ["neve", "seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(6700 + variacao * 89);
    const H = 1.2 + r() * 1.4;
    const largura = 0.5 + r() * 0.6;
    const seca = !!estado.seca;
    const queimada = !!estado.queimada;
    // Proporção taboa × junco: 0 só junco, 1 só taboa.
    const mistura = [0.9, 0.6, 0.25, 1, 0.5][variacao % 5];
    const lista: Lista = [];
    const corFolha = queimada ? QUEIMADA : seca ? FOLHA_SECA : FOLHA;

    if (nivel === 2) {
      for (let i = 0; i < 2; i++) {
        const a = (i / 2) * Math.PI + r() * 0.4;
        const h2 = queimada ? H * 0.3 : H * 0.9;
        const c = cartao(new THREE.Vector3(0, h2 * 0.5, 0), largura * (queimada ? 1.2 : 2), h2, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), 0, ATLAS.capim);
        lista.push({ material: "folhagem", geometria: tingir(c, corFolha, 0.15, variacao, 0.4, H * 0.5) });
      }
      return pecas(lista);
    }

    // Folhas: leque de cartões, os de dentro mais altos e retos, os de fora abertos.
    if (!queimada) {
      const n = nivel === 0 ? 9 + Math.floor(r() * 5) : 4;
      for (let i = 0; i < n; i++) {
        const fora = i / n;
        const a = r() * Math.PI * 2;
        const d = largura * fora * 0.45;
        const h = H * (0.95 - fora * 0.4) * (0.75 + r() * 0.3) * (seca ? 0.85 : 1);
        const w = largura * (0.6 + r() * 0.6);
        const giro = (r() < 0.5 ? -1 : 1) * (0.04 + fora * 0.4) * (0.5 + r() * 0.5);
        const centro = new THREE.Vector3(Math.cos(a) * d, h * 0.48, Math.sin(a) * d);
        const normal = new THREE.Vector3(Math.cos(a + Math.PI / 2 + (r() - 0.5)), 0, Math.sin(a + Math.PI / 2 + (r() - 0.5)));
        const c = cartao(centro, w, h, normal, giro, ATLAS.capim);
        tingir(c, corFolha, 0.22, variacao + i, 0.45, H * 0.6);
        // Pontas queimadas de sol e base enlameada.
        manchar(c, seca ? "#8e7a50" : "#a39a5c", 2.2, 0.55, 0.6, variacao + 20 + i);
        lista.push({ material: "folhagem", geometria: c });
      }
    }

    // Hastes de taboa com espiga.
    const madeira: NomeMaterial = queimada ? "carvao" : "casca-clara";
    const espigas: THREE.BufferGeometry[] = [];
    const nt = Math.round((nivel === 0 ? 4 + r() * 5 : 3) * mistura);
    for (let i = 0; i < nt; i++) {
      const a = r() * Math.PI * 2;
      const d = r() * largura * 0.35;
      const base = new THREE.Vector3(Math.cos(a) * d, -0.05, Math.sin(a) * d);
      const h = (queimada ? H * (0.25 + r() * 0.3) : H * (0.9 + r() * 0.35));
      const verga = (r() - 0.5) * 0.25 + (seca && r() < 0.35 ? 0.5 : 0);
      const topo = base.clone().add(new THREE.Vector3(Math.cos(a) * h * verga, h, Math.sin(a) * h * verga));
      const pts = suave([base, base.clone().lerp(topo, 0.5).add(new THREE.Vector3((r() - 0.5) * 0.06, 0, (r() - 0.5) * 0.06)), topo], nivel === 0 ? 5 : 2);
      const rh = 0.009 + r() * 0.005;
      const haste = tubo(pts, pts.map((_, k) => rh * (1.3 - (k / pts.length) * 0.5)), nivel === 0 ? 4 : 3, queimada);
      lista.push({ material: madeira, geometria: tingir(haste, queimada ? QUEIMADA : seca ? HASTE_SECA : HASTE, 0.15, variacao + i, 0.4, H * 0.4) });
      if (queimada) continue;
      // Espiga: charuto marrom um pouco abaixo da ponta, e a ponta seca fina por cima.
      const dir = topo.clone().sub(pts[pts.length - 2]).normalize();
      const comp = 0.14 + r() * 0.16;
      const re = 0.022 + r() * 0.012;
      const ini = topo.clone().addScaledVector(dir, -comp - 0.12);
      const fim = ini.clone().addScaledVector(dir, comp);
      const passos = nivel === 0 ? 5 : 2;
      const eixo = Array.from({ length: passos + 1 }, (_, k) => ini.clone().lerp(fim, k / passos));
      const raios = eixo.map((_, k) => re * (0.55 + 0.45 * Math.sin(((k / passos) * 0.8 + 0.1) * Math.PI)) * (seca && k > passos / 2 ? 1.25 : 1));
      const espiga = tubo(eixo, raios, nivel === 0 ? 7 : 4, true);
      tingir(espiga, seca ? "#7a5a3c" : ESPIGA, 0.2, variacao + 40 + i, 0.2, H);
      // Espiga seca solta paina: manchas claras de algodão.
      if (seca) manchar(espiga, "#cbbfa6", 18, 0.55, 0.8, variacao + 41 + i);
      espigas.push(espiga);
      lista.push({ material: "casca", geometria: espiga });
      if (nivel === 0) {
        const ponta = tubo([fim, topo.clone().addScaledVector(dir, 0.05)], [0.006, 0.002], 3);
        lista.push({ material: madeira, geometria: tingir(ponta, "#8a7a52", 0.1, variacao) });
      }
    }

    // Junco: tufos de varetas roliças, tortas e de alturas desiguais.
    const nj = Math.round((nivel === 0 ? 14 + r() * 10 : 5) * (1.15 - mistura));
    for (let i = 0; i < nj; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * largura * 0.6;
      const base = new THREE.Vector3(Math.cos(a) * d, -0.05, Math.sin(a) * d);
      const h = H * (0.5 + r() * 0.5) * (queimada ? 0.35 : 1);
      const abre = (0.1 + r() * 0.35) * (d / largura + 0.3);
      const fim = base.clone().add(new THREE.Vector3(Math.cos(a) * h * abre, h, Math.sin(a) * h * abre));
      const pts = caminho(base, fim, nivel === 0 ? 3 : 1, 0.06, r);
      // Junco tombado: a ponta deita.
      if (nivel === 0 && r() < (seca ? 0.4 : 0.15)) {
        const ult = pts[pts.length - 1];
        ult.add(new THREE.Vector3(Math.cos(a) * h * 0.35, -h * 0.3, Math.sin(a) * h * 0.35));
      }
      const g = tubo(pts, pts.map((_, k) => 0.007 * (1 - (k / pts.length) * 0.7)), 3, true);
      tingir(g, queimada ? QUEIMADA : seca ? HASTE_SECA : JUNCO, 0.2, variacao + 60 + i, 0.5, h * 0.5);
      if (!queimada) manchar(g, seca ? "#8c7448" : "#9a8a50", 3, 0.6, 0.7, variacao + 61);
      lista.push({ material: madeira, geometria: g });
    }

    // Lodo no pé da touceira.
    if (nivel === 0) {
      const lodo = bolha(largura * 0.45, 1, 0.35, variacao + 2, 0.22).translate(0, -0.02, 0);
      lista.push({ material: "terra", geometria: tingir(lodo, queimada ? "#2e2a26" : "#3e3a28", 0.2, variacao, 0.3, 0.1) });
    }

    if (estado.neve && nivel === 0) {
      for (const e of espigas) lista.push({ material: "neve", geometria: nevar(e, Math.min(1, estado.neve + 0.3), 0.012) });
      const monte = bolha(largura * 0.5, 1, 0.3, variacao + 5, 0.2 * estado.neve + 0.05).translate(0, 0, 0);
      lista.push({ material: "neve", geometria: tingir(monte, "#ffffff", 0.05, variacao) });
    }
    return pecas(lista);
  },
};

export default modelo;
