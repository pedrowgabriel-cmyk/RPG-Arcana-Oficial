// Árvore que o fogo pegou: tronco carbonizado em escamas (couro de jacaré),
// oco de fogo no pé, galhos reduzidos a tocos, um resto de casca que escapou,
// cinza e tição no chão em volta.

import * as THREE from "three";
import { bolha, caminho, nevar, pecas, ruido3, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, NomeMaterial, Nivel } from "../tipos";
import { escurecer, lascas, misturar, placaDeCasca, troncoComRelevo, v3 } from "./_mata-comum";

const CARVAO = "#2c2724";
const BRASA = "#4a3426";
const CINZA = "#4a4744";
const CASCA = "#5a4535";
const DENTRO = "#7d6248";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];

/** Escama do carvão: blocos em relevo separados por trincas fundas. */
function escama(a: number, y: number, seed: number) {
  const n = ruido3(Math.cos(a) * 4, y * 1.6, Math.sin(a) * 4, seed);
  const m = ruido3(Math.cos(a) * 9, y * 3.5, Math.sin(a) * 9, seed + 1);
  return Math.min(1, Math.abs(n - 0.5) * 4) * 0.7 + m * 0.3;
}

function carbonizar(g: THREE.BufferGeometry, seed: number) {
  tingir(g, CARVAO, 0.18, seed, 0.3, 1.5);
  // Brilho cinza-prata no alto das escamas, preto fosco nas trincas.
  misturar(g, "#4a4542", (p, n) => (ruido3(p.x * 3, p.y * 2, p.z * 3, seed + 3) - 0.5) * 2 + n.y * 0.3);
  misturar(g, BRASA, (p) => (ruido3(p.x * 1.2, p.y * 0.7, p.z * 1.2, seed + 8) - 0.62) * 3);
  return g;
}

