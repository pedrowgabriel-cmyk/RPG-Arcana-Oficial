// Porto industrial e Cidade-Oriental (Belo Horizonte, 1880). Uma capital portuária desigual:
// centro de sobrados ecléticos (platibanda com balaústres e pinhas, frontões, cantaria,
// sacadas de ferro, cores de pó: ocre, rosa-velho, verde-água), bairro alto de palacetes com
// mansarda e varanda de ferro, porto de sobrados gastos com toldo, cais de armazéns de tijolo
// com guincho e galpões de ferro em abóbada, fábricas de dente-de-serra e chaminé redonda,
// vila operária de casas geminadas, periferia de casebres de taipa e zinco, palafitas na
// beira da baía, e a Cidade-Oriental de telhado curvo de beiral levantado, colunas vermelhas,
// treliça de papel e lanternas. O bairro sai do id do prédio (a planta em
// lib/mapa/cidades/belo-horizonte.ts); os canônicos têm desenho próprio.

import * as THREE from "three";
import { sorteio } from "../../natureza/ferramentas";
import type { NomeMaterial } from "../../natureza/tipos";
import { aoLongo, bloco, chamine, malha, naFace, Obra, paredes, placa, porta, telhado, toldo, type Face } from "../kit";
import type { Estilo, NivelPredio, PecasDoPredio, PredioLocal } from "../tipos";
import {
  abobada,
  aneisCurvos,
  balaustrada,
  cilindro,
  cobertura,
  cupula,
  disco,
  lanterna,
  perfilArco,
  perfilExtrudado,
  pinha,
  portaLeve,
  quad,
  rodape,
  sacadaLeve,
  timpano,
  triangulo,
  v,
  vao,
  varandaDeFerro,
} from "./_porto-pecas";

type R = () => number;
const de = <T,>(r: R, l: readonly T[]): T => l[Math.floor(r() * l.length)];
const semear = (r: R) => Math.floor(r() * 1e6);
const entre = (r: R, a: number, b: number) => a + r() * (b - a);
const PORTA_DE_ENTRAR = { largura: 4.2, altura: 3 };
const FERRO = "#27241f";

// ---------------------------------------------------------------- bairros

type Bairro = "centro" | "alto" | "porto" | "cais" | "industrial" | "oriental" | "vila" | "periferia" | "palafita" | "sitio";

const BAIRROS: [RegExp, Bairro][] = [
  [/^(o-\d|mo-r|cc-r|tp-r|ac-r|mercado-oriental|casa-de-cha|templo-oriental|armazem-de-cha)/, "oriental"],
  [/^(pl-\d|cais-|armazem-do-cais|alfandega|capitania|farol)/, "cais"],
  [/^(po-\d|tav-r|hp-r|taverna-do-cais|pensao-do-cais|hospital-do-porto)/, "porto"],
  [/^(i-\d|ir-\d|patio-|fundicao|fabrica|tecelagem|usina|oficina-ferroviaria|garagem-dos-bondes)/, "industrial"],
  [/^(a-\d|igreja-da-colina|casarao)/, "alto"],
  [/^vo-/, "vila"],
  [/^pe-/, "palafita"],
  [/^(dq-|est-|vi-|vm-|vt-|ps-|pc-|pn-)/, "periferia"],
  [/^s-/, "sitio"],
  [/^(c-\d|cr-|loja-)/, "centro"],
];

function bairroDe(p: PredioLocal, r: R): Bairro {
  for (const [re, b] of BAIRROS) {
    if (!re.test(p.id)) continue;
    // Beira da baía: a casa de pescador é quase sempre palafita; o casario do cais, às vezes.
    if (b === "palafita") return r() < 0.85 ? "palafita" : "periferia";
    if (/^(dq-|est-)/.test(p.id)) return r() < 0.45 ? "palafita" : "periferia";
    return b;
  }
  // Fora da planta (bancada): casa térrea mostra a Cidade-Oriental; o resto, pelo tipo.
  if (p.tipo === "casa" && p.altura < 5) return "oriental";
  if (p.tipo === "tenda") return "oriental";
  if (p.tipo === "fazenda") return "sitio";
  if (p.tipo === "galpao" || p.tipo === "torre") return "cais";
  if (p.tipo === "fabrica" || p.tipo === "moinho") return "industrial";
  return "centro";
}

// ---------------------------------------------------------------- paletas

type Cores = {
  parede: string;
  ornato: string;
  base: string;
  barra: string;
  esquadria: string;
  porta: string;
  telha: string;
  material: NomeMaterial;
};

const PAREDE_CENTRO = ["#d9b86f", "#e3cfa3", "#c9947f", "#b7bf9e", "#a7b5ba", "#e7dcc6", "#cf9f62", "#bf8a70", "#d6c3a0", "#c4a98a"];
const PAREDE_PORTO = ["#c8b48c", "#b8a27a", "#a6b2a2", "#c39c76", "#9ea6a4", "#d0c0a0", "#b58f6c", "#8fa0a6", "#a98f7a"];
const PAREDE_ALTO = ["#efe4cc", "#e8d3b8", "#dcc49a", "#e2cbc0", "#d5dccb", "#f0e9da"];
const ORNATO = ["#efe8d8", "#e9dfc8", "#f2ecdf", "#ddd3bd"];
const BASE = ["#8f897d", "#9a9384", "#857e72", "#a39b8a"];
const BARRA = ["#5a3a30", "#4a4a44", "#3f4f4a", "#6a4a34", "#2f3a44"];
const ESQUADRIA = ["#2f4a3a", "#3b2b22", "#5a2f25", "#2e3d4f", "#4a4a3a", "#3f6a4a"];
const PORTA_COR = ["#3b281c", "#2b3a2c", "#4c241e", "#273242", "#5a3a22"];
const TELHA = ["#9c4f36", "#a65b3f", "#8a4632", "#9a5a40", "#93503a"];
const ARDOSIA = ["#4c5257", "#55504c", "#474d55"];
const TIJOLO = ["#8e4a34", "#7e4230", "#9a5a3e", "#74402e", "#87503a"];
const ZINCO = ["#6f6a63", "#7a5a46", "#5f625e", "#80654f"];
const LONA = ["#8a3a2a", "#3f5a4a", "#c9b48a", "#2f4a6a", "#9a7a3a", "#7a2f36"];
const LETREIRO = ["#2a1e16", "#3a2a1c", "#1f2a26", "#4a1e1a"];

function paleta(r: R, b: Bairro): Cores {
  const lista = b === "alto" ? PAREDE_ALTO : b === "porto" || b === "cais" ? PAREDE_PORTO : PAREDE_CENTRO;
  return {
    parede: de(r, lista),
    ornato: de(r, ORNATO),
    base: de(r, BASE),
    barra: de(r, BARRA),
    esquadria: de(r, ESQUADRIA),
    porta: de(r, PORTA_COR),
    telha: de(r, TELHA),
    material: "reboco",
  };
}

// ---------------------------------------------------------------- sobrado eclético

type Cobertura = "platibanda" | "balaustrada" | "mansarda" | "beiral" | "ameias";
type Janela = "arco" | "reta" | "triangulo" | "chave";

type OpSobrado = {
  cores?: Partial<Cores>;
  modesto?: boolean;
  loja?: boolean;
  letreiro?: string | null;
  toldos?: boolean;
  sacadas?: "nenhuma" | "individual" | "corrida";
  cobertura?: Cobertura;
  frontao?: "triangulo" | "curvo" | "atico" | null;
  bossagem?: boolean;
  grade?: boolean;
  pav?: number;
  janela?: Janela;
  veneziana?: boolean;
  passo?: number;
  chamines?: number;
  /** Arcos no térreo (teatro, palácio): portas altas em arco em todos os vãos. */
  arcada?: boolean;
};

type Montado = { h: number; pav: number; topo: number; cumeeira: number; c: Cores; us: number[] };

/** O corpo do sobrado eclético; volta onde fica o topo para torres e acessórios. */
function corpoSobrado(obra: Obra, t: Obra, p: PredioLocal, r: R, b: Bairro, o: OpSobrado = {}): Montado {
  const { largura: L, fundo: F, altura: A } = p;
  const c: Cores = { ...paleta(r, b), ...o.cores };
  const ent = p.entravel;
  let pav = o.pav ?? Math.max(1, Math.min(4, A >= 9.6 ? Math.round(A / 3.9) : A >= 5.8 ? 2 : 1));
  // Entrável: o térreo precisa caber o vão de 3 m com folga para o friso.
  if (ent) pav = Math.max(1, Math.min(pav, Math.floor(A / 3.4)));
  const h = A / pav;
  const modesto = !!o.modesto;
  paredes(obra, L, F, A, c.material, c.parede, ent ? PORTA_DE_ENTRAR : undefined);
  const hb = modesto ? 0.55 : 0.85;
  rodape(obra, L, F, hb, modesto ? "reboco" : "cantaria", modesto ? c.barra : c.base, ent ? PORTA_DE_ENTRAR.largura : 0);

  // Cunhais nos quatro cantos.
  const s = 0.04;
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    obra.por("reboco", bloco(0.5, A - hb, 0.5, x * (L / 2 - 0.25 + s), hb, z * (F / 2 - 0.25 + s)), c.ornato, 0.04, 0);
  }

  // Vãos de ~3,3 m; prédio monumental não passa de 13 vãos (o desempenho manda).
  const nv = Math.max(1, Math.min(13, Math.round(L / (o.passo ?? (modesto ? 3.5 : 3.3)))));
  const passo = L / nv;
  const us = Array.from({ length: nv }, (_, i) => -L / 2 + (i + 0.5) * passo);
  const livre = (u: number, w: number) => !ent || Math.abs(u) - w / 2 > PORTA_DE_ENTRAR.largura / 2 + 0.35;
  const estilo: Janela = o.janela ?? de(r, ["arco", "reta", "triangulo", "chave"] as const);
  const veneziana = o.veneziana ?? (modesto ? r() < 0.6 : r() < 0.2);

  // Pilastras entre os vãos da fachada.
  if (!modesto && passo >= 2.4) {
    for (let i = 1; i < nv; i++) {
      const u = -L / 2 + i * passo;
      if (ent && Math.abs(u) < PORTA_DE_ENTRAR.largura / 2 + 0.3) continue;
      obra.por("reboco", naFace(bloco(0.36, A - hb - 0.3, 0.1, 0, 0, 0.05), "frente", L, F, u, hb), c.ornato, 0.04, 0);
    }
  }
  // Frisos entre os andares.
  for (let k = 1; k < pav; k++) obra.por("reboco", bloco(L + 0.16, 0.2, F + 0.16, 0, k * h - 0.12, 0), c.ornato, 0.04, 0);
  // Bossagem: juntas fundas no térreo.
  if (o.bossagem) {
    for (let y = hb + 0.5; y < h - 0.35; y += 0.55) {
      obra.por("reboco", quad(L + 0.02, 0.05, 0, y, F / 2 + 0.006), "#5d574d", 0.03, 0);
      for (const f of ["esquerda", "direita"] as Face[]) obra.por("reboco", naFace(quad(F + 0.02, 0.05, 0, 0, 0.006), f, L, F, 0, y), "#5d574d", 0.03, 0);
    }
  }

  // Térreo.
  if (ent) porta(obra, "frente", L, F, 0, PORTA_DE_ENTRAR.largura, PORTA_DE_ENTRAR.altura, c.porta, true, c.ornato);
  const meio = Math.floor(nv / 2);
  const letreiro = o.letreiro ?? null;
  const folgaPlaca = letreiro ? 0.75 : 0;
  us.forEach((u, i) => {
    if (o.loja || o.arcada) {
      const w = Math.min(o.arcada ? 1.9 : 1.5, passo * 0.58);
      if (!livre(u, w + 0.4)) return;
      let hd = h - 0.55 - folgaPlaca - w / 2 - 0.15;
      const arco = hd >= 2.2;
      if (!arco) hd = Math.min(h - 0.6 - folgaPlaca, 2.7);
      hd = Math.min(hd, o.arcada ? 3.6 : 3.1);
      portaLeve(obra, "frente", L, F, u, w, hd, i % 2 && !o.arcada ? c.esquadria : c.porta, c.ornato, arco);
      if (o.toldos && r() < 0.75) toldo(obra, "frente", L, F, u, hd + (arco ? w / 2 + 0.25 : 0.2), w + 0.7, 1.3, de(r, LONA));
      return;
    }
    if (!ent && i === meio) {
      const w = Math.min(1.4, passo * 0.5);
      const hd = Math.min(h - 0.5 - w / 2 - 0.2, 2.9);
      portaLeve(obra, "frente", L, F, u, w, Math.max(2.1, hd), c.porta, c.ornato, hd >= 2.1);
      return;
    }
    const w = Math.min(1.1, passo * 0.42);
    const extra = estilo === "arco" ? w / 2 + 0.15 : estilo === "triangulo" ? 0.7 : 0.35;
    const hw = Math.min(2.0, h - hb - 0.65 - extra);
    if (hw < 0.9 || !livre(u, w + 0.4)) return;
    vao(obra, "frente", L, F, u, hb + 0.35, w, hw, { arco: estilo === "arco", sobreverga: estilo === "arco" ? "chave" : estilo, moldura: c.ornato, grade: o.grade, veneziana: veneziana ? c.esquadria : undefined });
  });
  if (letreiro) placa(obra, "frente", L, F, 0, Math.max(h - 0.68, ent ? 3.25 : 0), Math.min(L * 0.7, 9), 0.5, letreiro);

  // Andares de cima.
  const sac = o.sacadas ?? (modesto ? (r() < 0.35 ? "individual" : "nenhuma") : r() < 0.25 ? "corrida" : r() < 0.75 ? "individual" : "nenhuma");
  for (let k = 1; k < pav; k++) {
    const y0 = k * h;
    const nobre = k === 1;
    const est: Janela = nobre ? estilo : estilo === "arco" ? "arco" : "reta";
    const w = Math.min(1.1, passo * 0.42);
    const extra = est === "arco" ? w / 2 + 0.15 : est === "triangulo" ? 0.7 : est === "reta" ? 0.35 : 0.2;
    const comSacada = sac !== "nenhuma" && (nobre || sac === "individual");
    if (sac === "corrida" && nobre) sacadaLeve(obra, "frente", L, F, 0, y0 + 0.12, L - 1.3, 0.8, FERRO, c.base, 0.26);
    us.forEach((u) => {
      if (comSacada) {
        const hj = Math.min(2.45, h - 0.5 - extra);
        if (hj < 1.2) return;
        if (sac === "individual") sacadaLeve(obra, "frente", L, F, u, y0 + 0.12, w + 0.7, 0.62, FERRO, c.base);
        vao(obra, "frente", L, F, u, y0 + 0.12, w, hj, { arco: est === "arco", sobreverga: est === "arco" ? "chave" : est, moldura: c.ornato, peitoril: false, veneziana: veneziana ? c.esquadria : undefined });
      } else {
        const hj = Math.min(1.75, h - 1.2 - extra);
        if (hj < 0.8) return;
        vao(obra, "frente", L, F, u, y0 + 0.85, w, hj, { arco: est === "arco", sobreverga: est === "arco" ? "chave" : est, moldura: c.ornato, veneziana: veneziana ? c.esquadria : undefined });
      }
    });
  }
  // Laterais e fundos: menos janelas, sempre retas.
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
    const comp = f === "fundos" ? L : F;
    const n = Math.max(0, Math.floor((comp - 2.5) / (f === "fundos" ? 3.6 : 4.2)));
    for (const u of aoLongo(comp, n, 1.6)) {
      for (let k = 0; k < pav; k++) {
        if (r() < 0.6) continue;
        const y = k === 0 ? hb + 0.4 : k * h + 0.85;
        const hj = Math.min(1.5, h - (k === 0 ? hb + 0.4 : 0.85) - 0.6);
        if (hj < 0.8) continue;
        vao(obra, f, L, F, u, y, 0.9, hj, { moldura: c.ornato });
      }
    }
  }

  // Coroamento.
  const cob: Cobertura = o.cobertura ?? "platibanda";
  let topo = A;
  let cumeeira = A;
  if (cob === "beiral") {
    obra.por("reboco", bloco(L + 0.3, 0.3, F + 0.3, 0, A - 0.3, 0), c.ornato, 0.04, 0);
    const alto = Math.min(L, F) * entre(r, 0.24, 0.3);
    for (const g of telhado("quatro-aguas", L, F, A, alto, 0.75, 0.16)) t.por("telha", g, c.telha, 0.12, 0);
    cumeeira = A + alto;
  } else {
    obra.por("reboco", bloco(L + 0.36, 0.28, F + 0.36, 0, A - 0.28, 0), c.ornato, 0.04, 0);
    obra.por("reboco", bloco(L + 0.56, 0.12, F + 0.56, 0, A, 0), c.ornato, 0.04, 0);
    const y0 = A + 0.12;
    if (cob === "mansarda") {
      const hm = Math.min(3.0, Math.max(1.8, A * 0.3));
      const ard = de(r, ARDOSIA);
      t.por("telha-escura", cobertura([
        { hx: L / 2 + 0.2, hz: F / 2 + 0.2, y: y0 },
        { hx: L / 2 - 0.8, hz: F / 2 - 0.8, y: y0 + hm },
        { hx: Math.max(0.3, L / 2 - 2.0), hz: Math.max(0.3, F / 2 - 2.0), y: y0 + hm + 0.7 },
      ], true, true, 0.12), ard, 0.08, 0);
      // Crista de ferro no topo e lucarnas na frente.
      t.por("ferro", bloco(Math.max(0.6, L - 4), 0.35, 0.06, 0, y0 + hm + 0.7, 0), FERRO, 0.02, 0);
      const zl = F / 2 - 0.5;
      for (let i = 0; i < nv; i += nv > 4 ? 2 : 1) {
        const u = us[i];
        t.por("reboco", bloco(1.4, 1.6, 0.9, u, y0 + 0.3, zl - 0.45), c.ornato, 0.04, 0);
        vao(t, "frente", L, zl * 2, u, y0 + 0.5, 0.8, 1.0, { moldura: c.ornato, peitoril: false });
        for (const g of telhado("duas-aguas", 1.2, 1.6, y0 + 1.9, 0.55, 0.12, 0.08)) t.por("telha-escura", g.rotateY(Math.PI / 2).translate(u, 0, zl - 0.45), ard, 0.08, 0);
        t.por("reboco", triangulo(1.4, 0.5, u, y0 + 1.9, zl + 0.01), c.ornato, 0.04, 0);
      }
      topo = y0 + hm + 0.7;
      cumeeira = topo;
    } else {
      const hp = cob === "ameias" ? 0.7 : o.modesto ? 0.75 : entre(r, 1.0, 1.35);
      for (const k of [-1, 1]) obra.por("reboco", bloco(0.24, hp, F, k * (L / 2 - 0.12), y0, 0), c.parede, 0.05, 0);
      obra.por("reboco", bloco(L, hp, 0.24, 0, y0, -F / 2 + 0.12), c.parede, 0.05, 0);
      if (cob === "balaustrada") balaustrada(obra, "frente", L, F, L - 0.5, y0, hp, c.ornato);
      else {
        obra.por("reboco", bloco(L, hp, 0.26, 0, y0, F / 2 - 0.13), c.parede, 0.05, 0);
        obra.por("reboco", bloco(L + 0.1, 0.1, 0.36, 0, y0 + hp, F / 2 - 0.13), c.ornato, 0.04, 0);
        if (cob === "platibanda" && !o.modesto) {
          for (const u of us) obra.por("reboco", quad(passo * 0.62, hp * 0.46, u, y0 + hp * 0.26, F / 2 + 0.005), c.ornato, 0.04, 0);
        }
      }
      if (cob === "ameias") {
        const merlao = (x: number, z: number, w: number, d: number) => obra.por("reboco", bloco(w, 0.85, d, x, y0 + hp, z), c.parede, 0.05, 0);
        for (const x of aoLongo(L, Math.floor(L / 1.8), 0.5)) {
          merlao(x, F / 2 - 0.15, 0.95, 0.32);
          merlao(x, -F / 2 + 0.15, 0.95, 0.32);
        }
        for (const z of aoLongo(F, Math.floor(F / 1.8), 1.2)) {
          merlao(L / 2 - 0.15, z, 0.32, 0.95);
          merlao(-L / 2 + 0.15, z, 0.32, 0.95);
        }
      }
      if (!o.modesto && cob !== "ameias") for (const k of [-1, 1]) pinha(obra, k * (L / 2 - 0.3), y0 + hp, F / 2 - 0.2, c.ornato);
      // Telhado baixo escondido atrás da platibanda.
      const alto = Math.min(L, F) * 0.17;
      for (const g of telhado("quatro-aguas", L - 0.5, F - 0.5, A + 0.08, alto, 0, 0.12)) t.por("telha", g, c.telha, 0.12, 0);
      topo = y0 + hp;
      cumeeira = A + 0.08 + alto;
    }
    // Frontão sobre o vão do meio.
    const fr = o.frontao === undefined ? (o.modesto ? null : r() < 0.6 ? de(r, ["triangulo", "curvo", "atico"] as const) : null) : o.frontao;
    if (fr && cob !== "ameias") {
      const fw = Math.min(L * 0.42, Math.max(3.4, passo * 1.6), 9);
      const zf = cob === "mansarda" ? F / 2 + 0.22 : F / 2 + 0.02;
      const yb = cob === "mansarda" ? A + 0.24 : topo;
      const al = fr === "triangulo" ? fw * 0.24 : fr === "curvo" ? fw * 0.3 : 1.1;
      const perfil: [number, number][] = fr === "triangulo" ? [[fw / 2, 0], [0, al], [-fw / 2, 0]] : fr === "curvo" ? perfilArco(fw, al) : [[fw / 2, 0], [fw / 2, al], [-fw / 2, al], [-fw / 2, 0]];
      obra.por("reboco", perfilExtrudado(perfil, yb, zf, 0.35), c.parede, 0.05, 0);
      obra.por("reboco", bloco(fw + 0.35, 0.16, 0.45, 0, yb - 0.08, zf - 0.17), c.ornato, 0.04, 0);
      if (fr !== "atico") {
        const ro = Math.min(0.55, al * 0.3);
        disco(obra, "reboco", "frente", L, zf * 2, 0, yb + al * 0.42, ro, c.ornato, 0.005);
        disco(obra, "vidro", "frente", L, zf * 2, 0, yb + al * 0.42, ro - 0.12, "#2a3236", 0.012);
      } else obra.por("reboco", quad(fw * 0.7, 0.55, 0, yb + 0.28, zf + 0.005), c.ornato, 0.04, 0);
      pinha(obra, 0, yb + al, zf - 0.17, c.ornato);
      topo = Math.max(topo, yb + al);
    }
  }
  const nch = o.chamines ?? (o.modesto ? (r() < 0.5 ? 1 : 0) : r() < 0.3 ? 1 : 0);
  for (let i = 0; i < nch; i++) chamine(obra, (r() - 0.5) * L * 0.6, -F * 0.25, A, 1.6 + r() * 0.8, de(r, TIJOLO));
  return { h, pav, topo, cumeeira, c, us };
}

