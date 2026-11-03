// Maria da Fé (Doc 2 §5.3, pp. 208–219): vale frio, lago congelado, caça e pesca, cultura comunitária.
// Canônico: o lago congelado (área nomeada). O livro não cita prédios nem personagens daqui no Doc 2.
// Criação nossa: traçado, nomes genéricos dos prédios, o cais, o cemitério e os sítios de caça.
// Trilha leste liga à Serra da Saudade; estrada ao norte sai para o litoral de Varginha.

import type { Area, Cidade, Predio, Rua, XZ } from "../tipos";
import { fileira, sorteio } from "./kit";

const LAGO = { cx: 200, cz: 560, rx: 520, rz: 400 };
const PRACA: Area = { tipo: "praca", pts: [[-28, -54], [28, -54], [28, -7], [-28, -7]] };
const CEMITERIO: Area = { tipo: "cemiterio", pts: [[-330, -210], [-270, -210], [-270, -165], [-330, -165]] };

function contorno(cx: number, cz: number, rx: number, rz: number, n: number, seed: number, ruido: number): XZ[] {
  const r = sorteio(seed);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * ruido;
    return [Math.round(cx + Math.cos(a) * rx * k), Math.round(cz + Math.sin(a) * rz * k)] as XZ;
  });
}

const ruas: Rua[] = [
  { pts: [[-420, 0], [520, 0]], largura: 9, piso: "terra" },
  { pts: [[-100, 0], [-100, -300], [-60, -700], [0, -1190]], largura: 7, piso: "neve" },
  { pts: [[-100, 0], [-210, 120], [-380, 220], [-420, 500], [-380, 900], [-300, 1190]], largura: 7, piso: "neve" },
  { pts: [[0, 0], [0, 150]], largura: 6, piso: "terra" },
  { pts: [[-280, 170], [-100, 150], [100, 148], [300, 165], [480, 200]], largura: 5, piso: "terra" },
  { pts: [[0, 150], [0, 235]], largura: 3, piso: "madeira" },
  { pts: [[-420, -105], [-100, -105]], largura: 5, piso: "neve" },
  { pts: [[130, -105], [480, -105]], largura: 5, piso: "neve" },
  { pts: [[70, 80], [480, 80]], largura: 5, piso: "neve" },
  { pts: [[520, 0], [800, -40], [1190, -150]], largura: 4, piso: "neve" },
  { pts: [[-420, 0], [-700, -120]], largura: 3, piso: "neve" },
  { pts: [[130, -105], [200, -450], [230, -800]], largura: 3, piso: "neve" },
];

const fixos: Predio[] = [
  { id: "igreja", nome: "Igreja", tipo: "igreja", x: 0, z: -70, largura: 14, fundo: 22, altura: 10, entravel: true, porta: "s" },
  { id: "salao", nome: "Salão Comunitário", tipo: "publico", x: -60, z: -20, largura: 20, fundo: 14, altura: 6, entravel: true, porta: "s" },
  { id: "armazem-trocas", nome: "Armazém de Trocas", tipo: "comercio", x: 60, z: -20, largura: 18, fundo: 14, altura: 5, entravel: true, porta: "s" },
  { id: "casa-grande", nome: "Casa Grande", tipo: "publico", x: 100, z: -70, largura: 22, fundo: 14, altura: 6, entravel: true, porta: "s" },
  { id: "pousada", nome: "Pousada", tipo: "hotel", x: -50, z: 22, largura: 18, fundo: 14, altura: 6, entravel: true, porta: "n" },
  { id: "oficina", nome: "Oficina", tipo: "comercio", x: 50, z: 20, largura: 14, fundo: 12, altura: 5, entravel: true, porta: "n" },
  { id: "casa-cacador", nome: "Casa do Caçador", tipo: "casa", x: -170, z: -18, largura: 12, fundo: 10, altura: 4, entravel: true, porta: "s" },
  { id: "peixaria", nome: "Peixaria", tipo: "comercio", x: 45, z: 125, largura: 12, fundo: 10, altura: 4, entravel: true, porta: "s" },
  { id: "barracao-barcos", nome: "Barracão de Barcos", tipo: "galpao", x: -45, z: 125, largura: 16, fundo: 10, altura: 4, entravel: true, porta: "s" },
  { id: "armazem-gelo", nome: "Armazém de Gelo", tipo: "galpao", x: 230, z: -18, largura: 16, fundo: 12, altura: 5, entravel: true, porta: "s" },
  { id: "casa-oeste", nome: "Casa", tipo: "casa", x: -250, z: -18, largura: 10, fundo: 9, altura: 4, entravel: true, porta: "s" },
  { id: "casa-sul-oeste", nome: "Casa", tipo: "casa", x: -220, z: 20, largura: 10, fundo: 9, altura: 4, entravel: true, porta: "n" },
  { id: "casa-leste", nome: "Casa", tipo: "casa", x: 330, z: 22, largura: 10, fundo: 9, altura: 4, entravel: true, porta: "n" },
];

const casas = (id: string, x: number, z: number, eixo: "x" | "z", quantidade: number, seed: number, nome = "Casa") =>
  fileira({ id, nome, x, z, eixo, quantidade, fundo: [7, 9], seed });

