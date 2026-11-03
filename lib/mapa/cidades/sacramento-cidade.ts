// Sacramento, a antiga capital (Doc 2 §5.3, pp. 168–181): ruínas incendiadas, vegetação retomando edifícios.
// O livro e o Doc 2 não citam prédio nem rua pelo nome: tudo aqui é criação nossa, a partir da imagem oficial
// (campanário de igreja entre paredes queimadas, ruas de pedra rachada, mata subindo pelas ruínas).
// Os caminhos saem na direção real de Santo Ozório (oeste), Bom Fim (nordeste), Desemboque (leste-sudeste),
// Araçuaí (sudoeste) e do norte; as cidades vizinhas ficam a centenas de km, então as estradas só terminam na borda.

import type { Area, Predio, Rua, TipoPredio, XZ } from "../tipos";
import { quarteirao, sorteio } from "./kit";

const PASSO_BLOCO = 150;
const bx = (i: number) => -300 + PASSO_BLOCO * i;
const bz = (j: number) => -300 + PASSO_BLOCO * j;

type Marco = [id: string, nome: string, tipo: TipoPredio, i: number, j: number, lado: "n" | "s", deslocamento: number, largura: number, fundo: number, altura: number];

// Prédios entráveis do centro, encostados na rua do seu quarteirão com a porta para ela.
const MARCOS: Marco[] = [
  ["camara", "Casa de Câmara", "publico", 2, 1, "s", 40, 22, 16, 8],
  ["sobrado-praca", "Sobrado", "casa", 2, 1, "n", 100, 14, 14, 7],
  ["banco", "Banco", "banco", 0, 1, "n", 40, 18, 14, 7],
  ["hotel", "Hotel", "hotel", 0, 1, "s", 70, 24, 18, 8],
  ["saloon", "Saloon", "saloon", 1, 2, "n", 40, 20, 14, 6],
  ["armazem", "Armazém", "comercio", 1, 2, "s", 100, 18, 14, 6],
  ["cadeia", "Cadeia", "publico", 2, 2, "n", 40, 16, 14, 6],
  ["ferraria", "Ferraria", "galpao", 2, 2, "s", 60, 16, 12, 5],
  ["capela-lateral", "Capela", "igreja", 2, 0, "n", 40, 12, 16, 8],
  ["farmacia", "Farmácia", "comercio", 2, 0, "s", 100, 14, 12, 5],
  ["escola", "Escola", "publico", 1, 0, "s", 60, 20, 14, 6],
  ["casa-grande", "Casa grande", "casa", 0, 2, "n", 60, 14, 12, 6],
  ["hospital", "Hospital", "publico", 0, 2, "s", 50, 24, 16, 7],
];

const marcos: Predio[] = MARCOS.map(([id, nome, tipo, i, j, lado, dx, largura, fundo, altura]) => ({
  id,
  nome,
  tipo,
  x: bx(i) + dx,
  z: lado === "n" ? bz(j) + 9 + fundo / 2 : bz(j) + PASSO_BLOCO - 9 - fundo / 2,
  largura,
  fundo,
  altura,
  entravel: true,
  porta: lado,
}));

const predioAMao: Predio[] = [
  { id: "igreja-matriz", nome: "Igreja Matriz", tipo: "igreja", x: -75, z: -95, largura: 16, fundo: 28, altura: 10, entravel: true, porta: "s" },
  { id: "torre-do-sino", nome: "Torre do sino", tipo: "torre", x: -52, z: -100, largura: 8, fundo: 8, altura: 15, entravel: false },
  { id: "capela-do-cemiterio", nome: "Capela do cemitério", tipo: "ruina", x: -575, z: 350, largura: 12, fundo: 12, altura: 6, entravel: true, porta: "l" },
  { id: "fazenda-leste", nome: "Casarão de fazenda", tipo: "fazenda", x: 1050, z: -90, largura: 24, fundo: 16, altura: 6, entravel: true, porta: "s" },
  { id: "fazenda-oeste", nome: "Casarão de fazenda", tipo: "fazenda", x: -1150, z: 100, largura: 24, fundo: 16, altura: 6, entravel: true, porta: "s" },
  { id: "fazenda-nordeste", nome: "Casarão de fazenda", tipo: "fazenda", x: 1350, z: -668, largura: 24, fundo: 16, altura: 6, entravel: true, porta: "s" },
  { id: "galpao-da-estrada", nome: "Galpão da estrada", tipo: "galpao", x: 1500, z: 485, largura: 18, fundo: 12, altura: 5, entravel: true, porta: "s" },
  { id: "casa-da-estrada-oeste", nome: "Casa de beira de estrada", tipo: "casa", x: -1400, z: -432, largura: 10, fundo: 10, altura: 4, entravel: true, porta: "s" },
  { id: "casa-da-estrada-norte", nome: "Casa de beira de estrada", tipo: "casa", x: 12, z: -1300, largura: 10, fundo: 10, altura: 4, entravel: true, porta: "o" },
];

