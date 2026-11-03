// Belo Horizonte (Doc 2 §5.3, pp. 152–167): fronteira industrial e litorânea, porto, bondes, desigualdade e corrupção.
// Canônicos: Casa da Moeda, hospitais, prefeitura, estação, Cidade-Oriental (bairro e praça), Comando das Seis Balas e a polícia de BH (quartel).
// Criação nossa: o traçado, os nomes dos hospitais, a alfândega, a capitania, o farol, o mercado, o templo e a casa de chá orientais, o teatro,
// a escola, as fábricas, os hotéis e demais prédios entráveis, as linhas de bonde e todo o preenchimento. A baía fica a leste e o trilho
// chega do noroeste (Tupaciguara); a estrada de Desemboque sai a oeste e a do sul segue para o litoral meridional.

import type { Area, Cidade, Face, Piso, Predio, Rua, TipoPredio } from "../tipos";
import { fileira, quarteirao, sorteio } from "./kit";
import { dentroDoPoligono, distanciaAoSegmento } from "../zona";

const RAIO = 2500;

type Caixa = { x0: number; z0: number; x1: number; z1: number };
type Perfil = { nome: string; tipo?: TipoPredio; largura: [number, number]; fundo: [number, number]; altura: [number, number]; vao: number };
type Malha = Perfil & { id: string; xs: number[]; zs: number[]; rua: number; piso: Piso; margem: number; seed: number; pula?: string[] };

const bloco = (m: Pick<Malha, "xs" | "zs" | "margem">, i: number, j: number): Caixa => ({
  x0: m.xs[i] + m.margem,
  x1: m.xs[i + 1] - m.margem,
  z0: m.zs[j] + m.margem,
  z1: m.zs[j + 1] - m.margem,
});

const encher = (id: string, c: Caixa, p: Perfil, seed: number) => quarteirao({ ...p, ...c, id, seed });

/** Grade de ruas com os quarteirões preenchidos; `pula` lista os "i,j" que o texto monta à mão. */
function malha(m: Malha) {
  const [xa, xb, za, zb] = [m.xs[0], m.xs[m.xs.length - 1], m.zs[0], m.zs[m.zs.length - 1]];
  const ruas: Rua[] = [
    ...m.xs.map((x): Rua => ({ pts: [[x, za], [x, zb]], largura: m.rua, piso: m.piso })),
    ...m.zs.map((z): Rua => ({ pts: [[xa, z], [xb, z]], largura: m.rua, piso: m.piso })),
  ];
  const predios: Predio[] = [];
  for (let i = 0; i < m.xs.length - 1; i++) {
    for (let j = 0; j < m.zs.length - 1; j++) {
      if (!m.pula?.includes(`${i},${j}`)) predios.push(...encher(`${m.id}-${i}-${j}`, bloco(m, i, j), m, m.seed + i * 17 + j * 5));
    }
  }
  return { ruas, predios };
}

/** Prédio entrável colado a uma borda do quarteirão, com a porta para a rua dessa borda. */
function na(b: Caixa, face: Face, id: string, nome: string, tipo: TipoPredio, largura: number, fundo: number, altura: number, ao = 0.5, canon = false): Predio {
  const x = face === "l" ? b.x1 - 1.5 - largura / 2 : face === "o" ? b.x0 + 1.5 + largura / 2 : b.x0 + ao * (b.x1 - b.x0);
  const z = face === "s" ? b.z1 - 1.5 - fundo / 2 : face === "n" ? b.z0 + 1.5 + fundo / 2 : b.z0 + ao * (b.z1 - b.z0);
  return { id, nome, tipo, x, z, largura, fundo, altura, entravel: true, porta: face, ...(canon ? { canon: true } : {}) };
}

/** O que sobra do quarteirão depois de um prédio de `medida` metros colado à borda `face`. */
function resto(b: Caixa, face: Face, medida: number): Caixa {
  const r = 4.5 + medida;
  if (face === "n") return { ...b, z0: b.z0 + r };
  if (face === "s") return { ...b, z1: b.z1 - r };
  if (face === "l") return { ...b, x1: b.x1 - r };
  return { ...b, x0: b.x0 + r };
}

