// Barroco incendiado (Sacramento, a antiga capital): igrejas de pedra com torre e arcos
// sobrando, casarões sem telhado, paredes de cal e cantaria enegrecidas de fuligem,
// vigas carbonizadas, mato e trepadeira subindo, e poucos barracos de reconstrução.
// Silhueta de longe: paredes recortadas sem telhado, torres de coruchéu bulboso.

import * as THREE from "three";
import { bolha, sorteio } from "../../natureza/ferramentas";
import { aoLongo, bloco, chamine, empenas, malha, naFace, Obra, placa, sacada, telhado, toldo, type Face } from "../kit";
import type { Estilo, NivelPredio, PecasDoPredio, PredioLocal } from "../tipos";
import {
  arvoreNaRuina,
  caibro,
  entulho,
  frisoQuebrado,
  frontao,
  moita,
  ObraVelha,
  paredeVazada,
  perfilQuebrado,
  porParede,
  telhadoQueimado,
  torreBarroca,
  trepadeira,
  vigaCaida,
  type Vao,
} from "./_barroco-queimado-pecas";

const CAL = ["#a99b82", "#b0a189", "#9a8e78", "#a39278", "#918878"];
const PEDRA = ["#7d7466", "#857a6a", "#6f685e", "#7a6e5c"];
const CANTARIA = ["#8c8774", "#958d78", "#7f7b6b"];
const MUSGO = ["#4a5a2e", "#55652f", "#3f4f2a", "#5d6834"];
const VIGA = "#2b2521";
const TELHA = ["#6a3e30", "#5e3a2e", "#704636"];
const TABUA = ["#8a7356", "#7d6a52", "#94795a"];

type Cores = { cal: string; pedra: string; cantaria: string; musgo: string; telha: string; tabua: string };

function paleta(r: () => number): Cores {
  const de = (l: string[]) => l[Math.floor(r() * l.length)];
  return { cal: de(CAL), pedra: de(PEDRA), cantaria: de(CANTARIA), musgo: de(MUSGO), telha: de(TELHA), tabua: de(TABUA) };
}

const FACES: Face[] = ["frente", "direita", "fundos", "esquerda"];
/** Vão de entrar: 4,4 m de largura e pelo menos 3 m livres, em arco abatido se couber. */
const portaDeEntrar = (A: number): Vao => {
  const h = Math.max(3.05, Math.min(3.6, A - 0.35));
  return { u: 0, y: 0, w: 4.4, h, flecha: Math.min(0.6, h - 3) };
};
const comp = (f: Face, L: number, F: number) => (f === "frente" || f === "fundos" ? L : F);

/** Vãos de uma face: arcos abatidos no térreo, arcos plenos ou vergas no alto. */
function vaosDaFace(f: Face, L: number, F: number, A: number, r: () => number, porta: Vao | null, estilo: "abatido" | "pleno" = "abatido"): Vao[] {
  const c = comp(f, L, F);
  const n = Math.max(1, Math.floor((c - 1.2) / (f === "frente" ? 2.5 : 3.4)));
  const lista: Vao[] = [];
  if (porta) lista.push(porta);
  const andares = A >= 6.4 ? 2 : 1;
  for (const u of aoLongo(c, n, 1.4)) {
    for (let a = 0; a < andares; a++) {
      if (f !== "frente" && r() < 0.3) continue;
      const w = 1.05 + r() * 0.15;
      const y = a === 0 ? 1.0 : 3.95;
      const h = a === 0 ? 1.9 : 2.25;
      const flecha = estilo === "pleno" ? w / 2 : w * 0.2;
      // No térreo da frente, alguns vãos viram porta (casa de comércio barroca).
      if (a === 0 && f === "frente" && !porta && r() < 0.3) lista.push({ u, y: 0, w: 1.4, h: 2.9, flecha: 0.35 });
      else lista.push({ u, y, w, h, flecha });
    }
  }
  return lista;
}

/** Casco: as quatro paredes de cal sobre cantaria, enegrecidas, com o topo quebrado. */
function casco(obra: ObraVelha, p: PredioLocal, cor: Cores, r: () => number, quebra: number[], opcoes: { porta?: Vao | null; pleno?: boolean } = {}) {
  const { largura: L, fundo: F, altura: A } = p;
  const perfis: Record<string, THREE.Vector2[]> = {};
  FACES.forEach((f, i) => {
    const c = comp(f, L, F);
    const perfil = perfilQuebrado(c, A, quebra[i], r, [1 - quebra[i] * 0.2 * r(), 1 - quebra[i] * 0.3 * r()]);
    perfis[f] = perfil;
    const porta = f === "frente" ? (opcoes.porta === undefined ? (p.entravel ? portaDeEntrar(A) : { u: 0, y: 0, w: 1.6, h: 3.0, flecha: 0.4 }) : opcoes.porta) : null;
    const vaos = vaosDaFace(f, L, F, A, r, porta, opcoes.pleno ? "pleno" : "abatido");
    // Moldura de cantaria só na fachada: as laterais ficam lisas (e baratas).
    porParede(obra, f, L, F, perfil, vaos, "reboco", cor.cal, f === "frente" ? { cor: cor.cantaria } : undefined, 0.55);
    // Embasamento de pedra e cimalha onde a parede ainda está inteira.
    frisoQuebrado(obra, f, L, F, perfil, 0, 0.8, 0.08, cor.pedra, "cantaria", vaos);
    frisoQuebrado(obra, f, L, F, perfil, A - 0.4, 0.4, 0.22, cor.cantaria);
    if (A >= 6.4) frisoQuebrado(obra, f, L, F, perfil, 3.55, 0.2, 0.12, cor.cantaria);
  });
  // Cunhais de cantaria: aguentam mais que a parede, ficam de pé.
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const h = A * (r() < 0.6 ? 1 : 0.5 + r() * 0.4);
    obra.por("cantaria", bloco(0.6, h, 0.6, sx * (L / 2 - 0.27), 0, sz * (F / 2 - 0.27)), cor.cantaria, 0.06, 0.25);
  }
  return perfis;
}

function alturaPerto(perfil: THREE.Vector2[], u: number) {
  let melhor = perfil[0];
  for (const q of perfil) if (Math.abs(q.x - u) < Math.abs(melhor.x - u)) melhor = q;
  return melhor.y;
}