function sobrado(p: PredioLocal, r: R, b: Bairro, o: OpSobrado = {}, interior: Tipo = "loja"): PecasDoPredio {
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  corpoSobrado(obra, t, p, r, b, o);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, interior) };
}

/** Sobrado comum do centro, com variação de coroamento, comércio e sacadas. */
function sobradoDoCentro(p: PredioLocal, r: R, b: Bairro): PecasDoPredio {
  const loja = p.tipo === "comercio" || p.tipo === "saloon" || r() < 0.2;
  const sorteada: Cobertura = r() < 0.38 ? "balaustrada" : r() < 0.85 ? "platibanda" : "mansarda";
  const cob = p.altura < 5.8 && sorteada === "mansarda" ? "platibanda" : sorteada;
  return sobrado(p, r, b, { loja, cobertura: cob, letreiro: loja && r() < 0.55 ? de(r, LETREIRO) : null }, loja ? "loja" : "casa");
}

/** Sobrado do porto: mais baixo, cores gastas, beiral de telha ou platibanda simples, toldos. */
function sobradoDoPorto(p: PredioLocal, r: R): PecasDoPredio {
  const loja = p.tipo !== "casa" || r() < 0.5;
  return sobrado(p, r, "porto", { modesto: true, loja, toldos: loja, cobertura: r() < 0.55 ? "beiral" : "platibanda", letreiro: loja && r() < 0.7 ? de(r, LETREIRO) : null, frontao: r() < 0.15 ? "atico" : null }, loja ? "loja" : "casa");
}

/** Palacete do bairro alto: mansarda ou beiral, varanda de ferro na frente. */
function palacete(p: PredioLocal, r: R): PecasDoPredio {
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const cob: Cobertura = r() < 0.4 ? "mansarda" : r() < 0.7 ? "beiral" : "balaustrada";
  const m = corpoSobrado(obra, t, p, r, "alto", { cobertura: cob, sacadas: r() < 0.5 ? "individual" : "nenhuma", janela: de(r, ["arco", "triangulo", "reta"] as const), veneziana: r() < 0.5, chamines: 1 + (r() < 0.5 ? 1 : 0) });
  if (r() < 0.75) {
    varandaDeFerro(obra, t, "frente", p.largura, p.fundo, 0, Math.min(p.largura * 0.6, 10), 2.3, Math.min(m.h - 0.7, 3.0), { ferro: "#2f3a34", zinco: de(r, ZINCO), lambrequim: m.c.ornato, piso: m.c.base }, p.entravel);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, "casa") };
}

// ---------------------------------------------------------------- palácios e canônicos

type OpPalacio = OpSobrado & {
  portico?: { colunas: number; colossal: boolean };
  torre?: "relogio" | "cupula" | null;
  cupula?: boolean;
  guaritas?: boolean;
  mastro?: boolean;
  lanternim?: boolean;
  cruz?: boolean;
  varanda?: boolean;
};

function meioDisco2(raio: number) {
  const pts = [v(0, 0, 0)];
  for (let i = 0; i <= 6; i++) pts.push(v(Math.cos((i / 6) * Math.PI) * raio, Math.sin((i / 6) * Math.PI) * raio, 0));
  const tris: number[] = [];
  for (let i = 1; i <= 6; i++) tris.push(0, i, i + 1);
  return malha(pts, tris);
}

function palacio(p: PredioLocal, r: R, b: Bairro, o: OpPalacio, interior: Tipo): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const m = corpoSobrado(obra, t, p, r, b, o);
  const c = m.c;
  if (o.portico) {
    // Pórtico de colunas com frontão e escadaria (até 3 m para fora).
    let n = o.portico.colunas;
    const largura = (k: number) => (k - 1) * (p.entravel ? 4.7 : 3.2);
    while (n > 2 && largura(n) > L - 2) n -= 2;
    const pw = Math.min(largura(n), L - 1.5);
    const hc = o.portico.colossal ? A - 0.9 : Math.min(m.h, A - 0.9);
    const zc = F / 2 + 1.7;
    for (let i = 0; i < 3; i++) obra.por("cantaria", bloco(pw + 2.4 - i * 0.5, 0.18, 3.0 - i * 0.35, 0, i * 0.18, F / 2 + 1.5 - i * 0.17), c.base, 0.05, 0.2);
    for (let i = 0; i < n; i++) {
      const x = -pw / 2 + (i * pw) / (n - 1);
      obra.por("cantaria", bloco(0.95, 0.5, 0.95, x, 0.54, zc), c.ornato, 0.04, 0);
      obra.por("reboco", cilindro(0.4, 0.33, hc - 1.04, 8, x, 1.04, zc), c.ornato, 0.04, 0);
      obra.por("reboco", bloco(0.9, 0.3, 0.9, x, hc - 0.3, zc), c.ornato, 0.04, 0);
    }
    obra.por("reboco", bloco(pw + 1.4, 0.9, 2.3, 0, hc, F / 2 + 1.15), c.ornato, 0.04, 0);
    const al = Math.min((pw + 1.4) * 0.2, 3.2);
    obra.por("reboco", perfilExtrudado([[(pw + 1.4) / 2, 0], [0, al], [-(pw + 1.4) / 2, 0]], hc + 0.9, F / 2 + 2.3, 2.3), c.parede, 0.05, 0);
    obra.por("reboco", triangulo((pw + 1.4) * 0.7, al * 0.62, 0, hc + 1.05, F / 2 + 2.31), c.ornato, 0.04, 0);
  }
  if (o.torre) {
    // Torre do relógio no meio, um pouco para trás.
    const lado = Math.min(6, Math.max(3.2, L * 0.14));
    const ht = lado * 1.25;
    const z = -F * 0.08;
    const yb = A;
    const naTorre = (g: THREE.BufferGeometry, f: Face, y: number, afasta = 0) => naFace(g, f, lado, lado, 0, y, afasta).translate(0, 0, z);
    obra.por("reboco", bloco(lado, ht, lado, 0, yb, z), c.parede, 0.05, 0);
    for (const k of [-1, 1]) for (const q of [-1, 1]) obra.por("reboco", bloco(0.45, ht, 0.45, k * (lado / 2 - 0.2), yb, z + q * (lado / 2 - 0.2)), c.ornato, 0.04, 0);
    obra.por("reboco", bloco(lado + 0.5, 0.35, lado + 0.5, 0, yb + ht, z), c.ornato, 0.04, 0);
    for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
      const yr = yb + ht * 0.6;
      obra.por("reboco", naTorre(meioDisco2(lado * 0.36), f, yr, 0.02), "#efe9da", 0.03, 0);
      obra.por("reboco", naTorre(meioDisco2(lado * 0.36).rotateZ(Math.PI), f, yr, 0.02), "#efe9da", 0.03, 0);
      obra.por("ferro", naTorre(quad(0.07, lado * 0.26, 0, 0, 0.05), f, yr), FERRO, 0.02, 0);
      obra.por("ferro", naTorre(quad(lado * 0.2, 0.07, -lado * 0.1, 0, 0.05), f, yr), FERRO, 0.02, 0);
    }
    const ytopo = yb + ht + 0.35;
    if (o.torre === "cupula") {
      obra.por("reboco", cilindro(lado * 0.42, lado * 0.42, lado * 0.35, 10, 0, ytopo, z), c.parede, 0.05, 0);
      t.por("ferro", cupula(lado * 0.46, 0, ytopo + lado * 0.35, z, 10, 4, 1.15), "#5f8a7a", 0.08, 0);
      obra.por("reboco", cilindro(0.35, 0.3, 1.0, 6, 0, ytopo + lado * 0.35 + lado * 0.5, z), c.ornato, 0.04, 0);
    } else {
      for (const g of telhado("quatro-aguas", lado, lado, ytopo, lado * 1.1, 0.25, 0.12)) t.por("telha-escura", g.translate(0, 0, z), de(r, ARDOSIA), 0.08, 0);
    }
    obra.por("ferro", bloco(0.08, 3.2, 0.08, 0, ytopo + lado * 1.0, z), FERRO, 0.02, 0);
  }
  if (o.cupula) {
    const raio = Math.min(L, F) * 0.16;
    const z = -F * 0.05;
    obra.por("reboco", cilindro(raio, raio, raio * 0.7, 12, 0, A + 0.1, z), c.parede, 0.05, 0);
    t.por("ferro", cupula(raio * 1.05, 0, A + 0.1 + raio * 0.7, z, 12, 4, 0.9), "#5f8a7a", 0.08, 0);
    obra.por("reboco", cilindro(0.5, 0.45, 1.3, 6, 0, A + 0.1 + raio * 0.7 + raio * 0.9, z), c.ornato, 0.04, 0);
  }
  if (o.lanternim) {
    // Lanternim de ventilação ao longo da cumeeira (hospital).
    const comp = Math.max(3, Math.abs(L - F) + 1.5);
    const y = m.cumeeira - 0.35;
    const giro = F > L ? Math.PI / 2 : 0;
    obra.por("reboco", bloco(comp, 1.1, 1.6, 0, y, 0).rotateY(giro), c.parede, 0.05, 0);
    for (const s of [0, Math.PI]) obra.por("vidro", quad(comp - 0.4, 0.55, 0, y + 0.3, 0.81).rotateY(s + giro), "#2a3236", 0.04, 0);
    for (const g of telhado("duas-aguas", comp + 0.3, 1.6, y + 1.1, 0.55, 0.35, 0.1)) t.por("telha", g.rotateY(giro), c.telha, 0.12, 0);
  }
  if (o.guaritas) {
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const [gx, gz] = [x * (L / 2 - 0.4), z * (F / 2 - 0.4)];
      obra.por("reboco", cilindro(1.0, 1.0, 3.0, 8, gx, A - 0.6, gz), c.parede, 0.05, 0);
      obra.por("reboco", cilindro(1.15, 1.15, 0.3, 8, gx, A + 2.4, gz, true), c.ornato, 0.04, 0);
      t.por("telha-escura", cilindro(1.25, 0.03, 1.5, 8, gx, A + 2.7, gz), "#5a4a3e", 0.08, 0);
      for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) obra.por("vidro", quad(0.14, 0.7, 0, 0, 1.01).rotateY(a).translate(gx, A + 1.0, gz), "#1e1c1a", 0.02, 0);
    }
  }
  if (o.mastro) {
    obra.por("ferro", cilindro(0.07, 0.05, 6, 5, 0, m.topo, F / 2 - 0.6), FERRO, 0.02, 0);
    const bandeira = quad(1.9, 1.25, 0.95, m.topo + 4.4, 0);
    obra.por("lona", bandeira.clone().translate(0, 0, F / 2 - 0.6), "#2f5a3a", 0.06, 0);
    obra.por("lona", bandeira.rotateY(Math.PI).translate(1.9, 0, F / 2 - 0.6), "#2f5a3a", 0.06, 0);
  }
  if (o.cruz) {
    obra.por("ferro", bloco(0.12, 1.3, 0.12, 0, m.topo + 0.4, F / 2 - 0.1), FERRO, 0.02, 0);
    obra.por("ferro", bloco(0.75, 0.12, 0.12, 0, m.topo + 1.25, F / 2 - 0.1), FERRO, 0.02, 0);
  }
  if (o.varanda) {
    varandaDeFerro(obra, t, "frente", L, F, 0, L * 0.8, 2.6, Math.min(m.h - 0.6, 3.4), { ferro: "#2f3a34", zinco: de(r, ZINCO), lambrequim: c.ornato, piso: c.base }, true);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, interior) };
}