const modelo: Modelo = {
  id: "arvore-queimada",
  nome: "Árvore queimada",
  variacoes: 4,
  altura: [5, 12],
  raio: 3,
  estados: ["neve"],
  gerar(variacao, nivel: Nivel, estado) {
    const r = sorteio(6600 + variacao * 89);
    const altura = 5 + r() * 7;
    const raioBase = altura * (0.045 + r() * 0.015);
    const quebrada = variacao % 2 === 1;
    const alturaFuste = quebrada ? altura * (0.85 + r() * 0.15) : altura * (0.55 + r() * 0.15);
    const lean = v3((r() - 0.5) * 1.2, 0, (r() - 0.5) * 1.2);
    const curva = (y: number) => {
      const t = Math.max(0, y) / alturaFuste;
      return new THREE.Vector2(lean.x * t * t + Math.sin(t * 4 + variacao) * 0.15 * t, lean.z * t * t + Math.cos(t * 3 + variacao) * 0.15 * t);
    };
    const raioDoFuste = (t: number) => raioBase * (1 - 0.55 * t) * (1 + Math.max(0, 1 - t * 5) * 0.35);
    const ct = curva(alturaFuste);
    const topo = v3(ct.x, alturaFuste, ct.y);
    const lista: Lista = [];

    if (nivel === 2) {
      lista.push({ material: "carvao", geometria: tingir(tubo([v3(0, -0.2, 0), topo], [raioBase * 1.1, raioBase * 0.45], 4, true), CARVAO, 0.1, variacao) });
      for (let i = 0; i < 2; i++) {
        const a = r() * Math.PI * 2;
        const de = topo.clone().multiplyScalar(0.7 + i * 0.2);
        const fim = de.clone().add(v3(Math.cos(a) * altura * 0.15, altura * 0.12, Math.sin(a) * altura * 0.15));
        lista.push({ material: "carvao", geometria: tingir(tubo([de, fim], [raioBase * 0.4, raioBase * 0.2], 3), CARVAO, 0.1, variacao) });
      }
      return pecas(lista);
    }

    // Fuste com escamas e o oco de fogo no pé.
    const ladoDoOco = r() * Math.PI * 2;
    const altoDoOco = altura * (0.15 + r() * 0.15);
    const larguraDoOco = 0.5 + r() * 0.4;
    const temOco = variacao !== 2;
    const oco = (a: number, y: number) => {
      if (!temOco) return 0;
      const d = Math.abs(Math.atan2(Math.sin(a - ladoDoOco), Math.cos(a - ladoDoOco)));
      const fora = Math.max(0, 1 - d / larguraDoOco);
      const alto = Math.max(0, 1 - Math.max(0, y) / altoDoOco);
      return Math.sqrt(fora) * Math.sqrt(alto);
    };
    const fuste = troncoComRelevo(
      alturaFuste,
      raioDoFuste,
      nivel === 0 ? 14 : 7,
      nivel === 0 ? 14 : 4,
      (a, y) => (1 + (nivel === 0 ? (escama(a, y, variacao) - 0.5) * 0.18 : 0)) * (1 - oco(a, y) * 0.6),
      curva,
      !quebrada,
    );
    carbonizar(fuste, variacao);
    // O oco é o lugar mais preto da árvore.
    escurecer(fuste, (p) => {
      const c = curva(p.y);
      const a = Math.atan2(p.z - c.y, p.x - c.x);
      return 1 - oco(a, p.y) * 0.7;
    });
    if (nivel === 0) {
      escurecer(fuste, (p) => {
        const c = curva(p.y);
        const a = Math.atan2(p.z - c.y, p.x - c.x);
        return 0.55 + escama(a, p.y, variacao) * 0.6;
      });
    }
    lista.push({ material: "carvao", geometria: fuste });
    const madeira: THREE.BufferGeometry[] = [fuste];

    if (quebrada) {
      for (const l of lascas(topo, v3(0, 1, 0), raioDoFuste(1), r, nivel === 0 ? 5 : 3)) lista.push({ material: "carvao", geometria: carbonizar(l, variacao) });
    }

    // Tocos de galho: curtos, grossos, de ponta cega ou lascada.
    const nTocos = nivel === 0 ? 4 + Math.floor(r() * 4) : 3;
    for (let i = 0; i < nTocos; i++) {
      const y = alturaFuste * (0.35 + r() * 0.6);
      const c = curva(y);
      const de = v3(c.x, y, c.y);
      const a = r() * Math.PI * 2;
      const longo = i < 2 && !quebrada;
      const comp = longo ? altura * (0.2 + r() * 0.15) : 0.3 + r() * 1.4;
      const dir = v3(Math.cos(a), longo ? 0.9 + r() * 0.6 : 0.2 + r() * 0.8, Math.sin(a)).normalize();
      const fim = de.clone().addScaledVector(dir, comp);
      const pts = caminho(de, fim, nivel === 0 ? (longo ? 4 : 2) : 2, longo ? 0.5 : 0.1, r);
      const raio = raioDoFuste(y / alturaFuste) * (0.35 + r() * 0.2);
      const raioFim = longo ? raio * 0.25 : raio * 0.7;
      const t = tubo(pts, pts.map((_, k) => raio + (raioFim - raio) * (k / (pts.length - 1))), nivel === 0 ? 6 : 4, true);
      lista.push({ material: "carvao", geometria: carbonizar(t, variacao + i) });
      madeira.push(t);
      if (nivel === 0 && r() < 0.6) {
        for (const l of lascas(fim, dir, raioFim, r, 2)) lista.push({ material: "carvao", geometria: carbonizar(l, variacao) });
      }
      // Galho longo ainda tem um ou dois tocos menores.
      if (longo && nivel === 0) {
        const p = pts[2];
        const a2 = a + (r() - 0.5) * 2;
        const fim2 = p.clone().add(v3(Math.cos(a2) * 0.8, 0.6 + r() * 0.6, Math.sin(a2) * 0.8));
        lista.push({ material: "carvao", geometria: carbonizar(tubo([p, fim2], [raio * 0.4, raio * 0.25], 4, true), variacao) });
      }
    }

    if (nivel === 0) {
      // Raízes de pé carbonizadas.
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + r() * 0.5;
        const comp = raioBase * (2 + r() * 2);
        const pts = caminho(v3(Math.cos(a) * raioBase * 0.4, 0.4, Math.sin(a) * raioBase * 0.4), v3(Math.cos(a) * comp, -0.1, Math.sin(a) * comp), 2, 0.2, r);
        lista.push({ material: "carvao", geometria: carbonizar(tubo(pts, pts.map((_, k) => raioBase * 0.4 * (1 - k * 0.3)), 5, true), variacao + i) });
      }

      // O pouco de casca que o fogo não levou: do lado contrário ao oco, mais em cima.
      const nPlacas = 2 + Math.floor(r() * 3);
      for (let i = 0; i < nPlacas; i++) {
        const y = alturaFuste * (0.35 + r() * 0.5);
        const c = curva(y);
        const a = ladoDoOco + Math.PI + (r() - 0.5) * 1.6;
        const raio = raioDoFuste(y / alturaFuste) * 1.06;
        const { fora, dentro } = placaDeCasca(v3(c.x, y, c.y), v3(Math.cos(a), 0, Math.sin(a)), raio, raio * (0.9 + r() * 0.8), 0.4 + r() * 0.7, 0.03 + r() * 0.12, r);
        tingir(fora, CASCA, 0.2, variacao + i, 0, 1);
        // Borda chamuscada: a casca escurece para baixo, onde a chama lambeu.
        misturar(fora, CARVAO, (p) => (y - p.y) * 2 + 0.3);
        lista.push({ material: "casca", geometria: fora });
        lista.push({ material: "casca", geometria: tingir(dentro, DENTRO, 0.15, variacao + i, 0, 1) });
      }

      // Cinza no chão e tições espalhados.
      const cinza = bolha(raioBase * 3.5 + r() * 0.6, 2, 0.45, variacao, 0.03).translate(0, 0.01, 0);
      tingir(cinza, CINZA, 0.25, variacao, 0, 1);
      misturar(cinza, "#2a2725", (p) => 1.2 - Math.hypot(p.x, p.z) / (raioBase * 2.5));
      // Borda da mancha some na terra.
      misturar(cinza, "#5e5140", (p) => Math.hypot(p.x, p.z) / (raioBase * 3.5) * 1.6 - 0.6);
      lista.push({ material: "terra", geometria: cinza });
      for (let i = 0; i < 4; i++) {
        const a = r() * Math.PI * 2;
        const d = raioBase * (1.8 + r() * 2.5);
        const b = v3(Math.cos(a) * d, 0.08, Math.sin(a) * d);
        const comp = 0.5 + r() * 1.4;
        const fim = b.clone().add(v3(Math.cos(a + 1.5 + r()) * comp, 0.02, Math.sin(a + 1.5 + r()) * comp));
        const t = tubo([b, fim], [0.06 + r() * 0.06, 0.04 + r() * 0.04], 5, true);
        lista.push({ material: "carvao", geometria: carbonizar(t, variacao + i + 10) });
        madeira.push(t);
      }
    }

    if (estado.neve && nivel === 0) {
      for (const m of madeira) lista.push({ material: "neve", geometria: nevar(m, estado.neve, 0.04) });
    }
    return pecas(lista);
  },
};

export default modelo;