/** Mato, trepadeira, entulho e viga caída: o que a ruína ganha com os anos. */
function abandono(obra: ObraVelha, p: PredioLocal, cor: Cores, r: () => number, perfis: Record<string, THREE.Vector2[]> | null, intensidade = 1) {
  const { largura: L, fundo: F, altura: A } = p;
  const [f0, u0] = [obra.fuligem, obra.umidade];
  obra.fuligem = obra.umidade = 0;
  const nTrep = Math.round((1 + r() * 3) * intensidade);
  for (let i = 0; i < nTrep; i++) {
    const f = FACES[Math.floor(r() * 4)];
    const c = comp(f, L, F);
    let u = (r() - 0.5) * c * 0.8;
    // No entrável, nada de folhagem sobre o vão da porta.
    if (p.entravel && f === "frente" && Math.abs(u) < 3.2) u = (u < 0 ? -1 : 1) * Math.min(c / 2 - 0.8, 3.2 + r());
    const topo = perfis?.[f] ? Math.max(1.2, alturaPerto(perfis[f], u) - 0.2) : A;
    const alto = topo * (0.45 + r() * 0.5);
    trepadeira(obra, f, L, F, u, topo - alto, alto, 1.2 + r() * 2, Math.floor(r() * 1e5), cor.musgo);
  }
  for (let i = 0; i < Math.round((2 + r() * 2) * intensidade); i++) {
    const lado = r() < 0.5;
    const [x, z] = lado ? [(r() < 0.5 ? -1 : 1) * (L / 2 + 0.4), (r() - 0.5) * F * 0.9] : [(r() - 0.5) * L * 0.9, -F / 2 - 0.4];
    moita(obra, x, z, 0.6 + r() * 0.8, 0.5 + r() * 0.6, Math.floor(r() * 1e5), MUSGO[Math.floor(r() * 4)], 0);
  }
  obra.fuligem = f0;
  obra.umidade = u0;
  // Dentro: entulho e vigas (no entrável, fora do caminho da porta).
  const nEnt = p.entravel ? 1 : 1 + Math.floor(r() * 2);
  for (let i = 0; i < nEnt; i++) {
    const [x, z] = p.entravel ? [(r() < 0.5 ? -1 : 1) * L * 0.3, -F * 0.3] : [(r() - 0.5) * L * 0.4, (r() - 0.5) * F * 0.4];
    entulho(obra, x, z, 1.6 + r() * 2.2, 1.4 + r() * 2, 0.5 + r() * 0.6, cor.pedra, r);
  }
  for (let i = 0; i < 1 + Math.floor(r() * 2 * intensidade); i++) {
    vigaCaida(obra, (r() - 0.5) * L * 0.5, (r() - 0.5) * F * 0.4 - (p.entravel ? F * 0.15 : 0), Math.min(L, F) * (0.5 + r() * 0.3), r() * Math.PI * 2, 0.5 + r() * A * 0.4, VIGA, 0.22 + r() * 0.1);
  }
}

/** Alpendre de tábua nova: piso, esteios (nenhum no vão de entrar), viga e uma água. */
function alpendre(obra: Obra, L: number, F: number, comprimento: number, prof: number, h: number, n: number, entravel: boolean) {
  const mad = "#7a6248";
  obra.por("madeira", naFace(bloco(comprimento, 0.2, prof, 0, 0, prof / 2), "frente", L, F, 0, 0), mad, 0.1, 0.4);
  for (const u of aoLongo(comprimento - 0.4, n, 0)) if (!(entravel && Math.abs(u) < 2.5)) obra.por("madeira", naFace(bloco(0.22, h, 0.22, u, 0, prof - 0.2), "frente", L, F, 0, 0.2), mad, 0.1, 0);
  obra.por("madeira", naFace(bloco(comprimento, 0.2, 0.2, 0, 0, prof - 0.2), "frente", L, F, 0, h + 0.2), mad, 0.1, 0);
  for (const g of telhado("uma-agua", comprimento, prof, 0, 0.6, 0.3, 0.12)) obra.por("madeira", naFace(g.translate(0, h + 0.4, prof / 2), "frente", L, F, 0, 0), "#6e5a46", 0.12, 0);
}

/** Barraco de reconstrução: tábua nova, cobertura de uma água de tábua ou lona. */
function barraco(obra: ObraVelha, t: Obra, x: number, z: number, w: number, d: number, h: number, cor: Cores, r: () => number) {
  const e = 0.12;
  for (const [bw, bd, bx, bz] of [
    [w, e, 0, -d / 2],
    [e, d, -w / 2, 0],
    [e, d, w / 2, 0],
  ] as const)
    obra.limpo("madeira", bloco(bw, h, bd, x + bx, 0, z + bz), cor.tabua, 0.14, 0.2);
  // Frente de tábua com porta.
  const lado = (w - 1.1) / 2;
  for (const s of [-1, 1]) obra.limpo("madeira", bloco(lado, h, e, x + s * (w / 2 - lado / 2), 0, z + d / 2), cor.tabua, 0.14, 0.2);
  obra.limpo("madeira", bloco(1.1, h - 2.1, e, x, 2.1, z + d / 2), cor.tabua, 0.14, 0);
  obra.limpo("madeira-escura", bloco(1.0, 2.05, 0.05, 0, 0, 0).rotateY(0.6).translate(x + 0.2, 0, z + d / 2 + 0.3), "#4a3a2a", 0.1, 0);
  for (const u of aoLongo(w, Math.floor(w / 0.8), 0.2)) obra.limpo("madeira", bloco(0.07, h, 0.04, x + u, 0, z + d / 2 + 0.07), "#6a5640", 0.1, 0);
  const lona = r() < 0.5;
  for (const g of telhado("uma-agua", w, d, 0, 0.7, 0.35, 0.08)) t.por(lona ? "lona" : "madeira", g.translate(x, h, z), lona ? (r() < 0.5 ? "#b8a888" : "#8f8466") : "#6f5c46", 0.15, 0);
  // Chaminé de lata.
  if (r() < 0.6) obra.limpo("ferro", new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6).translate(x + w * 0.3, h + 0.7, z - d * 0.2), "#3a3532", 0.05, 0);
}

const reto = (c: number, A: number) => [new THREE.Vector2(-c, A), new THREE.Vector2(c, A)];

// ---------------------------------------------------------------------------
// Ruínas

type Variante = "casco" | "fachada" | "esquina" | "arcada" | "alicerce" | "capela" | "barraco";