function canonico(p: PredioLocal, r: R, b: Bairro): PecasDoPredio | null {
  switch (p.id) {
    case "casa-da-moeda":
      // Cofre do Império: cantaria cinza, bossagem, grades e pórtico colossal; cúpula de cobre.
      return palacio(p, r, b, {
        cores: { parede: "#b9b1a0", ornato: "#ddd5c3", base: "#7e786c", material: "cantaria" },
        bossagem: true, grade: true, cobertura: "balaustrada", frontao: null, sacadas: "nenhuma", janela: "reta", pav: 2,
        portico: { colunas: 6, colossal: true }, cupula: true,
      }, "banco");
    case "prefeitura":
      return palacio(p, r, b, {
        cores: { parede: "#d9a98e", ornato: "#f0e8d8", base: "#8f887a" },
        cobertura: "balaustrada", frontao: "curvo", sacadas: "corrida", janela: "triangulo", bossagem: true, pav: 3, passo: 6,
        torre: "cupula", mastro: true,
      }, "publico");
    case "quartel-da-policia":
      // Quartel amarelo de ameias e guaritas, janelas gradeadas e bandeira.
      return palacio(p, r, b, {
        cores: { parede: "#d6aa4c", ornato: "#efe6d0", base: "#7a7266" },
        cobertura: "ameias", frontao: null, sacadas: "nenhuma", janela: "reta", grade: true, bossagem: true, pav: 2,
        guaritas: true, mastro: true,
      }, "quartel");
    case "hospital-central":
      return palacio(p, r, b, {
        cores: { parede: "#ece6d6", ornato: "#f6f2e8", base: "#9a9384", esquadria: "#3f6a4a" },
        cobertura: "beiral", frontao: null, sacadas: "nenhuma", janela: "reta", veneziana: true, pav: 2,
        lanternim: true, varanda: true,
      }, "hospital");
    case "hospital-do-porto":
      return palacio(p, r, b, {
        cores: { parede: "#8e4a34", ornato: "#e6dcc4", base: "#6e675c", esquadria: "#3f6a4a", material: "tijolo" },
        cobertura: "beiral", frontao: null, sacadas: "nenhuma", janela: "arco", veneziana: true, modesto: true, pav: 2,
        lanternim: true, varanda: true,
      }, "hospital");
    case "estacao":
      return estacao(p, r);
    case "comando-das-seis-balas":
      return comando(p, r);
    case "farol-do-porto":
      return farol(p, r);
    case "igreja-matriz":
    case "igreja-da-colina":
      return igreja(p, r);
    case "teatro":
      return palacio(p, r, b, { cores: { parede: "#c98f7a" }, cobertura: "mansarda", frontao: "curvo", arcada: true, sacadas: "corrida", janela: "arco", pav: 2 }, "publico");
    case "banco":
      return palacio(p, r, b, { cores: { parede: "#cdbf9f" }, cobertura: "balaustrada", bossagem: true, grade: true, frontao: null, sacadas: "nenhuma", janela: "triangulo", portico: { colunas: 4, colossal: false } }, "banco");
    case "grande-hotel":
      return sobrado(p, r, b, { cobertura: "mansarda", sacadas: "individual", letreiro: "#2a1e16", loja: true, janela: "arco", frontao: "curvo", passo: 4.0 }, "hotel");
    case "alfandega":
    case "capitania-do-porto":
      return palacio(p, r, b, { cores: { parede: p.id === "alfandega" ? "#d4b27a" : "#b9c0b4" }, cobertura: "balaustrada", frontao: "triangulo", bossagem: true, grade: true, sacadas: "individual", janela: "arco", mastro: true }, "publico");
    case "escola":
      return palacio(p, r, b, { cores: { parede: "#e3cfa3" }, cobertura: "platibanda", frontao: "atico", sacadas: "nenhuma", janela: "arco", veneziana: true }, "publico");
    case "mercado-municipal":
      return armazem(p, r, "centro", { abobada: true, portas: 3, letreiro: true }, "mercado");
    case "casarao":
      return palacete(p, r);
    default:
      return null;
  }
}

/** Estação: pavilhão central de tijolo com relógio, alas baixas e marquise de ferro. */
function estacao(p: PredioLocal, r: R): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const tij = de(r, TIJOLO);
  const orn = "#e8dcc2";
  const cw = Math.min(14, Math.max(6, L * 0.24));
  const aw = Math.max(3.6, A * 0.72);
  paredes(obra, L, F, aw, "tijolo", tij, p.entravel ? PORTA_DE_ENTRAR : undefined);
  obra.por("tijolo", bloco(cw, A - aw, F, 0, aw, 0), tij);
  rodape(obra, L, F, 0.6, "cantaria", "#8f887a", p.entravel ? PORTA_DE_ENTRAR.largura : 0);
  for (const x of [-L / 2, -cw / 2, cw / 2, L / 2]) {
    const alto = Math.abs(x) <= cw / 2 + 0.01 ? A : aw;
    for (const z of [-1, 1]) obra.por("reboco", bloco(0.55, alto - 0.6, 0.55, x - Math.sign(x) * 0.25, 0.6, z * (F / 2 - 0.25 + 0.04)), orn, 0.04, 0);
  }
  obra.por("reboco", bloco(L + 0.3, 0.3, F + 0.3, 0, aw - 0.3, 0), orn, 0.04, 0);
  obra.por("reboco", bloco(cw + 0.4, 0.35, F + 0.4, 0, A - 0.35, 0), orn, 0.04, 0);
  // Alas: janelas altas em arco; telhado de duas águas de cada lado; marquise de ferro.
  const ala = (L - cw) / 2;
  for (const s of [-1, 1]) {
    const xc = s * (cw / 2 + ala / 2);
    const n = Math.max(1, Math.floor(ala / 3.2));
    for (let i = 0; i < n; i++) {
      const u = xc - ala / 2 + (i + 0.5) * (ala / n);
      const hw = Math.min(2.6, aw - 1.9);
      if (hw > 1) vao(obra, "frente", L, F, u, 0.9, 1.15, hw, { arco: true, sobreverga: "chave", moldura: orn });
      if (hw > 1 && i % 2 === 0) vao(obra, "fundos", L, F, -u, 0.9, 1.15, hw, { arco: true, moldura: orn });
    }
    for (const g of telhado("duas-aguas", ala, F, aw, F * 0.24, 0.55, 0.15)) t.por("telha-escura", g.translate(xc, 0, 0), "#6a4a3c", 0.1, 0);
    varandaDeFerro(obra, t, "frente", L, F, xc, ala - 0.8, 2.8, Math.min(aw - 0.8, 3.4), { ferro: "#2f3a34", zinco: "#6f6a63", lambrequim: "#d9cdb2", piso: "#8f887a" });
  }
  // Pavilhão: arcos de entrada, relógio no frontão, telhado alto de ardósia.
  if (!p.entravel) portaLeve(obra, "frente", L, F, 0, 2.2, Math.min(3.2, A - 3), "#3b281c", orn, true);
  for (const s of [-1, 1]) if (cw > 7.5) vao(obra, "frente", L, F, s * (cw / 2 - 1.6), 0.9, 1.2, Math.min(2.6, aw - 1.9), { arco: true, moldura: orn });
  if (A - aw > 2.2) for (const s of [-1, 0, 1]) vao(obra, "frente", L, F, s * cw * 0.3, aw + 0.6, 0.9, Math.min(1.6, A - aw - 1.4), { arco: true, moldura: orn });
  const fw = cw * 0.8;
  const al = fw * 0.28;
  obra.por("tijolo", perfilExtrudado([[fw / 2, 0], [0, al], [-fw / 2, 0]], A, F / 2 + 0.02, 0.4), tij, 0.08, 0);
  obra.por("reboco", bloco(fw + 0.4, 0.18, 0.5, 0, A - 0.05, F / 2 - 0.2), orn, 0.04, 0);
  const rr = Math.min(1.0, al * 0.32);
  disco(obra, "reboco", "frente", L, F + 0.05, 0, A + al * 0.4, rr + 0.15, orn, 0.01, 8);
  disco(obra, "reboco", "frente", L, F + 0.05, 0, A + al * 0.4, rr, "#f4efe2", 0.02, 8);
  obra.por("ferro", quad(0.08, rr * 0.75, 0, A + al * 0.4, F / 2 + 0.06), FERRO, 0.02, 0);
  obra.por("ferro", quad(rr * 0.55, 0.08, rr * 0.27, A + al * 0.4, F / 2 + 0.061), FERRO, 0.02, 0);
  const altoP = Math.min(cw, F) * 0.42;
  for (const g of telhado("quatro-aguas", cw, F, A, altoP, 0.45, 0.15)) t.por("telha-escura", g, de(r, ARDOSIA), 0.08, 0);
  // Lanterna com mastro no topo.
  const yt = A + altoP;
  obra.por("madeira", bloco(1.4, 1.4, 1.4, 0, yt - 0.3, 0), orn, 0.04, 0);
  for (const g of telhado("quatro-aguas", 1.4, 1.4, yt + 1.1, 1.2, 0.15, 0.08)) t.por("telha-escura", g, "#474d55", 0.08, 0);
  obra.por("ferro", bloco(0.06, 2.2, 0.06, 0, yt + 2.2, 0), FERRO, 0.02, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, "estacao") };
}

/** Comando das Seis Balas: um galpão de tijolo velho como outro qualquer da beira do cais. */
function comando(p: PredioLocal, r: R): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const tij = "#7a4434";
  const ent = p.entravel;
  paredes(obra, L, F, A, "tijolo", tij, ent ? PORTA_DE_ENTRAR : undefined);
  rodape(obra, L, F, 0.5, "cantaria", "#6e675c", ent ? PORTA_DE_ENTRAR.largura : 0);
  // Porta de correr de tábua com cintas de ferro, encostada ao lado do vão, no trilho.
  const meia = PORTA_DE_ENTRAR.largura / 2;
  const folha = Math.min(4.4, L / 2 - meia - 0.2);
  const xf = ent ? meia + folha / 2 + 0.05 : 0;
  obra.por("ferro", quad(Math.min(L - 0.6, meia * 2 + folha * 2), 0.1, 0, 3.15, F / 2 + 0.14), "#2a2622", 0.02, 0);
  obra.por("madeira-escura", bloco(folha, 3.0, 0.1, xf, 0.05, F / 2 + 0.1), "#3a2c22", 0.08, 0);
  for (const y of [0.5, 1.5, 2.5]) obra.por("ferro", quad(folha, 0.12, xf, y, F / 2 + 0.16), "#2a2622", 0.02, 0);
  // Janelas altas: tábua pregada de um lado, grade grossa nos outros.
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
    const comp = f === "fundos" ? L : F;
    for (const u of aoLongo(comp, Math.max(1, Math.floor(comp / 5)), 2)) {
      vao(obra, f, L, F, u, A - 2.0, 1.0, 0.9, f === "esquerda" ? { miolo: "madeira", vidro: "#4a3a2c", moldura: "#6a5a4a", materialDaMoldura: "madeira" } : { grade: true, moldura: "#6a5a4a", materialDaMoldura: "madeira" });
    }
  }
  // Placa velha, sem nome legível; lampião ao lado da entrada.
  obra.por("madeira", quad(Math.min(5, L * 0.4), 0.7, 0, A - 1.4, F / 2 + 0.03), "#8a7a62", 0.12, 0);
  obra.por("ferro", bloco(0.25, 0.35, 0.25, -(meia + 0.5), 3.2, F / 2 + 0.25), "#3a3026", 0.04, 0);
  obra.por("vidro", bloco(0.18, 0.22, 0.18, -(meia + 0.5), 3.25, F / 2 + 0.25), "#d9a347", 0.04, 0);
  const alto = F * 0.22;
  for (const g of telhado("duas-aguas", L, F, A, alto, 0.45, 0.14)) t.por("telha-escura", g, "#5e4a40", 0.14, 0);
  for (const s of [1, -1]) obra.por("tijolo", perfilExtrudado([[F / 2, 0], [0, alto], [-F / 2, 0]], A, L / 2, 0.01).rotateY((s * Math.PI) / 2), tij, 0.08, 0);
  chamine(obra, -L * 0.3, -F * 0.25, A, alto + 0.8, "#6a3a2c");
  // Caixotes e barril encostados, como em todo armazém.
  obra.por("madeira", bloco(1.0, 0.8, 0.9, -L / 2 + 1.0, 0, F / 2 + 0.6), "#7a5a3a", 0.1, 0);
  obra.por("madeira", bloco(0.8, 0.7, 0.8, -L / 2 + 1.1, 0.8, F / 2 + 0.6), "#6a4a30", 0.1, 0);
  obra.por("madeira", cilindro(0.35, 0.35, 0.9, 7, -L / 2 + 2.2, 0, F / 2 + 0.6, true), "#5a3e26", 0.1, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, "comando") };
}

