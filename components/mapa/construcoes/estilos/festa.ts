// Festa e lama (Bom Fim, 1880): cidade de chuva, feira e turismo. Fachadas em cores vivas
// já desbotadas pela chuva (ocre, rosa, anil, verde-água, laranja-terra, lilás), barra de lama
// subindo pelo pé das paredes, beiral largo de duas águas com cachorros e lambrequim recortado,
// sobrados com balcão corrido de tábua, passarelas de madeira sobre a lama, toldos listrados,
// barracas de feira, lampiões e cordões de bandeirinhas. Igreja amarela de torre com cúpula,
// coreto na praça. Canônicos com desenho próprio: Salão Bom de Gole, Hotel Versailles,
// Sede do Conselho de Hoteleiros, Universidade (em obras), Delegacia e Estátua de Ismael.

import * as THREE from "three";
import { sorteio } from "../../natureza/ferramentas";
import { aoLongo, bloco, chamine, empenas, interiorBasico, malha, naFace, Obra, paredes, placa, porta, telhado, type Face } from "../kit";
import type { Estilo, NivelPredio, PecasDoPredio, PredioLocal } from "../tipos";
import {
  arandela,
  balaustrada,
  balcaoCorrido,
  bandeirinhas,
  barraca,
  barril,
  cachorros,
  faixa,
  guardaCorpo,
  janelaFesta,
  lambrequim,
  lampiaoPendurado,
  lucarna,
  mansarda,
  passarela,
  poste,
  quad,
  sacadaLeve,
  toldoListrado,
  v,
} from "./_festa-pecas";

type Cor = THREE.ColorRepresentation;

// Cores vivas desbotadas pela chuva, cada uma com as venezianas que combinam com ela.
const FACHADAS: { cor: string; venezianas: string[] }[] = [
  { cor: "#d6ac55", venezianas: ["#2f6a8c", "#2f6650", "#8a2e28"] }, // ocre-amarelo
  { cor: "#cd8f80", venezianas: ["#2f6650", "#2f5a86", "#e2d6b8"] }, // rosa desbotado
  { cor: "#7fa2b6", venezianas: ["#c8962e", "#8a2e28", "#e2d6b8"] }, // anil lavado
  { cor: "#8fb293", venezianas: ["#8a2e28", "#5a3d78", "#2f5a86"] }, // verde-água
  { cor: "#cf8752", venezianas: ["#2f6650", "#2f5a86", "#e2d6b8"] }, // laranja-terra
  { cor: "#a995b6", venezianas: ["#c8962e", "#2f6650", "#e2d6b8"] }, // lilás
  { cor: "#b95b4c", venezianas: ["#c8962e", "#2f6650", "#e2d6b8"] }, // vermelho colonial
  { cor: "#dcc57e", venezianas: ["#2f5a86", "#8a2e28", "#2f6650"] }, // amarelo-palha
  { cor: "#6f9c98", venezianas: ["#c8962e", "#8a2e28", "#e2d6b8"] }, // turquesa
];
const PORTAS = ["#3e5a3a", "#2c4a6a", "#6a2a24", "#4e3826", "#7a5a22"];
const TELHAS = ["#a6573b", "#9a4d36", "#b0633f", "#8f4a37", "#84503e"];
const LONAS = ["#b8453a", "#d4a33a", "#3f74a3", "#4d8a5a", "#c26a8f", "#d0782f"];
const TABUAS = ["#a8503e", "#b8894a", "#6f8f86", "#8a6a8a", "#9a6a3e"];
const CAL = "#ece3cf";
const LAMA = "#5c4430";
const FLORES = ["#b8343a", "#d6a12e", "#c45a9a", "#4f8a3e"];

type Paleta = { fachada: string; barrado: string; trim: string; veneziana: string; porta: string; telha: string; lona: string; madeira: string };

function escurecer(cor: string, k: number) {
  return "#" + new THREE.Color(cor).multiplyScalar(k).getHexString();
}

function paletaFesta(r: () => number): Paleta {
  const de = <T>(l: T[]) => l[Math.floor(r() * l.length)];
  const f = de(FACHADAS);
  return {
    fachada: f.cor,
    barrado: escurecer(f.cor, 0.62),
    trim: r() < 0.8 ? CAL : "#e6cf9a",
    veneziana: de(f.venezianas),
    porta: de(PORTAS),
    telha: de(TELHAS),
    lona: de(LONAS),
    madeira: r() < 0.5 ? "#6a4a30" : "#5a3e28",
  };
}

const PAV = 3.6;
const ENTRAR = { largura: 4.2, altura: 3 };
const ESP = 0.18;

/** Paredes coloridas com barrado, lama subindo pelo pé, cunhais e cimalha em cal. */
function corpoColorido(obra: Obra, p: PredioLocal, cor: Paleta, r: () => number, pavimentos: number) {
  const { largura: L, fundo: F, altura: A, entravel } = p;
  paredes(obra, L, F, A, "reboco", cor.fachada, entravel ? ENTRAR : undefined);
  const vao = entravel ? ENTRAR.largura + 0.3 : 0;
  if (entravel) {
    faixa(obra, L, F, 0, 0.85, "reboco", cor.barrado, 0.03, vao, 0.08, 0.2);
    faixa(obra, L, F, 0, 0.35 + r() * 0.2, "terra", LAMA, 0.06, vao, 0.18, 0.3);
    faixa(obra, L, F, A - 0.28, 0.28, "reboco", cor.trim, 0.1, 0, 0.04, 0);
  } else {
    obra.por("reboco", bloco(L + 0.06, 0.85, F + 0.06, 0, 0, 0), cor.barrado, 0.08, 0.2);
    obra.por("terra", bloco(L + 0.12, 0.35 + r() * 0.25, F + 0.12, 0, 0, 0), LAMA, 0.18, 0.3);
    obra.por("reboco", bloco(L + 0.2, 0.28, F + 0.2, 0, A - 0.28, 0), cor.trim, 0.04, 0);
  }
  for (let andar = 1; andar < pavimentos; andar++) faixa(obra, L, F, andar * PAV - 0.1, 0.2, "reboco", cor.trim, 0.06);
  const c = 0.32;
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    obra.por("reboco", bloco(c, A - 0.85, c, x * (L / 2 - c / 2 + 0.03), 0.85, z * (F / 2 - c / 2 + 0.03)), cor.trim, 0.05, 0);
  }
}

/** Telhado de duas águas com beiral largo; empenas da cor da casa; cachorros e lambrequim. */
function telhadoLargo(obra: Obra, t: Obra, L: number, F: number, A: number, cor: Paleta, r: () => number, o: { beiral: number; alto?: number; lambrequim?: boolean; cachorros?: boolean; material?: "telha" | "telha-escura" }) {
  const alto = o.alto ?? F * (0.24 + r() * 0.08);
  for (const g of telhado("duas-aguas", L, F, A, alto, o.beiral, ESP)) t.por(o.material ?? "telha", g, cor.telha, 0.14, 0);
  for (const g of empenas(L, F, A, alto)) obra.por("reboco", g, cor.fachada, 0.08, 0);
  const inclinacao = alto / (F / 2 + o.beiral);
  if (o.cachorros !== false) cachorros(obra, "frente", L, F, L, A + inclinacao * o.beiral - ESP, o.beiral, inclinacao, cor.madeira);
  if (o.lambrequim) lambrequim(obra, "frente", L, F, L + o.beiral * 2, A - ESP + 0.02, o.beiral - 0.04);
  return alto;
}

/** Janelas espalhadas nas laterais e nos fundos (a vida da casa é para a rua). */
function janelasDosLados(obra: Obra, p: PredioLocal, cor: Paleta, r: () => number, pavimentos: number, grade = false) {
  const { largura: L, fundo: F } = p;
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
    const comp = f === "fundos" ? L : F;
    const n = Math.max(0, Math.floor((comp - 2) / 4.2));
    for (const u of aoLongo(comp, n, 1.8)) {
      for (let andar = 0; andar < pavimentos; andar++) {
        if (r() < 0.3) continue;
        janelaFesta(obra, f, L, F, u, 1.05 + andar * PAV, 0.9, 1.4, { moldura: cor.trim, veneziana: cor.veneziana, grade });
      }
    }
  }
}

/** Vãos da fachada: posições e qual é a porta. `centro` põe a porta no meio (entrável e prédios formais). */
function vaosDaFrente(L: number, centro: boolean, r: () => number, passo = 2.3) {
  const n = Math.max(2, Math.floor((L - 1.2) / passo));
  let pos = aoLongo(L, n, 1.25);
  if (centro) pos = [0, ...pos.filter((u) => Math.abs(u) > ENTRAR.largura / 2 + 0.85)];
  const iPorta = centro ? 0 : n <= 2 ? Math.floor(r() * n) : 1 + Math.floor(r() * (n - 2));
  return { pos, iPorta };
}

function interiorFesta(p: PredioLocal, extra?: (o: Obra) => void) {
  if (!p.entravel) return [];
  const obra = new Obra(3);
  interiorBasico(obra, p.largura, p.fundo, { piso: "#94744e", madeira: "#5a3a22" });
  extra?.(obra);
  return obra.pecas();
}

// ───────────────────────────── casa, sobrado e loja ─────────────────────────────

type OpcoesCasa = { loja?: boolean; letreiro?: Cor };