function ruina(p: PredioLocal, r: () => number, cor: Cores, forcar?: Variante): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new ObraVelha(Math.floor(r() * 1e6), 0.7, 0.15);
  const t = new ObraVelha(5, 0, 0);
  let v: Variante;
  if (forcar) v = forcar;
  else if (p.entravel) v = A >= 4.6 ? (r() < 0.5 ? "fachada" : "casco") : "alicerce";
  else if (A < 3) v = r() < 0.65 ? "alicerce" : "esquina";
  else {
    const x = r();
    v = x < 0.24 ? "casco" : x < 0.42 ? "fachada" : x < 0.6 ? "esquina" : x < 0.72 ? "arcada" : x < 0.8 ? "capela" : x < 0.9 ? "barraco" : "alicerce";
  }
  const portaFrente: Vao = p.entravel ? portaDeEntrar(A) : { u: (r() - 0.5) * L * 0.2, y: 0, w: 1.7, h: Math.min(3.2, A * 0.65), flecha: 0.45 };
  let perfis: Record<string, THREE.Vector2[]> | null = null;
  const toco = (f: Face, quebra: number, alturaMax: number, vaos: Vao[] = []) => {
    const perfil = perfilQuebrado(comp(f, L, F), alturaMax, quebra, r, [0.6 + r() * 0.4, 0.4 + r() * 0.5]);
    porParede(obra, f, L, F, perfil, vaos, "reboco", cor.cal, { cor: cor.cantaria }, 0.55);
    frisoQuebrado(obra, f, L, F, perfil, 0, 0.7, 0.08, cor.pedra, "cantaria", vaos);
    return perfil;
  };

  if (v === "casco") {
    perfis = casco(obra, p, cor, r, [p.entravel ? 0 : 0.35 + r() * 0.3, 0.5 + r() * 0.4, 0.7 + r() * 0.3, 0.5 + r() * 0.4], { porta: portaFrente });
  } else if (v === "fachada" || v === "capela") {
    // Frente inteira com frontão barroco; o resto caiu.
    const vaos: Vao[] = [portaFrente, ...aoLongo(L, Math.max(2, Math.floor(L / 3)), 1.6).filter((u) => Math.abs(u - portaFrente.u) > 2.2).map((u) => ({ u, y: 1.1, w: 1.1, h: Math.min(2.3, A * 0.4), flecha: 0.55 }))];
    if (A >= 5) vaos.push({ u: 0, y: A - 0.2, w: 1.1, h: 1.1, flecha: 0, oculo: true });
    const perfil = frontao(L, A, v === "capela" ? 2.6 : 1.4 + r() * 1.2, r);
    if (A >= 5) vaos.push(...[-1, 1].map((s) => ({ u: (s * L) / 4, y: A * 0.62, w: 1.0, h: 1.8, flecha: 0.5 })));
    porParede(obra, "frente", L, F, perfil, vaos, "reboco", cor.cal, { cor: cor.cantaria, largura: 0.26 }, 0.6);
    frisoQuebrado(obra, "frente", L, F, perfil, 0, 0.9, 0.1, cor.pedra, "cantaria", vaos);
    frisoQuebrado(obra, "frente", L, F, perfil, A - 0.35, 0.4, 0.28, cor.cantaria);
    for (const s of [-1, 1]) obra.por("cantaria", bloco(0.7, A + 0.1, 0.7, s * (L / 2 - 0.3), 0, F / 2 - 0.3), cor.cantaria, 0.05, 0.2);
    for (const s of [-1, 1]) obra.por("cantaria", bloco(0.45, A - 0.4, 0.15, portaFrente.u + s * (portaFrente.w / 2 + 0.6), 0, F / 2 + 0.05), cor.cantaria, 0.05, 0.2);
    const ladoAlto = v === "capela" ? 0.85 : 0.6;
    const vaosLado = () => (v === "capela" ? aoLongo(F, 2, 2.4).map((u) => ({ u, y: A * 0.35, w: 1.1, h: 2.0, flecha: 0.55 })) : []);
    toco("esquerda", 0.7, A * ladoAlto, vaosLado());
    toco("direita", 0.8, A * ladoAlto * (0.7 + r() * 0.3), vaosLado());
    toco("fundos", 0.9, A * (v === "capela" ? 0.7 : 0.35));
    if (v === "capela") {
      // Espadana: parede-sineira com um arco e a cruz, sobre o frontão.
      const topo = A + 0.2 + 2.6 * 0.85;
      const g = paredeVazada(2.6, reto(1.3, 2.4), [{ u: 0, y: 0.4, w: 1.0, h: 1.6, flecha: 0.5 }], 0.45).geometria;
      obra.por("reboco", g.translate(0, topo - 0.3, F / 2), cor.cal, 0.08, 0);
      obra.por("cantaria", bloco(2.9, 0.25, 0.6, 0, topo + 2.1, F / 2 - 0.22), cor.cantaria, 0.05, 0);
      obra.por("ferro", bloco(0.08, 1.2, 0.08, 0, topo + 2.35, F / 2 - 0.22), "#2c2a28", 0.02, 0);
      obra.por("ferro", bloco(0.6, 0.08, 0.08, 0, topo + 3.0, F / 2 - 0.22), "#2c2a28", 0.02, 0);
      obra.por("cantaria", bloco(Math.min(3, L * 0.3), 1.0, 1.0, 0, 0, -F / 2 + 1.3), cor.cantaria, 0.06, 0.2);
    }
    perfis = { frente: perfil, esquerda: reto(F, A * 0.6), direita: reto(F, A * 0.5), fundos: reto(L, A * 0.3) };
  } else if (v === "esquina") {
    const lado: Face = r() < 0.5 ? "esquerda" : "direita";
    const f1 = toco("frente", 0.45, A, [portaFrente, ...aoLongo(L, 3, 1.4).filter((u) => Math.abs(u - portaFrente.u) > 1.9).map((u) => ({ u, y: 1.0, w: 1.1, h: 1.9, flecha: 0.22 }))]);
    const f2 = toco(lado, 0.5, A, aoLongo(F, 2, 1.6).map((u) => ({ u, y: 1.0, w: 1.1, h: 1.9, flecha: 0.22 })));
    toco(lado === "esquerda" ? "direita" : "esquerda", 0.9, A * 0.3);
    toco("fundos", 0.9, A * 0.35);
    const sx = lado === "esquerda" ? -1 : 1;
    obra.por("cantaria", bloco(0.65, A, 0.65, sx * (L / 2 - 0.28), 0, F / 2 - 0.28), cor.cantaria, 0.05, 0.25);
    perfis = { frente: f1, esquerda: lado === "esquerda" ? f2 : reto(F, A * 0.3), direita: lado === "direita" ? f2 : reto(F, A * 0.3), fundos: reto(L, A * 0.35) };
    if (r() < 0.6) obra.por("madeira-escura", caibro(new THREE.Vector3(sx * L * 0.42, A * 0.8, F * 0.3), new THREE.Vector3(-sx * L * 0.2, 0.1, -F * 0.2), 0.24), VIGA, 0.1, 0);
  } else if (v === "arcada") {
    // Arcada de claustro ou de loja: pilares e arcos plenos; fundo mais baixo.
    const n = p.entravel ? 3 : Math.max(2, Math.floor(L / 3.2));
    const passo = (L - 1.2) / n;
    const largura = Math.max(passo - 0.75, p.entravel ? 0 : 0);
    const vaos: Vao[] = Array.from({ length: n }, (_, i) => ({ u: -L / 2 + 0.6 + passo * (i + 0.5), y: 0, w: largura, h: Math.min(A - 0.9, largura / 2 + 2.6), flecha: largura / 2 }));
    const perfil = perfilQuebrado(L, A, 0.3 + r() * 0.3, r, [1, 0.7]);
    porParede(obra, "frente", L, F, perfil, vaos, "cantaria", cor.cantaria, { cor: cor.pedra, largura: 0.18 }, 0.7);
    frisoQuebrado(obra, "frente", L, F, perfil, A - 0.45, 0.45, 0.2, cor.pedra);
    toco("esquerda", 0.7, A * 0.75);
    toco("direita", 0.8, A * 0.6);
    toco("fundos", 0.6, A * 0.55, aoLongo(L, 2, 2).map((u) => ({ u, y: 1.0, w: 1.1, h: 1.8, flecha: 0.55 })));
    perfis = { frente: perfil, esquerda: reto(F, A * 0.6), direita: reto(F, A * 0.5), fundos: reto(L, A * 0.5) };
  } else if (v === "alicerce") {
    // Só o alicerce de pedra, a lareira e esteios carbonizados de pé.
    const h = Math.min(1.3, A * 0.4);
    for (const f of FACES) {
      const perfil = perfilQuebrado(comp(f, L, F), h, 0.6, r);
      if (f === "frente" && p.entravel) {
        // Vão de entrar aberto até o chão: dois trechos de alicerce, um de cada lado.
        const resto = (L - 4.4) / 2;
        for (const sn of [-1, 1]) obra.por("cantaria", naFace(paredeVazada(resto, perfilQuebrado(resto, h, 0.6, r), [], 0.6).geometria, f, L, F, sn * (2.2 + resto / 2), 0), cor.pedra, 0.08, 0.25);
        continue;
      }
      const vaos = f === "frente" ? [{ u: portaFrente.u, y: 0, w: 1.6, h: Math.max(0.2, h * 0.5 - 0.3), flecha: 0 }] : [];
      porParede(obra, f, L, F, perfil, vaos, "cantaria", cor.pedra, undefined, 0.6);
    }
    const cx = (r() - 0.5) * L * 0.4;
    chamine(obra, cx, -F / 2 + 0.9, 0, Math.max(A, 3.5) + 0.8, "#6e5a4c");
    obra.por("tijolo", bloco(1.6, 1.4, 0.9, cx, 0, -F / 2 + 0.9), "#5e4a3e", 0.12, 0.2);
    obra.por("carvao", bloco(0.9, 0.7, 0.2, cx, 0.1, -F / 2 + 1.36), "#141210", 0.05, 0);
    for (let i = 0; i < 3 + Math.floor(r() * 3); i++) {
      const ex = (r() - 0.5) * L * 0.8;
      const ez = (r() - 0.5) * F * 0.7;
      obra.por("madeira-escura", bloco(0.24, 1 + r() * Math.max(A - 1, 1.5), 0.24, 0, 0, 0).rotateZ((r() - 0.5) * 0.2).translate(ex, 0, ez), VIGA, 0.1, 0);
    }
    perfis = { frente: reto(L, h), esquerda: reto(F, h), direita: reto(F, h), fundos: reto(L, h) };
  } else {
    // Barraco: canto da ruína reaproveitado, com um barraco de tábua dentro.
    const lado: Face = r() < 0.5 ? "esquerda" : "direita";
    const pf = toco("fundos", 0.35, A, aoLongo(L, 2, 1.8).map((u) => ({ u, y: 1.0, w: 1.1, h: 1.8, flecha: 0.22 })));
    const pl = toco(lado, 0.4, A * 0.9, aoLongo(F, 2, 1.8).map((u) => ({ u, y: 1.0, w: 1.1, h: 1.8, flecha: 0.22 })));
    toco(lado === "esquerda" ? "direita" : "esquerda", 0.8, A * 0.3);
    toco("frente", 0.9, A * 0.35, p.entravel ? [{ u: 0, y: 0, w: 4.4, h: Math.max(0.3, A * 0.35 - 0.6), flecha: 0 }] : []);
    const sx = lado === "esquerda" ? -1 : 1;
    const w = Math.min(L * 0.5, 5.5);
    const d = Math.min(F * 0.5, 4.5);
    barraco(obra, t, sx * (L / 2 - 0.6 - w / 2), -F / 2 + 0.6 + d / 2, w, d, 2.5, cor, r);
    perfis = { frente: reto(L, A * 0.3), esquerda: lado === "esquerda" ? pl : reto(F, A * 0.3), direita: lado === "direita" ? pl : reto(F, A * 0.3), fundos: pf };
  }

  abandono(obra, p, cor, r, perfis, v === "alicerce" ? 1.3 : 1);
  const corpo = obra.pecas();
  if (!p.entravel && r() < 0.3 && L > 8 && v !== "barraco") {
    const o2 = new Obra(77);
    arvoreNaRuina(o2, (r() - 0.5) * L * 0.4, (r() - 0.5) * F * 0.3, A * (0.9 + r() * 0.7), r, cor.musgo);
    corpo.push(...o2.pecas());
  }
  return { corpo, telhado: t.pecas(), interior: interiorRuina(p, cor, r) };
}