type Solto = Perfil & { id: string; caixa: Caixa; n: number; seed: number };

/** Casario irregular (periferia, sítios): sorteia posições sem tocar em prédios, ruas, água, roças e matas. */
function espalhar(o: Solto, ocupado: Predio[], ruas: Rua[], barreiras: Area[]): Predio[] {
  const r = sorteio(o.seed);
  const entre = ([a, b]: [number, number]) => Math.round(a + r() * (b - a));
  const novos: Predio[] = [];
  for (let t = 0; t < o.n * 40 && novos.length < o.n; t++) {
    const [w, d] = [entre(o.largura), entre(o.fundo)];
    const x = Math.round(o.caixa.x0 + r() * (o.caixa.x1 - o.caixa.x0));
    const z = Math.round(o.caixa.z0 + r() * (o.caixa.z1 - o.caixa.z0));
    if (Math.hypot(Math.abs(x) + w / 2, Math.abs(z) + d / 2) > RAIO - 5) continue;
    const meia = Math.hypot(w, d) / 2;
    if (ruas.some((ru) => ru.pts.some((p, i) => i > 0 && distanciaAoSegmento(x, z, ru.pts[i - 1], p) < meia + ru.largura / 2 + 1.5))) continue;
    if (barreiras.some((a) => dentroDoPoligono(x, z, a.pts))) continue;
    if (ocupado.concat(novos).some((p) => Math.abs(p.x - x) < (p.largura + w) / 2 + 3 && Math.abs(p.z - z) < (p.fundo + d) / 2 + 3)) continue;
    novos.push({ id: `${o.id}-${novos.length + 1}`, nome: o.nome, tipo: o.tipo ?? "casa", x, z, largura: w, fundo: d, altura: entre(o.altura), entravel: false });
  }
  return novos;
}

const poligono = (c: Caixa): [number, number][] => [[c.x0, c.z0], [c.x1, c.z0], [c.x1, c.z1], [c.x0, c.z1]];

// Centro: quadras de 110 m. O cais fica em x=640 e a baía começa em x=700.
const centro: Malha = {
  id: "c", nome: "Sobrado", tipo: "comercio", xs: [-210, -100, 10, 120, 230, 340, 450], zs: [-330, -220, -110, 0, 110, 220, 330],
  rua: 10, piso: "pedra", margem: 9, largura: [18, 28], fundo: [16, 22], altura: [6, 11], vao: 5, seed: 100,
  pula: ["3,0", "3,1", "3,2", "2,2", "4,2", "1,2", "2,1", "4,1", "3,3", "2,3", "4,3", "1,3", "0,3", "5,3", "1,4", "4,4"],
};
const C = (i: number, j: number) => bloco(centro, i, j);
const g = malha(centro);

const portoOeste: Malha = {
  id: "po", nome: "Loja", tipo: "comercio", xs: [450, 545], zs: centro.zs, rua: 10, piso: "pedra", margem: 12,
  largura: [16, 22], fundo: [14, 18], altura: [4, 8], vao: 6, seed: 200, pula: ["0,2", "0,4"],
};
const portoLeste: Malha = {
  id: "pl", nome: "Armazém", tipo: "galpao", xs: [545, 640], zs: centro.zs, rua: 10, piso: "pedra", margem: 12,
  largura: [18, 26], fundo: [12, 16], altura: [6, 9], vao: 3, seed: 210, pula: ["0,1", "0,3", "0,4"],
};
const PO = (i: number, j: number) => bloco(portoOeste, i, j);
const PL = (i: number, j: number) => bloco(portoLeste, i, j);
const gpo = malha(portoOeste);
const gpl = malha(portoLeste);

const oriental: Malha = {
  id: "o", nome: "Casa", xs: [140, 230, 320, 410, 500], zs: [330, 420, 510, 600], rua: 6, piso: "pedra", margem: 7,
  largura: [10, 14], fundo: [10, 14], altura: [3, 6], vao: 5, seed: 300, pula: ["1,0", "3,0", "1,1", "2,1", "2,2"],
};
const O = (i: number, j: number) => bloco(oriental, i, j);
const go = malha(oriental);

