// Cachoeira: rio que chega por cima de um paredão em anfiteatro, cai em um ou
// mais véus e bate num poço escuro, cercado de pedra molhada e espuma.
// Paredão de quartzito em bandas (ocre e cinza, como nas serras de Minas), com
// gruta rasa atrás da queda, limo escorrendo e musgo nas bordas.
//
// Água: cor por vértice clara = espuma (veja materiais.ts). UV da água em metros,
// v correndo a favor da correnteza, para o shader escorrer na direção certa.

import * as THREE from "three";
import { bolha, nevar, pecas, ruido3, sorteio } from "../ferramentas";
import type { Modelo, NomeMaterial } from "../tipos";
import { corDeRocha, grade, lerp, pedraDeRio, pintar, suave } from "./_agua-comum";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];
type Veu = { x: number; largura: number };

const AGUA_FUNDA = new THREE.Color("#1f3c3d");
const AGUA_RASA = new THREE.Color("#3d5a4c");
const AGUA_VIDRO = new THREE.Color("#5a7c74");
const ESPUMA = new THREE.Color("#e8efeb");
const ESPUMA_SUJA = new THREE.Color("#b4c4bd");
const GELO = new THREE.Color("#c4d6dc");
const NEVE = "#f2f5f7";

// Cada variação é uma cachoeira diferente: baixa e larga, dois véus, véu de noiva alto, grande de três véus.
const TIPOS: { altura: number; veus: Veu[]; vz: number }[] = [
  { altura: 12, veus: [{ x: 0.3, largura: 6.5 }], vz: 1.3 },
  { altura: 22, veus: [{ x: -2.6, largura: 3.2 }, { x: 2.4, largura: 2.2 }], vz: 1.1 },
  { altura: 32, veus: [{ x: 0, largura: 2.6 }], vz: 1.8 },
  { altura: 40, veus: [{ x: -5, largura: 4 }, { x: 0.6, largura: 6 }, { x: 6, largura: 2.4 }], vz: 1.5 },
];