function interiorRuina(p: PredioLocal, cor: Cores, r: () => number) {
  if (!p.entravel) return [];
  const o = new ObraVelha(9, 0.3, 0);
  // Lajes de pedra rachadas e um banco tombado.
  for (const x of aoLongo(p.largura - 1, 3, 0.6))
    for (const z of aoLongo(p.fundo - 1, 3, 0.6)) if (r() < 0.8) o.por("pedra", bloco((p.largura - 1.4) / 3 - 0.08, 0.08, (p.fundo - 1.4) / 3 - 0.08, x, 0.01, z), cor.pedra, 0.1, 0);
  o.por("madeira-escura", bloco(2.2, 0.45, 0.4, 0, 0, 0).rotateZ(0.25).rotateY(0.4).translate(p.largura * 0.2, 0, p.fundo * 0.1), "#3a2e24", 0.1, 0);
  return o.pecas();
}

// ---------------------------------------------------------------------------
// Prédios de pé (casarões queimados, alguns reconstruídos)

function casarao(p: PredioLocal, r: () => number, cor: Cores, extras: { inteiro?: number; reconstruido?: boolean; grade?: boolean; sacadas?: boolean } = {}): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new ObraVelha(Math.floor(r() * 1e6), 0.65, 0.12);
  const t = new ObraVelha(8, 0.35, 0);
  const quebra = extras.reconstruido ? [0, 0, 0, 0] : [0, 0.1 + r() * 0.15, 0.2 + r() * 0.2, 0.1 + r() * 0.15];
  const perfis = casco(obra, p, cor, r, quebra, { porta: p.entravel ? portaDeEntrar(A) : { u: 0, y: 0, w: 1.7, h: 3.1, flecha: 0.4 } });
  // Sobrado: sacadas de ferro que sobraram.
  if (A >= 6.4 && extras.sacadas !== false) {
    for (const u of aoLongo(L, Math.max(1, Math.floor((L - 1.2) / 2.5)), 1.4)) if (r() < 0.6 && Math.abs(u) > 2.4) sacada(obra, "frente", L, F, u, 3.85, 1.6, "#26221f");
  }
  if (extras.grade)
    for (const u of aoLongo(L, Math.max(1, Math.floor((L - 1.2) / 2.5)), 1.4)) {
      if (Math.abs(u) < 2.6) continue;
      for (let i = 0; i < 4; i++) obra.por("ferro", naFace(bloco(0.04, 1.9, 0.04, -0.39 + i * 0.26, 0, 0.1), "frente", L, F, u, 1.0), "#26221f", 0.02, 0);
    }
  const alto = Math.min(L, F) * 0.3;
  if (extras.reconstruido) {
    // Telhado refeito, remendado de lona e tábua; empena de tábua.
    t.fuligem = 0;
    for (const g of telhado("duas-aguas", L, F, A, alto, 0.6)) t.por("telha", g, cor.telha, 0.16, 0);
    for (let i = 0; i < 2; i++) {
      const x = (r() - 0.5) * L * 0.6;
      const s = r() < 0.5 ? 1 : -1;
      const quad = [
        [x - 1.2, 0.35, 0.33],
        [x + 1.2, 0.35, 0.33],
        [x + 1.2, 0.75, 0.13],
        [x - 1.2, 0.75, 0.13],
      ].map(([px, ky, kz]) => new THREE.Vector3(px, A + alto * ky + 0.12, s * F * kz));
      t.por(i === 0 ? "lona" : "madeira", malha(quad, s > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]), i === 0 ? "#7e745e" : "#5e4e3e", 0.12, 0);
    }
    for (const g of empenas(L, F, A, alto)) obra.limpo("madeira", g, cor.tabua);
  } else {
    telhadoQueimado(t, L, F, A, alto, extras.inteiro ?? r() * 0.55, r, { telha: cor.telha, viga: VIGA });
  }
  abandono(obra, p, cor, r, perfis, extras.reconstruido ? 0.5 : 1);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorCasa(p, cor, r) };
}