const industrial: Malha = {
  id: "i", nome: "Fábrica", tipo: "fabrica", xs: [-300, -100, 100, 300, 500], zs: [-850, -650, -450], rua: 12, piso: "terra", margem: 12,
  largura: [22, 34], fundo: [18, 26], altura: [8, 14], vao: 28, seed: 400, pula: ["0,1", "1,1", "2,1", "3,1"],
};
const I = (i: number, j: number) => bloco(industrial, i, j);
const gi = malha(industrial);

const bairroAlto: Malha = {
  id: "a", nome: "Casarão", xs: [-690, -540, -390, -240], zs: [-300, -150, 0, 150, 300, 450], rua: 8, piso: "pedra", margem: 10,
  largura: [14, 20], fundo: [12, 16], altura: [6, 9], vao: 36, seed: 500, pula: ["1,1", "1,3", "2,3", "0,4", "0,0", "2,4"],
};
const A = (i: number, j: number) => bloco(bairroAlto, i, j);
const ga = malha(bairroAlto);

const casaPobre: Perfil = { nome: "Casa", largura: [6, 9], fundo: [6, 8], altura: [3, 4], vao: 3 };

const ruas: Rua[] = [
  ...g.ruas,
  ...gpo.ruas,
  ...go.ruas,
  ...gi.ruas,
  ...ga.ruas,
  { pts: [[-210, 0], [640, 0]], largura: 14, piso: "pedra" },
  { pts: [[230, -330], [230, 600]], largura: 12, piso: "pedra" },
  { pts: [[640, -800], [640, 330]], largura: 16, piso: "pedra" },
  { pts: [[-1100, 0], [640, 0]], largura: 3, piso: "trilho" },
  { pts: [[640, -330], [640, 330]], largura: 3, piso: "trilho" },
  { pts: [[230, 0], [230, 600]], largura: 3, piso: "trilho" },
  { pts: [[-1860, -1470], [-1150, -940], [-700, -580], [-440, -400], [-320, -330], [640, -330]], largura: 4, piso: "trilho" },
  { pts: [[-240, -300], [-210, -300]], largura: 8, piso: "pedra" },
  { pts: [[-240, -150], [-210, -150]], largura: 8, piso: "pedra" },
  { pts: [[-240, 0], [-210, 0]], largura: 8, piso: "pedra" },
  { pts: [[-240, 150], [-210, 150]], largura: 8, piso: "pedra" },
  { pts: [[-240, 300], [-210, 300]], largura: 8, piso: "pedra" },
  { pts: [[-100, -450], [-100, -330]], largura: 8, piso: "terra" },
  { pts: [[100, -450], [100, -330]], largura: 8, piso: "terra" },
  { pts: [[300, -450], [300, -330]], largura: 8, piso: "terra" },
  { pts: [[500, -450], [500, -330]], largura: 8, piso: "terra" },
  { pts: [[-690, 0], [-1260, 0], [-1700, -110], [-2100, -290], [-2410, -540]], largura: 8, piso: "terra" },
  { pts: [[-1100, -180], [-780, -180]], largura: 6, piso: "terra" },
  { pts: [[-1100, 180], [-780, 180]], largura: 6, piso: "terra" },
  { pts: [[-1115, -180], [-1115, 180]], largura: 6, piso: "terra" },
  { pts: [[-770, -180], [-770, 180]], largura: 6, piso: "terra" },
  { pts: [[140, 600], [-20, 900], [-300, 1300], [-620, 1800], [-960, 2300]], largura: 8, piso: "terra" },
  { pts: [[640, -800], [690, -1000], [660, -1500], [610, -2000], [570, -2420]], largura: 8, piso: "terra" },
  { pts: [[640, 330], [650, 700], [690, 1100], [720, 1500], [760, 2000], [780, 2340]], largura: 8, piso: "terra" },
  { pts: [[580, -800], [580, -330]], largura: 5, piso: "terra" },
  { pts: [[-90, 340], [-90, 700]], largura: 5, piso: "terra" },
  { pts: [[320, 600], [380, 800], [470, 1050], [560, 1300]], largura: 5, piso: "terra" },
  { pts: [[-350, 700], [-1100, 820]], largura: 4, piso: "terra" },
  { pts: [[-300, 1000], [-1050, 1200]], largura: 4, piso: "terra" },
  { pts: [[-1100, 0], [-1480, 300]], largura: 4, piso: "terra" },
  { pts: [[-1100, -180], [-1480, -330]], largura: 4, piso: "terra" },
  { pts: [[-320, -480], [-1000, -900]], largura: 4, piso: "terra" },
  { pts: [[-690, -300], [-1050, -520]], largura: 4, piso: "terra" },
  { pts: [[-690, 300], [-1100, 520]], largura: 4, piso: "terra" },
  { pts: [[700, -165], [860, -165]], largura: 12, piso: "madeira" },
  { pts: [[700, 55], [860, 55]], largura: 12, piso: "madeira" },
  { pts: [[700, 275], [860, 275]], largura: 12, piso: "madeira" },
  { pts: [[-1860, -2000], [-1200, -1700]], largura: 4, piso: "terra" },
  { pts: [[-2300, 500], [-1500, 700]], largura: 4, piso: "terra" },
];