/** Farol: torre de alvenaria branca com faixas vermelhas, galeria de ferro e lanterna de vidro. */
function farol(p: PredioLocal, r: R): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const raio = Math.min(L, F) / 2 - 0.3;
  const hc = A - 3.2;
  obra.por("cantaria", cilindro(raio + 0.2, raio + 0.2, 1.0, 10, 0, 0, 0, true), "#8a8478", 0.06, 0.2);
  const faixas = 4;
  for (let i = 0; i < faixas; i++) {
    const y = 1 + (i * (hc - 1)) / faixas;
    const ra = raio - (i * raio * 0.32) / faixas;
    const rb = raio - ((i + 1) * raio * 0.32) / faixas;
    obra.por("reboco", cilindro(ra, rb, (hc - 1) / faixas, 10, 0, y, 0), i % 2 ? "#a8382c" : "#efe9dc", 0.04, 0);
  }
  const rt = raio * 0.68;
  obra.por("cantaria", cilindro(rt + 0.6, rt + 0.6, 0.25, 10, 0, hc, 0, true), "#8a8478", 0.04, 0);
  obra.por("ferro", cilindro(rt + 0.55, rt + 0.55, 0.9, 12, 0, hc + 0.25, 0), FERRO, 0.02, 0);
  obra.por("vidro", cilindro(rt * 0.7, rt * 0.7, 1.6, 8, 0, hc + 0.25, 0), "#e8c46a", 0.06, 0);
  t.por("ferro", cupula(rt * 0.8, 0, hc + 1.85, 0, 8, 3, 1.1), "#3f5a52", 0.06, 0);
  obra.por("ferro", bloco(0.08, 1.0, 0.08, 0, hc + 1.85 + rt * 0.85, 0), FERRO, 0.02, 0);
  if (p.entravel) porta(obra, "frente", raio * 2, raio * 2, 0, Math.min(PORTA_DE_ENTRAR.largura, raio * 1.6), PORTA_DE_ENTRAR.altura, "#3b281c", true, "#efe9dc");
  else obra.por("madeira", naFace(bloco(1.1, 2.1, 0.1, 0, 0, 0), "frente", raio * 2, raio * 2, 0, 1.0), "#3b281c", 0.08, 0);
  for (const y of [hc * 0.35, hc * 0.6, hc * 0.82]) vao(obra, "frente", raio * 1.5, raio * 1.5, 0, y, 0.5, 0.8, { moldura: "#efe9dc", peitoril: false });
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, "galpao") };
}

/** Igreja eclética: frontão curvo, duas torres com cúpula, nave de duas águas. */
function igreja(p: PredioLocal, r: R): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const cal = de(r, ["#f1ece0", "#ece3cf", "#e6dcc8"]);
  const orn = de(r, ["#c9a868", "#a9b4bd", "#d1b48a", "#b8b0a0"]);
  paredes(obra, L, F, A, "reboco", cal, p.entravel ? PORTA_DE_ENTRAR : undefined);
  rodape(obra, L, F, 0.9, "cantaria", "#8f887a", p.entravel ? PORTA_DE_ENTRAR.largura : 0);
  obra.por("reboco", bloco(L + 0.4, 0.4, F + 0.4, 0, A - 0.4, 0), orn, 0.04, 0);
  const alto = L * 0.36;
  for (const g of telhado("duas-aguas", F, L, A, alto, 0.45)) t.por("telha", g.rotateY(Math.PI / 2), de(r, TELHA), 0.1, 0);
  // Empena dos fundos (a da frente fica atrás do frontão).
  obra.por("reboco", perfilExtrudado([[L / 2, 0], [0, alto], [-L / 2, 0]], A, F / 2, 0.01).rotateY(Math.PI), cal);
  // Torres nos cantos da frente.
  const lado = Math.max(3, Math.min(5.5, L * 0.26));
  const ht = A + alto * 0.6;
  for (const s of [-1, 1]) {
    const x = s * (L / 2 - lado / 2);
    const z = F / 2 - lado / 2;
    obra.por("reboco", bloco(lado + 0.1, ht, lado + 0.1, x, 0, z), cal);
    for (const y of [A - 0.4, ht]) obra.por("reboco", bloco(lado + 0.4, 0.35, lado + 0.4, x, y, z), orn, 0.04, 0);
    // Sineira: vãos em arco nas quatro faces.
    const ys = ht + 0.35;
    const hs = lado * 0.95;
    obra.por("reboco", bloco(lado, hs, lado, x, ys, z), cal);
    for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
      obra.por("vidro", naFace(quad(lado * 0.42, hs * 0.55, 0, 0, 0.01), f, lado, lado, 0, ys + 0.4).translate(x, 0, z), "#1c1a18", 0.02, 0);
      obra.por("vidro", naFace(meioDisco2(lado * 0.21), f, lado, lado, 0, ys + 0.4 + hs * 0.55, 0.01).translate(x, 0, z), "#1c1a18", 0.02, 0);
    }
    obra.por("reboco", bloco(lado + 0.35, 0.3, lado + 0.35, x, ys + hs, z), orn, 0.04, 0);
    const yc = ys + hs + 0.3;
    obra.por("reboco", cilindro(lado * 0.4, lado * 0.4, lado * 0.35, 8, x, yc, z), cal, 0.04, 0);
    t.por("telha-escura", cupula(lado * 0.44, x, yc + lado * 0.35, z, 8, 4, 1.35), de(r, ["#4f6a66", "#6a5a4a", "#5a6a78"]), 0.08, 0);
    const yk = yc + lado * 0.35 + lado * 0.44 * 1.35;
    obra.por("ferro", bloco(0.09, 1.3, 0.09, x, yk, z), FERRO, 0.02, 0);
    obra.por("ferro", bloco(0.6, 0.09, 0.09, x, yk + 0.85, z), FERRO, 0.02, 0);
  }
  // Frontão curvo entre as torres, com óculo e cruz.
  const fw = Math.max(2.5, L - lado * 2);
  const fa = Math.min(alto + 1.4, fw * 0.55);
  obra.por("reboco", perfilExtrudado(perfilArco(fw, fa), A, F / 2 + 0.05, 0.4), cal);
  obra.por("reboco", bloco(fw + 0.2, 0.3, 0.6, 0, A - 0.1, F / 2 - 0.1), orn, 0.04, 0);
  const ro = Math.min(0.9, fa * 0.25);
  disco(obra, "reboco", "frente", L, F + 0.1, 0, A + fa * 0.4, ro + 0.15, orn, 0.01, 8);
  disco(obra, "vidro", "frente", L, F + 0.1, 0, A + fa * 0.4, ro, "#2a3236", 0.02, 8);
  obra.por("ferro", bloco(0.1, 1.4, 0.1, 0, A + fa, F / 2 - 0.15), FERRO, 0.02, 0);
  obra.por("ferro", bloco(0.7, 0.1, 0.1, 0, A + fa + 0.9, F / 2 - 0.15), FERRO, 0.02, 0);
  // Portal e janelas.
  if (p.entravel) {
    porta(obra, "frente", L, F, 0, PORTA_DE_ENTRAR.largura, PORTA_DE_ENTRAR.altura, "#4a2a1e", true, orn);
    obra.por("reboco", naFace(meioDisco2(PORTA_DE_ENTRAR.largura / 2 + 0.2), "frente", L, F, 0, PORTA_DE_ENTRAR.altura + 0.15, 0.04), orn, 0.04, 0);
  } else portaLeve(obra, "frente", L, F, 0, Math.min(2.4, fw * 0.5), Math.min(3.6, A * 0.45), "#4a2a1e", orn, true);
  vao(obra, "frente", L, F, 0, A * 0.6, 1.2, Math.min(1.8, A * 0.18), { arco: true, moldura: orn });
  for (const u of aoLongo(F - lado, Math.max(2, Math.floor((F - lado) / 4.5)), 1.8)) {
    for (const f of ["esquerda", "direita"] as Face[]) vao(obra, f, L, F, f === "esquerda" ? u - lado / 2 : u + lado / 2, A * 0.42, 1.1, Math.min(2.6, A * 0.3), { arco: true, moldura: orn });
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, "igreja") };
}

// ---------------------------------------------------------------- cais e indústria

type OpArmazem = { abobada?: boolean; ferro?: boolean; madeira?: boolean; portas?: number; guincho?: boolean; letreiro?: boolean };

/**
 * Armazém do cais: tijolo aparente com pilastras, empena para a rua, portões em arco,
 * porta de carga no alto com guincho; ou galpão de ferro em abóbada; ou tabuado.
 */
function armazem(p: PredioLocal, r: R, b: Bairro, o: OpArmazem = {}, tipoInterior: Tipo = "galpao"): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const ferro = !!o.ferro;
  const madeira = !!o.madeira && !ferro;
  const mat: NomeMaterial = ferro ? "ferro" : madeira ? "madeira" : "tijolo";
  const cor = ferro ? de(r, ZINCO) : madeira ? de(r, ["#6a5038", "#5e4a36", "#7a5e42"]) : de(r, TIJOLO);
  const claro = ferro ? "#3a3c3a" : madeira ? "#4a3626" : de(r, ["#c9b08e", "#d9c7a6", "#a86a50"]);
  const ent = p.entravel;
  paredes(obra, L, F, A, mat, cor, ent ? PORTA_DE_ENTRAR : undefined);
  rodape(obra, L, F, 0.5, "cantaria", "#7e786c", ent ? PORTA_DE_ENTRAR.largura : 0);
  // Pilastras de tijolo ou colunas de ferro na frente e nas laterais.
  const passo = ferro ? 4.5 : 4.0;
  if (!madeira) {
    for (const f of ["frente", "esquerda", "direita"] as Face[]) {
      const comp = f === "frente" ? L : F;
      const n = Math.max(1, Math.round(comp / passo));
      for (let i = 0; i <= n; i++) {
        const u = Math.max(-comp / 2 + 0.3, Math.min(comp / 2 - 0.3, -comp / 2 + (i * comp) / n));
        if (f === "frente" && ent && Math.abs(u) < PORTA_DE_ENTRAR.largura / 2 + 0.4) continue;
        const g = ferro ? cilindro(0.12, 0.12, A, 5, 0, 0, 0.12) : bloco(0.55, A - 0.5, 0.18, 0, 0.5, 0.09);
        obra.por(mat, naFace(g, f, L, F, u, 0), ferro ? "#2c2e2c" : cor, 0.06, 0);
      }
    }
  } else {
    // Tabuado com mata-juntas.
    for (const f of ["frente", "esquerda", "direita"] as Face[]) {
      const comp = f === "frente" ? L : F;
      for (const u of aoLongo(comp, Math.floor(comp / 0.9), 0.3)) obra.por("madeira", naFace(quad(0.09, A, 0, 0, 0.01), f, L, F, u, 0), "#4a3626", 0.1, 0);
    }
  }
  if (ferro) {
    // Chapa ondulada: listras escuras.
    for (const f of ["frente", "esquerda", "direita"] as Face[]) {
      const comp = f === "frente" ? L : F;
      for (const u of aoLongo(comp, Math.floor(comp / 0.7), 0.2)) obra.por("ferro", naFace(quad(0.07, A - 0.6, 0, 0.5, 0.008), f, L, F, u, 0), "#3e3f3c", 0.04, 0);
    }
  }
  // Cornija saliente.
  if (!madeira) obra.por(mat, bloco(L + 0.3, 0.35, F + 0.3, 0, A - 0.35, 0), ferro ? "#3a3c3a" : cor, 0.06, 0);
  // Portões com arco de descarga.
  const np = o.portas ?? (L > 30 ? 3 : L > 16 ? 2 : 1);
  const pw = Math.min(3.6, (L / np) * 0.5);
  const ph = Math.min(A - 1.6, 4.2);
  for (let i = 0; i < np; i++) {
    const u = -L / 2 + (i + 0.5) * (L / np);
    if (ent && Math.abs(u) - pw / 2 < PORTA_DE_ENTRAR.largura / 2 + 0.3) continue;
    obra.por("madeira-escura", naFace(bloco(pw, ph, 0.08, 0, 0, 0.04), "frente", L, F, u, 0), de(r, ["#3a2c22", "#2f3a30", "#4a3020"]), 0.1, 0);
    obra.por(mat, naFace(perfilExtrudado(perfilArco(pw + 0.6, 0.55), 0, 0.12, 0.12), "frente", L, F, u, ph), claro, 0.05, 0);
  }
  if (ent) obra.por(mat, naFace(perfilExtrudado(perfilArco(PORTA_DE_ENTRAR.largura + 0.6, 0.6), 0, 0.12, 0.12), "frente", L, F, 0, PORTA_DE_ENTRAR.altura), claro, 0.05, 0);
  // Janelas altas em arco nas laterais e nos fundos, gradeadas.
  if (!madeira) {
    for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
      const comp = f === "fundos" ? L : F;
      const n = Math.max(1, Math.round(comp / passo));
      for (let i = 0; i < n; i++) {
        if (r() < 0.25) continue;
        const u = -comp / 2 + (i + 0.5) * (comp / n);
        const hw = Math.min(1.4, A * 0.5 - 1.2);
        if (hw > 0.6) vao(obra, f, L, F, u, A * 0.5, 0.9, hw, { arco: true, moldura: claro, materialDaMoldura: mat, grade: !ferro, peitoril: false });
      }
    }
  }
  // Faixa de letreiro pintada na parede (o nome da firma, desbotado).
  if (o.letreiro ?? r() < 0.6) obra.por(mat, quad(Math.min(L * 0.7, 14), 0.8, 0, A - 1.4, F / 2 + 0.012), de(r, ["#d9cdb2", "#c9b48a", "#e0d6c0", "#2f3a30"]), 0.12, 0);
  // Cobertura: abóbada de ferro, empena para a rua (prédio fundo) ou cumeeira ao longo (largo).
  const telhaCor = de(r, ["#6a4a3c", "#5e5048", "#7a5442"]);
  if (o.abobada || (ferro && r() < 0.7)) {
    const fl = Math.min(L * 0.22, 6.5);
    t.por(ferro ? "ferro" : "telha-escura", abobada(L, F, A, fl, 0.5, 8), ferro ? cor : "#5a5e5c", 0.08, 0);
    obra.por("vidro", timpano(L, A, fl, F / 2, 8), "#3a4246", 0.04, 0);
    obra.por("vidro", timpano(L, A, fl, -F / 2, 8, true), "#3a4246", 0.04, 0);
    for (const u of [-L * 0.25, 0, L * 0.25]) obra.por("ferro", quad(0.1, fl * Math.sin(Math.PI * (0.5 + u / L)), u, A, F / 2 + 0.02), FERRO, 0.02, 0);
    if (o.abobada) {
      // Lanternim corrido na crista.
      obra.por("vidro", bloco(1.8, 0.8, F * 0.8, 0, A + fl - 0.2, 0), "#3a4246", 0.04, 0);
      for (const g of telhado("duas-aguas", F * 0.8, 1.8, A + fl + 0.6, 0.5, 0.3, 0.1)) t.por("ferro", g.rotateY(Math.PI / 2), "#4f5452", 0.06, 0);
    }
  } else if (L <= F * 1.6) {
    const alto = L * 0.26;
    for (const g of telhado("duas-aguas", F, L, A, alto, 0.45, 0.15)) t.por(ferro ? "ferro" : "telha-escura", g.rotateY(Math.PI / 2), ferro ? cor : telhaCor, 0.12, 0);
    for (const s of [0, Math.PI]) obra.por(mat, perfilExtrudado([[L / 2, 0], [0, alto], [-L / 2, 0]], A, F / 2, 0.3).rotateY(s), cor, 0.06, 0);
    if (!madeira && !ferro) disco(obra, "vidro", "frente", L, F + 0.02, 0, A + alto * 0.4, Math.min(0.6, alto * 0.25), "#2a3236", 0.01, 8);
    // Porta de carga no alto e o guincho.
    if ((o.guincho ?? true) && A >= 6) {
      obra.por("madeira-escura", naFace(bloco(1.5, 2.0, 0.08, 0, 0, 0.04), "frente", L, F, 0, A - 2.6), "#3a2c22", 0.1, 0);
      obra.por("madeira", bloco(0.25, 0.25, 1.6, 0, A + alto * 0.2, F / 2 + 0.8), "#4a3626", 0.08, 0);
      obra.por("ferro", bloco(0.04, 1.6, 0.04, 0, A + alto * 0.2 - 1.6, F / 2 + 1.45), "#2a2622", 0.02, 0);
      obra.por("ferro", bloco(0.25, 0.3, 0.12, 0, A + alto * 0.2 - 0.3, F / 2 + 1.45), "#2a2622", 0.02, 0);
    }
  } else {
    const alto = F * 0.24;
    for (const g of telhado("duas-aguas", L, F, A, alto, 0.45, 0.15)) t.por(ferro ? "ferro" : "telha-escura", g, ferro ? cor : telhaCor, 0.12, 0);
    for (const s of [1, -1]) obra.por(mat, perfilExtrudado([[F / 2, 0], [0, alto], [-F / 2, 0]], A, L / 2, 0.01).rotateY((s * Math.PI) / 2), cor, 0.06, 0);
    // Frontão escalonado no meio da fachada comprida.
    if (!ferro && !madeira) {
      const fw = Math.min(L * 0.32, 10);
      const d = fw / 6;
      obra.por(mat, perfilExtrudado([[fw / 2, 0], [fw / 2, 0.8], [fw / 2 - d, 0.8], [fw / 2 - d, 1.6], [d, 1.6], [d, 2.4], [-d, 2.4], [-d, 1.6], [-fw / 2 + d, 1.6], [-fw / 2 + d, 0.8], [-fw / 2, 0.8], [-fw / 2, 0]], A, F / 2 + 0.02, 0.4), cor, 0.06, 0);
      disco(obra, "vidro", "frente", L, F + 0.06, 0, A + 1.1, 0.45, "#2a3236", 0.01, 8);
    }
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, tipoInterior) };
}