function casa(p: PredioLocal, r: () => number, cor: Paleta, o: OpcoesCasa = {}): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const pavimentos = A >= 6.4 ? Math.max(2, Math.floor(A / PAV)) : 1;
  const obra = new Obra(Math.floor(r() * 1e6));
  const t = new Obra(7);
  corpoColorido(obra, p, cor, r, pavimentos);
  const floreira = r() < 0.35 ? FLORES[Math.floor(r() * FLORES.length)] : undefined;
  const { pos, iPorta } = vaosDaFrente(L, p.entravel, r);
  pos.forEach((u, i) => {
    if (i === iPorta) porta(obra, "frente", L, F, u, p.entravel ? ENTRAR.largura : o.loja ? 1.8 : 1.15, p.entravel ? ENTRAR.altura : 2.5, cor.porta, p.entravel, cor.trim);
    else if (o.loja) janelaFesta(obra, "frente", L, F, u, 0.6, 1.5, 2.0, { moldura: cor.porta, materialDaMoldura: "madeira" });
    else janelaFesta(obra, "frente", L, F, u, 1.05, 1.0, 1.5, { moldura: cor.trim, veneziana: cor.veneziana, floreira });
  });
  const balcao = pavimentos >= 2 && r() < 0.8;
  for (let andar = 1; andar < pavimentos; andar++) {
    const y = andar * PAV + 0.15;
    for (const u of aoLongo(L, Math.max(2, Math.floor((L - 1.2) / 2.3)), 1.25)) {
      if (balcao) janelaFesta(obra, "frente", L, F, u, y, 1.0, 2.15, { moldura: cor.trim, veneziana: cor.veneziana, vidro: "#3a3226" });
      else {
        sacadaLeve(obra, "frente", L, F, u, y - 0.05, 1.5, "#2c2a28");
        janelaFesta(obra, "frente", L, F, u, y, 1.0, 2.05, { moldura: cor.trim, veneziana: cor.veneziana });
      }
    }
    if (balcao) balcaoCorrido(obra, "frente", L, F, L - 0.4, andar * PAV + 0.05, 1.05, cor.madeira);
  }
  janelasDosLados(obra, p, cor, r, pavimentos);
  const beiral = balcao ? 1.3 : 0.85 + r() * 0.35;
  const alto = telhadoLargo(obra, t, L, F, A, cor, r, { beiral, lambrequim: r() < 0.45 });
  if (r() < 0.45) chamine(obra, (r() - 0.5) * L * 0.6, -F * 0.22, A, alto * 0.7 + 0.8, "#8a6450");
  // A vida na frente: lampião, barril de chuva, banco, bandeirinhas.
  const lado = r() < 0.5 ? -1 : 1;
  const uPorta = pos[iPorta];
  if (r() < 0.5 && !o.loja) barril(obra, lado * (L / 2 - 0.45), F / 2 + 0.45, 0.34, 0.85, "#5e4630");
  if (r() < 0.55) {
    if (p.entravel) arandela(obra, "frente", L, F, 0, ENTRAR.altura + 0.75);
    else {
      const ua = uPorta + (uPorta > 0 ? -1 : 1) * 1.0;
      if (!pos.some((u, i) => i !== iPorta && Math.abs(u - ua) < 0.95)) arandela(obra, "frente", L, F, ua, 2.85);
    }
  }
  if (!o.loja && !p.entravel && r() < 0.35) obra.por("madeira", bloco(1.4, 0.45, 0.4, uPorta + (uPorta > 0 ? -1.6 : 1.6), 0, F / 2 + 0.3), cor.madeira, 0.1, 0.2);
  if (r() < (o.loja ? 0.6 : 0.3)) bandeirinhas(obra, v(-L / 2 - 0.2, A - 0.42, F / 2 + beiral - 0.2), v(L / 2 + 0.2, A - 0.42, F / 2 + beiral - 0.2), r, 0.45);
  if (r() < 0.18) poste(obra, -lado * (L / 2 - 0.3), F / 2 + 2.2);
  if (o.loja) {
    passarela(obra, L, F, 1.6, cor.madeira);
    toldoListrado(obra, "frente", L, F, 0, 2.75, Math.min(L - 0.8, 7.5), 1.3, cor.lona);
    if (A >= 4.6 || pavimentos > 1) placa(obra, "frente", L, F, 0, pavimentos > 1 ? PAV - 0.75 : Math.min(A - 1.1, 3.55), Math.min(L * 0.6, 5), 0.6, o.letreiro ?? "#e2d2a8");
    if (r() < 0.6 && L >= 8) barraca(obra, (r() < 0.5 ? -1 : 1) * (L / 2 - 1.3), F / 2 + 2.25, 2.2, 1.3, LONAS[Math.floor(r() * LONAS.length)], r, 2.3);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorFesta(p) };
}

// ───────────────────────────── saloon ─────────────────────────────

/** Saloon festivo: platibanda recortada, alpendre de tábua, lampiões, bandeirinhas e barris. */
function saloon(p: PredioLocal, r: () => number, cor: Paleta, grande = false): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(Math.floor(r() * 1e6));
  const t = new Obra(8);
  if (grande) Object.assign(cor, { fachada: "#b4483c", barrado: "#6e2c25", trim: "#dcb050", veneziana: "#2f6650", porta: "#3e5a3a" });
  corpoColorido(obra, p, cor, r, 1);
  const alto = telhadoLargo(obra, t, L, F, A, cor, r, { beiral: 0.7, alto: F * 0.17, cachorros: false });
  // Platibanda: falsa fachada que esconde o telhado, com degrau no meio (arco no Bom de Gole).
  const topo = A + alto * 0.9;
  obra.por("reboco", bloco(L, topo - A + 0.1, 0.3, 0, A - 0.1, F / 2 - 0.15), cor.fachada, 0.08, 0);
  obra.por("reboco", bloco(L + 0.3, 0.22, 0.45, 0, topo, F / 2 - 0.1), cor.trim, 0.04, 0);
  const hPlaca = Math.min(1.1, topo - A - 0.4);
  if (grande) {
    const raio = L * 0.2;
    const pts = [v(0, topo + 0.2, F / 2)];
    const idx: number[] = [];
    for (let i = 0; i <= 10; i++) pts.push(v(-raio * Math.cos((i * Math.PI) / 10), topo + 0.2 + raio * 0.55 * Math.sin((i * Math.PI) / 10), F / 2));
    for (let i = 1; i <= 10; i++) idx.push(0, i + 1, i);
    obra.por("reboco", malha(pts, idx).translate(0, 0, -0.05), cor.fachada, 0.08, 0);
    obra.por("reboco", malha(pts, idx.map((_, k) => idx[k - (k % 3) + (2 - (k % 3))])).translate(0, 0, -0.3), cor.fachada, 0.08, 0);
    placa(obra, "frente", L, F, 0, A + 0.1, L * 0.55, hPlaca + 0.2, "#6e2c25");
    placa(obra, "frente", L, F, 0, A + 0.2, L * 0.51, hPlaca, "#e2c46a");
  } else {
    obra.por("reboco", bloco(L * 0.4, 0.9, 0.3, 0, topo + 0.2, F / 2 - 0.15), cor.fachada, 0.08, 0);
    obra.por("reboco", bloco(L * 0.4 + 0.3, 0.18, 0.42, 0, topo + 1.1, F / 2 - 0.1), cor.trim, 0.04, 0);
    placa(obra, "frente", L, F, 0, A + 0.15, L * 0.62, hPlaca, r() < 0.5 ? "#e2c46a" : "#e9dcc0");
  }
  // Porta no meio, janelas largas de vidro amarelado dos lados.
  const { pos } = vaosDaFrente(L, true, r, 2.6);
  porta(obra, "frente", L, F, 0, p.entravel ? ENTRAR.largura : 2.0, p.entravel ? ENTRAR.altura : 2.6, cor.porta, p.entravel, cor.trim);
  for (const u of pos.slice(1)) janelaFesta(obra, "frente", L, F, u, 0.9, 1.3, 1.8, { moldura: cor.trim, veneziana: cor.veneziana, vidro: "#4a3a22" });
  janelasDosLados(obra, p, cor, r, 1);
  // Alpendre na frente, de ponta a ponta.
  const prof = 2.4;
  const hEsteio = grande ? 3.3 : 2.9;
  const esteios = aoLongo(L - 0.2, Math.max(3, Math.round(L / 3.2) + 1), 0.15);
  obra.por("madeira", bloco(L, 0.22, prof, 0, 0, F / 2 + prof / 2), cor.madeira, 0.14, 0.3);
  for (const u of esteios) obra.por("madeira", bloco(0.2, hEsteio, 0.2, u, 0.22, F / 2 + prof - 0.2), cor.madeira, 0.1, 0);
  obra.por("madeira", bloco(L, 0.22, 0.24, 0, hEsteio + 0.15, F / 2 + prof - 0.2), cor.madeira, 0.1, 0);
  if (grande) {
    // Cobertura plana virando balcão do andar de cima, com portas-janela atrás.
    obra.por("madeira", bloco(L, 0.18, prof, 0, hEsteio + 0.37, F / 2 + prof / 2), cor.madeira, 0.12, 0);
    balaustrada(obra, "frente", L, F, 0, hEsteio + 0.55, L - 0.1, prof - 0.1, cor.trim);
    for (const u of aoLongo(L, Math.floor(L / 3), 1.6)) janelaFesta(obra, "frente", L, F, u, hEsteio + 0.6, 1.1, Math.min(1.8, A - hEsteio - 1.05), { moldura: cor.trim, veneziana: cor.veneziana, vidro: "#4a3a22" });
  } else {
    for (const g of telhado("uma-agua", L, prof, 0, 0.55, 0.2, 0.12)) obra.por("telha", g.translate(0, hEsteio + 0.37, F / 2 + prof / 2), cor.telha, 0.12, 0);
  }
  lambrequim(obra, "frente", L, F, L, hEsteio + 0.37, prof - 0.08, cor.trim);
  // Guarda-corpo entre os esteios, menos na entrada.
  for (let i = 0; i < esteios.length - 1; i++) {
    const meio = (esteios[i] + esteios[i + 1]) / 2;
    if (Math.abs(meio) < 2.6) continue;
    balaustrada(obra, "frente", L, F, meio, 0.22, esteios[i + 1] - esteios[i] - 0.2, prof - 0.2, cor.madeira, 0.85);
  }
  for (let i = 1; i < esteios.length - 1; i++) lampiaoPendurado(obra, esteios[i], hEsteio + 0.15, F / 2 + prof - 0.2);
  // Bandeirinhas: da platibanda até as pontas do alpendre, e de esteio a esteio.
  const ponta = F / 2 + prof - 0.2;
  for (const s of [-1, 1]) bandeirinhas(obra, v(s * (L / 2 - 0.2), topo + 0.1, F / 2 + 0.1), v(s * (L / 2 - 0.2), hEsteio + 0.3, ponta), r, 0.2);
  bandeirinhas(obra, v(-L / 2, hEsteio + 0.1, ponta + 0.05), v(L / 2, hEsteio + 0.1, ponta + 0.05), r, grande ? 0.6 : 0.45);
  if (grande) {
    bandeirinhas(obra, v(-L / 2, topo + 0.15, F / 2 + 0.05), v(0, topo + 0.2 + L * 0.11, F / 2 + 0.05), r, 0.5);
    bandeirinhas(obra, v(0, topo + 0.2 + L * 0.11, F / 2 + 0.05), v(L / 2, topo + 0.15, F / 2 + 0.05), r, 0.5);
  }
  // Barris de cachaça no alpendre e amarra-cavalo na lama.
  const nb = grande ? 4 : 2;
  for (let i = 0; i < nb; i++) barril(obra, (i % 2 ? 1 : -1) * (L / 2 - 0.6 - Math.floor(i / 2) * 0.75), F / 2 + 0.75, 0.32, 0.85, "#6a4a2c", 0.22);
  if (grande) barril(obra, -L / 2 + 0.95, F / 2 + 0.75, 0.3, 0.8, "#6a4a2c", 1.07);
  for (const s of [-1, 1]) obra.por("madeira", bloco(0.14, 1.05, 0.14, s * Math.min(L / 2 - 1, 4), 0, F / 2 + prof + 0.45), cor.madeira, 0.1, 0.2);
  obra.por("madeira", bloco(Math.min(L - 2, 8) + 0.3, 0.1, 0.12, 0, 0.95, F / 2 + prof + 0.45), cor.madeira, 0.1, 0);
  const interior = interiorFesta(p, (o) => {
    for (const s of [-1, 1]) barril(o, s * (L / 2 - 1), -F / 2 + 1, 0.4, 1.0, "#6a4a2c");
    if (L >= 14) {
      o.por("madeira", bloco(4, 0.5, 2.6, -L / 2 + 2.4, 0, F / 4), "#7a5a3a", 0.08, 0);
      for (const s of [-1, 1]) for (let i = 0; i < 2; i++) o.por("madeira", bloco(1.2, 0.76, 1.2, s * (L / 4) + i * 1.8 - 0.9, 0, F * 0.22), "#5a3a22", 0.08, 0);
    }
  });
  return { corpo: obra.pecas(), telhado: t.pecas(), interior };
}