const areas: Area[] = [
  {
    tipo: "agua",
    nome: "Baía de BH",
    pts: [
      [1900, -2400], [800, -2400], [780, -1700], [730, -1000], [700, -440],
      [700, -174], [860, -174], [860, -156], [700, -156],
      [700, 46], [860, 46], [860, 64], [700, 64],
      [700, 266], [860, 266], [860, 284], [700, 284],
      [700, 440], [720, 1000], [800, 1700], [930, 2400], [1900, 2400],
    ],
  },
  { tipo: "areia", pts: [[702, -1000], [727, -1000], [755, -1400], [730, -1400]] },
  { tipo: "areia", pts: [[730, -1400], [755, -1400], [777, -1700], [777, -2200], [752, -2200], [752, -1700]] },
  { tipo: "areia", pts: [[690, 460], [715, 460], [745, 1000], [720, 1000]] },
  { tipo: "areia", pts: [[720, 1000], [745, 1000], [800, 1700], [775, 1700]] },
  { tipo: "rochas", pts: [[560, -1500], [610, -1520], [615, -1380], [565, -1360]] },
  { tipo: "rochas", pts: [[640, 1400], [700, 1420], [705, 1520], [645, 1530]] },
  { tipo: "praca", pts: poligono(C(3, 0)) },
  { tipo: "praca", pts: poligono(C(3, 1)) },
  { tipo: "praca", pts: poligono(C(1, 4)) },
  { tipo: "praca", pts: poligono(O(1, 1)), nome: "Cidade-Oriental" },
  { tipo: "praca", pts: poligono(A(1, 3)) },
  { tipo: "cemiterio", pts: [[-900, 520], [-780, 520], [-780, 620], [-900, 620]] },
  { tipo: "mata", pts: [[-1000, -1500], [-400, -1750], [100, -1500], [-200, -1100], [-800, -1150]] },
  { tipo: "mata", pts: [[200, -1900], [500, -1800], [520, -1300], [150, -1250]] },
  { tipo: "mata", pts: [[-1700, 1600], [-1000, 1650], [-900, 2000], [-1500, 2100]] },
  { tipo: "lavoura", pts: [[-2300, 520], [-1700, 520], [-1700, 900], [-2300, 950]] },
  { tipo: "lavoura", pts: [[-1500, 1100], [-1000, 1000], [-950, 1400], [-1450, 1450]] },
  { tipo: "lavoura", pts: [[-300, 1900], [100, 1950], [120, 2350], [-250, 2300]] },
  { tipo: "pasto", pts: [[-1600, 520], [-1250, 540], [-1200, 1000], [-1650, 950]] },
  { tipo: "pasto", pts: [[0, -1180], [420, -1130], [430, -960], [10, -960]] },
  { tipo: "pasto", pts: [[200, 1500], [600, 1550], [620, 1950], [200, 1900]] },
];

const barreiras = areas.filter((a) => a.tipo !== "praca" && a.tipo !== "areia");