function interiorCasa(p: PredioLocal, cor: Cores, r: () => number) {
  if (!p.entravel) return [];
  const o = new ObraVelha(13, 0.2, 0);
  const { largura: L, fundo: F } = p;
  o.por("madeira", bloco(L - 1.1, 0.08, F - 1.1, 0, 0.02, 0), "#5a4a3a", 0.12, 0);
  o.por("carvao", bolha(1, 1, 0.4, 7, 0.05).scale(L * 0.22, 1, F * 0.2).translate(L * 0.15, 0.11, -F * 0.1), "#1c1816", 0.1, 0);
  o.limpo("madeira", bloco(L * 0.45, 1.05, 0.8, 0, 0, -F / 2 + 1.4), "#6a5440", 0.1, 0);
  for (const s of [-1, 1]) o.limpo("madeira", bloco(1.4, 0.78, 0.9, s * L * 0.26, 0, F * 0.05), "#6a5440", 0.1, 0);
  entulho(o, -L * 0.3, -F * 0.25, 1.6, 1.4, 0.4, cor.pedra, r);
  return o.pecas();
}

function comercio(p: PredioLocal, r: () => number, cor: Cores, oque: "armazem" | "saloon" | "farmacia" | "outro"): PecasDoPredio {
  const base = casarao(p, r, cor, oque === "saloon" || r() < 0.5 ? { reconstruido: true, sacadas: oque !== "saloon" } : { inteiro: 0.5 + r() * 0.3 });
  const o = new ObraVelha(21, 0, 0);
  const { largura: L, fundo: F, altura: A } = p;
  if (oque === "saloon") {
    // Alpendre de tábua nova pregado na fachada queimada.
    alpendre(o, L, F, L * 0.9, 2.2, 3.1, Math.max(3, Math.floor(L / 3)), p.entravel);
    placa(o, "frente", L, F, 0, Math.min(A - 0.9, 3.4), Math.min(L * 0.55, 5), 0.8, "#4a3424");
  } else {
    toldo(o, "frente", L, F, 0, 3.4, Math.min(L - 1, 6.5), 1.7, oque === "farmacia" ? "#7a7a62" : "#a89a7a");
    placa(o, "frente", L, F, 0, Math.min(A - 0.9, 4.0), Math.min(L * 0.5, 4.5), 0.7, "#5a4430");
    for (const s of [-1, 1]) o.por("madeira", naFace(bloco(0.8, 0.7, 0.7, s * (L / 2 - 1.4), 0, 0.6), "frente", L, F, 0, 0), "#8a7052", 0.12, 0.2);
  }
  return { ...base, corpo: [...base.corpo, ...o.pecas()] };
}

// ---------------------------------------------------------------------------
// Igreja: fachada com frontão e duas torres (uma partida), nave sem telhado.