// ───────────────────────────── hotéis ─────────────────────────────

function hotel(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const base = casa(p, r, cor);
  const obra = new Obra(14);
  const { largura: L, fundo: F, altura: A } = p;
  passarela(obra, L, F, 1.5, cor.madeira);
  placa(obra, "frente", L, F, 0, A >= 6.4 ? PAV - 0.85 : Math.min(A - 1.0, 3.5), Math.min(L * 0.5, 5.5), 0.6, "#e2d2a8");
  return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
}

/**
 * Hotel Versailles: pretensão afrancesada no meio da lama. Rosa-salmão com cantaria,
 * pilastras, pavilhão central com frontão curvo e óculo dourado, marquise sobre colunas,
 * sacadas de ferro, mansarda de ardósia com lucarnas, urnas na cornija e letreiro dourado.
 */
function versailles(p: PredioLocal, r: () => number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const cor: Paleta = { fachada: "#e3bcae", barrado: "#9a7468", trim: "#f2eadb", veneziana: "#6f8a9a", porta: "#3a4a5a", telha: "#4c5560", lona: "#3f74a3", madeira: "#5a3e28" };
  const obra = new Obra(901);
  const t = new Obra(902);
  const pav = Math.max(2, Math.round(A / PAV));
  const hp = A / pav;
  paredes(obra, L, F, A, "reboco", cor.fachada, p.entravel ? ENTRAR : undefined);
  if (!p.entravel) porta(obra, "frente", L, F, 0, 2.6, ENTRAR.altura, cor.porta, false, cor.trim);
  const vao = p.entravel ? ENTRAR.largura + 0.3 : 0;
  faixa(obra, L, F, 0, 1.0, "cantaria", "#b8ad98", 0.06, vao, 0.06, 0.2);
  faixa(obra, L, F, 0, 0.3 + r() * 0.15, "terra", LAMA, 0.09, vao, 0.18, 0.3);
  for (let andar = 1; andar < pav; andar++) faixa(obra, L, F, andar * hp - 0.12, 0.24, "reboco", cor.trim, 0.08);
  faixa(obra, L, F, A - 0.45, 0.45, "reboco", cor.trim, 0.16);
  const colunas = aoLongo(L, Math.max(4, Math.round(L / 4.2)), 0.2);
  const wp = Math.min(L * 0.32, 9);
  for (const u of colunas) if (Math.abs(u) > wp / 2) obra.por("reboco", bloco(0.42, A - 1.45, 0.14, u, 1.0, F / 2 + 0.07), cor.trim, 0.04, 0);
  // Pavilhão central: avança 30 cm, com o vão da porta recortado e frontão curvo.
  const Fp = F + 0.6;
  const ladoP = (wp - ENTRAR.largura) / 2;
  for (const s of [-1, 1]) obra.por("reboco", bloco(ladoP, A, 0.3, s * (ENTRAR.largura / 2 + ladoP / 2), 0, F / 2 + 0.15), cor.fachada, 0.06, 0);
  obra.por("reboco", bloco(ENTRAR.largura, A - ENTRAR.altura, 0.3, 0, ENTRAR.altura, F / 2 + 0.15), cor.fachada, 0.06, 0);
  const frontao: THREE.Vector3[] = [v(0, A + 0.1, F / 2 + 0.3)];
  for (let i = 0; i <= 8; i++) frontao.push(v((-wp / 2) * Math.cos((i * Math.PI) / 8), A + 0.1 + 1.6 * Math.sin((i * Math.PI) / 8), F / 2 + 0.3));
  const idx: number[] = [];
  for (let i = 1; i <= 8; i++) idx.push(0, i + 1, i);
  obra.por("reboco", malha(frontao, idx), cor.fachada, 0.06, 0);
  obra.por("reboco", bloco(wp + 0.4, 0.3, 0.5, 0, A - 0.2, F / 2 + 0.1), cor.trim, 0.04, 0);
  obra.por("ferro", new THREE.CylinderGeometry(0.55, 0.55, 0.12, 12).rotateX(Math.PI / 2).translate(0, A + 0.85, F / 2 + 0.34), "#c9a24a", 0.06, 0);
  // Marquise sobre duas colunas, com sacada de ferro em cima; degrau de cantaria.
  for (const s of [-1, 1]) {
    obra.por("cantaria", new THREE.CylinderGeometry(0.24, 0.28, ENTRAR.altura + 0.4, 10).translate(s * (ENTRAR.largura / 2 + 0.45), (ENTRAR.altura + 0.4) / 2, F / 2 + 0.85), "#efe6d4", 0.04, 0);
    obra.por("cantaria", bloco(0.6, 0.25, 0.6, s * (ENTRAR.largura / 2 + 0.45), ENTRAR.altura + 0.4, F / 2 + 0.85), "#efe6d4", 0.04, 0);
  }
  obra.por("cantaria", bloco(ENTRAR.largura + 1.8, 0.2, 1.2, 0, ENTRAR.altura + 0.65, F / 2 + 0.75), "#efe6d4", 0.04, 0);
  obra.por("cantaria", bloco(ENTRAR.largura + 1.4, 0.15, 1.4, 0, 0, F / 2 + 0.85), "#b8ad98", 0.05, 0.2);
  sacadaLeve(obra, "frente", L, Fp, 0, ENTRAR.altura + 0.85, ENTRAR.largura + 1.4, "#2a2826");
  janelaFesta(obra, "frente", L, Fp, 0, ENTRAR.altura + 0.95, 1.4, Math.min(2.1, 2 * hp - ENTRAR.altura - 1.3), { moldura: cor.trim, vidro: "#3a3a34" });
  if (pav >= 3) placa(obra, "frente", L, Fp, 0, 2 * hp + 0.35, wp - 1.0, 0.9, "#c9a24a");
  else placa(obra, "frente", L, Fp, 0, A - 1.2, wp - 1.0, 0.6, "#c9a24a");
  // Janelas: térreo alto, andares com sacadas de ferro.
  for (const u of aoLongo(L, Math.max(4, Math.floor((L - 1) / 2.5)), 1.4)) {
    if (Math.abs(u) < wp / 2 + 0.6) continue;
    janelaFesta(obra, "frente", L, F, u, 1.15, 1.1, Math.min(2.0, hp - 1.6), { moldura: cor.trim, veneziana: cor.veneziana, vidro: "#3a3a34" });
    for (let andar = 1; andar < pav; andar++) {
      const y = andar * hp + 0.2;
      sacadaLeve(obra, "frente", L, F, u, y - 0.05, 1.5, "#2a2826");
      janelaFesta(obra, "frente", L, F, u, y, 1.0, Math.min(2.1, hp - 0.75), { moldura: cor.trim, veneziana: cor.veneziana, vidro: "#3a3a34" });
    }
  }
  janelasDosLados(obra, p, cor, r, pav);
  // Mansarda de ardósia com lucarnas; o pavilhão sobe mais, com crista de ferro e mastro dourado.
  const hm = 2.6;
  for (const g of mansarda(L, F, A, hm, 1.1, 0.35)) t.por("telha-escura", g, cor.telha, 0.06, 0);
  for (const u of aoLongo(L, Math.max(3, Math.floor(L / 3.4)), 2.2)) if (Math.abs(u) > wp / 2 + 0.4) lucarna(obra, t, u, A + 0.1, F / 2 + 0.2, cor.fachada, cor.telha, cor.trim);
  for (const g of mansarda(wp, 5, A + 0.3, hm + 1.4, 0.9, 0.2)) t.por("telha-escura", g.translate(0, 0, F / 2 - 2.6), "#434b55", 0.06, 0);
  t.por("ferro", bloco(wp - 1.6, 0.35, 0.05, 0, A + hm + 1.95, F / 2 - 1.7), "#2a2826", 0.02, 0);
  t.por("ferro", bloco(0.08, 1.2, 0.08, 0, A + hm + 1.95, F / 2 - 2.6), "#c9a24a", 0.03, 0);
  for (const u of colunas) obra.por("cantaria", new THREE.CylinderGeometry(0.2, 0.12, 0.55, 8).translate(u, A + 0.3, F / 2 + 0.05), "#efe6d4", 0.04, 0);
  for (const s of [-1, 1]) poste(obra, s * (ENTRAR.largura / 2 + 1.8), F / 2 + 1.9, 3.3);
  // Floreiras de cantaria no térreo, já respingadas de lama.
  for (const s of [-1, 1]) {
    obra.por("cantaria", bloco(1.6, 0.6, 0.6, s * (wp / 2 + 1.2), 0, F / 2 + 0.6), "#d8cdb8", 0.08, 0.35);
    obra.por("folhagem", bloco(1.4, 0.35, 0.45, s * (wp / 2 + 1.2), 0.6, F / 2 + 0.6), "#5d7f3a", 0.2, 0);
  }
  const interior = interiorFesta(p, (o) => {
    o.por("lona", bloco(L * 0.5, 0.03, F - 2, 0, 0.1, 0), "#8a3a34", 0.06, 0);
    o.por("madeira", bloco(2.4, 1.0, 0.6, L / 2 - 3, 0, -F / 2 + 3), "#4a2e1c", 0.06, 0);
  });
  return { corpo: obra.pecas(), telhado: t.pecas(), interior };
}