const brutos: Predio[] = [
  ...casas("rua-n-o", -330, -18, "x", 8, 11),
  ...casas("rua-n-l", 85, -18, "x", 9, 12),
  ...casas("rua-s-o", -330, 20, "x", 8, 13),
  ...casas("rua-s-l", 85, 20, "x", 8, 14),
  ...casas("alta-s-o", -330, -92, "x", 7, 15),
  ...casas("alta-n-o", -300, -118, "x", 5, 16),
  ...casas("alta-s-l", 130, -92, "x", 7, 17),
  ...casas("alta-n-l", 130, -118, "x", 5, 18),
  ...casas("fundo-o", -330, -62, "x", 5, 19),
  ...casas("baixa-n", 80, 62, "x", 6, 20),
  ...casas("baixa-s", 80, 98, "x", 5, 21),
  ...casas("margem-o", -260, 160, "x", 6, 22, "Casa de Pesca"),
  ...casas("margem-l", 130, 135, "x", 6, 23, "Casa de Pesca"),
  ...casas("cais-l", 330, 150, "x", 4, 24, "Casa de Pesca"),
  ...casas("estrada-n", -76, -420, "z", 6, 25),
  ...casas("estrada-s", -460, 300, "z", 5, 26),
  ...casas("trilha-l", 640, -45, "x", 5, 27),
  ...casas("sitio-ne", 250, -520, "x", 3, 28, "Cabana de Caça"),
  ...casas("sitio-n", -250, -640, "x", 3, 29, "Cabana de Caça"),
  ...casas("sitio-no", -650, -330, "x", 3, 30, "Cabana de Caça"),
  ...casas("sitio-o", -640, 80, "x", 2, 31, "Cabana de Caça"),
  ...casas("sitio-se", 700, 300, "x", 4, 32, "Casa de Pesca"),
  ...casas("sitio-e", 900, -230, "x", 3, 33, "Cabana de Caça"),
  ...casas("sitio-s", -520, 760, "z", 3, 34, "Cabana de Caça"),
];

const perto = (a: Predio, b: Predio, m: number) =>
  Math.abs(a.x - b.x) < (a.largura + b.largura) / 2 + m && Math.abs(a.z - b.z) < (a.fundo + b.fundo) / 2 + m;

function distSeg(px: number, pz: number, [ax, az]: XZ, [bx, bz]: XZ) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
}

function aceito(p: Predio, feitos: Predio[]) {
  const reta = Math.max(p.largura, p.fundo) / 2;
  for (const r of ruas) {
    for (let i = 0; i < r.pts.length - 1; i++) if (distSeg(p.x, p.z, r.pts[i], r.pts[i + 1]) < r.largura / 2 + 2 + reta) return false;
  }
  const u = ((p.x - LAGO.cx) / (LAGO.rx + 25)) ** 2 + ((p.z - LAGO.cz) / (LAGO.rz + 25)) ** 2;
  if (u < 1) return false;
  for (const a of [PRACA, CEMITERIO]) {
    const xs = a.pts.map((q) => q[0]), zs = a.pts.map((q) => q[1]);
    if (p.x + p.largura / 2 > Math.min(...xs) - 3 && p.x - p.largura / 2 < Math.max(...xs) + 3 && p.z + p.fundo / 2 > Math.min(...zs) - 3 && p.z - p.fundo / 2 < Math.max(...zs) + 3) return false;
  }
  return !feitos.some((q) => perto(p, q, 2));
}

const feitos = [...fixos];
for (const p of brutos) if (aceito(p, feitos)) feitos.push(p);

const cidade: Cidade = {
  id: "maria-da-fe",
  nome: "Maria da Fé",
  tipo: "cidade",
  raio: 1200,
  chao: "neve",
  especie: "pinheiro",
  arvores: 700,
  chegada: { x: -100, z: -150 },
  predios: feitos,
  ruas,
  areas: [
    { tipo: "neve", pts: contorno(LAGO.cx, LAGO.cz, LAGO.rx, LAGO.rz, 28, 7, 0.06), nome: "Lago congelado de Maria da Fé" },
    { tipo: "agua", pts: [[190, 940], [215, 940], [250, 1195], [180, 1195]] },
    { tipo: "agua", pts: [[120, 300], [128, 300], [128, 308], [120, 308]] },
    { tipo: "agua", pts: [[260, 340], [268, 340], [268, 348], [260, 348]] },
    { tipo: "agua", pts: [[40, 420], [48, 420], [48, 428], [40, 428]] },
    PRACA,
    CEMITERIO,
    { tipo: "pasto", pts: [[300, -420], [560, -420], [560, -240], [300, -240]] },
    { tipo: "mata", pts: [[560, -1000], [1120, -1000], [1120, -420], [560, -420]], nome: "Pinheiral do Leste" },
    { tipo: "mata", pts: [[-620, -1050], [-180, -1050], [-180, -760], [-620, -760]] },
    { tipo: "mata", pts: [[-760, 300], [-560, 300], [-560, 700], [-760, 700]] },
    { tipo: "mata", pts: [[760, 420], [1100, 420], [1100, 900], [760, 900]] },
    { tipo: "mata", pts: [[300, -780], [520, -780], [520, -560], [300, -560]] },
    { tipo: "rochas", pts: [[-1150, -700], [-930, -760], [-840, -500], [-980, -300], [-1130, -420]], nome: "Serra de Gelo" },
    { tipo: "rochas", pts: [[-1000, -60], [-860, -90], [-820, 120], [-900, 300], [-1040, 220]] },
    { tipo: "rochas", pts: [[-1050, 500], [-880, 460], [-800, 700], [-900, 900], [-1060, 780]] },
    { tipo: "rochas", pts: [[-460, -1180], [-300, -1120], [-240, -1170], [-340, -1198]] },
    { tipo: "rochas", pts: [[720, -250], [790, -280], [830, -200], [760, -170]] },
    { tipo: "rochas", pts: [[-200, 1000], [-90, 960], [-30, 1060], [-150, 1120]] },
  ],
};

export default cidade;
