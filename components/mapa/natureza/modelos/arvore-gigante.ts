// Árvore gigante da mata atlântica (jequitibá, figueira-branca): fuste alto e
// reto que abre lá em cima numa copa larga em nuvens, sapopemba na base,
// cipó descendo dos galhos, bromélia e barba-de-velho pelos galhos.

import * as THREE from "three";
import { ATLAS } from "../atlas";
import { bolha, caminho, cartao, deformar, nevar, pecas, preparar, ruido3, sorteio, tingir, tubo } from "../ferramentas";
import type { Modelo, NomeMaterial, Nivel } from "../tipos";
import { escurecer, manchar, nevarFolhas, troncoComRelevo, v3 } from "./_mata-comum";

const CASCA = "#7a6f62";
const LIQUEN = "#9a9a84";
const MUSGO = "#4f5a32";
const QUEIMADA = "#26211e";
const FOLHAS = ["#4d6634", "#5a6f38", "#46602f", "#66743d"];
const FOLHA_SECA = ["#9c7b45", "#a9894e", "#8a6a3c"];
const CIPO = "#4e4232";
const BROMELIA = ["#6a7034", "#5f7238", "#7d6038"];
const BARBA = "#9a9c86";

type Lista = { material: NomeMaterial; geometria: THREE.BufferGeometry }[];
type Galho = { pontos: THREE.Vector3[]; raios: number[]; ponta: THREE.Vector3; grosso: boolean };

/** Sapopemba: tábua que sai do tronco e desce curva até o chão, afinando na borda. */
function aleta(ang: number, raioTronco: number, alturaTopo: number, alcance: number, espessura: number, r: () => number, pontos: number) {
  const s = new THREE.Shape();
  const dentro = raioTronco * 0.35;
  s.moveTo(dentro, -0.3);
  s.lineTo(alcance + 0.15, -0.3);
  const curva = 1.8 + r() * 1.2;
  for (let i = pontos; i >= 0; i--) {
    const t = i / pontos;
    s.lineTo(raioTronco * 0.8 + (alcance - raioTronco * 0.8) * t, alturaTopo * Math.pow(1 - t, curva));
  }
  s.lineTo(dentro, alturaTopo);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, steps: 1 });
  g.translate(0, 0, -0.5);
  const onda = r() * 6;
  deformar(g, (p) => {
    const t = Math.min(1, Math.max(0, (p.x - raioTronco) / Math.max(0.1, alcance - raioTronco)));
    p.z = p.z * espessura * (1 - 0.7 * t) + Math.sin(p.x * 1.3 + onda) * 0.18 * t * raioTronco;
  });
  g.rotateY(-ang);
  return preparar(g);
}