function igreja(p: PredioLocal, r: () => number, cor: Cores, matriz: boolean): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new ObraVelha(Math.floor(r() * 1e6) + 3, 0.55, 0.12);
  const t = new ObraVelha(31, 0.2, 0);
  const lado = Math.max(3, Math.min(4, L * 0.24));
  const duas = matriz || L >= 13;
  const cTorre = { fuste: cor.cal, cantaria: cor.cantaria, cupula: "#4a4038" };
  // Entrável de torre única: a torre vai para o canto dos fundos (campanário posterior,
  // comum nas capelas mineiras) e a porta fica no meio da fachada.
  const atras = !duas && !!p.entravel;
  const Lf = duas ? L - lado * 2 : atras ? L : L - lado;
  const desloca = duas || atras ? 0 : -lado / 2;
  const alto = Math.min(5, Lf * 0.55);
  const perfil = frontao(Lf, A, alto, () => 0.9);
  const hPorta = Math.max(3.05, Math.min(4.6, A - 0.4));
  const porta: Vao = p.entravel ? { u: 0, y: 0, w: 4.4, h: hPorta, flecha: Math.min(2.2, hPorta - 3) } : { u: 0, y: 0, w: 2.4, h: Math.min(4.2, A - 0.4), flecha: 1.2 };
  const vaos: Vao[] = [porta, { u: 0, y: A + 0.3, w: 1.4, h: 1.4, flecha: 0, oculo: true }];
  if (Lf >= 7) for (const s of [-1, 1]) vaos.push({ u: s * Lf * 0.3, y: A * 0.55, w: 1.1, h: 2.1, flecha: 0.55 });
  // A fachada é desenhada com largura Lf e depois deslocada para o meio entre as torres.
  const fach = new ObraVelha(41, 0.5, 0.1);
  porParede(fach, "frente", Lf, F, perfil, vaos, "reboco", cor.cal, { cor: cor.cantaria, largura: 0.3 }, 0.7);
  frisoQuebrado(fach, "frente", Lf, F, perfil, 0, 1.0, 0.12, cor.pedra, "cantaria", vaos);
  frisoQuebrado(fach, "frente", Lf, F, perfil, A - 0.4, 0.45, 0.3, cor.cantaria);
  for (const s of [-1, 1]) fach.por("cantaria", naFace(bloco(0.5, A - 0.4, 0.18, s * (porta.w / 2 + 0.7), 0, 0.09), "frente", Lf, F, 0, 0), cor.cantaria, 0.05, 0.2);
  fach.por("cantaria", naFace(bloco(porta.w + 1.8, 0.35, 0.3, 0, 0, 0.15), "frente", Lf, F, 0, porta.h + 0.35), cor.cantaria, 0.05, 0);
  fach.por("ferro", bloco(0.1, 1.4, 0.1, 0, A + alto * 0.85 + 0.6, F / 2 - 0.35), "#2c2a28", 0.02, 0);
  fach.por("ferro", bloco(0.7, 0.1, 0.1, 0, A + alto * 0.85 + 1.4, F / 2 - 0.35), "#2c2a28", 0.02, 0);
  const pecasFachada = fach.pecas().map((pc) => ({ ...pc, geometria: pc.geometria.translate(desloca, 0, 0) }));
  // Nave: paredes laterais altas com janelas em arco, mais quebradas para os fundos.
  for (const f of ["esquerda", "direita"] as Face[]) {
    const perfilLado = perfilQuebrado(F, A, 0.45 + r() * 0.3, r, [1, 0.45 + r() * 0.3]);
    // Na face "esquerda" u cresce para a frente; na "direita", para os fundos.
    const sFrente = f === "esquerda" ? 1 : -1;
    const janelas: Vao[] = aoLongo(F - lado, Math.max(2, Math.floor(F / 5)), 2).map((u) => ({ u: u - sFrente * lado * 0.5, y: A * 0.4, w: 1.3, h: 2.6, flecha: 0.65 }));
    porParede(obra, f, L, F, perfilLado, janelas, "reboco", cor.cal, { cor: cor.cantaria, largura: 0.24 }, 0.7);
    frisoQuebrado(obra, f, L, F, perfilLado, 0, 1.0, 0.1, cor.pedra);
    frisoQuebrado(obra, f, L, F, perfilLado, A - 0.4, 0.4, 0.25, cor.cantaria);
    for (const u of aoLongo(F - lado, 3, 1)) obra.por("cantaria", naFace(bloco(0.7, A * (0.5 + r() * 0.3), 0.6, 0, 0, 0.3), f, L, F, u - sFrente * lado * 0.5, 0), cor.pedra, 0.08, 0.25);
  }
  const fundos = perfilQuebrado(L, A * 0.9, 0.8, r);
  porParede(obra, "fundos", L, F, fundos, [{ u: 0, y: A * 0.4, w: 1.2, h: 2.2, flecha: 0.6 }], "reboco", cor.cal, { cor: cor.cantaria }, 0.7);
  // Torres: a da direita inteira com o sino (como na tela), a outra partida.
  const zT = atras ? -F / 2 + lado / 2 : F / 2 - lado / 2;
  const fuste = A + alto * 0.5;
  torreBarroca(obra, L / 2 - lado / 2, zT, lado, fuste, cTorre, r, 0);
  if (duas) torreBarroca(obra, -L / 2 + lado / 2, zT, lado, fuste, cTorre, r, matriz ? 0.45 + r() * 0.2 : 0.3);
  // Tesouras queimadas sobre a nave (somem quando se entra).
  const altoT = L * 0.35;
  for (let z = F / 2 - lado - 1; z > -F / 2 + 1; z -= 2.8) {
    if (r() < 0.3) continue;
    const quebrada = r() < 0.35;
    for (const s of [-1, 1]) {
      if (quebrada && s > 0) continue;
      t.por("madeira-escura", caibro(new THREE.Vector3(s * (L / 2 - 0.3), A, z), new THREE.Vector3(0, A + altoT, z), 0.22), VIGA, 0.1, 0);
    }
    if (!quebrada) t.por("madeira-escura", bloco(L - 0.6, 0.22, 0.22, 0, A - 0.1, z), VIGA, 0.1, 0);
  }
  t.por("madeira-escura", bloco(0.25, 0.25, F * 0.55, 0, A + altoT - 0.15, F * 0.1), VIGA, 0.1, 0);
  // Um pedaço de telhado que resistiu, junto da fachada.
  for (const g of telhado("duas-aguas", F * 0.22, L, A, altoT, 0.4).slice(0, 2)) t.por("telha", g.rotateY(Math.PI / 2).translate(0, 0, F / 2 - lado - F * 0.11), cor.telha, 0.15, 0);
  abandono(obra, p, cor, r, { frente: perfil, esquerda: reto(F, A), direita: reto(F, A), fundos }, 1);
  // Interior: piso de lajes, bancos tombados, altar-mor queimado.
  const dentro = new ObraVelha(43, 0.4, 0);
  if (p.entravel) {
    dentro.por("pedra", bloco(L - 1.4, 0.08, F - 1.4, 0, 0.02, 0), "#6f685e", 0.12, 0);
    for (let i = 0; i < Math.floor(F / 2.6) - 2; i++)
      for (const s of [-1, 1]) {
        if (r() < 0.3) continue;
        dentro.por("madeira-escura", bloco(L * 0.3, 0.5, 0.45, 0, 0, 0).rotateZ((r() - 0.5) * 0.3).rotateY((r() - 0.5) * 0.5).translate(s * L * 0.22, 0, F / 2 - lado - 2 - i * 2.4), "#3a2e24", 0.1, 0);
      }
    dentro.por("cantaria", bloco(L * 0.45, 1.2, 1.4, 0, 0, -F / 2 + 1.4), cor.cantaria, 0.05, 0);
    dentro.por("madeira-escura", bloco(L * 0.4, A * 0.55, 0.5, 0, 1.2, -F / 2 + 0.9), "#4a3a22", 0.1, 0);
    entulho(dentro, L * 0.25, -F * 0.15, 2.6, 2.2, 0.7, cor.pedra, r);
  }
  return { corpo: [...obra.pecas(), ...pecasFachada], telhado: t.pecas(), interior: dentro.pecas() };
}

// ---------------------------------------------------------------------------
// Outros tipos

function fazenda(p: PredioLocal, r: () => number, cor: Cores): PecasDoPredio {
  const base = casarao({ ...p, altura: Math.min(p.altura, 5.2) }, r, cor, { inteiro: 0.3 + r() * 0.3 });
  const o = new ObraVelha(51, 0.5, 0.1);
  const { largura: L, fundo: F } = p;
  o.por("cantaria", bloco(L + 0.6, 0.6, F + 0.6, 0, -0.3, 0), cor.pedra, 0.08, 0.3);
  // Alpendre que queimou: piso de pedra, esteios carbonizados, alguns caídos.
  o.por("pedra", naFace(bloco(L * 0.92, 0.3, 2.6, 0, 0, 1.3), "frente", L, F, 0, 0), cor.pedra, 0.1, 0.3);
  for (const u of aoLongo(L * 0.92, Math.max(3, Math.floor(L / 3)), 0.2)) {
    if (Math.abs(u) < 2.6 && p.entravel) continue;
    const de = r();
    if (de < 0.25) vigaCaida(o, u, F / 2 + 1.8, 2.6, r() * 3, 0.3, VIGA, 0.2);
    else o.por("madeira-escura", naFace(bloco(0.22, 2.7 * (de < 0.5 ? 0.5 + r() * 0.3 : 1), 0.22, u, 0, 2.4), "frente", L, F, 0, 0.3), VIGA, 0.12, 0);
  }
  return { ...base, corpo: [...base.corpo, ...o.pecas()] };
}