const predios: Predio[] = [
  na({ x0: 145, x1: 205, z0: -355, z1: -337 }, "s", "estacao", "Estação", "estacao", 60, 18, 9, 0.5, true),
  na(C(3, 2), "n", "prefeitura", "Prefeitura", "publico", 60, 30, 14, 0.5, true),
  na(C(2, 2), "n", "casa-da-moeda", "Casa da Moeda", "banco", 50, 34, 12, 0.5, true),
  na(C(4, 2), "n", "quartel-da-policia", "Quartel da Polícia", "publico", 44, 30, 10, 0.5, true),
  na(C(1, 2), "n", "hospital-central", "Hospital Central", "publico", 44, 32, 11, 0.5, true),
  na(C(2, 1), "l", "banco", "Banco", "banco", 24, 18, 8),
  na(C(4, 1), "o", "teatro", "Teatro", "publico", 30, 26, 12),
  na(C(3, 3), "n", "saloon-do-centro", "Saloon", "saloon", 28, 20, 6),
  na(C(2, 3), "n", "mercado-municipal", "Mercado Municipal", "comercio", 44, 26, 7),
  na(C(4, 3), "n", "grande-hotel", "Grande Hotel", "hotel", 40, 26, 12),
  na(C(1, 3), "n", "padaria", "Padaria", "comercio", 10, 12, 5, 0.1),
  na(C(1, 3), "n", "farmacia", "Farmácia", "comercio", 10, 12, 5, 0.25),
  na(C(1, 3), "n", "armazem-de-secos", "Armazém", "comercio", 12, 12, 5, 0.42),
  na(C(0, 3), "n", "ferraria", "Ferraria", "comercio", 14, 12, 5, 0.15),
  na(C(0, 3), "n", "oficina-do-centro", "Oficina", "comercio", 14, 12, 5, 0.4),
  na(C(5, 3), "n", "pensao-do-cais", "Pensão do Cais", "hotel", 30, 20, 8, 0.3),
  na(C(1, 4), "n", "igreja-matriz", "Igreja Matriz", "igreja", 20, 32, 16),
  na(C(4, 4), "n", "escola", "Escola", "publico", 34, 22, 8),
  ...[
    [C(3, 2), "n", 30], [C(2, 2), "n", 34], [C(4, 2), "n", 30], [C(1, 2), "n", 32], [C(3, 3), "n", 20],
    [C(2, 3), "n", 26], [C(4, 3), "n", 26], [C(1, 3), "n", 12], [C(0, 3), "n", 12], [C(5, 3), "n", 20], [C(1, 4), "n", 32], [C(4, 4), "n", 22],
    [C(2, 1), "l", 24], [C(4, 1), "o", 30],
  ].flatMap(([b, f, m], k) => encher(`cr-${k}`, resto(b as Caixa, f as Face, m as number), centro, 150 + k)),
  ...fileira({ id: "loja-a", nome: "Loja", tipo: "comercio", x: -36, z: C(1, 3).z0 + 6.5, eixo: "x", quantidade: 3, altura: [4, 8], seed: 11 }),
  ...fileira({ id: "loja-b", nome: "Loja", tipo: "comercio", x: -140, z: C(0, 3).z0 + 6.5, eixo: "x", quantidade: 2, altura: [4, 8], seed: 12 }),
  ...fileira({ id: "loja-c", nome: "Loja", tipo: "comercio", x: 408, z: C(5, 3).z0 + 6.5, eixo: "x", quantidade: 2, altura: [4, 8], seed: 13 }),
  ...g.predios,

  na(PO(0, 2), "n", "taverna-do-cais", "Taverna do Cais", "saloon", 28, 18, 6),
  ...encher("tav-r", resto(PO(0, 2), "n", 18), portoOeste, 211),
  na(PO(0, 4), "n", "hospital-do-porto", "Hospital do Porto", "publico", 40, 30, 10, 0.5, true),
  ...encher("hp-r", resto(PO(0, 4), "n", 30), portoOeste, 212),
  na(PL(0, 1), "l", "armazem-do-cais-1", "Armazém do Cais", "galpao", 44, 18, 8),
  na(PL(0, 3), "l", "armazem-do-cais-2", "Armazém do Cais", "galpao", 44, 18, 8),
  na(PL(0, 4), "l", "armazem-do-cais-3", "Armazém do Cais", "galpao", 44, 18, 8),
  ...gpo.predios,
  ...gpl.predios,
  na({ x0: 656, x1: 684, z0: -75, z1: -45 }, "o", "alfandega", "Alfândega", "publico", 24, 30, 9),
  na({ x0: 656, x1: 684, z0: -274, z1: -250 }, "o", "capitania-do-porto", "Capitania do Porto", "publico", 22, 24, 8),
  na({ x0: 846, x1: 856, z0: 50, z1: 60 }, "o", "farol-do-porto", "Farol do Porto", "torre", 9, 9, 24),
  ...fileira({ id: "cais-a", nome: "Armazém", tipo: "galpao", x: 672, z: -135, eixo: "z", quantidade: 2, largura: [16, 20], fundo: [12, 16], altura: [6, 9], seed: 21 }),
  ...fileira({ id: "cais-b", nome: "Armazém", tipo: "galpao", x: 672, z: -25, eixo: "z", quantidade: 3, largura: [16, 20], fundo: [12, 16], altura: [6, 9], seed: 22 }),
  ...fileira({ id: "cais-c", nome: "Armazém", tipo: "galpao", x: 672, z: 95, eixo: "z", quantidade: 7, largura: [16, 20], fundo: [12, 16], altura: [6, 9], seed: 23 }),
  ...fileira({ id: "cais-d", nome: "Armazém", tipo: "galpao", x: 672, z: 305, eixo: "z", quantidade: 1, largura: [16, 20], fundo: [12, 16], altura: [6, 9], seed: 24 }),

  na(O(1, 0), "n", "mercado-oriental", "Mercado Oriental", "comercio", 22, 16, 6),
  ...encher("mo-r", resto(O(1, 0), "n", 16), oriental, 310),
  na(O(3, 0), "n", "casa-de-cha", "Casa de Chá", "comercio", 12, 10, 5),
  ...encher("cc-r", resto(O(3, 0), "n", 10), oriental, 311),
  na(O(2, 1), "n", "templo-oriental", "Templo", "igreja", 16, 20, 9),
  ...encher("tp-r", resto(O(2, 1), "n", 20), oriental, 312),
  na(O(2, 2), "n", "armazem-de-cha", "Armazém de Chá", "comercio", 16, 12, 6),
  ...encher("ac-r", resto(O(2, 2), "n", 12), oriental, 313),
  ...go.predios,

  na(I(0, 1), "s", "fundicao", "Fundição", "fabrica", 36, 26, 14),
  na(I(1, 1), "s", "fabrica", "Fábrica", "fabrica", 40, 28, 16),
  na(I(2, 1), "s", "tecelagem", "Fábrica de Tecidos", "fabrica", 40, 26, 14),
  na(I(3, 1), "s", "usina", "Usina", "fabrica", 36, 24, 18),
  ...[0, 1, 2, 3].flatMap((i) => encher(`ir-${i}`, resto(I(i, 1), "s", i === 1 ? 28 : i === 2 ? 26 : i === 0 ? 26 : 24), industrial, 420 + i)),
  ...gi.predios,
  { id: "oficina-ferroviaria", nome: "Oficina Ferroviária", tipo: "galpao", x: 340, z: -395, largura: 40, fundo: 22, altura: 10, entravel: true, porta: "s" },
  { id: "garagem-dos-bondes", nome: "Garagem dos Bondes", tipo: "galpao", x: 0, z: -395, largura: 40, fundo: 22, altura: 9, entravel: true, porta: "s" },
  ...fileira({ id: "patio", nome: "Depósito", tipo: "galpao", x: -280, z: -362, eixo: "x", quantidade: 6, largura: [14, 20], fundo: [10, 12], altura: [5, 8], seed: 31 }),

  na(A(1, 1), "s", "igreja-da-colina", "Igreja", "igreja", 20, 34, 18),
  na(A(2, 3), "n", "casarao", "Casarão", "hotel", 24, 20, 9),
  ...ga.predios,

  { id: "comando-das-seis-balas", nome: "Comando das Seis Balas", tipo: "galpao", x: 600, z: -600, largura: 14, fundo: 12, altura: 6, entravel: true, porta: "o", canon: true },
  ...[-1, 0, 1].flatMap((k) =>
    [-1, 1].map((d, n) => fileira({ id: `vo-${k}-${n}`, ...casaPobre, x: -1100, z: k * 180 + d * (k === 0 ? 10 : 9), eixo: "x", quantidade: 14, seed: 40 + k * 3 + n }))
  ).flat(),
];