/** Fábrica: tijolo com pilastras, janelas em arco em fila, dente-de-serra ou lanternim, chaminé redonda. */
function fabrica(p: PredioLocal, r: R): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const tij = de(r, TIJOLO);
  const orn = de(r, ["#c9b08e", "#a86a50", "#d9c7a6"]);
  const ent = p.entravel;
  paredes(obra, L, F, A, "tijolo", tij, ent ? PORTA_DE_ENTRAR : undefined);
  rodape(obra, L, F, 0.6, "cantaria", "#7e786c", ent ? PORTA_DE_ENTRAR.largura : 0);
  const andares = A >= 10 ? 2 : 1;
  const ha = A / andares;
  for (const f of ["frente", "esquerda", "direita", "fundos"] as Face[]) {
    const comp = f === "frente" || f === "fundos" ? L : F;
    const n = Math.max(1, Math.round(comp / 3.6));
    for (let i = 0; i <= n && f !== "fundos"; i++) {
      const u = Math.max(-comp / 2 + 0.3, Math.min(comp / 2 - 0.3, -comp / 2 + (i * comp) / n));
      if (f === "frente" && ent && Math.abs(u) < PORTA_DE_ENTRAR.largura / 2 + 0.4) continue;
      obra.por("tijolo", naFace(bloco(0.6, A - 0.6, 0.2, 0, 0.6, 0.1), f, L, F, u, 0), tij, 0.08, 0);
    }
    if (f === "fundos" && r() < 0.5) continue;
    for (let i = 0; i < n; i++) {
      const u = -comp / 2 + (i + 0.5) * (comp / n);
      for (let k = 0; k < andares; k++) {
        if (f === "frente" && k === 0 && Math.abs(u) < (ent ? PORTA_DE_ENTRAR.largura / 2 + 1.2 : 2.6)) continue;
        const w = Math.min(1.6, comp / n - 1.4);
        const hw = Math.min(2.4, ha - 1.9 - w / 2);
        if (hw < 0.8 || w < 0.6) continue;
        vao(obra, f, L, F, u, k * ha + 1.1, w, hw, { arco: true, moldura: orn, materialDaMoldura: "tijolo", peitoril: false });
      }
    }
  }
  for (let k = 1; k < andares; k++) obra.por("tijolo", bloco(L + 0.24, 0.25, F + 0.24, 0, k * ha - 0.1, 0), orn, 0.06, 0);
  obra.por("tijolo", bloco(L + 0.34, 0.4, F + 0.34, 0, A - 0.4, 0), tij, 0.08, 0);
  if (!ent) obra.por("madeira-escura", naFace(bloco(3.4, Math.min(4, ha - 0.8), 0.08, 0, 0, 0.04), "frente", L, F, 0, 0), "#33291f", 0.08, 0);
  obra.por("tijolo", quad(Math.min(L * 0.6, 16), 0.9, 0, A - 1.5, F / 2 + 0.012), de(r, ["#d9cdb2", "#e0d6c0", "#c9b48a"]), 0.12, 0);
  const corTelhado = de(r, ["#5e5048", "#6a4a3c", "#55504c"]);
  const tecelagem = p.id.startsWith("tecelagem") || (!p.id.startsWith("usina") && !p.id.startsWith("fundicao") && r() < 0.45);
  if (tecelagem) {
    // Dente-de-serra: águas viradas para a frente, vidro vertical para os fundos.
    const n = Math.max(2, Math.round(F / 5));
    const d = F / n;
    const hs = Math.min(2.6, d * 0.5);
    const pts: THREE.Vector3[] = [];
    const tris: number[] = [];
    const vid: THREE.Vector3[] = [];
    const tv: number[] = [];
    const lat: THREE.Vector3[] = [];
    const tl: number[] = [];
    for (let i = 0; i < n; i++) {
      const z0 = F / 2 - i * d;
      const z1 = z0 - d;
      const k = pts.length;
      pts.push(v(-L / 2 - 0.2, A, z0 + 0.2), v(L / 2 + 0.2, A, z0 + 0.2), v(L / 2 + 0.2, A + hs, z1), v(-L / 2 - 0.2, A + hs, z1));
      tris.push(k, k + 1, k + 2, k, k + 2, k + 3);
      const j = vid.length;
      vid.push(v(L / 2, A, z1), v(-L / 2, A, z1), v(-L / 2, A + hs, z1), v(L / 2, A + hs, z1));
      tv.push(j, j + 1, j + 2, j, j + 2, j + 3);
      for (const s of [-1, 1]) {
        const q = lat.length;
        lat.push(v((s * L) / 2, A, z0), v((s * L) / 2, A, z1), v((s * L) / 2, A + hs, z1));
        tl.push(...(s > 0 ? [q, q + 1, q + 2] : [q, q + 2, q + 1]));
      }
    }
    t.por("telha-escura", malha(pts, tris), corTelhado, 0.1, 0);
    obra.por("vidro", malha(vid, tv), "#3a4246", 0.06, 0);
    obra.por("tijolo", malha(lat, tl), tij, 0.08, 0);
  } else {
    const alto = F * 0.22;
    for (const g of telhado("duas-aguas", L, F, A, alto, 0.45, 0.14)) t.por("telha-escura", g, corTelhado, 0.1, 0);
    for (const s of [1, -1]) obra.por("tijolo", perfilExtrudado([[F / 2, 0], [0, alto], [-F / 2, 0]], A, L / 2, 0.01).rotateY((s * Math.PI) / 2), tij, 0.08, 0);
    // Lanternim de ventilação ao longo da cumeeira.
    const comp = L * 0.7;
    obra.por("madeira-escura", bloco(comp, 1.0, 1.4, 0, A + alto - 0.3, 0), "#3a3430", 0.06, 0);
    for (const s of [0, Math.PI]) obra.por("vidro", quad(comp - 0.3, 0.6, 0, A + alto - 0.1, 0.71).rotateY(s), "#2a3236", 0.04, 0);
    for (const g of telhado("duas-aguas", comp + 0.2, 1.4, A + alto + 0.7, 0.5, 0.3, 0.1)) t.por("telha-escura", g, corTelhado, 0.08, 0);
  }
  // Chaminé redonda alta (duas na usina), num canto dos fundos.
  const chamines = p.id.startsWith("usina") ? 2 : 1;
  for (let i = 0; i < chamines; i++) {
    const x = (L / 2 - 2.2) * (i === 0 ? 1 : -1);
    const z = -F / 2 + 2.2;
    const H = Math.min(A * 2.4, 36) * (i ? 0.85 : 1);
    obra.por("tijolo", bloco(3.0, 3.2, 3.0, x, 0, z), "#6e3a2a", 0.08, 0);
    obra.por("tijolo", cilindro(1.15, 0.72, H - 3.2, 10, x, 3.2, z), de(r, ["#7e4230", "#8a4a34", "#6e3a2a"]), 0.08, 0);
    obra.por("tijolo", cilindro(0.95, 0.95, 0.7, 10, x, H - 0.4, z, true), "#3a2a22", 0.06, 0);
    obra.por("ferro", cilindro(1.0, 1.0, 0.18, 10, x, H * 0.55, z), "#2a2622", 0.02, 0);
  }
  // Caixa-d'água de madeira sobre pés de ferro no telhado (às vezes).
  if (r() < 0.35 && L > 14) {
    const x = -L * 0.25;
    for (const [a, b2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) obra.por("ferro", bloco(0.15, 2.4, 0.15, x + a * 1.1, A, b2 * 1.1), FERRO, 0.02, 0);
    obra.por("madeira", cilindro(1.5, 1.5, 2.0, 10, x, A + 2.4, 0, true), "#5a4632", 0.08, 0);
    t.por("ferro", cilindro(1.6, 0.05, 0.8, 10, x, A + 4.4, 0), "#4a4440", 0.06, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, "fabrica") };
}

/** Cata-vento de ferro sobre torre treliçada com caixa-d'água (o "moinho" da cidade industrial). */
function cataVento(p: PredioLocal, r: R): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const b = Math.min(L, F) / 2 - 0.4;
  const topo = A * 0.82;
  const cima = new THREE.Vector3(0, 1, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const pe = new THREE.Vector3(x * b, 0, z * b);
    const alto = new THREE.Vector3(x * b * 0.2, topo, z * b * 0.2);
    const dir = alto.clone().sub(pe);
    const g = cilindro(0.08, 0.08, dir.length(), 4, 0, 0, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(cima, dir.clone().normalize()));
    obra.por("ferro", g.translate(pe.x, pe.y, pe.z), "#3a3836", 0.02, 0);
  }
  for (const y of [topo * 0.33, topo * 0.66]) {
    const s = b * (1 - (y / topo) * 0.8);
    obra.por("ferro", bloco(s * 2, 0.08, 0.08, 0, y, s), "#3a3836", 0.02, 0);
    obra.por("ferro", bloco(s * 2, 0.08, 0.08, 0, y, -s), "#3a3836", 0.02, 0);
    obra.por("ferro", bloco(0.08, 0.08, s * 2, s, y, 0), "#3a3836", 0.02, 0);
    obra.por("ferro", bloco(0.08, 0.08, s * 2, -s, y, 0), "#3a3836", 0.02, 0);
  }
  obra.por("madeira", cilindro(b * 0.6, b * 0.6, 1.8, 10, 0, topo * 0.33 + 0.1, 0, true), "#5a4632", 0.08, 0);
  // Roda de pás e leme.
  const rr = Math.min(2.6, A * 0.18);
  const giro = r() * Math.PI;
  for (let i = 0; i < 14; i++) {
    const pa = bloco(0.28, rr, 0.03, 0, 0, 0).translate(0, rr * 0.25, 0).rotateZ(giro + (i * Math.PI * 2) / 14);
    obra.por("ferro", pa.translate(0, topo + 0.4, b * 0.2 + 0.5), "#8a8a82", 0.06, 0);
  }
  obra.por("ferro", bloco(0.12, 0.12, 2.4, 0, topo + 0.34, -0.6), "#3a3836", 0.02, 0);
  obra.por("ferro", bloco(0.04, 1.0, 1.4, 0, topo, -1.9), "#8a8a82", 0.04, 0);
  return { corpo: obra.pecas(), telhado: [], interior: [] };
}

// ---------------------------------------------------------------- Cidade-Oriental

type CoresOrientais = { parede: string; madeira: string; coluna: string; telha: string; papel: string; lanterna: string };

function paletaOriental(r: R): CoresOrientais {
  return {
    parede: de(r, ["#e8dcc2", "#d9c39a", "#c9b087", "#e2cfae", "#b8a07a"]),
    madeira: de(r, ["#3a2a20", "#2e2420", "#4a3022"]),
    coluna: de(r, ["#9a2f22", "#a8362a", "#8a2a20", "#7a3a2a"]),
    telha: de(r, ["#4a524e", "#3e4a52", "#5a4a3a", "#2f5a52", "#5a5e58", "#3a4440"]),
    papel: de(r, ["#ecdfb8", "#e6d4a6", "#f0e6c8"]),
    lanterna: de(r, ["#c8382a", "#b8302a", "#d9a03a"]),
  };
}

/** Telhado curvo com cumeeira e acabamentos levantados nas pontas. */
function telhadoOriental(t: Obra, L: number, F: number, base: number, alto: number, beiral: number, levanta: number, cor: string, nivel: NivelPredio) {
  t.por("telha-escura", cobertura(aneisCurvos(L, F, base, alto, beiral, levanta, nivel === 0 ? 3 : 2), false, nivel === 0), cor, 0.08, 0);
  if (nivel === 1) return;
  const mx = L >= F ? (L - F) / 2 : 0;
  const mz = F > L ? (F - L) / 2 : 0;
  const topo = base + alto;
  if (mx > 0.4 || mz > 0.4) {
    // Cumeeira grossa com as pontas arrebitadas para fora.
    const emX = mx > mz;
    const m = emX ? mx : mz;
    const giro = emX ? 0 : Math.PI / 2;
    t.por("telha-escura", bloco(m * 2 + 0.2, 0.3, 0.34, 0, topo - 0.08, 0).rotateY(giro), "#2a2a28", 0.04, 0);
    for (const s of [-1, 1]) {
      const ponta = bloco(0.9, 0.26, 0.3, 0, 0, 0).translate(s * 0.4, 0, 0).rotateZ(s * 0.55).translate(s * (m + 0.05), topo - 0.05, 0);
      t.por("telha-escura", ponta.rotateY(giro), "#2a2a28", 0.04, 0);
    }
  } else {
    t.por("ferro", cilindro(0.18, 0.04, 1.2, 6, 0, topo - 0.05, 0), "#8a6a2a", 0.06, 0);
  }
}

