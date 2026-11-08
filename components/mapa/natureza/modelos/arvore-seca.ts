// Árvore morta em pé: sem folha, madeira cinza de sol e chuva, casca soltando
// em placas, galhos quebrados com lasca na ponta e um pedaço caído no chão.

import * as THREE from "three";
import { caminho, nevar, pecas, ruido3, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, NomeMaterial, Nivel } from "../tipos";
import { lascas, misturar, placaDeCasca, troncoComRelevo, v3 } from "./_mata-comum";

const MADEIRA = "#8d8578";
const CASCA = "#4e4034";
const DENTRO = "#a08a6c";
const CARVAO = "#2a2522";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];
type Ramo = { pontos: THREE.Vector3[]; raios: number[]; quebrado: boolean };

/** Galho que se divide; cada ponta tem chance de ter quebrado e virado toco. */
function ramificar(r: () => number, de: THREE.Vector3, dir: THREE.Vector3, comp: number, raio: number, nivelRamo: number, maxNivel: number, saida: Ramo[], segs: number) {
  const fim = de.clone().addScaledVector(dir, comp);
  const quebrado = nivelRamo > 0 && r() < 0.3;
  const compReal = quebrado ? 0.35 + r() * 0.35 : 1;
  const ate = de.clone().lerp(fim, compReal);
  const pts = caminho(de, ate, Math.max(2, segs - nivelRamo), comp * 0.12, r);
  const raioFim = quebrado ? raio * (1 - compReal * 0.5) : raio * 0.18;
  saida.push({ pontos: pts, raios: pts.map((_, k) => raio + (raioFim - raio) * (k / (pts.length - 1))), quebrado });
  if (quebrado || nivelRamo >= maxNivel) return;
  const filhos = 2 + Math.floor(r() * 2);
  for (let i = 0; i < filhos; i++) {
    const k = 1 + Math.floor(r() * (pts.length - 1));
    const t = k / (pts.length - 1);
    const lado = v3(r() - 0.5, 0, r() - 0.5).normalize();
    const nd = dir.clone().multiplyScalar(0.6).add(lado.multiplyScalar(0.7 + r() * 0.4)).add(v3(0, 0.25 + r() * 0.35, 0)).normalize();
    ramificar(r, pts[k], nd, comp * (0.45 + r() * 0.25) * (1 - t * 0.3), raio * (0.45 + (1 - t) * 0.2), nivelRamo + 1, maxNivel, saida, segs);
  }
}

function corDaMadeira(g: THREE.BufferGeometry, seed: number, alturaCasca: number, queimada: number) {
  tingir(g, MADEIRA, 0.16, seed, 0.35, 2);
  // Veio comprido: faixas claras e escuras correndo pelo comprimento.
  misturar(g, "#6e675d", (p) => (ruido3(p.x * 6, p.y * 0.35, p.z * 6, seed + 2) - 0.5) * 1.6);
  // Casca que ainda resta perto do pé, em manchas.
  if (alturaCasca > 0) misturar(g, CASCA, (p) => (1 - p.y / alturaCasca) * 1.4 + (ruido3(p.x * 1.5, p.y * 0.8, p.z * 1.5, seed + 4) - 0.5) * 1.6);
  // Fogo que passou pelo pé: preto subindo pela madeira.
  if (queimada > 0) misturar(g, CARVAO, (p) => (1 - p.y / queimada) * 2 + (ruido3(p.x * 2, p.y * 0.6, p.z * 2, seed + 6) - 0.5) * 1.5);
  return g;
}