const solto = (o: Solto) => predios.push(...espalhar(o, predios, ruas, barreiras));

solto({ id: "est", ...casaPobre, nome: "Barraco", caixa: { x0: 515, z0: -780, x1: 685, z1: -420 }, n: 22, seed: 51 });
solto({ id: "vi", ...casaPobre, caixa: { x0: -1000, z0: -1000, x1: -320, z1: -420 }, n: 22, seed: 52 });
solto({ id: "vm", ...casaPobre, caixa: { x0: -1500, z0: -420, x1: -1100, z1: 520 }, n: 30, seed: 53 });
solto({ id: "vt", ...casaPobre, caixa: { x0: -780, z0: -250, x1: -690, z1: 250 }, n: 6, seed: 54 });
solto({ id: "ps", ...casaPobre, nome: "Casebre", caixa: { x0: -1150, z0: 480, x1: -250, z1: 1500 }, n: 45, seed: 55 });
solto({ id: "pc", ...casaPobre, caixa: { x0: -250, z0: 340, x1: 90, z1: 700 }, n: 10, seed: 56 });
solto({ id: "pe", ...casaPobre, nome: "Casa de Pescador", caixa: { x0: 250, z0: 700, x1: 690, z1: 1300 }, n: 18, seed: 57 });
solto({ id: "dq", ...casaPobre, caixa: { x0: 520, z0: 345, x1: 690, z1: 700 }, n: 10, seed: 58 });
solto({ id: "pn", ...casaPobre, caixa: { x0: -700, z0: 470, x1: -250, z1: 700 }, n: 8, seed: 59 });