function esqueleto(r: () => number, altura: number, nivel: Nivel, raioTronco: number, topo: THREE.Vector3) {
  const galhos: Galho[] = [];
  const principais = nivel === 0 ? 4 + Math.floor(r() * 2) : 4;
  const giro = r() * Math.PI * 2;
  for (let i = 0; i < principais; i++) {
    const ang = giro + (i / principais) * Math.PI * 2 + (r() - 0.5) * 0.7;
    const abre = altura * (0.2 + r() * 0.14);
    const fim = topo.clone().add(v3(Math.cos(ang) * abre, altura * (0.14 + r() * 0.16), Math.sin(ang) * abre));
    const de = topo.clone().add(v3(0, -r() * altura * 0.04, 0));
    const pts = caminho(de, fim, nivel === 0 ? 5 : 3, 1.2, r);
    const r0 = raioTronco * (0.42 + r() * 0.16);
    galhos.push({ pontos: pts, raios: pts.map((_, k) => r0 * (1 - (k / pts.length) * 0.65)), ponta: fim, grosso: true });
    if (nivel > 0) continue;
    for (let s = 0; s < 2; s++) {
      const base = pts[2 + Math.floor(r() * (pts.length - 2))];
      const a2 = ang + (r() - 0.5) * 2;
      const comp = altura * (0.08 + r() * 0.09);
      const ate = base.clone().add(v3(Math.cos(a2) * comp, altura * (0.03 + r() * 0.08), Math.sin(a2) * comp));
      const p2 = caminho(base, ate, 3, 0.5, r);
      galhos.push({ pontos: p2, raios: p2.map((_, k) => r0 * 0.38 * (1 - (k / p2.length) * 0.75)), ponta: ate, grosso: false });
    }
  }
  // Um ou dois galhos baixos, mais deitados: é deles que pendura o cipó.
  const baixos = nivel === 0 ? 1 + Math.floor(r() * 2) : 1;
  for (let i = 0; i < baixos; i++) {
    const ang = r() * Math.PI * 2;
    const y = topo.y * (0.72 + r() * 0.15);
    const de = v3(topo.x * (y / topo.y) ** 2, y, topo.z * (y / topo.y) ** 2);
    const comp = altura * (0.18 + r() * 0.08);
    const fim = de.clone().add(v3(Math.cos(ang) * comp, altura * (0.05 + r() * 0.06), Math.sin(ang) * comp));
    const pts = caminho(de, fim, nivel === 0 ? 4 : 2, 0.9, r);
    const r0 = raioTronco * 0.3;
    galhos.push({ pontos: pts, raios: pts.map((_, k) => r0 * (1 - (k / pts.length) * 0.7)), ponta: fim, grosso: true });
  }
  return galhos;
}

/** Copa em nuvens: cada ponta ganha um tufo em cúpula, cartões virados para fora. */
function copa(r: () => number, galhos: Galho[], altura: number, nivel: Nivel, seca: boolean, neve: number, seed: number) {
  const lista: THREE.BufferGeometry[] = [];
  const porPonta = nivel === 0 ? (seca ? 5 : 13) : 7;
  const raioTufo = altura * (nivel === 0 ? 0.11 : 0.13);
  const tam = altura * (nivel === 0 ? 0.13 : 0.19);
  const cores = seca ? FOLHA_SECA : FOLHAS;
  for (const g of galhos) {
    const centro = g.ponta.clone().add(v3(0, raioTufo * 0.15, 0));
    const cor = cores[Math.floor(r() * cores.length)];
    const esc = g.grosso ? 1.15 : 0.85;
    for (let i = 0; i < porPonta; i++) {
      // Cúpula achatada: mais cartão em cima, quase nada embaixo.
      const a = r() * Math.PI * 2;
      const el = Math.asin(Math.min(1, r() * 1.2 - 0.25));
      const d = raioTufo * esc * (0.55 + r() * 0.5);
      const dir = v3(Math.cos(a) * Math.cos(el), Math.sin(el) * 0.6, Math.sin(a) * Math.cos(el));
      const c = centro.clone().addScaledVector(dir, d);
      const normal = dir.clone().add(v3(0, 0.6, 0)).normalize();
      const f = cartao(c, tam * esc * (0.85 + r() * 0.45), tam * esc * (0.75 + r() * 0.4), normal, r() * Math.PI * 2, ATLAS.larga);
      tingir(f, cor, 0.2, seed + 7, 0, 1);
      // Por dentro e por baixo da nuvem fica escuro; o topo pega sol.
      escurecer(f, (p) => {
        const rel = p.clone().sub(centro);
        const fora = Math.min(1, rel.length() / (raioTufo * esc * 1.1));
        return 0.5 + 0.35 * fora + 0.25 * Math.min(1, Math.max(0, rel.y / (raioTufo * 0.8)));
      });
      if (neve) nevarFolhas(f, neve, seed);
      lista.push(f);
    }
  }
  return lista;
}