const retangulo = (x0: number, z0: number, x1: number, z1: number): XZ[] => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

const areas: Area[] = [
  { tipo: "praca", pts: retangulo(-140, -140, -10, -10) },
  { tipo: "mata", pts: retangulo(-1100, -800, -800, -550) },
  { tipo: "mata", pts: retangulo(250, -1100, 650, -850) },
  { tipo: "mata", pts: retangulo(500, 800, 900, 1200) },
  { tipo: "mata", pts: retangulo(-1300, 400, -950, 750) },
  { tipo: "mata", pts: retangulo(1000, -420, 1300, -200) },
  { tipo: "cemiterio", pts: retangulo(-640, 372, -500, 470) },
  { tipo: "lavoura", pts: retangulo(950, 0, 1250, 170) },
  { tipo: "pasto", pts: retangulo(-1300, 160, -950, 300) },
  { tipo: "pasto", pts: retangulo(1200, -560, 1500, -380) },
  { tipo: "rochas", pts: retangulo(-420, -1600, -330, -1520) },
  { tipo: "rochas", pts: retangulo(700, 1300, 780, 1380) },
];

const GRADE = [-300, -150, 0, 150, 300];

const ruas: Rua[] = [
  ...GRADE.map((v): Rua => ({ pts: [[-300, v], [300, v]], largura: v === 0 ? 10 : 8, piso: v === 0 ? "pedra" : "terra" })),
  ...GRADE.map((v): Rua => ({ pts: [[v, -300], [v, 300]], largura: v === 0 ? 10 : 8, piso: v === 0 ? "pedra" : "terra" })),
  { pts: [[-1700, -500], [-1100, -300], [-700, -110], [-300, 0]], largura: 8, piso: "terra" },
  { pts: [[300, 0], [800, 150], [1250, 420], [1650, 570]], largura: 8, piso: "terra" },
  { pts: [[300, -300], [600, -520], [900, -760], [1300, -1050]], largura: 7, piso: "terra" },
  { pts: [[0, -300], [-30, -800], [-20, -1400], [-30, -1780]], largura: 6, piso: "terra" },
  { pts: [[0, 300], [-250, 700], [-650, 1050], [-1100, 1350]], largura: 6, piso: "terra" },
  { pts: [[-300, 300], [-420, 340], [-520, 350]], largura: 4, piso: "terra" },
  { pts: [[-300, -150], [-520, -200], [-760, -180]], largura: 5, piso: "terra" },
  { pts: [[300, 150], [520, 260], [700, 420], [760, 600]], largura: 5, piso: "terra" },
  { pts: [[150, 300], [250, 520], [400, 760], [480, 1000]], largura: 5, piso: "terra" },
  { pts: [[300, -150], [540, -130], [740, -250], [920, -300]], largura: 5, piso: "terra" },
  { pts: [[-150, -300], [-300, -520], [-480, -720], [-620, -900]], largura: 5, piso: "terra" },
  { pts: [[150, -300], [260, -560], [380, -780]], largura: 4, piso: "terra" },
  { pts: [[1050, -70], [1050, 300]], largura: 3, piso: "terra" },
  { pts: [[-1150, 125], [-1000, -60], [-880, -200]], largura: 3, piso: "terra" },
  { pts: [[1350, -650], [1200, -800], [1080, -890]], largura: 3, piso: "terra" },
];