/** Casa, loja, casa de chá ou templo oriental: madeira escura, colunas vermelhas, treliça de papel. */
function casaOriental(p: PredioLocal, r: R, o: { loja?: boolean; cha?: boolean; templo?: boolean } = {}): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const c = paletaOriental(r);
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const ent = p.entravel;
  const dois = !o.templo && A >= 5 && L >= 8;
  const h1 = o.templo ? A * 0.55 : dois ? A * 0.56 : A;
  const recuo = o.templo ? 1.6 : dois ? 0.5 : 0;
  // Plataforma de pedra e corpo; o andar de cima recua.
  rodape(obra, L, F, 0.45, "cantaria", "#8a8478", ent ? PORTA_DE_ENTRAR.largura : 0);
  const parede = o.templo ? "#b8402e" : c.parede;
  paredes(obra, L, F, h1, "reboco", parede, ent ? PORTA_DE_ENTRAR : undefined);
  if (recuo) obra.por("reboco", bloco(L - recuo * 2, A - h1, F - recuo * 2, 0, h1, 0), parede);
  // Esqueleto de madeira: esteios nos cantos e na fachada, viga em cima.
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) obra.por("madeira-escura", bloco(0.24, h1, 0.24, x * (L / 2 - 0.08), 0, z * (F / 2 - 0.08)), c.madeira, 0.05, 0);
  const nv = Math.max(2, Math.round(L / 2.6));
  for (let i = 1; i < nv; i++) {
    const u = -L / 2 + (i * L) / nv;
    if (ent && Math.abs(u) < PORTA_DE_ENTRAR.largura / 2 + 0.2) continue;
    obra.por("madeira-escura", naFace(bloco(0.2, h1 - 0.45, 0.08, 0, 0, 0.04), "frente", L, F, u, 0.45), c.madeira, 0.05, 0);
  }
  obra.por("madeira-escura", bloco(L + 0.1, 0.24, F + 0.1, 0, h1 - 0.24, 0), c.madeira, 0.05, 0);
  // Varanda de colunas vermelhas sob o beiral da frente.
  const beiral = o.templo ? 1.5 : 1.1;
  const nc = o.templo ? 6 : L > 9 ? 4 : 2;
  const hcol = h1 - 0.1;
  const zc = F / 2 + beiral - 0.35;
  for (let i = 0; i < nc; i++) {
    let x = -L / 2 + 0.4 + (i * (L - 0.8)) / (nc - 1);
    if (ent && Math.abs(x) < PORTA_DE_ENTRAR.largura / 2 + 0.2) x = (x < 0 ? -1 : 1) * (PORTA_DE_ENTRAR.largura / 2 + 0.3);
    obra.por("madeira", cilindro(0.15, 0.15, hcol - 0.45, 6, x, 0.45, zc), c.coluna, 0.05, 0);
    obra.por("cantaria", bloco(0.4, 0.2, 0.4, x, 0.45, zc), "#8a8478", 0.04, 0);
  }
  obra.por("cantaria", bloco(L, 0.45, beiral - 0.1, 0, 0, F / 2 + (beiral - 0.1) / 2), "#8a8478", 0.05, 0.2);
  obra.por("madeira", bloco(L, 0.22, 0.22, 0, hcol - 0.2, zc), c.coluna, 0.05, 0);
  // Porta e janelas de treliça com papel.
  if (ent) porta(obra, "frente", L, F, 0, PORTA_DE_ENTRAR.largura, PORTA_DE_ENTRAR.altura, c.coluna, true, c.madeira);
  const slots = Array.from({ length: nv }, (_, i) => -L / 2 + (i + 0.5) * (L / nv));
  const meio = Math.floor(nv / 2);
  const papel = { miolo: "lona" as NomeMaterial, vidro: c.papel, moldura: c.madeira, materialDaMoldura: "madeira-escura" as NomeMaterial, trelica: c.madeira, peitoril: false };
  slots.forEach((u, i) => {
    if (ent && Math.abs(u) < PORTA_DE_ENTRAR.largura / 2 + 0.9) return;
    if (!ent && i === meio) {
      portaLeve(obra, "frente", L, F, u, Math.min(1.6, L / nv - 0.6), Math.min(2.4, h1 - 0.9), c.coluna, c.madeira, false, "madeira-escura");
      return;
    }
    if (o.loja) {
      // Loja aberta: vão escuro e o balcão de tábua na frente.
      const w = L / nv - 0.5;
      obra.por("vidro", naFace(quad(w, Math.min(2.2, h1 - 1.2), 0, 0, 0.02), "frente", L, F, u, 0.5), "#2a2420", 0.04, 0);
      obra.por("madeira", naFace(bloco(w, 0.8, 0.5, 0, 0, 0.3), "frente", L, F, u, 0.45), c.madeira, 0.08, 0);
      return;
    }
    vao(obra, "frente", L, F, u, 1.1, Math.min(1.3, L / nv - 0.7), Math.min(1.4, h1 - 1.9), papel);
  });
  if (o.cha) disco(obra, "lona", "frente", L, F, -L / 4, h1 * 0.5, 0.8, c.papel, 0.03, 8);
  for (const f of ["esquerda", "direita"] as Face[]) {
    for (const u of aoLongo(F, Math.max(1, Math.floor(F / 4)), 1.6)) {
      if (r() < 0.35) continue;
      vao(obra, f, L, F, u, 1.1, 1.1, Math.min(1.3, h1 - 1.9), papel);
    }
  }
  // Placa vertical de loja e lanternas.
  if (o.loja || o.cha) {
    const lado = r() < 0.5 ? -1 : 1;
    obra.por("madeira", bloco(0.1, 2.0, 0.65, lado * (L / 2 - 0.5), 1.2, F / 2 + 0.45), r() < 0.5 ? "#7a1e18" : "#1e1a16", 0.06, 0);
    obra.por("madeira", bloco(0.12, 1.6, 0.45, lado * (L / 2 - 0.5), 1.4, F / 2 + 0.45), "#c9a040", 0.06, 0);
  }
  for (const s of [-1, 1]) lanterna(obra, s * (L / 2 - 0.2), hcol - 0.85, zc, c.lanterna);
  if (o.loja || o.cha || o.templo) for (const x of [-L / 4, L / 4]) lanterna(obra, x, hcol - 0.75, zc, r() < 0.6 ? "#c8382a" : "#d9a03a");
  // Telhados: saia no primeiro andar (sobrado e templo) e o curvo de cima.
  if (recuo) {
    t.por("telha-escura", cobertura([
      { hx: L / 2 + beiral * 0.8, hz: F / 2 + beiral, y: h1, levanta: 0.7 },
      { hx: L / 2 - recuo + 0.1, hz: F / 2 - recuo + 0.1, y: h1 + 0.9 },
    ], false, true, 0.14), c.telha, 0.08, 0);
    const Lr = L - recuo * 2;
    const Fr = F - recuo * 2;
    const nj = o.templo ? 3 : Math.max(2, nv - 1);
    for (const u of aoLongo(Lr, nj, 1.0)) vao(obra, "frente", Lr, Fr, u, h1 + (o.templo ? 1.2 : 1.0), o.templo ? 1.0 : 0.9, Math.min(o.templo ? 1.5 : 1.0, A - h1 - 1.4), o.templo ? { ...papel, moldura: "#d9a03a", materialDaMoldura: "madeira" } : papel);
  }
  const Lt = L - recuo * 2;
  const Ft = F - recuo * 2;
  telhadoOriental(t, Lt, Ft, A, Math.min(Lt, Ft) * (o.templo ? 0.38 : 0.32) + 0.4, o.templo ? 1.3 : dois ? 0.9 : beiral, o.templo ? 1.1 : 0.85, c.telha, 0);
  if (o.templo) {
    // Incensário de bronze e dois leões de pedra na escada.
    const zf = F / 2 + beiral + 1.0;
    obra.por("ferro", cilindro(0.55, 0.45, 0.8, 8, 0, 0, zf), "#6a5a2a", 0.06, 0);
    obra.por("ferro", cilindro(0.2, 0.06, 0.6, 6, 0, 0.8, zf), "#6a5a2a", 0.06, 0);
    for (const s of [-1, 1]) {
      obra.por("cantaria", bloco(0.7, 0.5, 0.7, s * (PORTA_DE_ENTRAR.largura / 2 + 0.9), 0, F / 2 + beiral + 0.4), "#8a8478", 0.05, 0);
      obra.por("cantaria", bloco(0.5, 0.75, 0.6, s * (PORTA_DE_ENTRAR.largura / 2 + 0.9), 0.5, F / 2 + beiral + 0.4), "#9a9488", 0.05, 0);
    }
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, o.templo ? "templo" : o.loja || o.cha ? "cha" : "casa") };
}

/** Barraca de feira: armação de bambu, lona, balcão com mercadoria. */
function tenda(p: PredioLocal, r: R, b: Bairro): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const oriental = b === "oriental";
  const lona = oriental ? de(r, ["#a8362a", "#c9a040", "#2f5a52", "#d9ccae"]) : de(r, ["#d9ccae", "#c9b48a", "#9a8a6a"]);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) obra.por("madeira", cilindro(0.06, 0.06, A, 5, x * (L / 2 - 0.2), 0, z * (F / 2 - 0.2)), "#8a7a52", 0.08, 0);
  if (oriental) t.por("lona", cobertura(aneisCurvos(L, F, A, Math.min(L, F) * 0.25, 0.4, 0.35, 2), false, false), lona, 0.08, 0);
  else for (const g of telhado("duas-aguas", L, F, A, Math.min(L, F) * 0.3, 0.3, 0.04)) t.por("lona", g, lona, 0.1, 0);
  obra.por("madeira", bloco(L - 0.8, 0.9, 0.7, 0, 0, F / 2 - 0.6), "#6a4a30", 0.08, 0);
  for (let i = 0; i < 5; i++) obra.por("lona", bloco(0.4, 0.25, 0.35, -L / 2 + 0.9 + i * ((L - 1.8) / 4), 0.9, F / 2 - 0.6), de(r, ["#b8862a", "#6a8a3a", "#a83a2a", "#d9c08a"]), 0.1, 0);
  if (oriental) lanterna(obra, 0, A - 0.8, F / 2 - 0.3, "#c8382a");
  obra.por("madeira", bloco(0.6, 0.6, 0.6, L / 2 - 0.8, 0, -F / 2 + 0.8), "#7a5a3a", 0.1, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, "loja") };
}

// ---------------------------------------------------------------- periferia

/** Casebre de taipa ou tábua, telhado de zinco, palha ou telha velha; palafita na beira da baía. */
function casebre(p: PredioLocal, r: R, palafita: boolean): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const tabua = palafita || r() < 0.4;
  const mat: NomeMaterial = tabua ? "madeira" : "reboco";
  const parede = tabua ? de(r, ["#6a5038", "#5e4a36", "#7a5e42", "#5a4a3a", "#6e6250"]) : de(r, ["#a88a62", "#9a7c58", "#b39a74", "#c2ab84", "#d2c2a0"]);
  const cobre = de(r, ["zinco", "zinco", "palha", "telha"] as const);
  const corTeto = cobre === "zinco" ? de(r, ZINCO) : cobre === "palha" ? de(r, ["#9a8458", "#8a7448", "#a8925e"]) : "#7a4a3a";
  const matTeto: NomeMaterial = cobre === "zinco" ? "ferro" : cobre === "palha" ? "palha" : "telha-escura";
  const duas = cobre === "palha" || r() < 0.3;
  let y0 = 0;
  // Corpo um pouco menor que a planta: o resto é puxado (casebre) ou deque (palafita).
  let Lc = L;
  let Fc = F;
  let xc = 0;
  let zc = 0;
  if (palafita) {
    y0 = 1.3;
    const deque = Math.min(1.6, F * 0.25);
    Fc = F - deque;
    zc = -deque / 2;
    for (const x of aoLongo(L, Math.max(2, Math.round(L / 2.4)), 0.25)) {
      for (const z of aoLongo(F, Math.max(2, Math.round(F / 2.4)), 0.25)) obra.por("madeira-escura", cilindro(0.1, 0.1, y0 + 0.4, 4, x, -0.4, z), "#3a3026", 0.1, 0);
    }
    obra.por("madeira", bloco(L, 0.16, F, 0, y0 - 0.16, 0), "#7a6448", 0.12, 0);
    for (let i = 0; i < 4; i++) obra.por("madeira", bloco(1.0, 0.08, 0.3, 0, (i * y0) / 4, F / 2 + 0.3 + (3 - i) * 0.32), "#6a5038", 0.1, 0);
    // Rede de pesca pendurada no esteio do deque.
    obra.por("madeira", bloco(0.08, 1.4, 0.08, L / 2 - 0.2, y0, F / 2 - 0.1), "#4a3a2a", 0.08, 0);
    obra.por("lona", quad(1.4, 1.0, L / 2 - 1.0, y0 + 0.3, F / 2 - 0.08), "#4a4a3e", 0.1, 0);
  } else if (L >= 7 && r() < 0.5) {
    Lc = L - 2.2;
    xc = (r() < 0.5 ? -1 : 1) * 1.1;
    const xp = xc > 0 ? -L / 2 + 1.1 : L / 2 - 1.1;
    const hp = Math.max(2.0, A - 1.5);
    obra.por("madeira", bloco(2.2, hp, F * 0.7, xp, 0, -F * 0.15), de(r, ["#6a5038", "#5e4a36"]), 0.12, 0.2);
    for (const g of telhado("uma-agua", F * 0.7, 2.2, hp, 0.4, 0.2, 0.05)) t.por(matTeto, g.rotateY(xp > 0 ? Math.PI / 2 : -Math.PI / 2).translate(xp, 0, -F * 0.15), corTeto, 0.12, 0);
  }
  const topoParede = duas ? A : A - 0.5;
  const H = topoParede - y0;
  const casa = (g: THREE.BufferGeometry) => g.translate(xc, y0, zc);
  obra.por(mat, casa(bloco(Lc, H, Fc, 0, 0, 0)), parede, 0.12, 0.25);
  if (!tabua) obra.por("reboco", casa(bloco(Lc + 0.04, 0.5, Fc + 0.04, 0, 0, 0)), "#6e5a42", 0.1, 0.3);
  if (tabua) for (const u of aoLongo(Lc, Math.floor(Lc / 1.0), 0.3)) obra.por("madeira", casa(naFace(quad(0.08, H, 0, 0, 0.01), "frente", Lc, Fc, u, 0)), "#3e3024", 0.1, 0);
  // Porta e uma janela de tramela.
  const up = (r() - 0.5) * Math.max(0, Lc - 2.4);
  const naFrente = (g: THREE.BufferGeometry, u: number, y: number) => casa(naFace(g, "frente", Lc, Fc, u, y));
  obra.por("madeira", naFrente(bloco(0.95, Math.min(2.0, H - 0.3), 0.06, 0, 0, 0.03), up, 0), de(r, ["#4a3a2a", "#3a4a3a", "#5a3a2a", "#2f3f4a"]), 0.12, 0);
  const uj = up > 0 ? up - 1.7 : up + 1.7;
  if (Math.abs(uj) < Lc / 2 - 0.5 && H > 2.0) {
    obra.por("vidro", naFrente(quad(0.75, 0.75, 0, 0, 0.012), uj, 1.0), "#1e1a16", 0.04, 0);
    obra.por("madeira", naFrente(bloco(0.4, 0.75, 0.04, 0, 0, 0), uj - 0.6, 1.0), "#5a4a36", 0.1, 0);
  }
  // Telhado: duas águas (palha ou telha) ou uma água de zinco caindo para a frente.
  const beiral = 0.45;
  if (duas) {
    const alto = Math.min(Lc, Fc) * 0.35;
    const torto = (r() - 0.5) * 0.03;
    for (const g of telhado("duas-aguas", Lc, Fc, A, alto, beiral, cobre === "palha" ? 0.3 : 0.06)) t.por(matTeto, g.rotateZ(torto).translate(xc, 0, zc), corTeto, 0.14, 0);
    for (const s of [1, -1]) obra.por(mat, perfilExtrudado([[Fc / 2, 0], [0, alto], [-Fc / 2, 0]], A, Lc / 2, 0.01).rotateY((s * Math.PI) / 2).translate(xc, 0, zc), parede, 0.1, 0);
  } else {
    for (const g of telhado("uma-agua", Lc, Fc, topoParede, 0.7, beiral, 0.05)) t.por(matTeto, g.translate(xc, 0, zc), corTeto, 0.16, 0);
    obra.por(mat, casa(bloco(Lc, 0.7, 0.1, 0, H, -Fc / 2 + 0.05)), parede, 0.1, 0);
    if (cobre === "zinco") for (let i = 0; i < 3; i++) t.por("pedra", bloco(0.3, 0.2, 0.3, xc + (r() - 0.5) * Lc * 0.7, topoParede + 0.4, zc + (r() - 0.5) * Fc * 0.3), "#6a665e", 0.1, 0);
  }
  if (!palafita && r() < 0.35) chamine(obra, xc + Lc * 0.3, zc - Fc * 0.2, topoParede - 0.2, 1.2, "#6a5a4a");
  // Vida: barril e varal.
  if (!palafita && r() < 0.6) obra.por("madeira", cilindro(0.3, 0.3, 0.8, 6, r() < 0.5 ? -L / 2 + 0.4 : L / 2 - 0.4, 0, F / 2 + 0.4, true), "#5a3e26", 0.1, 0);
  if (!palafita && r() < 0.35) {
    for (const s of [-1, 1]) obra.por("madeira", bloco(0.06, 1.8, 0.06, (s * L) / 2, 0, F / 2 + 1.6), "#5a4632", 0.1, 0);
    obra.por("madeira", bloco(L, 0.02, 0.02, 0, 1.75, F / 2 + 1.6), "#3a3026", 0.04, 0);
    obra.por("lona", quad(0.8, 0.6, -L / 4, 1.12, F / 2 + 1.6), "#d9d0bc", 0.1, 0);
    obra.por("lona", quad(0.6, 0.7, L / 6, 1.03, F / 2 + 1.6), "#8a3a2a", 0.1, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, "casa") };
}

