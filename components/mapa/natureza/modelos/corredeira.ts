// Corredeira: trecho de rio raso e pedregoso, descendo em degrau, com água
// branca onde a correnteza bate nas pedras. Margens de cascalho e terra, pedras
// redondas lavadas (escuras e com limo até a linha d'água, claras por cima).
// O rio corre de -z para +z; a UV da água corre a favor (v em metros).

import * as THREE from "three";
import { nevar, pecas, ruido3, sorteio } from "../ferramentas";
import type { Modelo, NomeMaterial } from "../tipos";
import { grade, lerp, pedraDeRio, pintar, suave } from "./_agua-comum";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];
type Pedra = { x: number; z: number; raio: number; achata: number };

const AGUA = new THREE.Color("#2f4540");
const AGUA_SECA = new THREE.Color("#384634");
const AGUA_CLARA = new THREE.Color("#7f978f");
const ESPUMA = new THREE.Color("#e6eeea");
const LEITO = new THREE.Color("#3a352a");
const CASCALHO = new THREE.Color("#8d8068");
const BARRANCO = new THREE.Color("#6e5a42");
const CAPIM = new THREE.Color("#6d6a3c");
const NEVE = "#f2f5f7";

const modelo: Modelo = {
  id: "corredeira",
  nome: "Corredeira",
  variacoes: 4,
  altura: [1, 2.5],
  raio: 14,
  estados: ["neve", "seca"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(7300 + variacao * 173);
    const seed = 80 + variacao * 11;
    const seca = !!estado.seca;
    const neve = estado.neve ?? 0;
    const L = 22 + r() * 8; // comprimento do trecho
    const Wc = 6 + r() * 5; // largura do canal
    const Wt = Wc + 14; // largura com as margens
    const queda = 0.35 + r() * 0.25;
    const zDegrau = (r() - 0.5) * L * 0.4;
    const curvas = 0.8 + r() * 1.4;
    const fase = r() * 6;
    const meio = (z: number) => Math.sin((z / L) * Math.PI * curvas + fase) * Wc * 0.25;
    const meiaLargura = (z: number) => (Wc / 2) * (0.85 + 0.3 * ruido3(0, 0, z * 0.12, seed));
    // Nível d'água: desce devagar e cai de uma vez no degrau.
    const nivelEm = (z: number) => 0.75 - ((z + L / 2) / L) * queda * 0.5 - suave(zDegrau - 0.8, zDegrau + 1.2, z) * queda * 0.6 - (seca ? 0.22 : 0);
    const lista: Lista = [];

    // ---------- Pedras do canal (antes da água, que reage a elas) ----------
    const pedras: Pedra[] = [];
    const nPedras = nivel === 2 ? 2 : nivel === 1 ? 6 : 11;
    for (let i = 0; i < nPedras; i++) {
      // Metade se junta na linha do degrau (é ela que faz o degrau).
      const noDegrau = i % 2 === 0;
      const z = noDegrau ? zDegrau + (r() - 0.5) * 2 : (r() - 0.5) * L * 0.85;
      const x = meio(z) + (r() - 0.5) * 2 * meiaLargura(z) * 0.85;
      pedras.push({ x, z, raio: 0.45 + r() * (i < 3 ? 1.2 : 0.7), achata: 0.45 + r() * 0.3 });
    }

    // ---------- Leito e margens: um relevo só ----------
    const nx = nivel === 0 ? 18 : nivel === 1 ? 8 : 3;
    const nz = nivel === 0 ? 22 : nivel === 1 ? 9 : 3;
    const altoEm = (x: number, z: number) => {
      const d = Math.abs(x - meio(z)) / meiaLargura(z);
      const n = nivelEm(z);
      const fundo = Math.max(0.02, n - 0.5 * (1 - Math.min(1, d) ** 2) - 0.08);
      const barranco = n + 0.25 + 0.7 * suave(1.1, 1.8, d) + (ruido3(x * 0.3, 0, z * 0.3, seed + 1) - 0.5) * 0.5 * suave(1, 1.6, d);
      const fora = 1 - suave(0.72, 1, Math.abs(x) / (Wt / 2));
      return lerp(fundo, barranco, suave(0.8, 1.25, d)) * fora;
    };
    const chao = grade(
      nx,
      nz,
      (i, j) => {
        const x = (i / nx - 0.5) * Wt;
        const z = (j / nz - 0.5) * L;
        return { p: new THREE.Vector3(x, altoEm(x, z), z), uv: [x / 3, z / 3] };
      },
      { facetado: nivel === 0, virar: true },
    );
    pintar(chao, (p, n, c) => {
      const d = Math.abs(p.x - meio(p.z)) / meiaLargura(p.z);
      const nAgua = nivelEm(p.z);
      // Leito escuro, faixa de cascalho lavado na beira, barranco de terra, capim em cima.
      c.copy(LEITO).lerp(CASCALHO, suave(0.9, 1.3, d));
      c.lerp(BARRANCO, suave(1.5, 2.1, d) * 0.7);
      c.lerp(CAPIM, suave(1.9, 2.6, d) * Math.max(0, n.y) * (seca ? 0.4 : 0.85));
      if (seca) c.lerp(new THREE.Color("#a39478"), suave(0.7, 1.1, d) * 0.5);
      const molhado = 1 - suave(nAgua, nAgua + 0.3, p.y);
      // Cascalho: grão miúdo claro e escuro; manchas de capim ralo no barranco.
      const grao = ruido3(p.x * 2.5, 0, p.z * 2.5, seed + 4);
      c.lerp(CAPIM, suave(1.6, 2.2, d) * suave(0.55, 0.75, ruido3(p.x * 0.35, 1, p.z * 0.35, seed + 5)) * (seca ? 0.3 : 0.7));
      c.multiplyScalar((1 - molhado * 0.35) * (0.78 + 0.44 * grao));
    });
    lista.push({ material: "terra", geometria: chao });
    if (neve > 0 && nivel < 2) lista.push({ material: "neve", geometria: pintar(nevar(chao, neve, 0.06), (_, __, c) => c.set(NEVE)) });

    // Saias nas pontas: fecham o corte do relevo até o chão.
    if (nivel < 2) {
      for (const ponta of [-1, 1]) {
        const z = (ponta * L) / 2;
        const saia = grade(nx, 1, (i, j) => {
          const t = ponta < 0 ? i / nx : 1 - i / nx;
          const x = (t - 0.5) * Wt;
          return { p: new THREE.Vector3(x, j === 0 ? altoEm(x, z) : 0, z), uv: [x / 3, j] };
        });
        pintar(saia, (p, _, c) => c.copy(BARRANCO).multiplyScalar(0.6 + p.y * 0.3));
        lista.push({ material: "terra", geometria: saia });
      }
    }

    // ---------- Água ----------
    const ax = nivel === 0 ? 10 : nivel === 1 ? 4 : 1;
    const az = nivel === 0 ? 26 : nivel === 1 ? 9 : 3;
    const espumaEm = (x: number, z: number) => {
      let e = 0;
      for (const p of pedras) {
        const dz = z - p.z;
        const dx = (x - p.x) / (p.raio * (1 + Math.max(0, dz) * 0.12));
        // Rabo de espuma para baixo da pedra, travesseiro curto em cima.
        const rabo = dz > 0 ? 0.9 * Math.exp(-dx * dx * 1.6 - (dz / (p.raio * 3)) ** 2) : Math.exp(-dx * dx * 2 - (dz / (p.raio * 0.7)) ** 2);
        e = Math.max(e, rabo);
      }
      // Faixa branca logo abaixo do degrau.
      const degrau = suave(zDegrau - 0.5, zDegrau + 0.3, z) * (1 - suave(zDegrau + 0.6, zDegrau + 3.2, z));
      e = Math.max(e, degrau * (0.35 + 0.75 * ruido3(x * 0.9, 0, z * 0.6, seed + 6)));
      return Math.min(1, e * (seca ? 0.45 : 1));
    };
    const agua = grade(ax, az, (i, j) => {
      const z = (j / az - 0.5) * L;
      const u = i / ax - 0.5;
      const x = meio(z) + u * 2 * meiaLargura(z) * 1.12;
      // Ondas paradas: travesseiro antes da pedra, buraco e trem de ondas depois.
      let y = nivelEm(z);
      for (const p of pedras) {
        const dz = z - p.z;
        const dx = (x - p.x) / (p.raio * 1.3);
        const lado = Math.exp(-dx * dx);
        y += lado * (dz < 0 ? 0.12 * Math.exp(-((dz / p.raio) ** 2)) : 0.08 * Math.sin(dz * 2.2) * Math.exp(-dz / (p.raio * 3)));
      }
      const depois = z - zDegrau;
      if (depois > 0) y += 0.07 * Math.sin(depois * 2.6) * Math.exp(-depois / 3);
      return { p: new THREE.Vector3(x, y, z), uv: [x, z + L / 2] };
    }, { virar: true });
    pintar(agua, (p, _, c) => {
      const d = Math.abs(p.x - meio(p.z)) / meiaLargura(p.z);
      // Fio do meio mais rápido e claro, beira parada e escura.
      c.copy(seca ? AGUA_SECA : AGUA).lerp(AGUA_CLARA, (1 - Math.min(1, d)) * 0.35 * (seca ? 0.4 : 1));
      c.lerp(ESPUMA, espumaEm(p.x, p.z));
      if (neve > 0.5) c.lerp(new THREE.Color("#c9d7dc"), suave(0.85, 1.1, d) * neve);
    });
    lista.push({ material: "agua", geometria: agua });

    // ---------- Pedras ----------
    for (const [i, p] of pedras.entries()) {
      // Pedra sai da água: a correnteza só lava o pé.
      const onde = new THREE.Vector3(p.x, Math.max(p.raio * p.achata * 0.3, nivelEm(p.z) - p.raio * p.achata * (i % 3 === 2 ? 0.75 : 0.3)), p.z);
      const det = nivel === 0 && p.raio > 0.9 ? 1 : 0;
      lista.push({ material: "pedra", geometria: pedraDeRio(p.raio, det, seed + i * 5, onde, p.achata, r() * 6, nivelEm(p.z) + 0.06, { seca, musgo: 0.4 }) });
    }
    // Seixos e pedras soltas na beira, fora d'água.
    const soltas = nivel === 0 ? 7 : nivel === 1 ? 2 : 0;
    for (let i = 0; i < soltas; i++) {
      const z = (r() - 0.5) * L * 0.9;
      const lado = r() < 0.5 ? -1 : 1;
      const x = meio(z) + lado * meiaLargura(z) * (1.05 + r() * 0.5);
      const raio = 0.3 + r() * 0.6;
      const onde = new THREE.Vector3(x, altoEm(x, z) + raio * 0.15, z);
      lista.push({ material: "pedra", geometria: pedraDeRio(raio, 0, seed + 60 + i, onde, 0.5 + r() * 0.3, r() * 6, nivelEm(z) + 0.1, { seca, musgo: 0.7 }) });
    }
    if (neve > 0 && nivel === 0) {
      for (const pd of lista.filter((p) => p.material === "pedra").map((p) => p.geometria)) {
        lista.push({ material: "neve", geometria: pintar(nevar(pd, neve, 0.05), (_, __, c) => c.set(NEVE)) });
      }
    }
    return pecas(lista);
  },
};

export default modelo;