/** Miolo escuro e opaco de cada tufo grande: tapa o céu que vazaria entre os cartões. */
function miolos(galhos: Galho[], altura: number, nivel: Nivel, seca: boolean, neve: number, seed: number) {
  const lista: THREE.BufferGeometry[] = [];
  const raioTufo = altura * (nivel === 0 ? 0.11 : 0.13);
  galhos.forEach((g, i) => {
    if (!g.grosso) return;
    const m = bolha(raioTufo * 0.7, 0, 0.3, seed + i, 0.55).translate(g.ponta.x, g.ponta.y + raioTufo * 0.3, g.ponta.z);
    tingir(m, seca ? "#6e5634" : "#2f4024", 0.15, seed + i, 0, 1);
    if (neve) nevarFolhas(m, neve * 0.8, seed);
    lista.push(m);
  });
  return lista;
}

/** Cipó pendurado: liana grossa que desce até o chão ou fio solto balançando. */
function cipos(r: () => number, galhos: Galho[], nivel: Nivel, altura: number, quantos: number) {
  const lista: THREE.BufferGeometry[] = [];
  const grossos = galhos.filter((g) => g.grosso);
  for (let i = 0; i < quantos; i++) {
    const g = grossos[i % grossos.length];
    const de = g.pontos[1 + Math.floor(r() * (g.pontos.length - 2))].clone();
    const ateChao = i % 2 === 0;
    const passos = nivel === 0 ? 9 : 4;
    const pts: THREE.Vector3[] = [];
    if (ateChao) {
      // Liana: desce em curva e encosta no chão um pouco para fora.
      const fim = v3(de.x * (0.6 + r() * 0.7) + (r() - 0.5) * 3, 0, de.z * (0.6 + r() * 0.7) + (r() - 0.5) * 3);
      const barrigaMax = 1.5 + r() * 0.5;
      for (let k = 0; k <= passos; k++) {
        const t = k / passos;
        const p = de.clone().lerp(fim, t);
        const barriga = Math.sin(t * Math.PI) * barrigaMax;
        p.x += Math.sin(t * 5 + i) * 0.35 + de.x * 0.08 * barriga;
        p.z += Math.cos(t * 4 + i) * 0.35 + de.z * 0.08 * barriga;
        p.y = de.y * Math.pow(1 - t, 1.15);
        pts.push(p);
      }
      const raio = 0.05 + r() * 0.06;
      lista.push(tubo(pts, pts.map((_, k) => raio * (1 - k * 0.03)), nivel === 0 ? 4 : 3));
    } else {
      const comp = Math.max(1, Math.min(de.y - 2, altura * (0.15 + r() * 0.2)));
      for (let k = 0; k <= passos; k++) {
        const t = k / passos;
        pts.push(de.clone().add(v3(Math.sin(t * 3 + i) * 0.4 * t, -comp * t, Math.cos(t * 2.5 + i) * 0.4 * t)));
      }
      const raio = 0.025 + r() * 0.03;
      lista.push(tubo(pts, pts.map((_, k) => raio * (1 - (k / passos) * 0.6)), 3, true));
    }
  }
  return lista;
}

/** Cipó abraçando o fuste em espiral, do chão até perto da forquilha. */
function cipoEnrolado(r: () => number, topoY: number, raioDoFuste: (t: number) => number, curva: (y: number) => THREE.Vector2) {
  const pts: THREE.Vector3[] = [];
  const voltas = 1.6 + r() * 1.2;
  const a0 = r() * Math.PI * 2;
  const n = 18;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const y = t * topoY * 0.9;
    const a = a0 + t * voltas * Math.PI * 2;
    const rr = raioDoFuste(y / topoY) * (1.08 + Math.max(0, 1 - (y / topoY) * 8) * 0.35) + 0.06;
    const c = curva(y);
    pts.push(v3(Math.cos(a) * rr + c.x, y, Math.sin(a) * rr + c.y));
  }
  return tubo(pts, pts.map(() => 0.07), 4);
}