/** Casa operária geminada de tijolo (vila ao longo do trilho). */
function geminada(p: PredioLocal, r: R): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const caiada = r() < 0.4;
  const parede = caiada ? de(r, ["#e2d8c2", "#d8ccb0", "#cfc2a6"]) : de(r, TIJOLO);
  const mat: NomeMaterial = caiada ? "reboco" : "tijolo";
  obra.por(mat, bloco(L, A, F, 0, 0, 0), parede, 0.08, 0.25);
  obra.por("tijolo", bloco(L + 0.04, 0.55, F + 0.04, 0, 0, 0), "#6e3a2a", 0.08, 0.3);
  obra.por("tijolo", bloco(L + 0.16, 0.22, F + 0.16, 0, A - 0.22, 0), caiada ? "#8a4a34" : "#6e3a2a", 0.06, 0);
  const lado = r() < 0.5 ? -1 : 1;
  portaLeve(obra, "frente", L, F, lado * L * 0.22, 0.9, Math.min(2.1, A - 0.6), de(r, PORTA_COR), "#c9b08e", false, "tijolo");
  vao(obra, "frente", L, F, -lado * L * 0.2, 1.0, 0.85, Math.min(1.2, A - 1.6), { moldura: "#c9b08e", materialDaMoldura: "tijolo", veneziana: de(r, ESQUADRIA), sobreverga: "reta" });
  const alto = F * 0.3;
  for (const g of telhado("duas-aguas", L, F, A, alto, 0.35, 0.12)) t.por("telha", g, de(r, TELHA), 0.14, 0);
  for (const s of [1, -1]) obra.por(mat, perfilExtrudado([[F / 2, 0], [0, alto], [-F / 2, 0]], A, L / 2, 0.01).rotateY((s * Math.PI) / 2), parede, 0.08, 0);
  if (r() < 0.6) chamine(obra, lado * L * 0.35, -F * 0.15, A, alto + 0.5, "#6e3a2a");
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, "casa") };
}

/** Sítio na saída da cidade: casa de taipa caiada com alpendre e telha. */
function sitio(p: PredioLocal, r: R): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const cal = de(r, ["#e6dcc4", "#ddd0b2", "#d2c4a4"]);
  paredes(obra, L, F, A, "reboco", cal, p.entravel ? PORTA_DE_ENTRAR : undefined);
  rodape(obra, L, F, 0.6, "reboco", de(r, ["#6a4a34", "#4a5a46", "#7a5a3a"]), p.entravel ? PORTA_DE_ENTRAR.largura : 0);
  const prof = Math.min(2.4, F * 0.3);
  obra.por("madeira", bloco(L, 0.2, prof, 0, 0, F / 2 + prof / 2), "#6a5038", 0.1, 0.3);
  const esteios = aoLongo(L, Math.max(2, Math.round(L / 3)) | 1, 0.3);
  for (const u of esteios) if (!p.entravel || Math.abs(u) > PORTA_DE_ENTRAR.largura / 2 + 0.2) obra.por("madeira", bloco(0.2, A - 0.8, 0.2, u, 0.2, F / 2 + prof - 0.15), "#5a4028", 0.1, 0);
  for (const g of telhado("uma-agua", L, prof, A - 0.6, 0.6, 0.3, 0.1)) t.por("telha", g.translate(0, 0, F / 2 + prof / 2), "#9a5a40", 0.12, 0);
  if (p.entravel) porta(obra, "frente", L, F, 0, PORTA_DE_ENTRAR.largura, PORTA_DE_ENTRAR.altura, "#4e3826", true);
  else portaLeve(obra, "frente", L, F, 0, 1.0, Math.min(2.2, A - 0.6), "#4e3826", "#e6dcc4");
  for (const s of [-1, 1]) if (L > 7) vao(obra, "frente", L, F, s * L * 0.3, 1.0, 0.9, Math.min(1.2, A - 1.6), { veneziana: "#3f6a3e", moldura: "#efe9dc" });
  for (const g of telhado("quatro-aguas", L, F, A, Math.min(L, F) * 0.32, 0.6)) t.por("telha", g, de(r, TELHA), 0.12, 0);
  if (r() < 0.6) chamine(obra, L * 0.25, -F * 0.2, A, 1.8);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDe(p, "casa") };
}

/** Ruína de tijolo: paredes quebradas, vigas carbonizadas, entulho. */
function ruina(p: PredioLocal, r: R): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const e = 0.45;
  const cor = de(r, TIJOLO);
  const trecho = (w: number, d: number, x: number, z: number, frente = false) => {
    const partes = Math.max(1, Math.round(Math.max(w, d) / 2.2));
    for (let i = 0; i < partes; i++) {
      const k = i / partes - 0.5 + 0.5 / partes;
      const [bx, bz] = w > d ? [x + k * w, z] : [x, z + k * d];
      // Entrável: o meio da frente fica aberto para passar.
      if (frente && p.entravel && Math.abs(bx) < PORTA_DE_ENTRAR.largura / 2 + 0.6) continue;
      if (r() < 0.15) continue;
      const h = A * (0.2 + r() * 0.8);
      obra.por("tijolo", bloco(w > d ? w / partes : e, h, w > d ? e : d / partes, bx, 0, bz), cor, 0.15, 0.3);
    }
  };
  trecho(L, e, 0, F / 2 - e / 2, true);
  trecho(L, e, 0, -F / 2 + e / 2);
  trecho(e, F, -L / 2 + e / 2, 0);
  trecho(e, F, L / 2 - e / 2, 0);
  for (let i = 0; i < 3; i++) obra.por("madeira-escura", bloco(0.2, 0.2, F * 0.8, 0, 0, 0).rotateX((r() - 0.5) * 0.5).rotateY((r() - 0.5) * 0.6).translate((r() - 0.5) * L * 0.6, 0.4, 0), "#2a221c", 0.1, 0);
  for (let i = 0; i < 6; i++) obra.por("tijolo", bloco(0.6 + r(), 0.3 + r() * 0.5, 0.5 + r(), (r() - 0.5) * L * 0.7, 0, (r() - 0.5) * F * 0.7), cor, 0.18, 0);
  return { corpo: obra.pecas(), telhado: [], interior: interiorDe(p, "galpao") };
}

// ---------------------------------------------------------------- interiores

type Tipo = "casa" | "loja" | "saloon" | "hotel" | "banco" | "publico" | "hospital" | "quartel" | "igreja" | "templo" | "cha" | "galpao" | "mercado" | "fabrica" | "estacao" | "comando";

function semente(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

function interiorDe(p: PredioLocal, tipo: Tipo) {
  if (!p.entravel) return [];
  const { largura: L, fundo: F } = p;
  const o = new Obra(semente(p.id));
  const mov = "#5a3a22";
  const pedra = tipo === "banco" || tipo === "publico" || tipo === "estacao" || tipo === "hospital";
  const chao = tipo === "galpao" || tipo === "fabrica" || tipo === "mercado" || tipo === "comando";
  const piso = chao ? "#6e6656" : tipo === "templo" || tipo === "cha" ? "#8a6a48" : pedra ? "#c9c0ac" : "#9a7a52";
  o.por(pedra ? "cantaria" : "madeira", bloco(L - 0.8, 0.08, F - 0.8, 0, 0.02, 0), piso, 0.06, 0);
  const fundo = -F / 2 + 1.2;
  const mesa = (x: number, z: number, cor = mov) => {
    o.por("madeira", bloco(1.2, 0.76, 0.8, x, 0, z), cor, 0.08, 0);
    for (const s of [-1, 1]) o.por("madeira", bloco(0.45, 0.45, 0.45, x + s * 0.9, 0, z), cor, 0.08, 0);
  };
  const grade = (largura: number, z: number, h: number) => {
    const n = Math.floor(largura / 0.18);
    for (let i = 0; i <= n; i++) o.por("ferro", bloco(0.03, h, 0.03, -largura / 2 + i * (largura / n), 1.05, z), FERRO, 0.02, 0);
  };
  const rr = sorteio(semente(p.id) + 7);
  switch (tipo) {
    case "loja":
    case "cha":
      o.por("madeira", bloco(L * 0.55, 1.0, 0.7, 0, 0, fundo + 1.2), mov, 0.08, 0);
      o.por("madeira", bloco(L - 1.2, 2.2, 0.45, 0, 0, -F / 2 + 0.65), "#4a3020", 0.08, 0);
      for (let i = 0; i < 6; i++) o.por("lona", bloco(0.5, 0.35, 0.3, -L / 2 + 1.2 + i * ((L - 2.4) / 5), 1.2, -F / 2 + 0.7), de(rr, ["#b8862a", "#6a8a3a", "#a83a2a", "#d9c08a", "#3f5a6a"]), 0.1, 0);
      if (tipo === "cha") for (const x of [-L / 4, L / 4]) o.por("madeira", bloco(1.4, 0.35, 1.4, x, 0, F * 0.1), "#4a2a1e", 0.08, 0);
      else for (const x of [-L / 2 + 1.2, L / 2 - 1.2]) o.por("madeira", cilindro(0.35, 0.35, 0.9, 7, x, 0, F * 0.15, true), "#5a3e26", 0.1, 0);
      break;
    case "saloon":
      o.por("madeira", bloco(L * 0.7, 1.1, 0.75, 0, 0, fundo + 0.8), "#4a2a18", 0.08, 0);
      o.por("madeira", bloco(L * 0.7, 2.2, 0.35, 0, 0, -F / 2 + 0.6), "#3a2416", 0.08, 0);
      for (const [x, z] of [[-0.25, 0.1], [0.25, 0.1], [-0.25, 0.32], [0.25, 0.32]]) mesa(L * x, F * z);
      o.por("madeira", bloco(1.6, 1.3, 0.7, -L / 2 + 1.3, 0, F * 0.05), "#1e1612", 0.06, 0);
      break;
    case "hotel":
      o.por("madeira", bloco(L * 0.35, 1.05, 0.7, L * 0.2, 0, fundo + 1.0), mov, 0.08, 0);
      for (let i = 0; i < 8; i++) o.por("madeira", bloco(1.6, 0.2 + i * 0.4, 0.4, -L / 2 + 1.4, 0, fundo + 0.4 + i * 0.4), "#4a3020", 0.08, 0);
      for (const x of [-L * 0.15, L * 0.15]) o.por("lona", bloco(1.0, 0.8, 0.9, x, 0, F * 0.15), "#6a2a24", 0.08, 0);
      break;
    case "banco":
      o.por("madeira", bloco(L * 0.7, 1.05, 0.6, 0, 0, fundo + 2.0), mov, 0.08, 0);
      grade(L * 0.7, fundo + 2.0, 1.1);
      o.por("ferro", bloco(1.6, 2.0, 1.2, L * 0.3, 0, fundo), "#2a2c2a", 0.04, 0);
      o.por("ferro", cilindro(0.3, 0.3, 0.06, 8, L * 0.3, 1.0, fundo + 0.62), "#8a7a4a", 0.04, 0);
      for (const x of [-L * 0.25, 0, L * 0.25]) o.por("madeira", bloco(2.0, 0.45, 0.5, x, 0, F * 0.2), mov, 0.08, 0);
      break;
    case "publico":
    case "estacao":
      o.por("madeira", bloco(L * 0.4, 1.1, 0.8, 0, 0, fundo + 0.8), mov, 0.08, 0);
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) o.por("madeira", bloco(L * 0.25, 0.45, 0.5, s * L * 0.2, 0, F * 0.25 - i * 1.6), mov, 0.08, 0);
      if (tipo === "estacao") grade(L * 0.4, fundo + 0.8, 1.0);
      break;
    case "hospital":
      for (let i = 0; i < Math.max(2, Math.floor((L - 2) / 2.2)); i++) {
        for (const z of [fundo + 0.6, F * 0.2]) {
          const x = -L / 2 + 1.6 + i * 2.2;
          if (z > 0 && Math.abs(x) < 2.4) continue;
          o.por("ferro", bloco(0.9, 0.55, 1.9, x, 0, z), "#e8e4da", 0.04, 0);
          o.por("lona", bloco(0.8, 0.12, 0.5, x, 0.55, z - 0.6), "#f4f0e8", 0.03, 0);
        }
      }
      break;
    case "quartel":
      mesa(-L * 0.2, F * 0.15);
      mesa(L * 0.2, F * 0.15);
      o.por("madeira", bloco(L * 0.3, 1.9, 0.5, -L * 0.2, 0, fundo), "#3a2a1c", 0.08, 0);
      for (let i = 0; i < 6; i++) o.por("ferro", bloco(0.08, 1.2, 0.08, -L * 0.3 + i * 0.4, 0.4, fundo + 0.3), "#2a2622", 0.04, 0);
      grade(L * 0.3, fundo + 1.8, 1.4);
      break;
    case "igreja":
      for (let i = 0; i < Math.floor(F / 2.4) - 2; i++) for (const s of [-1, 1]) o.por("madeira", bloco(L * 0.3, 0.5, 0.45, s * L * 0.22, 0, F / 2 - 3 - i * 2.2), mov, 0.08, 0);
      o.por("reboco", bloco(L * 0.4, 1.3, 1.2, 0, 0, fundo), "#efe6cf", 0.04, 0);
      o.por("reboco", bloco(L * 0.25, 3.0, 0.4, 0, 1.3, fundo - 0.4), "#c9a868", 0.04, 0);
      break;
    case "templo":
      o.por("madeira", bloco(L * 0.4, 1.0, 1.4, 0, 0, fundo + 0.4), "#8a2a20", 0.06, 0);
      o.por("ferro", cilindro(0.35, 0.3, 0.6, 8, 0, 0, fundo + 2.2), "#6a5a2a", 0.06, 0);
      for (let i = 0; i < 6; i++) o.por("lona", bloco(0.6, 0.15, 0.6, -L * 0.25 + (i % 3) * L * 0.25, 0, F * 0.05 + Math.floor(i / 3) * 1.4), "#a8362a", 0.06, 0);
      break;
    case "casa":
      mesa(0, 0);
      o.por("madeira", bloco(1.8, 0.5, 0.9, -L / 2 + 1.4, 0, fundo + 0.4), "#6a5a44", 0.08, 0);
      break;
    default: {
      // Galpão, mercado, fábrica, comando: carga, máquinas ou bancas, com corredor livre na porta.
      const n = Math.max(3, Math.floor((L * F) / 30));
      for (let i = 0; i < n; i++) {
        const x = (rr() - 0.5) * (L - 3);
        const z = (rr() - 0.5) * (F - 4) - 0.5;
        if (Math.abs(x) < 2.6 && z > -F * 0.2) continue;
        if (tipo === "fabrica") o.por("ferro", bloco(1.4 + rr(), 1.2 + rr(), 1.0 + rr(), x, 0, z), "#3a3836", 0.06, 0);
        else if (rr() < 0.4) o.por("madeira", cilindro(0.35, 0.35, 0.9, 7, x, 0, z, true), "#5a3e26", 0.1, 0);
        else o.por("madeira", bloco(0.9 + rr() * 0.4, 0.7 + rr() * 0.5, 0.9, x, 0, z), "#7a5a3a", 0.1, 0);
      }
      if (tipo === "comando") {
        mesa(-L * 0.18, -F * 0.12, "#3a2a1c");
        o.por("madeira", bloco(2.2, 1.9, 0.5, L / 2 - 1.6, 0, fundo), "#2e241c", 0.06, 0);
        o.por("vidro", bloco(0.2, 0.3, 0.2, -L * 0.18, 0.76, -F * 0.12), "#d9a347", 0.04, 0);
      }
      if (tipo === "mercado") for (let i = 0; i < 4; i++) for (const s of [-1, 1]) o.por("madeira", bloco(3.0, 0.9, 1.0, s * L * 0.22, 0, F * 0.25 - i * (F / 5)), "#6a4a30", 0.08, 0);
    }
  }
  return o.pecas();
}