// ───────────────────────────── públicos ─────────────────────────────

type Publico = "conselho" | "universidade" | "delegacia" | "espetaculos" | "banco" | "comum";

function publico(p: PredioLocal, r: () => number, cor: Paleta, qual: Publico): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  if (qual === "conselho") Object.assign(cor, { fachada: "#cfa04e", barrado: "#7a5a2a", trim: CAL, veneziana: "#2f5a46", porta: "#3a2a1c" });
  if (qual === "universidade") Object.assign(cor, { fachada: "#9db4c0", barrado: "#56707e", trim: CAL, veneziana: "#7a3a2c", porta: "#3a2a1c" });
  if (qual === "delegacia") Object.assign(cor, { fachada: "#8aa0a6", barrado: "#4c5a5e", trim: "#d8d0bc", veneziana: "#3a4436", porta: "#3a2e26" });
  if (qual === "banco") Object.assign(cor, { fachada: "#93ab8e", barrado: "#4e6048", trim: CAL });
  const obra = new Obra(Math.floor(r() * 1e6));
  const t = new Obra(17);
  const pav = A >= 6.6 ? Math.max(2, Math.floor(A / PAV)) : 1;
  corpoColorido(obra, p, cor, r, pav);
  const grade = qual === "delegacia" || qual === "banco";
  if (qual === "delegacia") faixa(obra, L, F, 0, 1.2, "cantaria", "#8a8274", 0.07, p.entravel ? ENTRAR.largura + 0.3 : 0, 0.1, 0.25);
  const { pos } = vaosDaFrente(L, true, r, 2.6);
  const altJanela = pav > 1 ? 2.0 : Math.min(2.2, A - 2.2);
  porta(obra, "frente", L, F, 0, p.entravel ? ENTRAR.largura : 1.8, p.entravel ? ENTRAR.altura : 2.9, cor.porta, p.entravel, cor.trim);
  pos.forEach((u, i) => {
    if (i > 0) janelaFesta(obra, "frente", L, F, u, 1.0, 1.1, altJanela, { moldura: cor.trim, veneziana: grade ? undefined : cor.veneziana, grade });
    for (let andar = 1; andar < pav; andar++) {
      const y = andar * PAV + 0.25;
      if (i === 0 && qual !== "delegacia") sacadaLeve(obra, "frente", L, F, 0, y - 0.05, 2.2, "#2a2826");
      janelaFesta(obra, "frente", L, F, u, y, 1.0, Math.min(2.0, A - y - 0.9), { moldura: cor.trim, veneziana: cor.veneziana });
    }
  });
  // Pilastras entre os vãos.
  for (const u of aoLongo(L, Math.max(2, pos.length + 1), 0.15)) {
    if (Math.abs(u) < ENTRAR.largura / 2 + 0.35 || pos.some((w) => Math.abs(w - u) < 0.95)) continue;
    obra.por("reboco", bloco(0.36, A - 1.15, 0.1, u, 0.85, F / 2 + 0.05), cor.trim, 0.04, 0);
  }
  janelasDosLados(obra, p, cor, r, pav, grade);
  // Frontão triangular no meio da fachada (a delegacia é baixa e atarracada, sem frontão).
  const wf = Math.min(L * 0.55, 8);
  const hf = qual === "delegacia" ? 0 : wf * 0.28;
  if (hf > 0) {
    const tri = (z: number, inv: boolean) => malha([v(-wf / 2, A, z), v(wf / 2, A, z), v(0, A + hf, z)], inv ? [1, 0, 2] : [0, 1, 2]);
    obra.por("reboco", tri(F / 2 + 0.05, false), cor.fachada, 0.06, 0);
    obra.por("reboco", tri(F / 2 - 0.35, true), cor.fachada, 0.06, 0);
    const ang = Math.atan2(hf, wf / 2);
    const lado = Math.hypot(wf / 2, hf);
    for (const s of [-1, 1]) obra.por("reboco", bloco(lado + 0.3, 0.2, 0.55, 0, -0.1, 0).rotateZ(-s * ang).translate((s * wf) / 4, A + hf / 2 + 0.05, F / 2 - 0.12), cor.trim, 0.04, 0);
    obra.por("reboco", bloco(wf + 0.4, 0.22, 0.55, 0, A - 0.05, F / 2 - 0.12), cor.trim, 0.04, 0);
  }
  for (const g of telhado("quatro-aguas", L, F, A, Math.min(L, F) * 0.24, 0.8, ESP)) t.por("telha", g, cor.telha, 0.12, 0);
  placa(obra, "frente", L, F, 0, Math.min(ENTRAR.altura + 0.25, A - 1.0), Math.min(L * 0.45, 5), 0.5, qual === "delegacia" ? "#e2d6b8" : "#3a2a1c");
  for (const s of [-1, 1]) poste(obra, s * (L / 2 - 0.6), F / 2 + 1.4);
  if (qual === "conselho") {
    // Relógio no frontão, mastro com bandeira e bancos para os turistas.
    obra.por("reboco", new THREE.CylinderGeometry(0.6, 0.6, 0.12, 14).rotateX(Math.PI / 2).translate(0, A + hf * 0.42, F / 2 + 0.1), "#f4efe2", 0.02, 0);
    obra.por("ferro", bloco(0.05, 0.45, 0.03, 0, A + hf * 0.42, F / 2 + 0.18), "#1e1c1a", 0.02, 0);
    obra.por("ferro", bloco(0.32, 0.05, 0.03, 0.14, A + hf * 0.42, F / 2 + 0.18), "#1e1c1a", 0.02, 0);
    obra.por("ferro", bloco(0.07, 3, 0.07, 0, A + hf, F / 2 - 0.1), "#2a2826", 0.02, 0);
    obra.por("lona", quad(1.3, 0.85, true).translate(0.68, A + hf + 2.1, F / 2 - 0.1), "#3d6a9a", 0.06, 0);
    for (const s of [-1, 1]) obra.por("madeira", bloco(1.6, 0.45, 0.45, s * (L / 2 - 2.2), 0, F / 2 + 1.0), "#5a3e28", 0.08, 0.2);
  }
  if (qual === "universidade") {
    // Em obras: o terço direito ainda no tijolo, com andaime de madeira na frente.
    const w = L / 3;
    const xw = L / 2 - w / 2;
    obra.por("tijolo", bloco(w, A - 0.9, 0.06, xw, 0.85, F / 2 + 0.03), "#9a5a40", 0.12, 0);
    for (const u of [L / 2 - w + 0.2, xw, L / 2 - 0.2]) obra.por("madeira", bloco(0.12, A + 0.8, 0.12, u, 0, F / 2 + 1.3), "#8a7050", 0.12, 0);
    for (const y of [2.4, 4.8, Math.min(7, A - 0.6)]) obra.por("madeira", bloco(w + 0.2, 0.08, 1.0, xw, y, F / 2 + 0.85), "#9a7a52", 0.14, 0);
    const d = Math.hypot(w - 0.4, A);
    obra.por("madeira", bloco(0.08, d, 0.08, 0, -d / 2, 0).rotateZ(Math.atan2(w - 0.4, A)).translate(xw, A / 2, F / 2 + 1.38), "#8a7050", 0.1, 0);
    obra.por("tijolo", bloco(1.2, 0.6, 0.8, xw, 0, F / 2 + 2.1), "#9a5a40", 0.15, 0.3);
    // Mirante com sino no telhado: a universidade quer ser vista de longe.
    const m = 2.6;
    const ym = A + Math.min(L, F) * 0.24 - 0.6;
    obra.por("reboco", bloco(m, 2.0, m, 0, ym, 0), cor.fachada, 0.06, 0);
    for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) janelaFesta(obra, f, m, m, 0, ym + 0.45, 0.8, 1.1, { moldura: cor.trim });
    for (const g of telhado("quatro-aguas", m, m, ym + 2.0, 1.3, 0.3, 0.12)) t.por("telha", g, cor.telha, 0.1, 0);
  }
  if (qual === "delegacia") {
    // Alpendre baixo de tábua sobre a porta, amarra-cavalo, banco do xerife e tábua de avisos.
    const prof = 1.8;
    for (const s of [-1, 1]) obra.por("madeira", bloco(0.2, 2.8, 0.2, s * (ENTRAR.largura / 2 + 0.6), 0, F / 2 + prof - 0.2), "#5a3e28", 0.1, 0);
    for (const g of telhado("uma-agua", ENTRAR.largura + 1.8, prof, 0, 0.45, 0.2, 0.12)) obra.por("telha-escura", g.translate(0, 2.85, F / 2 + prof / 2), "#6e4a3a", 0.1, 0);
    for (const s of [-1, 1]) obra.por("madeira", bloco(0.14, 1.05, 0.14, s * 3.6, 0, F / 2 + 2.7), "#5a3e28", 0.1, 0.2);
    obra.por("madeira", bloco(7.5, 0.1, 0.12, 0, 0.95, F / 2 + 2.7), "#5a3e28", 0.1, 0);
    obra.por("madeira", bloco(1.5, 0.45, 0.42, -L / 2 + 1.6, 0, F / 2 + 0.35), "#5a3e28", 0.1, 0.2);
    obra.por("madeira", naFace(bloco(1.2, 0.9, 0.06, 0, 0, 0.03), "frente", L, F, L / 2 - 1.3, 1.3), "#7a6248", 0.1, 0);
    for (let i = 0; i < 3; i++) obra.por("lona", naFace(quad(0.3, 0.38), "frente", L, F, L / 2 - 1.7 + i * 0.4, 1.55, 0.07), "#e6dcc2", 0.08, 0);
  }
  if (qual === "espetaculos") {
    // Cartazes colados e bandeirinhas descendo do frontão.
    for (const [u, k] of [
      [-L / 2 + 1.0, 0],
      [L / 2 - 1.0, 2],
    ] as const) obra.por("lona", naFace(quad(0.8, 1.1), "frente", L, F, u, 1.3, 0.06), ["#d8c690", "#c87a5a", "#e6dcc2"][k], 0.08, 0);
    for (const s of [-1, 1]) bandeirinhas(obra, v(0, A + hf, F / 2 + 0.25), v(s * L / 2, A + 0.1, F / 2 + 0.7), r, 0.3);
  }
  const interior = interiorFesta(p, (o) => {
    if (qual === "delegacia") for (let i = 0; i < 7; i++) o.por("ferro", bloco(0.05, 2.6, 0.05, L / 2 - 3.8 + i * 0.5, 0, -F / 2 + 3.2), "#2a2826", 0.02, 0);
    if (qual === "universidade") for (let i = 0; i < 3; i++) o.por("madeira", bloco(L * 0.6, 0.75, 0.6, 0, 0, F * 0.15 - i * 1.8), "#5a3a22", 0.08, 0);
  });
  return { corpo: obra.pecas(), telhado: t.pecas(), interior };
}