/** Bromélia: roseta de folhas de capim cruzadas, sentada no galho. */
function bromelia(base: THREE.Vector3, tam: number, r: () => number, cor: string, seed: number) {
  const lista: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI + r() * 0.4;
    const f = cartao(base.clone().add(v3(0, tam * 0.4, 0)), tam, tam * 0.9, v3(Math.cos(a), 0.15, Math.sin(a)), 0, ATLAS.capim);
    lista.push(tingir(f, cor, 0.15, seed, 0.35, base.y + tam * 0.5));
  }
  return lista;
}

const modelo: Modelo = {
  id: "arvore-gigante",
  nome: "Árvore gigante com cipó",
  variacoes: 4,
  altura: [20, 30],
  raio: 9,
  estados: ["neve", "seca", "queimada"],
  gerar(variacao, nivel, estado) {
    const r = sorteio(4100 + variacao * 131);
    const altura = 20 + r() * 10;
    const raioBase = altura * (0.036 + r() * 0.012);
    const topoY = altura * (0.56 + r() * 0.1);
    const inclina = v3((r() - 0.5) * 1.6, 0, (r() - 0.5) * 1.6);
    const queimada = !!estado.queimada;
    const seca = !!estado.seca;
    const neve = estado.neve ?? 0;
    const corMadeira = queimada ? QUEIMADA : CASCA;
    const matMadeira: NomeMaterial = queimada ? "carvao" : "casca";
    const curva = (y: number) => {
      const t = Math.max(0, y) / topoY;
      return new THREE.Vector2(inclina.x * t * t + Math.sin(t * 3 + variacao) * 0.25 * t, inclina.z * t * t + Math.cos(t * 2.5 + variacao) * 0.25 * t);
    };
    const raioDoFuste = (t: number) => raioBase * (1 - 0.42 * t);
    const topo = v3(curva(topoY).x, topoY, curva(topoY).y);
    const lista: Lista = [];

    if (nivel === 2) {
      const pe = tubo([v3(0, -0.2, 0), topo.clone().setY(altura * 0.74)], [raioBase * 1.3, raioBase * 0.55], 4);
      lista.push({ material: matMadeira, geometria: tingir(pe, corMadeira, 0.1, variacao) });
      if (!queimada) {
        const cor = neve ? "#dfe5e6" : seca ? FOLHA_SECA[0] : FOLHAS[variacao % FOLHAS.length];
        const a = r() * Math.PI * 2;
        for (const [dx, dy, s] of [
          [0, 0, 1],
          [0.45, -0.05, 0.75],
        ]) {
          const m = bolha(altura * 0.3 * s, 0, 0.3, variacao + dx * 10, 0.45).translate(topo.x + Math.cos(a) * dx * altura * 0.3, altura * (0.8 + dy), topo.z + Math.sin(a) * dx * altura * 0.3);
          lista.push({ material: neve ? "neve" : "musgo", geometria: tingir(m, cor, 0.12, variacao, 0.35, altura) });
        }
      }
      return pecas(lista);
    }

    // Fuste: sulcos verticais rasos e o pé alargado onde nascem as sapopembas.
    const sulcos = 5 + Math.floor(r() * 4);
    const fuste = troncoComRelevo(
      topoY,
      raioDoFuste,
      nivel === 0 ? 10 : 6,
      nivel === 0 ? 8 : 3,
      (a, y, t) => 1 + (nivel === 0 ? (ruido3(Math.cos(a) * sulcos, y * 0.15, Math.sin(a) * sulcos, variacao) - 0.5) * 0.22 : 0) + Math.max(0, 1 - t * 8) * 0.35,
      curva,
      false,
    );
    tingir(fuste, corMadeira, 0.16, variacao, 0.45, 4);
    if (!queimada) {
      manchar(fuste, LIQUEN, 0.7, 0.9, variacao + 3, 0);
      manchar(fuste, MUSGO, 0.8, 0.6, variacao + 5, 0.2);
    }
    lista.push({ material: matMadeira, geometria: fuste });

    // Sapopembas.
    const nAletas = nivel === 0 ? 4 + Math.floor(r() * 3) : 4;
    const a0 = r() * Math.PI * 2;
    for (let i = 0; i < nAletas; i++) {
      const ang = a0 + (i / nAletas) * Math.PI * 2 + (r() - 0.5) * 0.8;
      const g = aleta(ang, raioBase, raioBase * (3.5 + r() * 2.5), raioBase * (2.8 + r() * 1.8), raioBase * (0.36 + r() * 0.14), r, nivel === 0 ? 6 : 3);
      tingir(g, corMadeira, 0.16, variacao + i, 0.5, 2.5);
      if (!queimada) manchar(g, MUSGO, 0.9, 0.8, variacao + 9, 0.6);
      lista.push({ material: matMadeira, geometria: g });
    }

    // Galhos.
    const galhos = esqueleto(r, altura, nivel, raioBase, topo);
    const madeira = galhos.map((g) => {
      const t = tubo(g.pontos, g.raios, g.raios[0] < 0.12 ? 4 : nivel === 0 ? 7 : 5, true);
      tingir(t, corMadeira, 0.18, variacao + 1, 0, 1);
      if (!queimada) manchar(t, LIQUEN, 0.6, 1.2, variacao + 4, 0.4);
      return t;
    });
    for (const m of madeira) lista.push({ material: matMadeira, geometria: m });

    // Copa.
    if (!queimada) {
      for (const f of copa(r, galhos, altura, nivel, seca, neve, variacao)) lista.push({ material: "folhagem", geometria: f });
      for (const m of miolos(galhos, altura, nivel, seca, neve, variacao)) lista.push({ material: "musgo", geometria: m });
    }

    // Cipós: no fogo queimam junto, ficam poucos e pretos.
    const nCipos = nivel === 0 ? (queimada ? 2 : 6 + Math.floor(r() * 3)) : 2;
    for (const c of cipos(r, galhos, nivel, altura, nCipos)) {
      lista.push({ material: queimada ? "carvao" : "casca", geometria: tingir(c, queimada ? QUEIMADA : seca ? "#5d5040" : CIPO, 0.2, variacao + 2, 0.3, 3) });
    }
    if (nivel === 0 && !queimada && r() < 0.8) {
      lista.push({ material: "casca", geometria: tingir(cipoEnrolado(r, topoY, raioDoFuste, curva), CIPO, 0.2, variacao, 0.3, 3) });
    }

    // Epífitas: bromélias nos galhos e barba-de-velho pendurada.
    if (nivel === 0 && !queimada) {
      const grossos = galhos.filter((g) => g.grosso);
      for (let i = 0; i < 7; i++) {
        const g = grossos[i % grossos.length];
        const k = 1 + Math.floor(r() * (g.pontos.length - 2));
        const base = g.pontos[k].clone().add(v3(0, g.raios[k] * 0.8, 0));
        const cor = seca ? "#8a6a3c" : BROMELIA[Math.floor(r() * BROMELIA.length)];
        for (const b of bromelia(base, 0.7 + r() * 0.6, r, cor, variacao + i)) lista.push({ material: "folhagem", geometria: neve ? nevarFolhas(b, neve, i) : b });
      }
      for (let i = 0; i < 6; i++) {
        const g = galhos[Math.floor(r() * galhos.length)];
        const p = g.pontos[1 + Math.floor(r() * (g.pontos.length - 2))];
        const comp = 1 + r() * 1.6;
        const a = r() * Math.PI;
        for (const da of [0, Math.PI / 2]) {
          const f = cartao(p.clone().add(v3(0, -comp * 0.5, 0)), comp * 0.5, comp, v3(Math.cos(a + da), 0, Math.sin(a + da)), Math.PI, ATLAS.capim);
          lista.push({ material: "folhagem", geometria: tingir(f, BARBA, 0.15, i, 0, 1) });
        }
      }
    }

    if (neve && nivel === 0) {
      for (const m of madeira) lista.push({ material: "neve", geometria: nevar(m, neve, 0.05) });
    }
    return pecas(lista);
  },
};

export default modelo;