const modelo: Modelo = {
  id: "cachoeira",
  nome: "Cachoeira",
  variacoes: 4,
  altura: [12, 40],
  raio: 22,
  estados: ["neve", "seca"],
  gerar(variacao, nivel, estado) {
    const tipo = TIPOS[variacao % TIPOS.length];
    const r = sorteio(5100 + variacao * 131);
    const seed = 40 + variacao * 7;
    const seca = !!estado.seca;
    const neve = estado.neve ?? 0;
    const congelada = neve >= 0.7;
    const H = tipo.altura;
    const veus = (seca ? tipo.veus.slice(0, 1) : tipo.veus).map((v) => ({ x: v.x, largura: v.largura * (seca ? 0.3 : 1) }));
    const larguraAgua = Math.max(...tipo.veus.map((v) => Math.abs(v.x) + v.largura / 2)) * 2;
    const W = Math.max(H * 1.5, larguraAgua * 2.6, 24);
    const D = H * 0.35 + 6;
    const lista: Lista = [];
    const daAgua = (): NomeMaterial => (congelada ? "neve" : "agua");

    // ---------- Paredão em anfiteatro ----------
    const curva = (x: number) => (x / (W / 2)) ** 2 * W * 0.32;
    const altoEm = (x: number) =>
      H * Math.pow(1 - suave(0.4 + 0.15 * ruido3(x * 0.05, 7, 0, seed), 1, Math.abs(x) / (W / 2)), 0.55) * (0.9 + 0.2 * ruido3(x * 0.12, 5, 0, seed + 8)) * (1 - 0.06 * canal(x));
    // Onde a água cava a pedra (gruta atrás do véu) e o leito do rio no topo.
    const recuo = (x: number) => Math.max(...tipo.veus.map((v) => Math.exp(-(((x - v.x) / (v.largura * 0.75 + 1)) ** 2))));
    const canal = (x: number) => Math.max(...tipo.veus.map((v) => Math.exp(-(((x - v.x) / (v.largura * 0.6 + 0.4)) ** 2))));
    const faceZ = (x: number, y: number, h: number) => {
      const t = h > 0 ? y / h : 0;
      // Bandas de rocha que saem e entram (estratos), inclinação para trás e gruta atrás da queda.
      // Degraus horizontais (camadas) e fendas verticais (blocos que se soltam).
      const camada = Math.floor(y / 2.2 + ruido3(x * 0.08, 0, 0, seed + 3) * 1.5);
      const degrau = (ruido3(x * 0.06, camada * 1.7, 0, seed) - 0.5) * 3.2;
      const fenda = (ruido3(x * 0.55, y * 0.08, 1, seed + 1) - 0.5) * 1.6 + (ruido3(x * 1.4, y * 0.5, 2, seed + 12) - 0.5) * 0.6;
      const estrato = degrau + fenda;
      const gruta = recuo(x) * Math.sin(Math.min(1, t * 1.15) * Math.PI) * Math.min(3.5, H * 0.12);
      return curva(x) - y * 0.12 + estrato * Math.min(1, h / 6) - gruta + 0.6;
    };

    const nx = nivel === 0 ? 22 : nivel === 1 ? 12 : 4;
    const nf = nivel === 0 ? 13 : nivel === 1 ? 5 : 2; // linhas da face
    const nt = nivel === 0 ? 4 : nivel === 1 ? 2 : 1; // linhas do topo
    const nb = nivel === 0 ? 2 : 1; // linhas do lado de trás
    const paredao = grade(nx, nf + nt + nb, (i, j) => {
      const x = (i / nx - 0.5) * W;
      const h = altoEm(x);
      let y: number;
      let z: number;
      if (j <= nf) {
        y = (j / nf) * h;
        z = faceZ(x, y, h);
      } else if (j <= nf + nt) {
        const t = (j - nf) / nt;
        z = lerp(faceZ(x, h, h), -D, t);
        // Topo irregular, com o leito do rio cavado perto da borda.
        y = h + (ruido3(x * 0.15, 3, z * 0.15, seed + 2) - 0.5) * 1.2 * Math.min(1, h / 5) - canal(x) * 1.1 * (h / H);
      } else {
        const t = (j - nf - nt) / nb;
        z = -D - t * (H * 0.55 + 2);
        y = h * (1 - t) * (1 - t * 0.3);
      }
      return { p: new THREE.Vector3(x, Math.max(0, y), z), uv: [x / 3, (y - z) / 3] };
    }, { facetado: true });
    const ESCURO = new THREE.Color("#2f3329");
    pintar(paredao, (p, n, c) => {
      corDeRocha(p, n, c, seed, 0.4, { seca, musgo: 0.9 });
      // Faixa molhada e com limo onde a água bate e respinga.
      const molhado = recuo(p.x) * (seca ? 0.35 : 1);
      c.lerp(ESCURO, molhado * 0.55 * (0.6 + 0.4 * ruido3(p.x * 0.6, p.y * 0.15, 0, seed + 4)));
      // Escorridos escuros de ferro e limo na face.
      const escorrido = ruido3(p.x * 0.9, p.y * 0.06, 0, seed + 6);
      if (n.y < 0.5) c.multiplyScalar(1 - Math.max(0, escorrido - 0.6) * 0.8);
    });
    lista.push({ material: "pedra", geometria: paredao });
    if (neve > 0 && nivel < 2) lista.push({ material: "neve", geometria: pintar(nevar(paredao, neve, 0.12), (_, __, c) => c.set(NEVE)) });

    // ---------- Rio em cima, chegando na borda ----------
    const bordaZ = (x: number) => faceZ(x, altoEm(x), altoEm(x));
    const nivelDoRio = H - 1.1 + (seca ? 0.2 : 0.55);
    for (const v of veus) {
      const n = nivel === 0 ? 6 : 1;
      const cols = nivel === 0 ? 3 : 1;
      const l = v.largura * (seca ? 2.2 : 1.25);
      const rio = grade(cols, n, (i, j) => {
        const t = j / n; // 0 = atrás, 1 = borda
        const x = v.x + (i / cols - 0.5) * l * (0.5 + 0.5 * suave(0, 0.5, t)) + Math.sin(t * 3 + variacao) * 0.6 * (1 - t);
        const z = lerp(-D * 0.85, bordaZ(v.x) + 0.25, t);
        return { p: new THREE.Vector3(x, nivelDoRio - (1 - t) * 0.15, z), uv: [x, z + D] };
      }, { virar: true });
      pintar(rio, (p, _, c) => {
        c.copy(AGUA_RASA).lerp(AGUA_VIDRO, suave(-3, 0, p.z - bordaZ(v.x)));
        if (congelada) c.copy(GELO);
      });
      lista.push({ material: daAgua(), geometria: rio });
    }

    // ---------- Véus caindo ----------
    const g = 9.8;
    const impactos: THREE.Vector3[] = [];
    for (const [k, v] of veus.entries()) {
      const linhas = nivel === 0 ? 13 : nivel === 1 ? 5 : 1;
      const colunas = nivel === 0 ? 6 : nivel === 1 ? 2 : 1;
      const topo = nivelDoRio;
      const z0 = bordaZ(v.x) + 0.25;
      const vz = tipo.vz * (seca ? 0.4 : 1);
      const queda = Math.sqrt((2 * topo) / g);
      const veu = grade(colunas, linhas, (i, j) => {
        const s = j / linhas; // 0 = borda, 1 = poço
        const y = topo * (1 - s) + 0.12 * s;
        const t = Math.sqrt((2 * (topo - y)) / g);
        const abre = 1 + s * 0.35 + (ruido3(v.x, y * 0.15, 0, seed + k) - 0.5) * 0.3;
        const u = i / colunas - 0.5;
        const ondula = (ruido3(u * 3 + k * 5, y * 0.2, 2, seed + 11) - 0.5) * 0.9 * s;
        const x = v.x + u * v.largura * abre + ondula;
        // Barriga do véu para fora no meio e bordas que ficam para trás.
        const z = z0 + vz * t - Math.abs(u) * 0.6 * s + (1 - 4 * u * u) * 0.25;
        return { p: new THREE.Vector3(x, y, z), uv: [x, topo - y] };
      });
      pintar(veu, (p, _, c) => {
        c.copy(AGUA_VIDRO).lerp(ESPUMA, suave(0.3, 2.2, topo - p.y));
        c.lerp(ESPUMA_SUJA, suave(0.6, 1, Math.abs(p.x - v.x) / (v.largura * 0.6)) * 0.6);
        if (congelada) c.copy(GELO).lerp(ESPUMA, ruido3(p.x * 2, p.y * 0.5, 0, seed) * 0.6);
      });
      lista.push({ material: daAgua(), geometria: veu });
      impactos.push(new THREE.Vector3(v.x, 0.15, z0 + vz * queda));
    }

    // ---------- Poço ----------
    const zImpacto = Math.max(...impactos.map((p) => p.z));
    const R = (Math.min(H * 0.38, 14) + larguraAgua * 0.35 + 3) * (seca ? 0.8 : 1);
    const centro = new THREE.Vector3(0, 0, zImpacto + R * 0.42);
    const voltas = nivel === 0 ? 24 : nivel === 1 ? 10 : 6;
    const aneis = nivel === 0 ? 4 : nivel === 1 ? 2 : 1;
    const raioEm = (a: number) => R * (0.82 + 0.36 * ruido3(Math.cos(a) * 1.5, Math.sin(a) * 1.5, 0, seed + 20));
    const alturaDoPoco = seca ? 0.08 : 0.16;
    const poco = grade(voltas, aneis, (i, j) => {
      const a = (i / voltas) * Math.PI * 2 - Math.PI / 2;
      const rr = raioEm(a) * (j / aneis);
      const x = centro.x + Math.cos(a) * rr;
      const z = centro.z + Math.sin(a) * rr;
      // UV radial a partir da queda: a espuma se espalha para fora; emenda escondida atrás.
      return { p: new THREE.Vector3(x, alturaDoPoco, z), uv: [Math.atan2(x, z - zImpacto + 0.5) * 4, Math.hypot(x - centro.x, z - zImpacto + 0.5)] };
    });
    pintar(poco, (p, _, c) => {
      let espuma = 0;
      for (const [k, im] of impactos.entries()) {
        const l = veus[k].largura;
        const d = Math.hypot((p.x - im.x) / (l * 0.7 + 1), (p.z - im.z) / (l * 0.5 + 2));
        espuma = Math.max(espuma, Math.exp(-d * d * 0.8));
      }
      espuma *= seca ? 0.6 : 1;
      const borda = Math.hypot(p.x - centro.x, p.z - centro.z) / R;
      c.copy(AGUA_FUNDA).lerp(AGUA_RASA, suave(0.6, 1, borda)).lerp(ESPUMA, Math.min(1, espuma * 1.25));
      if (congelada) c.copy(GELO).lerp(ESPUMA, espuma * 0.5);
    });
    lista.push({ material: daAgua(), geometria: poco });

    // Fundo escuro do poço: dá profundidade através da água translúcida.
    const fundo = grade(voltas, 1, (i, j) => {
      const a = (i / voltas) * Math.PI * 2 - Math.PI / 2;
      const rr = raioEm(a) * 1.04 * j;
      return { p: new THREE.Vector3(centro.x + Math.cos(a) * rr, 0.03, centro.z + Math.sin(a) * rr), uv: [(Math.cos(a) * rr) / 3, (Math.sin(a) * rr) / 3] };
    });
    const LODO = new THREE.Color("#4e4a3c");
    pintar(fundo, (p, _, c) => c.set("#2a2f27").lerp(LODO, suave(0.7, 1, Math.hypot(p.x - centro.x, p.z - centro.z) / R)));
    if (nivel < 2) lista.push({ material: "pedra-escura", geometria: fundo });

    // Riacho que sai do poço para frente, com margem de terra molhada.
    if (nivel < 2) {
      const comp = R * 1.3;
      const larg = Math.max(2.5, larguraAgua * 0.5) * (seca ? 0.5 : 1);
      const linhas = nivel === 0 ? 8 : 3;
      const z0 = centro.z + raioEm(Math.PI / 2) * 0.85;
      const meioEm = (t: number) => Math.sin(t * 2.4 + variacao) * 1.6;
      const riacho = grade(2, linhas, (i, j) => {
        const t = j / linhas;
        const x = meioEm(t) + (i / 2 - 0.5) * larg * (1 - t * 0.5);
        return { p: new THREE.Vector3(x, alturaDoPoco - t * 0.06, z0 + t * comp), uv: [x, t * comp] };
      }, { virar: true });
      const CLARA = new THREE.Color("#8fa59d");
      pintar(riacho, (p, _, c) => {
        const meio = 1 - Math.abs(p.x - meioEm((p.z - z0) / comp)) / (larg * 0.5);
        c.copy(AGUA_RASA).lerp(CLARA, meio * 0.5 * (seca ? 0.3 : 1));
        if (congelada) c.copy(GELO);
      });
      lista.push({ material: daAgua(), geometria: riacho });
      for (const lado of [-1, 1]) {
        const margem = grade(1, linhas, (i, j) => {
          const t = j / linhas;
          const dentro = larg * (1 - t * 0.5) * 0.45;
          const x = meioEm(t) + (lado < 0 ? lerp(-dentro - 1.8, -dentro, i) : lerp(dentro, dentro + 1.8, i));
          return { p: new THREE.Vector3(x, 0.07, z0 + t * comp), uv: [x / 3, (t * comp) / 3] };
        }, { virar: true });
        pintar(margem, (p, _, c) => c.set("#4a4334").multiplyScalar(0.85 + 0.3 * ruido3(p.x, 0, p.z, seed)));
        lista.push({ material: "terra", geometria: margem });
      }
    }

    // ---------- Pedras ----------
    const molhada = alturaDoPoco + 0.25;
    if (nivel === 2) {
      lista.push({ material: "pedra", geometria: pintar(bolha(R * 0.3, 0, 0.3, seed, 0.5).translate(-R * 0.8, 0.3, centro.z), (p, n, c) => corDeRocha(p, n, c, seed, molhada)) });
    } else {
      // Em volta do poço: pedras grandes atrás e nas laterais, menores na frente.
      const volta = nivel === 0 ? 13 : 5;
      for (let i = 0; i < volta; i++) {
        const a = (i / volta) * Math.PI * 2 + r() * 0.4;
        const atras = Math.max(0, -Math.sin(a));
        const raio = (0.7 + r() * 1.3 + atras * 1.5) * (H > 25 ? 1.3 : 1);
        const rr = raioEm(a) * (0.98 + r() * 0.12);
        const pos = new THREE.Vector3(centro.x + Math.cos(a) * rr, raio * 0.15, centro.z + Math.sin(a) * rr);
        const giro = r() * 6;
        const achata = 0.5 + r() * 0.25;
        if (Math.sin(a) > 0.75) continue; // boca do riacho livre
        const det = nivel === 0 && raio > 1.8 ? 1 : 0;
        lista.push({ material: "pedra", geometria: pedraDeRio(raio, det, seed + i * 3, pos, achata, giro, molhada, { seca }) });
      }
      // Dentro do poço, perto da queda: pedras escuras lavadas, meio submersas.
      const dentro = nivel === 0 ? 4 : 1;
      for (let i = 0; i < dentro; i++) {
        const im = impactos[i % impactos.length];
        const lado = i % 2 ? 1 : -1;
        const pos = new THREE.Vector3(im.x + lado * (veus[i % veus.length].largura * 0.6 + 1 + r() * 2), 0, im.z + (r() - 0.3) * 3);
        const raio = 0.8 + r() * 1.2;
        lista.push({ material: "pedra", geometria: pedraDeRio(raio, nivel === 0 && i < 2 ? 1 : 0, seed + 50 + i, pos, 0.55, r() * 6, raio * 0.6, { seca, musgo: 0.2 }) });
      }
      // Na borda de cima, ao lado do rio: a água contorna.
      const cima = nivel === 0 ? 3 : 0;
      for (let i = 0; i < cima; i++) {
        const v = veus[i % veus.length];
        const x = v.x + (i % 2 ? 1 : -1) * (v.largura * 0.55 + 0.4 + r());
        const pos = new THREE.Vector3(x, altoEm(x) - canal(x) * 1.1 + 0.1, bordaZ(x) - 1 - r() * 2);
        lista.push({ material: "pedra", geometria: pedraDeRio(0.8 + r() * 0.8, 0, seed + 70 + i, pos, 0.6, r() * 6, nivelDoRio + 0.15, { seca }) });
      }
    }

    // ---------- Espuma onde a água bate ----------
    if (!congelada && nivel < 2) {
      for (const [k, im] of impactos.entries()) {
        const l = veus[k].largura;
        const n = nivel === 0 && veus.length === 1 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const b = bolha(l * 0.3 + 0.5 - i * 0.2, nivel === 0 ? 1 : 0, 0.45, seed + 90 + i + k * 5, 0.16).translate(im.x + (r() - 0.5) * l * 0.6, alturaDoPoco + 0.05, im.z + (r() - 0.3) * 1.5);
          pintar(b, (p, _, c) => c.copy(ESPUMA).lerp(ESPUMA_SUJA, Math.max(0, 0.3 - p.y) * 1.5));
          lista.push({ material: "agua", geometria: b });
        }
      }
    }
    if (neve > 0 && nivel === 0) {
      const pedras = lista.filter((p) => p.material === "pedra" && p.geometria !== paredao).map((p) => p.geometria);
      for (const pd of pedras) lista.push({ material: "neve", geometria: pintar(nevar(pd, neve, 0.06), (_, __, c) => c.set(NEVE)) });
    }
    return pecas(lista);
  },
};

export default modelo;