// ---------------------------------------------------------------- longe (nível 1)

/** Nível 1: volume, telhado e cor, com o ritmo das janelas em faixas escuras. */
function longe(p: PredioLocal, r: R, b: Bairro): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(semear(r));
  const t = new Obra(semear(r));
  const janelas = (pav: number, y0: number, alto: number) => {
    const nv = Math.max(1, Math.round(L / 3.2));
    for (let k = 0; k < pav; k++) {
      for (let i = 0; i < nv; i++) obra.por("vidro", quad(Math.min(1.1, L / nv - 0.8), alto, -L / 2 + (i + 0.5) * (L / nv), y0 + k * (A / pav), F / 2 + 0.02), "#2a3034", 0.04, 0);
    }
  };
  if (b === "oriental") {
    const c = paletaOriental(r);
    obra.por("reboco", bloco(L, A, F, 0, 0, 0), c.parede);
    obra.por("cantaria", bloco(L + 0.06, 0.45, F + 0.06, 0, 0, 0), "#8a8478", 0.04, 0);
    obra.por("madeira-escura", bloco(L + 0.08, 0.24, F + 0.08, 0, A - 0.24, 0), c.madeira, 0.04, 0);
    telhadoOriental(t, L, F, A, Math.min(L, F) * 0.32 + 0.4, 1.0, 0.85, c.telha, 1);
    if (A >= 5 && L >= 8) t.por("telha-escura", cobertura([{ hx: L / 2 + 0.9, hz: F / 2 + 0.9, y: A * 0.56, levanta: 0.4 }, { hx: L / 2, hz: F / 2, y: A * 0.56 + 0.8 }], false, false), c.telha, 0.06, 0);
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  if (b === "periferia" || b === "palafita" || b === "vila" || b === "sitio" || p.tipo === "ruina") {
    const y0 = b === "palafita" ? 1.3 : 0;
    const tij = b === "vila";
    const parede = tij ? de(r, TIJOLO) : b === "palafita" ? "#6a5038" : de(r, ["#a88a62", "#9a7c58", "#b39a74", "#6a5038", "#d2c2a0"]);
    if (y0) obra.por("madeira-escura", bloco(L * 0.9, y0, F * 0.9, 0, 0, 0), "#2e2620", 0.04, 0);
    if (p.tipo === "ruina") {
      obra.por("tijolo", bloco(L, A * 0.5, F, 0, 0, 0), de(r, TIJOLO), 0.1);
      return { corpo: obra.pecas(), telhado: [], interior: [] };
    }
    obra.por(tij ? "tijolo" : "reboco", bloco(L, A - y0, F, 0, y0, 0), parede, 0.1);
    const tipoT = b === "vila" ? "duas-aguas" : b === "sitio" ? "quatro-aguas" : "uma-agua";
    const telhaBoa = b === "vila" || b === "sitio";
    const cor = telhaBoa ? de(r, TELHA) : de(r, [...ZINCO, "#9a8458"]);
    for (const g of telhado(tipoT, L, F, A, tipoT === "uma-agua" ? 0.7 : Math.min(L, F) * 0.3, 0.4, 0.1).slice(0, 1)) t.por(telhaBoa ? "telha" : "ferro", g, cor, 0.14, 0);
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  if (p.tipo === "galpao" || p.tipo === "fabrica" || p.tipo === "estacao" || p.tipo === "moinho" || p.tipo === "torre" || b === "cais" || b === "industrial") {
    const ferro = b === "cais" && r() < 0.3;
    const cor = ferro ? de(r, ZINCO) : de(r, TIJOLO);
    obra.por(ferro ? "ferro" : "tijolo", bloco(L, A, F, 0, 0, 0), cor);
    obra.por("tijolo", bloco(L + 0.3, 0.35, F + 0.3, 0, A - 0.35, 0), cor, 0.06, 0);
    if (p.tipo === "fabrica") {
      const alto = F * 0.22;
      for (const g of telhado("duas-aguas", L, F, A, alto, 0.4, 0.1).slice(0, 1)) t.por("telha-escura", g, "#5e5048", 0.1, 0);
      obra.por("tijolo", cilindro(1.15, 0.72, Math.min(A * 2.4, 36), 8, L / 2 - 2.2, 0, -F / 2 + 2.2), "#7e4230", 0.06, 0);
      janelas(A >= 10 ? 2 : 1, 1.1, 1.8);
    } else if (ferro) {
      const fl = Math.min(L * 0.22, 6.5);
      t.por("ferro", abobada(L, F, A, fl, 0.5, 5), cor, 0.08, 0);
      obra.por("vidro", timpano(L, A, fl, F / 2, 5), "#3a4246", 0.04, 0);
      obra.por("ferro", timpano(L, A, fl, -F / 2, 5, true), cor, 0.04, 0);
    } else if (L <= F * 1.6) {
      const alto = L * 0.26;
      for (const g of telhado("duas-aguas", F, L, A, alto, 0.4, 0.1).slice(0, 1)) t.por("telha-escura", g.rotateY(Math.PI / 2), "#6a4a3c", 0.12, 0);
      obra.por("tijolo", triangulo(L, alto, 0, A, F / 2), cor, 0.06, 0);
      obra.por("tijolo", triangulo(L, alto, 0, A, F / 2).rotateY(Math.PI), cor, 0.06, 0);
      obra.por("madeira-escura", quad(Math.min(3.4, L * 0.3), Math.min(4, A - 1.6), 0, 0, F / 2 + 0.02), "#33291f", 0.06, 0);
    } else {
      for (const g of telhado("duas-aguas", L, F, A, F * 0.24, 0.4, 0.1).slice(0, 1)) t.por("telha-escura", g, "#6a4a3c", 0.12, 0);
      obra.por("tijolo", triangulo(F, F * 0.24, 0, A, L / 2).rotateY(Math.PI / 2), cor, 0.06, 0);
      obra.por("tijolo", triangulo(F, F * 0.24, 0, A, L / 2).rotateY(-Math.PI / 2), cor, 0.06, 0);
      janelas(1, 0.2, Math.min(4, A - 1.6));
    }
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  if (p.tipo === "igreja") {
    obra.por("reboco", bloco(L, A, F, 0, 0, 0), "#efe8da");
    for (const s of [0, Math.PI]) obra.por("reboco", triangulo(L, L * 0.36, 0, A, F / 2).rotateY(s), "#efe8da");
    for (const g of telhado("duas-aguas", F, L, A, L * 0.36, 0.4).slice(0, 1)) t.por("telha", g.rotateY(Math.PI / 2), "#9c4f36", 0.1, 0);
    const lado = Math.max(3, Math.min(5.5, L * 0.26));
    const ht = A + L * 0.36 * 0.6 + lado;
    for (const s of [-1, 1]) {
      obra.por("reboco", bloco(lado, ht, lado, s * (L / 2 - lado / 2), 0, F / 2 - lado / 2), "#efe8da");
      t.por("telha-escura", cupula(lado * 0.44, s * (L / 2 - lado / 2), ht, F / 2 - lado / 2, 6, 2, 1.35), "#4f6a66", 0.06, 0);
    }
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  // Sobrado eclético (centro, porto, alto): corpo, rodapé, cornija, platibanda e telhado baixo.
  const c = paleta(r, b);
  const pav = A >= 9.6 ? Math.round(A / 3.9) : A >= 5.8 ? 2 : 1;
  obra.por("reboco", bloco(L, A, F, 0, 0, 0), c.parede);
  obra.por("cantaria", bloco(L + 0.06, 0.8, F + 0.06, 0, 0, 0), b === "porto" ? c.barra : c.base, 0.04, 0);
  obra.por("reboco", bloco(L + 0.4, 0.3, F + 0.4, 0, A - 0.3, 0), c.ornato, 0.04, 0);
  janelas(pav, 1.2, Math.min(2.0, A / pav - 1.5));
  if (b === "porto" && r() < 0.55) {
    for (const g of telhado("quatro-aguas", L, F, A, Math.min(L, F) * 0.27, 0.6, 0.1).slice(0, 1)) t.por("telha", g, c.telha, 0.12, 0);
  } else if (b === "alto" && r() < 0.5) {
    t.por("telha-escura", cobertura([{ hx: L / 2 + 0.2, hz: F / 2 + 0.2, y: A }, { hx: L / 2 - 0.8, hz: F / 2 - 0.8, y: A + 2.2 }, { hx: Math.max(0.3, L / 2 - 2), hz: Math.max(0.3, F / 2 - 2), y: A + 2.9 }], true, false), de(r, ARDOSIA), 0.08, 0);
  } else {
    const hp = 1.1;
    obra.por("reboco", bloco(L, hp, 0.3, 0, A, F / 2 - 0.15), c.parede, 0.04, 0);
    obra.por("reboco", bloco(L, hp, 0.3, 0, A, -F / 2 + 0.15), c.parede, 0.04, 0);
    obra.por("reboco", bloco(L + 0.12, 0.12, 0.42, 0, A + hp, F / 2 - 0.15), c.ornato, 0.04, 0);
    for (const g of telhado("quatro-aguas", L - 0.5, F - 0.5, A + 0.08, Math.min(L, F) * 0.17, 0, 0.1).slice(0, 1)) t.por("telha", g, c.telha, 0.12, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

// ---------------------------------------------------------------- despacho

export function gerarPorto(p: PredioLocal, nivel: NivelPredio, sem: number): PecasDoPredio {
  const r = sorteio(sem);
  const b = bairroDe(p, r);
  if (nivel === 1 && !p.entravel) return longe(p, r, b);
  const can = canonico(p, r, b);
  if (can) return can;
  if (p.tipo === "ruina") return ruina(p, r);
  if (b === "oriental") {
    if (p.tipo === "igreja") return casaOriental(p, r, { templo: true });
    if (p.tipo === "tenda") return tenda(p, r, b);
    if (p.tipo === "comercio" || p.tipo === "saloon" || p.tipo === "hotel") return casaOriental(p, r, { loja: true, cha: p.id.startsWith("casa-de-cha") || p.tipo === "saloon" });
    if (p.tipo === "galpao" || p.tipo === "fabrica") return armazem(p, r, b, { madeira: r() < 0.5 });
    if (p.tipo === "casa") return casaOriental(p, r, { loja: r() < 0.3 });
  }
  if (b === "palafita" && p.tipo === "casa") return casebre(p, r, true);
  if (b === "periferia" && p.tipo === "casa") return casebre(p, r, false);
  if (b === "vila" && p.tipo === "casa") return geminada(p, r);
  switch (p.tipo) {
    case "igreja":
      return igreja(p, r);
    case "publico":
      return palacio(p, r, b, { cobertura: r() < 0.5 ? "balaustrada" : "platibanda", frontao: de(r, ["triangulo", "curvo", "atico"] as const), sacadas: "individual", bossagem: r() < 0.5, mastro: r() < 0.4 }, "publico");
    case "banco":
      return palacio(p, r, b, { cobertura: "balaustrada", frontao: null, bossagem: true, grade: true, sacadas: "nenhuma", janela: "triangulo", portico: { colunas: 4, colossal: false } }, "banco");
    case "hotel":
      return sobrado(p, r, b, { cobertura: r() < 0.4 ? "mansarda" : "balaustrada", sacadas: "individual", letreiro: de(r, LETREIRO), loja: true, modesto: b === "porto", toldos: b === "porto" }, "hotel");
    case "saloon":
      return sobrado(p, r, b, { loja: true, letreiro: de(r, LETREIRO), sacadas: "corrida", toldos: b === "porto", modesto: b === "porto", cobertura: b === "porto" ? "beiral" : "platibanda" }, "saloon");
    case "estacao":
      return estacao(p, r);
    case "galpao":
      if (b === "periferia" || b === "palafita" || b === "sitio") return armazem(p, r, b, { madeira: true, guincho: false });
      return armazem(p, r, b, { ferro: b === "cais" && r() < 0.3, madeira: b !== "industrial" && r() < 0.12, portas: p.id.startsWith("garagem") ? 4 : p.id.startsWith("oficina") ? 3 : undefined });
    case "fabrica":
      return fabrica(p, r);
    case "fazenda":
      return sitio(p, r);
    case "moinho":
      return cataVento(p, r);
    case "torre":
      return farol(p, r);
    case "tenda":
      return tenda(p, r, b);
    case "casa":
      if (b === "alto") return palacete(p, r);
      if (b === "porto" || b === "cais") return sobradoDoPorto(p, r);
      if (b === "sitio") return sitio(p, r);
      if (b === "industrial") return geminada(p, r);
      return sobradoDoCentro(p, r, b);
    default:
      if (b === "porto" || b === "cais" || b === "industrial") return sobradoDoPorto(p, r);
      if (b === "periferia" || b === "palafita" || b === "vila") return casebre(p, r, b === "palafita");
      return sobradoDoCentro(p, r, b);
  }
}

const estilo: Estilo = { id: "porto", nome: "Porto industrial e Cidade-Oriental (Belo Horizonte)", gerar: gerarPorto };

export default estilo;