const sitio = { nome: "Sítio", tipo: "fazenda" as const, largura: [8, 14] as [number, number], fundo: [8, 12] as [number, number], altura: [3, 5] as [number, number], vao: 0 };
solto({ id: "s-o", ...sitio, caixa: { x0: -2300, z0: -800, x1: -1500, z1: 500 }, n: 8, seed: 61 });
solto({ id: "s-so", ...sitio, caixa: { x0: -1500, z0: 1450, x1: -400, z1: 2300 }, n: 6, seed: 62 });
solto({ id: "s-n", ...sitio, caixa: { x0: -800, z0: -1700, x1: 300, z1: -950 }, n: 6, seed: 63 });
solto({ id: "s-s", ...sitio, caixa: { x0: -200, z0: 1400, x1: 600, z1: 2300 }, n: 6, seed: 64 });
solto({ id: "s-ne", ...sitio, caixa: { x0: 100, z0: -2100, x1: 650, z1: -1000 }, n: 5, seed: 65 });
solto({ id: "s-no", ...sitio, caixa: { x0: -1400, z0: -1100, x1: -900, z1: -700 }, n: 4, seed: 66 });
solto({ id: "s-l", ...sitio, caixa: { x0: -2300, z0: 1000, x1: -1500, z1: 1800 }, n: 4, seed: 67 });

const cidade: Cidade = {
  id: "belo-horizonte",
  nome: "Belo Horizonte",
  tipo: "cidade",
  raio: RAIO,
  chao: "campo",
  especie: "copa",
  arvores: 1800,
  chegada: { x: 175, z: -275 },
  predios,
  ruas,
  areas,
  // O recorte real é da capital de Minas, mas a baía é do livro: o morro desce até ela.
  // Feições feitas à mão: a base de elevação não vê buracos nem grutas.
  feicoes: [
    { tipo: "vocoroca", pts: [[-1960, 760], [-1840, 900], [-1790, 1060], [-1650, 1190]], largura: 16, fundo: 16 },
    { tipo: "vocoroca", pts: [[1180, 1750], [1270, 1840], [1300, 1980]], largura: 12, fundo: 12 },
    { tipo: "dolina", x: -1420, z: 1720, raio: 70, fundo: 26 },
    { tipo: "dolina", x: -1720, z: 1450, raio: 44, fundo: 18 },
    { tipo: "gruta", x: -880, z: 2080, nome: "Gruta da Serra" },
  ],
};

export default cidade;