// Preenchimento: quarteirões do centro (mais denso perto da praça) e ruínas espalhadas, rareando até o campo.
const centro: Predio[] = [];
for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) {
    if (i === 1 && j === 1) continue;
    const doMarco = (lado: "n" | "s") => MARCOS.some((m) => m[3] === i && m[4] === j && m[5] === lado);
    const denso = Math.abs(i - 1.5) + Math.abs(j - 1.5) <= 2;
    centro.push(
      ...quarteirao({
        id: `q${i}${j}`,
        nome: "Ruína",
        tipo: "ruina",
        x0: bx(i) + 10,
        x1: bx(i) + PASSO_BLOCO - 10,
        z0: bz(j) + (doMarco("n") ? 39 : 10),
        z1: bz(j) + PASSO_BLOCO - (doMarco("s") ? 39 : 10),
        largura: [9, 15],
        fundo: [9, 13],
        altura: [2, 6],
        vao: denso ? 17 : 26,
        seed: 100 + i * 10 + j,
      }),
    );
  }
}

const exclusoes = areas.map((a) => {
  const xs = a.pts.map((p) => p[0]);
  const zs = a.pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
});

const amostrasDeRua = ruas.flatMap((r) => {
  const pontos: { x: number; z: number; meia: number }[] = [];
  for (let k = 1; k < r.pts.length; k++) {
    const [a, b] = [r.pts[k - 1], r.pts[k]];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
    for (let s = 0; s <= n; s++) pontos.push({ x: a[0] + ((b[0] - a[0]) * s) / n, z: a[1] + ((b[1] - a[1]) * s) / n, meia: r.largura / 2 });
  }
  return pontos;
});

const noCaminho = (p: Predio) =>
  amostrasDeRua.some((s) => Math.hypot(Math.max(Math.abs(s.x - p.x) - p.largura / 2, 0), Math.max(Math.abs(s.z - p.z) - p.fundo / 2, 0)) < s.meia + 2.5);

const naArea = (p: Predio) =>
  exclusoes.some((e) => p.x + p.largura / 2 > e.x0 - 3 && p.x - p.largura / 2 < e.x1 + 3 && p.z + p.fundo / 2 > e.z0 - 3 && p.z - p.fundo / 2 < e.z1 + 3);

const colado = (a: Predio, b: Predio) => {
  const folga = a.entravel || b.entravel ? 6 : 2.5;
  return Math.abs(a.x - b.x) < (a.largura + b.largura) / 2 + folga && Math.abs(a.z - b.z) < (a.fundo + b.fundo) / 2 + folga;
};

const fixos: Predio[] = [...predioAMao, ...marcos].map((p) => ({ ...p, altura: p.altura }));
const aceitos: Predio[] = [...fixos];
const aceitar = (p: Predio) => {
  if (noCaminho(p) || naArea(p) || aceitos.some((o) => colado(p, o))) return;
  aceitos.push(p);
};
centro.forEach(aceitar);

const sorte = sorteio(777);
const entre = (a: number, b: number) => Math.round(a + sorte() * (b - a));
const PASSO_ESPALHO = 44;
let n = 0;
for (let x = -1750; x <= 1750; x += PASSO_ESPALHO) {
  for (let z = -1750; z <= 1750; z += PASSO_ESPALHO) {
    const px = x + entre(-10, 10);
    const pz = z + entre(-10, 10);
    const r = Math.hypot(px, pz);
    if (r > 1740 || (Math.abs(px) <= 312 && Math.abs(pz) <= 312)) continue;
    const chance = 0.3 * Math.exp(-(r - 300) / 330);
    if (sorte() > chance) continue;
    const dado = sorte();
    const rural = r > 1000;
    const tipo: TipoPredio = dado < 0.82 ? "ruina" : dado < 0.94 ? "casa" : "galpao";
    n++;
    aceitar({
      id: `r${n}`,
      nome: tipo === "ruina" ? "Ruína" : tipo === "casa" ? "Casa" : rural ? "Celeiro" : "Oficina",
      tipo,
      x: px,
      z: pz,
      largura: entre(8, tipo === "galpao" ? 16 : 13),
      fundo: entre(8, tipo === "galpao" ? 14 : 12),
      altura: tipo === "ruina" ? entre(2, 5) : entre(3, 5),
      entravel: false,
    });
  }
}

const cidade = {
  id: "sacramento-cidade",
  nome: "Sacramento",
  tipo: "cidade" as const,
  raio: 1800,
  chao: "cinzas" as const,
  especie: "copa" as const,
  arvores: 260,
  chegada: { x: -340, z: 0 },
  predios: aceitos,
  ruas,
  areas,
};

export default cidade;