// ───────────────────────────── igreja ─────────────────────────────

/** Igreja amarela de cunhais brancos, frontão e torre central de cúpula nascendo da fachada. */
function igreja(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const capela = L < 14;
  const c: Paleta = { ...cor, fachada: capela ? "#ece2c8" : "#e0c46e", barrado: capela ? "#5a7896" : "#8a6a2a", trim: CAL, porta: "#2c4a6a" };
  const obra = new Obra(21);
  const t = new Obra(22);
  corpoColorido(obra, p, c, r, 1);
  const alto = L * 0.36;
  for (const g of telhado("duas-aguas", F, L, A, alto, 0.7)) t.por("telha", g.rotateY(Math.PI / 2), c.telha, 0.12, 0);
  for (const g of empenas(F, L, A, alto)) obra.por("reboco", g.rotateY(Math.PI / 2), c.fachada, 0.06, 0);
  const z = F / 2 + 0.2;
  obra.por("reboco", malha([v(-L / 2, A, z), v(L / 2, A, z), v(0, A + alto + 0.9, z)], [0, 1, 2]), c.fachada, 0.06, 0);
  obra.por("reboco", bloco(L + 0.4, 0.35, 0.6, 0, A - 0.1, F / 2), c.trim, 0.04, 0);
  const rake = Math.hypot(L / 2, alto + 0.9);
  for (const s of [-1, 1]) obra.por("reboco", bloco(rake + 0.3, 0.25, 0.5, 0, -0.12, 0).rotateZ(-s * Math.atan2(alto + 0.9, L / 2)).translate((s * L) / 4, A + (alto + 0.9) / 2, z - 0.1), c.trim, 0.04, 0);
  porta(obra, "frente", L, F, 0, p.entravel ? ENTRAR.largura : 2.4, p.entravel ? ENTRAR.altura : 3.4, c.porta, p.entravel, c.trim);
  if (L >= 12) for (const s of [-1, 1]) janelaFesta(obra, "frente", L, F, s * (L / 2 - 2.2), A * 0.5, 1.0, 1.9, { moldura: c.trim, vidro: "#3a4a5a" });
  janelaFesta(obra, "frente", L, F, 0, ENTRAR.altura + 0.9, 1.1, 1.3, { moldura: c.trim, vidro: "#3a4a5a" });
  for (const u of aoLongo(F, Math.max(2, Math.floor(F / 5)), 2.4)) for (const f of ["esquerda", "direita"] as Face[]) janelaFesta(obra, f, L, F, u, A * 0.42, 1.0, 2.1, { moldura: c.trim, vidro: "#3a4a5a" });
  // Torre central: base, sineira vazada com sino, cúpula e cruz.
  const lado = Math.max(2.8, Math.min(4.2, L * 0.28));
  const y0 = A + alto * 0.55;
  const hT = capela ? 1.4 : 3.2;
  const zt = F / 2 - lado / 2;
  obra.por("reboco", bloco(lado, hT, lado, 0, y0, zt), c.fachada, 0.06, 0);
  obra.por("reboco", bloco(lado + 0.3, 0.3, lado + 0.3, 0, y0 + hT, zt), c.trim, 0.04, 0);
  const s = 0.4;
  const hs = lado * 0.85;
  for (const [px, pz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) obra.por("reboco", bloco(s, hs, s, px * (lado / 2 - s / 2), y0 + hT + 0.3, zt + pz * (lado / 2 - s / 2)), c.trim, 0.04, 0);
  obra.por("ferro", new THREE.CylinderGeometry(lado * 0.16, lado * 0.22, lado * 0.32, 8).translate(0, y0 + hT + 0.3 + hs * 0.55, zt), "#7a5a2a", 0.05, 0);
  const yc = y0 + hT + 0.3 + hs;
  obra.por("reboco", bloco(lado + 0.3, 0.3, lado + 0.3, 0, yc, zt), c.trim, 0.04, 0);
  t.por("telha-escura", new THREE.SphereGeometry(lado * 0.52, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.25, 1).translate(0, yc + 0.3, zt), "#7e8a86", 0.08, 0);
  const ycr = yc + 0.3 + lado * 0.65;
  t.por("ferro", bloco(0.1, 1.4, 0.1, 0, ycr, zt), "#2c2a28", 0.02, 0);
  t.por("ferro", bloco(0.7, 0.1, 0.1, 0, ycr + 0.9, zt), "#2c2a28", 0.02, 0);
  // Festa do padroeiro: bandeirinhas da sineira até os lampiões do adro.
  for (const sx of [-1, 1]) {
    bandeirinhas(obra, v(sx * lado * 0.4, y0 + hT + 0.2, F / 2 + 0.2), v(sx * (L / 2 - 0.3), 2.6, F / 2 + 2.6), r, 0.4);
    poste(obra, sx * (L / 2 - 0.3), F / 2 + 2.6, 2.2);
  }
  const dentro = new Obra(23);
  if (p.entravel) {
    dentro.por("madeira", bloco(L - 1, 0.08, F - 1, 0, 0.02, 0), "#8a6a48", 0.08, 0);
    for (let i = 0; i < Math.floor(F / 2.4) - 2; i++) for (const sx of [-1, 1]) dentro.por("madeira", bloco(L * 0.32, 0.5, 0.45, sx * L * 0.22, 0, F / 2 - 3 - i * 2.2), "#5a3a22", 0.08, 0);
    dentro.por("reboco", bloco(L * 0.4, 1.4, 1.2, 0, 0, -F / 2 + 1.2), "#e0c46e", 0.04, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

// ───────────────────────────── madeira: galpão, estação, pavilhão ─────────────────────────────

/** Galpão de tábua pintada com a empena para a rua, portão com X em cal e porta do paiol. */
function galpao(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(41);
  const t = new Obra(42);
  const tinta = TABUAS[Math.floor(r() * TABUAS.length)];
  paredes(obra, L, F, A, "madeira", tinta, p.entravel ? ENTRAR : undefined);
  if (p.entravel) faixa(obra, L, F, 0, 0.5, "terra", LAMA, 0.05, ENTRAR.largura + 0.3, 0.18, 0.3);
  else obra.por("terra", bloco(L + 0.1, 0.5, F + 0.1, 0, 0, 0), LAMA, 0.18, 0.3);
  // Mata-juntas: ripas que desenham o tabuado.
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
    const comp = f === "frente" || f === "fundos" ? L : F;
    for (const u of aoLongo(comp, Math.floor(comp / 1.1), 0.3)) {
      if (f === "frente" && Math.abs(u) < ENTRAR.largura / 2 + 0.2) continue;
      obra.por("madeira", naFace(quad(0.08, A - 0.5).translate(u, 0.5, 0.03), f, L, F, 0, 0), escurecer(tinta, 0.8), 0.08, 0);
    }
  }
  const alto = L * 0.32;
  for (const g of telhado("duas-aguas", F, L, A, alto, 0.6)) t.por("telha-escura", g.rotateY(Math.PI / 2), escurecer(cor.telha, 0.85), 0.14, 0);
  for (const g of empenas(F, L, A, alto)) obra.por("madeira", g.rotateY(Math.PI / 2), tinta, 0.08, 0);
  // Portão: folhas escuras com X em cal (fechado) ou o vão aberto (entrável), sempre com contorno branco.
  const wp = p.entravel ? ENTRAR.largura : Math.min(4, L * 0.4);
  const hp = p.entravel ? ENTRAR.altura : Math.min(A - 0.6, 3.2);
  if (!p.entravel) {
    obra.por("madeira-escura", naFace(bloco(wp, hp, 0.06, 0, 0, 0.03), "frente", L, F, 0, 0), escurecer(tinta, 0.7), 0.08, 0);
    const d = Math.hypot(wp, hp);
    for (const s of [-1, 1]) obra.por("madeira", naFace(bloco(d, 0.12, 0.04, 0, -0.06, 0).rotateZ(s * Math.atan2(hp, wp)).translate(0, hp / 2, 0.08), "frente", L, F, 0, 0), CAL, 0.05, 0);
  }
  for (const [bw, bh, bx, by] of [
    [wp + 0.3, 0.15, 0, hp],
    [0.15, hp, -wp / 2 - 0.07, 0],
    [0.15, hp, wp / 2 + 0.07, 0],
  ] as const) obra.por("madeira", naFace(bloco(bw, bh, 0.08, bx, by, 0.06), "frente", L, F, 0, 0), CAL, 0.05, 0);
  if (A + alto * 0.5 > hp + 1.8) {
    const yp = Math.max(hp + 0.5, A - 0.6);
    obra.por("madeira-escura", naFace(bloco(1.2, 1.3, 0.06, 0, 0, 0.03), "frente", L, F, 0, yp), "#3a2a1c", 0.08, 0);
    obra.por("madeira", naFace(bloco(0.18, 0.18, 1.0, 0, 0, 0.5), "frente", L, F, 0, yp + 1.6), "#5a4028", 0.08, 0);
  }
  for (const f of ["esquerda", "direita"] as Face[]) for (const u of aoLongo(F, Math.max(1, Math.floor(F / 6)), 2)) janelaFesta(obra, f, L, F, u, 2.0, 0.9, 0.9, { moldura: CAL, materialDaMoldura: "madeira", vidro: "#2a2620" });
  if (/ferrari/i.test(p.nome)) chamine(obra, L * 0.3, -F * 0.25, 0, A + alto + 1.5, "#7a4a38");
  if (r() < 0.5) barril(obra, L / 2 - 0.5, F / 2 + 0.5, 0.34, 0.9, "#5e4630");
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorFesta(p) };
}

/** Pavilhão aberto: Barracão de Festas e Mercado Coberto. Esteios, mureta, bandeirinhas cruzando por dentro. */
function pavilhao(p: PredioLocal, r: () => number, cor: Paleta, mercado: boolean): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(51);
  const t = new Obra(52);
  const tinta = mercado ? "#7a5a3a" : "#5e7e78";
  obra.por("cantaria", bloco(L + 0.3, 0.25, F + 0.3, 0, 0, 0), "#8f8676", 0.08, 0.3);
  const xs = aoLongo(L - 0.3, Math.max(3, Math.round(L / 3.5) + 1), 0);
  const zs = aoLongo(F - 0.3, Math.max(3, Math.round(F / 3.5) + 1), 0);
  for (const x of xs) {
    obra.por("madeira", bloco(0.28, A - 0.25, 0.28, x, 0.25, zs[0]), tinta, 0.1, 0);
    if (Math.abs(x) > ENTRAR.largura / 2 + 0.2) obra.por("madeira", bloco(0.28, A - 0.25, 0.28, x, 0.25, zs[zs.length - 1]), tinta, 0.1, 0);
  }
  for (const z of zs.slice(1, -1)) for (const x of [xs[0], xs[xs.length - 1]]) obra.por("madeira", bloco(0.28, A - 0.25, 0.28, x, 0.25, z), tinta, 0.1, 0);
  faixa(obra, L - 0.3, F - 0.3, A - 0.35, 0.35, "madeira", tinta, 0.05);
  // Mureta de tábua entre os esteios, com a entrada livre no meio da frente.
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) balaustrada(obra, f, L - 0.3, F - 0.3, 0, 0.25, (f === "fundos" ? L : F) - 0.6, 0, tinta, 0.9);
  const resto = (L - 0.3 - ENTRAR.largura - 0.6) / 2;
  for (const s of [-1, 1]) balaustrada(obra, "frente", L - 0.3, F - 0.3, s * (ENTRAR.largura / 2 + 0.3 + resto / 2), 0.25, resto, 0, tinta, 0.9);
  const alto = L * 0.28;
  for (const g of telhado("duas-aguas", F, L, A, alto, 0.9)) t.por("telha", g.rotateY(Math.PI / 2), cor.telha, 0.14, 0);
  for (const g of empenas(F, L, A, alto)) t.por("madeira", g.rotateY(Math.PI / 2), tinta, 0.08, 0);
  lambrequim(obra, "frente", L, F, L + 1.8, A - ESP + 0.02, 0.85, CAL);
  placa(obra, "frente", L, F, 0, A + alto * 0.25, Math.min(L * 0.4, 6), 0.7, mercado ? "#e2d2a8" : "#d6a33a");
  const dentro = new Obra(53);
  if (mercado) {
    // Fileiras de barracas debaixo da cobertura, com corredor no meio.
    for (const z of [-F / 4, F / 8]) for (const x of aoLongo(L - 2, Math.max(2, Math.floor(L / 5.5)), 1.4)) if (Math.abs(x) > 1.6 || z < 0) barraca(obra, x, z, 2.4, 1.4, LONAS[Math.floor(r() * LONAS.length)], r, 2.3);
  } else {
    // Bandeirinhas cruzando de canto a canto, lampiões, mesas compridas e palco.
    const y = A - 0.4;
    bandeirinhas(obra, v(xs[0], y, zs[0]), v(xs[xs.length - 1], y, zs[zs.length - 1]), r, 0.7);
    bandeirinhas(obra, v(xs[xs.length - 1], y, zs[0]), v(xs[0], y, zs[zs.length - 1]), r, 0.7);
    for (const z of zs) bandeirinhas(obra, v(xs[0], y, z), v(xs[xs.length - 1], y, z), r, 0.5);
    for (const z of zs.slice(1, -1)) lampiaoPendurado(obra, 0, y - 0.4, z);
    for (const x of [-L / 4, L / 4]) {
      dentro.por("madeira", bloco(1.0, 0.78, F * 0.6, x, 0.25, -F * 0.05), "#6a4a30", 0.08, 0);
      for (const s of [-1, 1]) dentro.por("madeira", bloco(0.35, 0.45, F * 0.6, x + s * 0.85, 0.25, -F * 0.05), "#5a3a22", 0.08, 0);
    }
    dentro.por("madeira", bloco(L * 0.4, 0.6, 2.5, 0, 0.25, -F / 2 + 1.6), "#7a5a3a", 0.08, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

/** Estação de tábua pintada com plataforma coberta, esteios brancos e lambrequim. */
function estacao(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const base = galpao({ ...p, nome: "Estação" }, r, cor);
  const obra = new Obra(19);
  const { largura: L, fundo: F } = p;
  const prof = 2.8;
  const h = 3.2;
  obra.por("madeira", bloco(L, 0.5, prof, 0, 0, F / 2 + prof / 2), "#6a4a30", 0.12, 0.3);
  const esteios = aoLongo(L, Math.max(3, Math.floor(L / 3.5)), 0.3);
  for (const u of esteios) obra.por("madeira", bloco(0.2, h, 0.2, u, 0.5, F / 2 + prof - 0.25), "#e6dcc2", 0.06, 0);
  for (const g of telhado("uma-agua", L, prof, 0, 0.6, 0.3, 0.12)) obra.por("telha-escura", g.translate(0, h + 0.5, F / 2 + prof / 2), "#6e4a3a", 0.1, 0);
  lambrequim(obra, "frente", L, F, L + 0.6, h + 0.38, prof + 0.25, CAL);
  for (const u of esteios.slice(1, -1)) lampiaoPendurado(obra, u, h + 0.45, F / 2 + prof - 0.25);
  placa(obra, "frente", L, F, 0, h + 1.2, Math.min(L * 0.4, 6), 0.6, "#e6dcc2");
  return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
}

// ───────────────────────────── campo ─────────────────────────────

/** Casa-grande térrea sobre embasamento de pedra, alpendre com guarda-corpo e bandeirinhas de São João. */
function fazenda(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const c = { ...cor, fachada: r() < 0.5 ? "#e8dcc0" : cor.fachada, barrado: r() < 0.5 ? "#3f6a8c" : cor.barrado };
  const A = Math.min(p.altura, 5.2);
  const base = casa({ ...p, altura: A }, r, c);
  const obra = new Obra(31);
  const { largura: L, fundo: F } = p;
  obra.por("cantaria", bloco(L + 0.6, 0.6, F + 0.6, 0, -0.3, 0), "#8f8676", 0.08, 0.3);
  const prof = 2.6;
  const hE = 2.6;
  obra.por("madeira", bloco(L * 0.92, 0.3, prof, 0, 0, F / 2 + prof / 2), c.madeira, 0.12, 0.3);
  const esteios = aoLongo(L * 0.92, Math.max(3, Math.floor(L / 3)), 0.15);
  for (const u of esteios) obra.por("madeira", bloco(0.22, hE, 0.22, u, 0.3, F / 2 + prof - 0.2), c.madeira, 0.1, 0);
  for (const g of telhado("uma-agua", L * 0.92, prof, 0, 0.6, 0.3, 0.12)) obra.por("telha", g.translate(0, hE + 0.45, F / 2 + prof / 2), c.telha, 0.12, 0);
  for (let i = 0; i < esteios.length - 1; i++) {
    const meio = (esteios[i] + esteios[i + 1]) / 2;
    if (Math.abs(meio) < (p.entravel ? 2.6 : 0.8)) continue;
    balaustrada(obra, "frente", L, F, meio, 0.3, esteios[i + 1] - esteios[i] - 0.22, prof - 0.2, c.madeira, 0.85);
  }
  if (r() < 0.6) bandeirinhas(obra, v(esteios[0], hE + 0.2, F / 2 + prof - 0.1), v(esteios[esteios.length - 1], hE + 0.2, F / 2 + prof - 0.1), r, 0.5);
  chamine(obra, -L * 0.3, -F * 0.25, A, 2.4, "#8a6450");
  return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
}

/** Moinho de fubá: casa alta de tábua pintada com roda d'água e bica no lado direito. */
function moinho(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  // No entrável a casa ocupa a planta toda (porta no meio) e a roda encosta por fora, à direita.
  const lw = p.entravel ? L : Math.max(3, L - 1.6);
  const xc = -(L - lw) / 2;
  const raio = Math.min(F * 0.42, A * 0.3, 3.6);
  const tinta = TABUAS[Math.floor(r() * TABUAS.length)];
  const obra = new Obra(61);
  const t = new Obra(62);
  const alto = Math.min(F, lw) * 0.38;
  const hc = A - alto;
  if (p.entravel) {
    paredes(obra, L, F, hc, "madeira", tinta, ENTRAR);
    faixa(obra, L, F, 0, 1.0, "cantaria", "#8f8676", 0.06, ENTRAR.largura + 0.3, 0.1, 0.3);
    porta(obra, "frente", L, F, 0, ENTRAR.largura, ENTRAR.altura, "#3a2a1c", true, CAL);
  } else {
    obra.por("cantaria", bloco(lw + 0.2, 1.0, F + 0.2, xc, 0, 0), "#8f8676", 0.1, 0.3);
    obra.por("madeira", bloco(lw, hc - 1, F, xc, 1, 0), tinta, 0.1, 0);
    porta(obra, "frente", lw, F, xc, 1.3, 2.3, "#3a2a1c", false, CAL);
  }
  for (const g of telhado("duas-aguas", lw, F, hc, alto, 0.5)) t.por("telha-escura", g.translate(xc, 0, 0), escurecer(cor.telha, 0.85), 0.12, 0);
  for (const g of empenas(lw, F, hc, alto)) obra.por("madeira", g.translate(xc, 0, 0), tinta, 0.08, 0);
  janelaFesta(obra, "frente", lw, F, xc, Math.max(3.4, hc - 1.8), 0.8, 0.9, { moldura: CAL, materialDaMoldura: "madeira" });
  // Roda d'água: pás tangentes, raios e eixo, girando no plano yz.
  const xr = p.entravel ? L / 2 + 0.4 : L / 2 - 0.35;
  const cy = raio + 0.3;
  const giro = r();
  for (let i = 0; i < 12; i++) {
    const a = ((i + giro) * Math.PI * 2) / 12;
    obra.por("madeira", bloco(0.6, 0.12, raio * 0.55, 0, -0.06, 0).rotateX(a).translate(xr, cy + Math.cos(a) * raio, Math.sin(a) * raio), "#5a4028", 0.12, 0);
  }
  for (let i = 0; i < 6; i++) obra.por("madeira", bloco(0.1, raio * 2, 0.1, 0, -raio, 0).rotateX(((i + giro) * Math.PI) / 6).translate(xr, cy, 0), "#5a4028", 0.1, 0);
  const xParede = xc + lw / 2;
  obra.por("ferro", new THREE.CylinderGeometry(0.15, 0.15, xr - xParede + 0.3, 8).rotateZ(Math.PI / 2).translate((xr + xParede) / 2, cy, 0), "#2a2826", 0.03, 0);
  // Bica de madeira trazendo a água por cima da roda.
  obra.por("madeira", bloco(0.6, 0.3, F / 2, xr, cy + raio + 0.2, -F / 4), "#5a4028", 0.1, 0);
  obra.por("madeira", bloco(0.15, cy + raio + 0.2, 0.15, xr, 0, -F / 2 + 0.3), "#5a4028", 0.1, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorFesta(p) };
}

/** Engenho de cana: reboco ocre gasto com o tijolo aparecendo, lanternim e chaminé alta. */
function fabrica(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const c = { ...cor, fachada: "#c99a5a", barrado: "#7a5232" };
  const obra = new Obra(71);
  const t = new Obra(72);
  corpoColorido(obra, p, c, r, 1);
  (["frente", "esquerda", "direita", "fundos"] as Face[]).forEach((f, i) => {
    const comp = i === 0 || i === 3 ? L : F;
    obra.por("tijolo", naFace(quad(1.4 + r() * 1.8, 0.8 + r() * 1.4).translate(0, 0, 0.02), f, L, F, (r() < 0.5 ? -1 : 1) * comp * (0.2 + r() * 0.15), 1.2 + r() * Math.max(0.5, A - 4)), "#8a4a34", 0.15, 0);
  });
  const { pos } = vaosDaFrente(L, true, r, 3);
  porta(obra, "frente", L, F, 0, p.entravel ? ENTRAR.largura : 3.0, p.entravel ? ENTRAR.altura : 3.2, "#3a2a1c", p.entravel, CAL);
  for (const u of pos.slice(1)) janelaFesta(obra, "frente", L, F, u, 1.6, 1.4, 2.0, { moldura: CAL, vidro: "#2a2620" });
  for (const f of ["esquerda", "direita"] as Face[]) for (const u of aoLongo(F, Math.max(2, Math.floor(F / 4)), 1.8)) janelaFesta(obra, f, L, F, u, 2.0, 1.2, 1.6, { moldura: CAL, vidro: "#2a2620" });
  const alto = telhadoLargo(obra, t, L, F, A, c, r, { beiral: 0.8, alto: F * 0.22, material: "telha-escura" });
  t.por("madeira", bloco(L * 0.5, 0.7, 1.4, 0, A + alto - 0.3, 0), "#3a2e24", 0.08, 0);
  for (const g of telhado("duas-aguas", L * 0.5, 1.6, A + alto + 0.4, 0.5, 0.2, 0.1)) t.por("telha-escura", g, escurecer(cor.telha, 0.8), 0.12, 0);
  const xc = L / 2 - 1.2;
  const zc = -F / 2 + 1.2;
  obra.por("tijolo", bloco(1.6, 1.2, 1.6, xc, 0, zc), "#7a4a38", 0.1, 0.2);
  obra.por("tijolo", new THREE.CylinderGeometry(0.55, 0.75, A * 2.1, 8).translate(xc, 1.2 + A * 1.05, zc), "#8a5040", 0.12, 0);
  obra.por("tijolo", new THREE.CylinderGeometry(0.72, 0.72, 0.4, 8).translate(xc, 1.2 + A * 2.1, zc), "#6a3a2c", 0.1, 0);
  // Feixes de cana encostados na frente.
  for (let i = 0; i < 3; i++) obra.por("palha", bloco(1.8, 0.42, 0.5, -L / 2 + 1.4, i * 0.42, F / 2 + 0.6 + (i % 2) * 0.1), "#8a9a4a", 0.2, 0.3);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorFesta(p) };
}

// ───────────────────────────── praça: coreto, mirante, estátua ─────────────────────────────

/** Coreto octogonal: base de pedra com escada, esteios, guarda-corpo de tábua, telhado em pirâmide. */
function coreto(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const R = Math.min(p.largura, p.fundo) / 2 - 0.1;
  const obra = new Obra(81);
  const t = new Obra(82);
  const hb = 1.0;
  const hp = Math.max(2.4, Math.min(3.2, p.altura - hb - 1.4));
  obra.por("cantaria", new THREE.CylinderGeometry(R, R + 0.1, hb, 8).rotateY(Math.PI / 8).translate(0, hb / 2, 0), "#bdb29c", 0.08, 0.3);
  obra.por("cantaria", bloco(1.6, 0.5, 0.8, 0, 0, R + 0.3), "#a89e88", 0.08, 0.3);
  const tinta = r() < 0.5 ? "#e6dcc2" : "#7fa2b6";
  const ri = R - 0.2;
  const apotema = ri * Math.cos(Math.PI / 8);
  const lado = 2 * ri * Math.sin(Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    obra.por("madeira", bloco(0.16, hp, 0.16, Math.sin(a) * ri, hb, Math.cos(a) * ri), tinta, 0.08, 0);
    if (i === 0) continue; // lado da frente: a escada
    const m = (i * Math.PI) / 4;
    for (const g of guardaCorpo(lado - 0.16, 0.9)) obra.por("madeira", g.translate(0, hb, apotema).rotateY(m), tinta, 0.08, 0);
  }
  const yt = hb + hp;
  obra.por("madeira", new THREE.CylinderGeometry(R - 0.05, R - 0.05, 0.3, 8, 1, true).rotateY(Math.PI / 8).translate(0, yt, 0), tinta, 0.08, 0);
  t.por("telha", new THREE.ConeGeometry(R + 0.6, R * 0.8, 8).rotateY(Math.PI / 8).translate(0, yt + 0.15 + R * 0.4, 0), cor.telha, 0.1, 0);
  t.por("ferro", bloco(0.08, 1.0, 0.08, 0, yt + 0.15 + R * 0.8 - 0.1, 0), "#2a2826", 0.02, 0);
  lampiaoPendurado(obra, 0, yt - 0.05, 0);
  for (let i = 0; i < 8; i += 2) {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    bandeirinhas(obra, v(Math.sin(a) * ri, yt - 0.1, Math.cos(a) * ri), v(Math.sin(a + Math.PI / 2) * ri, yt - 0.1, Math.cos(a + Math.PI / 2) * ri), r, 0.35);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

/** Mirante de tábua pintada (torre comum): plataforma coberta e bandeirinhas descendo. */
function mirante(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(85);
  const t = new Obra(86);
  const tinta = TABUAS[Math.floor(r() * TABUAS.length)];
  const hp = A - 2.4;
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) obra.por("madeira", bloco(0.26, A, 0.26, (x * L) / 2.6, 0, (z * F) / 2.6), "#5a4028", 0.1, 0);
  for (const y of [hp * 0.33, hp * 0.66]) faixa(obra, (L * 2) / 2.6, (F * 2) / 2.6, y, 0.14, "madeira", "#5a4028", 0.1);
  obra.por("madeira", bloco(L * 0.92, 0.25, F * 0.92, 0, hp, 0), tinta, 0.1, 0);
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) balaustrada(obra, f, L * 0.92, F * 0.92, 0, hp + 0.25, L * 0.88, 0, tinta, 1.0);
  for (const g of telhado("quatro-aguas", L * 0.95, F * 0.95, A, 1.5, 0.35)) t.por("telha", g, cor.telha, 0.1, 0);
  lambrequim(obra, "frente", L * 0.95, F * 0.95, L * 0.95 + 0.7, A - 0.15, 0.3, CAL);
  for (const s of [-1, 1]) bandeirinhas(obra, v(s * L * 0.4, A - 0.3, F * 0.4), v(s * L * 0.5, 0.6 + A * 0.15, F / 2 + 2.6), r, 0.6);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

/** Estátua de Ismael: pedestal de cantaria com degraus, bronze esverdeado pela chuva, chapéu erguido, lampiões nos cantos. */
function estatua(p: PredioLocal): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(95);
  const pedra = "#b9b09c";
  obra.por("cantaria", bloco(L, 0.3, F, 0, 0, 0), "#9a917e", 0.08, 0.3);
  obra.por("cantaria", bloco(L * 0.78, 0.3, F * 0.78, 0, 0.3, 0), pedra, 0.08, 0.2);
  const hp = A * 0.36;
  obra.por("cantaria", bloco(L * 0.5, hp, F * 0.5, 0, 0.6, 0), pedra, 0.06, 0.1);
  obra.por("cantaria", bloco(L * 0.58, 0.22, F * 0.58, 0, 0.6 + hp, 0), "#c9c0aa", 0.04, 0);
  obra.por("ferro", bloco(L * 0.3, 0.4, 0.04, 0, 0.6 + hp * 0.45, F * 0.25 + 0.02), "#7a6a3a", 0.05, 0);
  const y0 = 0.82 + hp;
  const k = (A - y0) / 2.45;
  const bronze = (g: THREE.BufferGeometry) => obra.por("ferro", g, "#5e7a68", 0.12, 0);
  bronze(bloco(0.95 * k, 0.12 * k, 0.7 * k, 0, y0, 0));
  for (const s of [-1, 1]) bronze(new THREE.CylinderGeometry(0.11 * k, 0.13 * k, 0.9 * k, 6).translate(s * 0.15 * k, y0 + 0.57 * k, 0));
  bronze(new THREE.CylinderGeometry(0.2 * k, 0.24 * k, 0.75 * k, 7).translate(0, y0 + 1.35 * k, 0));
  bronze(new THREE.ConeGeometry(0.48 * k, 0.7 * k, 7).translate(0, y0 + 1.3 * k, 0));
  bronze(new THREE.SphereGeometry(0.15 * k, 7, 5).translate(0, y0 + 1.86 * k, 0));
  bronze(new THREE.CylinderGeometry(0.07 * k, 0.07 * k, 0.75 * k, 5).rotateZ(-0.5).translate(0.36 * k, y0 + 1.95 * k, 0));
  bronze(new THREE.CylinderGeometry(0.26 * k, 0.26 * k, 0.04 * k, 9).translate(0.55 * k, y0 + 2.28 * k, 0));
  bronze(new THREE.CylinderGeometry(0.11 * k, 0.13 * k, 0.16 * k, 7).translate(0.55 * k, y0 + 2.36 * k, 0));
  bronze(new THREE.CylinderGeometry(0.06 * k, 0.06 * k, 0.65 * k, 5).rotateZ(0.25).translate(-0.3 * k, y0 + 1.25 * k, 0.05 * k));
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) poste(obra, x * (L / 2 - 0.2), z * (F / 2 - 0.2), 2.2);
  return { corpo: obra.pecas(), telhado: [], interior: [] };
}

// ───────────────────────────── feira e ruína ─────────────────────────────

function tenda(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(87);
  const alto = Math.max(2.3, Math.min(A, 2.8));
  barraca(obra, 0, 0, L - 0.2, F - 0.2, cor.lona, r, alto);
  for (let i = 0; i < 3; i++) obra.por("palha", new THREE.CylinderGeometry(0.28, 0.22, 0.45, 7).translate(-L / 2 + 0.5 + i * 0.65, 0.22, F / 2 + 0.4), "#b89a5a", 0.15, 0.2);
  if (r() < 0.6) bandeirinhas(obra, v(-L / 2, alto + 0.05, -F / 2), v(L / 2, alto + 0.05, -F / 2), r, 0.25);
  return { corpo: obra.pecas(), telhado: [], interior: interiorFesta(p) };
}

/** Ruína: casa colorida que a chuva derrubou. Paredes cortadas, tijolo à mostra, caibros soltos. */
function ruina(p: PredioLocal, r: () => number, cor: Paleta, nivel: NivelPredio): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(91);
  const e = 0.4;
  const trecho = (w: number, d: number, x: number, z: number) => {
    const partes = nivel === 1 ? 1 : Math.max(1, Math.round(Math.max(w, d) / 2.2));
    for (let i = 0; i < partes; i++) {
      const h = A * (nivel === 1 ? 0.6 : 0.25 + r() * 0.75);
      if (nivel === 0 && r() < 0.15) continue;
      const t = i / partes - 0.5 + 0.5 / partes;
      const [bx, bz] = w > d ? [x + t * w, z] : [x, z + t * d];
      const [bw, bd] = [w > d ? w / partes : e, w > d ? e : d / partes];
      obra.por("tijolo", bloco(bw, h, bd, bx, 0, bz), "#8a5040", 0.15, 0.3);
      if (nivel === 0 && h > 1.2) obra.por("reboco", bloco(bw + 0.04, h * (0.4 + r() * 0.5), bd + 0.04, bx, 0, bz), escurecer(cor.fachada, 0.85), 0.15, 0.3);
    }
  };
  trecho(L, e, 0, F / 2 - e / 2);
  trecho(L, e, 0, -F / 2 + e / 2);
  trecho(e, F, -L / 2 + e / 2, 0);
  trecho(e, F, L / 2 - e / 2, 0);
  if (nivel === 0) {
    for (let i = 0; i < 3; i++) obra.por("madeira", bloco(0.14, 0.14, F * 0.8, 0, 0, 0).rotateX(0.4 + r() * 0.3).translate((r() - 0.5) * L * 0.7, A * 0.35, 0), "#4a3828", 0.1, 0);
    for (let i = 0; i < 5; i++) obra.por("telha", bloco(0.7 + r(), 0.2 + r() * 0.3, 0.5 + r(), (r() - 0.5) * L * 0.7, 0, (r() - 0.5) * F * 0.7), cor.telha, 0.15, 0);
  }
  return { corpo: obra.pecas(), telhado: [], interior: nivel === 0 ? interiorFesta(p) : [] };
}