function galpao(p: PredioLocal, r: () => number, cor: Cores): PecasDoPredio {
  // Reconstruído sobre o alicerce queimado: meia parede de pedra, tábua nova em cima.
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new ObraVelha(Math.floor(r() * 1e6), 0.45, 0.15);
  const t = new ObraVelha(61, 0, 0);
  const hp = Math.min(1.8, A * 0.4);
  const larg = p.entravel ? 4.4 : 3.2;
  for (const f of FACES) {
    if (f === "frente") {
      // Frente em dois trechos: o vão da porta vai até o chão.
      const resto = (L - larg) / 2;
      for (const sn of [-1, 1]) obra.por("cantaria", naFace(paredeVazada(resto, perfilQuebrado(resto, hp, 0.15, r), [], 0.55).geometria, f, L, F, sn * (larg / 2 + resto / 2), 0), cor.pedra, 0.08, 0.25);
      continue;
    }
    porParede(obra, f, L, F, perfilQuebrado(comp(f, L, F), hp, 0.15, r), [], "cantaria", cor.pedra, undefined, 0.55);
  }
  for (const f of FACES) {
    const c = comp(f, L, F);
    const h = A - hp;
    if (f === "frente") {
      const lado = (c - larg) / 2;
      for (const s of [-1, 1]) obra.limpo("madeira", naFace(bloco(lado, h, 0.1, s * (larg / 2 + lado / 2), 0, -0.1), f, L, F, 0, hp), cor.tabua, 0.14, 0);
      obra.limpo("madeira", naFace(bloco(larg, Math.max(0.2, A - 3.2), 0.1, 0, 0, -0.1), f, L, F, 0, 3.2), cor.tabua, 0.14, 0);
    } else obra.limpo("madeira", naFace(bloco(c, h, 0.1, 0, 0, -0.1), f, L, F, 0, hp), cor.tabua, 0.14, 0);
    for (const u of aoLongo(c, Math.floor(c / 1.0), 0.3)) if (f !== "frente" || Math.abs(u) > larg / 2) obra.limpo("madeira", naFace(bloco(0.07, h, 0.04, u, 0, 0), f, L, F, 0, hp), "#6a5640", 0.1, 0);
  }
  const alto = F * 0.28;
  for (const g of telhado("duas-aguas", L, F, A, alto, 0.5)) t.por("telha-escura", g, "#5e4436", 0.14, 0);
  for (const g of empenas(L, F, A, alto)) obra.limpo("madeira", g, cor.tabua);
  t.por("lona", malha([new THREE.Vector3(-L * 0.2, A + alto * 0.3 + 0.15, F * 0.36), new THREE.Vector3(L * 0.1, A + alto * 0.3 + 0.15, F * 0.36), new THREE.Vector3(L * 0.1, A + alto * 0.8 + 0.15, F * 0.08), new THREE.Vector3(-L * 0.2, A + alto * 0.8 + 0.15, F * 0.08)], [0, 1, 2, 0, 2, 3]), "#a49478", 0.12, 0);
  chamine(obra, L * 0.3, -F * 0.3, 0, A + alto + 1, "#5a4a40");
  abandono(obra, p, cor, r, null, 0.5);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorCasa(p, cor, r) };
}

function moinho(p: PredioLocal, r: () => number, cor: Cores): PecasDoPredio {
  // Torre redonda de pedra com o topo desmoronado; pás e eixo queimaram.
  const raio = Math.min(p.largura, p.fundo) / 2;
  const obra = new ObraVelha(71, 0.6, 0.15);
  const g = new THREE.CylinderGeometry(raio * 0.8, raio, p.altura, 12, 3, true).translate(0, p.altura / 2, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > p.altura * 0.6) {
      const a = Math.atan2(pos.getZ(i), pos.getX(i));
      pos.setY(i, y - (0.5 + 0.5 * Math.sin(a * 3 + 1)) * p.altura * 0.35 - (a > 0 ? 1 : 0) * p.altura * 0.15);
    }
  }
  g.computeVertexNormals();
  obra.por("cantaria", g, cor.pedra, 0.1, 0.3);
  const dentro = g.clone().scale(-0.88, 1, 0.88);
  dentro.computeVertexNormals();
  obra.por("cantaria", dentro, cor.pedra, 0.1, 0.3);
  vigaCaida(obra, raio * 0.4, raio + 0.8, raio * 2.4, 0.4, 0.6, VIGA, 0.25);
  abandono(obra, { ...p, largura: raio * 2, fundo: raio * 2 }, cor, r, null, 0.7);
  return { corpo: obra.pecas(), telhado: [], interior: [] };
}

function fabrica(p: PredioLocal, r: () => number, cor: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new ObraVelha(81, 0.55, 0.1);
  const t = new ObraVelha(82, 0.2, 0);
  for (const f of FACES) {
    const c = comp(f, L, F);
    const perfil = perfilQuebrado(c, A, f === "frente" ? (p.entravel ? 0 : 0.2) : 0.5, r);
    const vaos: Vao[] = aoLongo(c, Math.max(2, Math.floor(c / 3.2)), 1.6).map((u) => ({ u, y: 1.4, w: 1.6, h: 3.0, flecha: 0.8 }));
    if (f === "frente") vaos.unshift(p.entravel ? portaDeEntrar(A) : { u: 0, y: 0, w: 3.2, h: 3.6, flecha: 1.6 });
    porParede(obra, f, L, F, perfil, vaos, "tijolo", "#6e4636", { cor: "#8a6a52", material: "tijolo", largura: 0.25 }, 0.55);
  }
  // Chaminé de tijolo que ficou de pé.
  chamine(obra, L * 0.3, -F * 0.3, 0, A * 2.4, "#5e3c30");
  obra.por("tijolo", bloco(1.4, 1.2, 1.4, L * 0.3, 0, -F * 0.3), "#5e3c30", 0.1, 0.2);
  // Tesouras de ferro retorcidas.
  for (const z of aoLongo(F, 4, 1.5))
    if (r() < 0.7)
      for (const s of [-1, 1]) t.por("ferro", caibro(new THREE.Vector3(s * (L / 2 - 0.3), A, z), new THREE.Vector3(r() < 0.3 ? s * L * 0.15 : 0, A + L * 0.18 - (r() < 0.3 ? 1 : 0), z), 0.14), "#2e2a28", 0.05, 0);
  abandono(obra, p, cor, r, null, 1);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorCasa(p, cor, r) };
}

function tenda(p: PredioLocal, r: () => number, cor: Cores): PecasDoPredio {
  // Abrigo de lona escorado num toco de parede queimada.
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new ObraVelha(91, 0.5, 0.1);
  porParede(obra, "fundos", L, F, perfilQuebrado(L, A * 0.9, 0.5, r), [], "reboco", cor.cal, undefined, 0.45);
  const lona = r() < 0.5 ? "#b3a382" : "#9a8c6c";
  const g = malha([new THREE.Vector3(-L / 2, A * 0.8, -F / 2 + 0.3), new THREE.Vector3(L / 2, A * 0.8, -F / 2 + 0.3), new THREE.Vector3(L / 2, 0.9, F / 2), new THREE.Vector3(-L / 2, 0.9, F / 2)], [0, 3, 2, 0, 2, 1, 0, 1, 2, 0, 2, 3]);
  obra.limpo("lona", g, lona, 0.15, 0);
  for (const s of [-1, 1]) obra.limpo("madeira", bloco(0.12, 1.0, 0.12, s * (L / 2 - 0.1), 0, F / 2 - 0.1), "#6a5640", 0.1, 0);
  obra.limpo("madeira", bloco(1.2, 0.4, 0.6, -L * 0.25, 0, 0), "#7a6248", 0.1, 0);
  obra.por("carvao", bolha(0.4, 0, 0.3, 3, 0.3).translate(L * 0.3, 0.05, F / 2 + 0.8), "#1e1a18", 0.05, 0);
  return { corpo: obra.pecas(), telhado: [], interior: interiorCasa(p, cor, r) };
}

// ---------------------------------------------------------------------------
// Longe: volume e cor (≤ 300 triângulos)