const modelo: Modelo = {
  id: "arvore-seca",
  nome: "Árvore seca sem folha",
  variacoes: 4,
  altura: [7, 15],
  raio: 3.5,
  estados: ["neve", "queimada"],
  gerar(variacao, nivel: Nivel, estado) {
    const r = sorteio(5200 + variacao * 71);
    const altura = 7 + r() * 8;
    const tipo = variacao % 4; // 0 copa pelada, 1 toco alto quebrado, 2 inclinada, 3 bifurcada
    const raioBase = altura * (0.03 + r() * 0.012);
    const alturaFuste = tipo === 1 ? altura * (0.75 + r() * 0.15) : altura * (0.4 + r() * 0.15);
    const inclina = tipo === 2 ? v3(Math.cos(r() * 6.3), 0, Math.sin(r() * 6.3)).multiplyScalar(altura * 0.18) : v3((r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.8);
    const queimada = estado.queimada ? altura * (0.35 + r() * 0.25) : 0;
    const alturaCasca = estado.queimada ? 0 : 1.2 + r() * 2;
    const curva = (y: number) => {
      const t = Math.max(0, y) / alturaFuste;
      return new THREE.Vector2(inclina.x * t * t + Math.sin(t * 5 + variacao) * 0.12 * t, inclina.z * t * t + Math.cos(t * 4 + variacao) * 0.12 * t);
    };
    const raioDoFuste = (t: number) => raioBase * (1 - (tipo === 1 ? 0.45 : 0.35) * t) * (1 + Math.max(0, 1 - t * 6) * 0.3);
    const ct = curva(alturaFuste);
    const topo = v3(ct.x, alturaFuste, ct.y);
    const lista: Lista = [];

    if (nivel === 2) {
      const pe = tubo([v3(0, -0.2, 0), topo], [raioBase * 1.1, raioBase * 0.6], 4);
      lista.push({ material: "casca", geometria: corDaMadeira(pe, variacao, 0, queimada) });
      if (tipo !== 1) {
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + r();
          const fim = topo.clone().add(v3(Math.cos(a) * altura * 0.25, altura * (0.2 + r() * 0.2), Math.sin(a) * altura * 0.25));
          lista.push({ material: "casca", geometria: corDaMadeira(tubo([topo, fim], [raioBase * 0.4, raioBase * 0.1], 3), variacao, 0, queimada) });
        }
      }
      return pecas(lista);
    }

    // Fuste.
    const fuste = troncoComRelevo(
      alturaFuste,
      raioDoFuste,
      nivel === 0 ? 9 : 6,
      nivel === 0 ? 8 : 3,
      (a, y) => 1 + (nivel === 0 ? (ruido3(Math.cos(a) * 3, y * 0.4, Math.sin(a) * 3, variacao) - 0.5) * 0.3 : 0),
      curva,
      tipo !== 1,
    );
    lista.push({ material: "casca", geometria: corDaMadeira(fuste, variacao, alturaCasca, queimada) });
    const madeira: THREE.BufferGeometry[] = [fuste];

    // Toco alto: topo estilhaçado.
    if (tipo === 1) {
      for (const l of lascas(topo, v3(0, 1, 0), raioDoFuste(1), r, nivel === 0 ? 5 : 3)) {
        lista.push({ material: "casca", geometria: corDaMadeira(l, variacao, 0, queimada) });
      }
    }

    // Galhos.
    const ramos: Ramo[] = [];
    const segs = nivel === 0 ? 5 : 3;
    const maxNivel = nivel === 0 ? 3 : 1;
    const principais = tipo === 1 ? 2 + Math.floor(r() * 2) : tipo === 3 ? 2 : 3 + Math.floor(r() * 2);
    for (let i = 0; i < principais; i++) {
      const a = (i / principais) * Math.PI * 2 + r() * 0.8;
      const y = tipo === 3 || tipo === 0 ? alturaFuste * (0.92 + r() * 0.08) : alturaFuste * (0.45 + r() * 0.45);
      const c = curva(y);
      const de = v3(c.x, y, c.y);
      const subida = tipo === 3 ? 1.6 : tipo === 1 ? 0.25 + r() * 0.4 : 0.5 + r() * 0.6;
      const dir = v3(Math.cos(a), subida, Math.sin(a)).normalize();
      const comp = tipo === 3 ? altura - alturaFuste : altura * (tipo === 1 ? 0.2 + r() * 0.15 : 0.35 + r() * 0.15);
      const raio = raioDoFuste(y / alturaFuste) * (tipo === 3 ? 0.75 : 0.5 + r() * 0.15);
      ramificar(r, de, dir, comp, raio, tipo === 1 ? 1 : 0, maxNivel, ramos, segs);
    }
    for (const g of ramos) {
      const lados = g.raios[0] > 0.15 ? (nivel === 0 ? 7 : 5) : g.raios[0] > 0.05 ? 4 : 3;
      const t = tubo(g.pontos, g.raios, lados, true);
      corDaMadeira(t, variacao + 1, 0, queimada);
      lista.push({ material: "casca", geometria: t });
      madeira.push(t);
      if (g.quebrado && nivel === 0 && g.raios[0] > 0.06) {
        const n = g.pontos.length;
        const dir = g.pontos[n - 1].clone().sub(g.pontos[n - 2]);
        for (const l of lascas(g.pontos[n - 1], dir, g.raios[n - 1], r, 3)) lista.push({ material: "casca-clara", geometria: tingir(l, "#9a8f7e", 0.15, variacao, 0, 1) });
      }
    }

    if (nivel === 0) {
      // Raízes de superfície abrindo no chão.
      const nRaizes = 4 + Math.floor(r() * 3);
      for (let i = 0; i < nRaizes; i++) {
        const a = (i / nRaizes) * Math.PI * 2 + r() * 0.6;
        const comp = raioBase * (3 + r() * 3);
        const pts = caminho(v3(Math.cos(a) * raioBase * 0.5, 0.5 + r() * 0.3, Math.sin(a) * raioBase * 0.5), v3(Math.cos(a) * comp, -0.1, Math.sin(a) * comp), 3, 0.3, r);
        const t = tubo(pts, pts.map((_, k) => raioBase * 0.4 * (1 - k * 0.25)), 5, true);
        lista.push({ material: "casca", geometria: corDaMadeira(t, variacao + 3, alturaCasca, queimada) });
      }

      // Placas de casca soltando do fuste.
      if (!estado.queimada) {
        const nPlacas = 5 + Math.floor(r() * 4);
        for (let i = 0; i < nPlacas; i++) {
          const y = alturaFuste * (0.15 + r() * 0.7);
          const c = curva(y);
          const a = r() * Math.PI * 2;
          const radial = v3(Math.cos(a), 0, Math.sin(a));
          const raio = raioDoFuste(y / alturaFuste) * 1.05;
          const { fora, dentro } = placaDeCasca(v3(c.x, y, c.y), radial, raio, raio * (0.8 + r() * 0.8), 0.5 + r() * 0.9, 0.05 + r() * 0.2, r);
          lista.push({ material: "casca", geometria: tingir(fora, CASCA, 0.2, variacao + i, 0, 1) });
          lista.push({ material: "casca-clara", geometria: tingir(dentro, DENTRO, 0.15, variacao + i, 0, 1) });
        }
      }

      // Pedaço caído: o topo que quebrou (toco alto) ou um galho grosso.
      const a = r() * Math.PI * 2;
      const comp = tipo === 1 ? altura * 0.35 : altura * 0.2;
      const raio = tipo === 1 ? raioBase * 0.5 : raioBase * 0.3;
      const ini = v3(Math.cos(a) * raioBase * 3, raio * 0.8, Math.sin(a) * raioBase * 3);
      const fim = ini.clone().add(v3(Math.cos(a + 1.2) * comp, raio * 0.4 - 0.1, Math.sin(a + 1.2) * comp));
      const pts = caminho(ini, fim, 3, 0.25, r);
      const caido = tubo(pts, pts.map((_, k) => raio * (1 - k * 0.15)), 6, true);
      lista.push({ material: "casca", geometria: corDaMadeira(caido, variacao + 5, 0, queimada ? altura : 0) });
      madeira.push(caido);
    }

    if (estado.neve && nivel === 0) {
      for (const m of madeira) lista.push({ material: "neve", geometria: nevar(m, estado.neve, 0.04) });
    }
    return pecas(lista);
  },
};

export default modelo;