// ───────────────────────────── longe (nível 1) ─────────────────────────────

/** Volume, telhado e cor: a fachada colorida, a lama no pé e o perfil de cada tipo. */
function longe(p: PredioLocal, cor: Paleta): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(1);
  const t = new Obra(2);
  const roof = (alto: number, girar = false, mat: "telha" | "telha-escura" = "telha", c: Cor = cor.telha, parede: Cor = cor.fachada) => {
    const g = girar ? telhado("duas-aguas", F, L, A, alto, 0.7)[0].rotateY(Math.PI / 2) : telhado("duas-aguas", L, F, A, alto, 0.9)[0];
    t.por(mat, g, c, 0.1, 0);
    for (const e of girar ? empenas(F, L, A, alto).map((g2) => g2.rotateY(Math.PI / 2)) : empenas(L, F, A, alto)) obra.por("reboco", e, parede, 0.05, 0);
  };
  const caixa = (c: Cor = cor.fachada, mat: "reboco" | "madeira" = "reboco") => {
    obra.por(mat, bloco(L, A, F, 0, 0, 0), c, 0.08, 0.2);
    obra.por("terra", bloco(L + 0.1, 0.5, F + 0.1, 0, 0, 0), LAMA, 0.1, 0);
    if (mat === "reboco") obra.por("reboco", bloco(L + 0.16, 0.25, F + 0.16, 0, A - 0.25, 0), CAL, 0.04, 0);
  };
  const canon: Record<string, string> = { "salao-bom-de-gole": "#b4483c", "hotel-versailles": "#e3bcae", "conselho-hoteleiros": "#cfa04e", universidade: "#9db4c0", delegacia: "#8aa0a6" };
  const fachada = canon[p.id] ?? cor.fachada;
  switch (p.tipo) {
    case "torre":
      if (p.id === "estatua-ismael") {
        obra.por("cantaria", bloco(L * 0.6, A * 0.45, F * 0.6, 0, 0, 0), "#b9b09c", 0.06, 0);
        obra.por("ferro", new THREE.CylinderGeometry(0.4, 0.5, A * 0.55, 5).translate(0, A * 0.72, 0), "#5e7a68", 0.08, 0);
      } else {
        obra.por("madeira", new THREE.CylinderGeometry(L / 2 - 0.3, L / 2 - 0.3, A * 0.7, 8, 1, true).translate(0, A * 0.35, 0), "#e6dcc2", 0.06, 0);
        t.por("telha", new THREE.ConeGeometry(L / 2 + 0.3, 1.8, 8).translate(0, A * 0.7 + 0.9, 0), cor.telha, 0.08, 0);
      }
      break;
    case "tenda":
      obra.por("madeira", bloco(L * 0.9, 0.9, F * 0.5, 0, 0, F * 0.2), "#7a5a3a", 0.1, 0);
      t.por("lona", telhado("uma-agua", L, F, Math.min(A, 2.6) - 0.4, 0.4, 0.1, 0.05)[0], cor.lona, 0.08, 0);
      break;
    case "igreja": {
      const c = L < 14 ? "#ece2c8" : "#e0c46e";
      caixa(c);
      roof(L * 0.36, true, "telha", cor.telha, c);
      const lado = Math.max(2.8, Math.min(4.2, L * 0.28));
      const h = L * 0.2 + lado * 1.2 + 3;
      obra.por("reboco", bloco(lado, h, lado, 0, A, F / 2 - lado / 2), c, 0.05, 0);
      t.por("telha-escura", new THREE.ConeGeometry(lado * 0.55, lado * 0.8, 6).translate(0, A + h + lado * 0.4, F / 2 - lado / 2), "#7e8a86", 0.06, 0);
      break;
    }
    case "galpao":
    case "estacao":
    case "moinho":
    case "fabrica": {
      const tinta = p.tipo === "fabrica" ? "#c99a5a" : TABUAS[Math.floor((L * 7 + F) % TABUAS.length)];
      caixa(tinta, p.tipo === "fabrica" ? "reboco" : "madeira");
      roof(L * 0.3, true, "telha-escura", escurecer(cor.telha, 0.85), tinta);
      if (p.tipo === "fabrica") obra.por("tijolo", new THREE.CylinderGeometry(0.6, 0.75, A * 2.2, 6).translate(L / 2 - 1.2, A * 1.1, -F / 2 + 1.2), "#8a5040", 0.1, 0);
      break;
    }
    case "hotel":
      caixa(fachada);
      if (p.id === "hotel-versailles") for (const g of mansarda(L, F, A, 2.6, 1.1, 0.35).slice(0, 2)) t.por("telha-escura", g, "#4c5560", 0.06, 0);
      else {
        roof(F * 0.26);
        if (A >= 6.4) obra.por("madeira", bloco(L - 0.4, 0.25, 1.0, 0, PAV, F / 2 + 0.5), cor.madeira, 0.08, 0);
      }
      break;
    case "saloon":
      caixa(fachada);
      roof(F * 0.17, false, "telha", cor.telha, fachada);
      obra.por("reboco", bloco(L, F * 0.17 + 1.0, 0.3, 0, A, F / 2 - 0.15), fachada, 0.06, 0);
      obra.por("madeira", bloco(L, 0.25, 2.4, 0, 3.0, F / 2 + 1.2), cor.madeira, 0.08, 0);
      break;
    case "publico":
    case "banco":
      caixa(fachada);
      t.por("telha", telhado("quatro-aguas", L, F, A, Math.min(L, F) * 0.24, 0.8)[0], cor.telha, 0.1, 0);
      break;
    case "ruina":
      return ruina(p, sorteio(5), cor, 1);
    default:
      caixa();
      roof(F * 0.27);
      if (A >= 6.4) obra.por("madeira", bloco(L - 0.4, 0.25, 1.0, 0, PAV, F / 2 + 0.5), cor.madeira, 0.08, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

// ───────────────────────────── despacho ─────────────────────────────

export function gerarFesta(p: PredioLocal, nivel: NivelPredio, semente: number): PecasDoPredio {
  const r = sorteio(semente);
  const cor = paletaFesta(r);
  if (nivel === 1) return longe(p, cor);
  switch (p.id) {
    case "salao-bom-de-gole":
      return saloon(p, r, cor, true);
    case "hotel-versailles":
      return versailles(p, r);
    case "conselho-hoteleiros":
      return publico(p, r, cor, "conselho");
    case "universidade":
      return publico(p, r, cor, "universidade");
    case "delegacia":
      return publico(p, r, cor, "delegacia");
    case "estatua-ismael":
      return estatua(p);
  }
  switch (p.tipo) {
    case "comercio":
      return /mercado/i.test(p.nome) ? pavilhao(p, r, cor, true) : casa(p, r, cor, { loja: true, letreiro: r() < 0.5 ? "#e2d2a8" : "#3a2a1c" });
    case "saloon":
      return saloon(p, r, cor);
    case "hotel":
      return hotel(p, r, cor);
    case "igreja":
      return igreja(p, r, cor);
    case "publico":
      return publico(p, r, cor, /espet/i.test(p.nome) ? "espetaculos" : "comum");
    case "banco":
      return publico(p, r, cor, "banco");
    case "estacao":
      return estacao(p, r, cor);
    case "galpao":
      return /festa/i.test(p.nome) ? pavilhao(p, r, cor, false) : galpao(p, r, cor);
    case "fazenda":
      return fazenda(p, r, cor);
    case "moinho":
      return moinho(p, r, cor);
    case "fabrica":
      return fabrica(p, r, cor);
    case "torre":
      return p.altura >= 8 && Math.min(p.largura, p.fundo) < 6 ? mirante(p, r, cor) : coreto(p, r, cor);
    case "tenda":
      return tenda(p, r, cor);
    case "ruina":
      return ruina(p, r, cor, 0);
    default:
      return casa(p, r, cor);
  }
}

const estilo: Estilo = { id: "festa", nome: "Festa e lama (Bom Fim)", gerar: gerarFesta };

export default estilo;