function longe(p: PredioLocal, r: () => number, cor: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new ObraVelha(1, 0.5, 0);
  const t = new Obra(2);
  const e = 0.6;
  if (p.tipo === "ruina" || p.tipo === "moinho") {
    // Paredes em pedaços de alturas diferentes.
    for (const f of FACES) {
      const c = comp(f, L, F);
      const n = 2 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        if (r() < 0.2) continue;
        const h = A * (0.3 + r() * 0.7);
        obra.por("reboco", naFace(bloco(c / n, h, e, -c / 2 + (c / n) * (i + 0.5), 0, -e / 2), f, L, F, 0, 0), cor.cal, 0.1, 0.2);
      }
    }
    obra.limpo("musgo", bolha(1, 0, 0.4, 5, 0.6).scale(L * 0.25, A * 0.35, F * 0.25), cor.musgo, 0.15, 0);
    return { corpo: obra.pecas(), telhado: [], interior: [] };
  }
  obra.por("reboco", bloco(L, A, F, 0, 0, 0), cor.cal, 0.1, 0.2);
  obra.por("cantaria", bloco(L + 0.06, 0.8, F + 0.06, 0, 0, 0), cor.pedra, 0.05, 0);
  if (p.tipo === "igreja") {
    const lado = Math.max(3, Math.min(4, L * 0.24));
    const alto = A + Math.min(5, L * 0.3) * 0.5;
    obra.por("reboco", bloco(lado, alto + lado * 1.05, lado, L / 2 - lado / 2, 0, F / 2 - lado / 2), cor.cal, 0.08, 0);
    obra.por("telha-escura", new THREE.ConeGeometry(lado * 0.45, lado * 1.3, 6).translate(L / 2 - lado / 2, alto + lado * 1.05 + lado * 0.65, F / 2 - lado / 2), "#4a4038", 0.08, 0);
    obra.por("reboco", bloco(lado, alto * 0.8, lado, -L / 2 + lado / 2, 0, F / 2 - lado / 2), cor.cal, 0.08, 0);
    obra.por("reboco", malha([new THREE.Vector3(-L / 2 + lado, A, F / 2 + 0.05), new THREE.Vector3(L / 2 - lado, A, F / 2 + 0.05), new THREE.Vector3(0, A + 4, F / 2 + 0.05)], [0, 1, 2]), cor.cal, 0.08, 0);
    return { corpo: obra.pecas(), telhado: [], interior: [] };
  }
  if (p.tipo === "torre") {
    const lado = Math.min(L, F) * 0.8;
    obra.por("telha-escura", new THREE.ConeGeometry(lado * 0.45, lado * 1.3, 6).translate(0, A + lado * 0.65, 0), "#4a4038", 0.08, 0);
    return { corpo: obra.pecas(), telhado: [], interior: [] };
  }
  // Meio telhado: parte de telha, o resto aberto (o vazio escuro de dentro).
  const alto = Math.min(L, F) * 0.3;
  const reconstruido = p.tipo === "comercio" || p.tipo === "saloon" || p.tipo === "galpao" || p.tipo === "tenda";
  const fr = reconstruido ? 1 : 0.2 + r() * 0.4;
  const c = L * fr;
  for (const g of telhado("duas-aguas", c, F, A, alto, 0.4).slice(0, 1)) t.por("telha", g.translate(-L / 2 + c / 2, 0, 0), cor.telha, 0.12, 0);
  if (!reconstruido) obra.por("carvao", bloco(L * (1 - fr) - 0.6, 0.05, F - 0.8, L / 2 - (L * (1 - fr)) / 2, A - 0.02, 0), "#1c1816", 0.05, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

export function gerarBarrocoQueimado(p: PredioLocal, nivel: NivelPredio, semente: number): PecasDoPredio {
  const r = sorteio(semente);
  const cor = paleta(r);
  if (nivel === 1) return longe(p, r, cor);
  const id = p.id ?? "";
  if (id === "igreja-matriz") return igreja(p, r, cor, true);
  if (id === "capela-do-cemiterio") return ruina(p, r, cor, "capela");
  switch (p.tipo) {
    case "ruina":
      return ruina(p, r, cor);
    case "igreja":
      return igreja(p, r, cor, false);
    case "torre": {
      // Torre do sino solta: fuste de pedra, sineira e coruchéu, com entulho em volta.
      const obra = new ObraVelha(101, 0.45, 0.12);
      const lado = Math.min(p.largura, p.fundo) * 0.8;
      torreBarroca(obra, 0, 0, lado, Math.max(3, p.altura - lado * 2.3 - 1.6), { fuste: cor.pedra, cantaria: cor.cantaria, cupula: "#4a4038" }, r, 0, "cantaria");
      abandono(obra, { ...p, largura: lado, fundo: lado }, cor, r, null, 0.6);
      return { corpo: obra.pecas(), telhado: [], interior: [] };
    }
    case "comercio":
      return comercio(p, r, cor, id === "farmacia" ? "farmacia" : id === "armazem" ? "armazem" : "outro");
    case "saloon":
      return comercio(p, r, cor, "saloon");
    case "hotel":
      return casarao(p, r, cor, { inteiro: 0.4 + r() * 0.3, sacadas: true });
    case "banco":
      return casarao(p, r, cor, { inteiro: 0.2 + r() * 0.3, grade: true, sacadas: false });
    case "publico":
      return casarao(p, r, cor, { inteiro: id === "cadeia" ? 0.9 : r() * 0.5, grade: id === "cadeia" || id === "camara", sacadas: !(id === "cadeia" || id === "camara") });
    case "estacao": {
      const base = casarao({ ...p, altura: Math.min(p.altura, 5.5) }, r, cor, { inteiro: 0.2 });
      const o = new ObraVelha(111, 0.5, 0.1);
      const hPlat = p.entravel ? 0.3 : 0.7;
      o.por("cantaria", naFace(bloco(p.largura, hPlat, 3.2, 0, 0, 1.6), "frente", p.largura, p.fundo, 0, 0), cor.pedra, 0.1, 0.3);
      for (const u of aoLongo(p.largura, Math.floor(p.largura / 4), 0.6)) if (r() < 0.7 && !(p.entravel && Math.abs(u) < 2.5)) o.por("madeira-escura", naFace(bloco(0.22, 3.2 * (r() < 0.4 ? 0.5 : 1), 0.22, u, 0, 3.0), "frente", p.largura, p.fundo, 0, hPlat), VIGA, 0.1, 0);
      return { ...base, corpo: [...base.corpo, ...o.pecas()] };
    }
    case "fazenda":
      return fazenda(p, r, cor);
    case "galpao":
      return galpao(p, r, cor);
    case "moinho":
      return moinho(p, r, cor);
    case "fabrica":
      return fabrica(p, r, cor);
    case "tenda":
      return tenda(p, r, cor);
    default:
      // Casa: casarão queimado ou casa reocupada com telhado refeito.
      return casarao(p, r, cor, r() < 0.25 || id.includes("estrada") ? { reconstruido: true } : {});
  }
}

const estilo: Estilo = { id: "barroco-queimado", nome: "Barroco incendiado (Sacramento)", gerar: gerarBarrocoQueimado };

export default estilo;
