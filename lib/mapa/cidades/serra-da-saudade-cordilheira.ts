// Serra da Saudade, cordilheira (Doc 2 §5.3, pp. 244–245): montanhas, lagos, frio, ferrovias e fauna.
// Canônicos: a própria serra, os lagos, a ferrovia e o território da Yakecan (égua indomável, nunca montada).
// Estação, acampamentos, cabanas, mina e capela são criação nossa; nomes genéricos de propósito.

import type { Area, Cidade, XZ } from "../tipos";

const bloco = (cx: number, cz: number, w: number, h: number): XZ[] => [
  [cx - w / 2, cz - h / 2],
  [cx + w / 2, cz - h / 2],
  [cx + w / 2, cz + h / 2],
  [cx - w / 2, cz + h / 2],
];

const rocha = (cx: number, cz: number, w: number, h: number): Area => ({ tipo: "rochas", pts: bloco(cx, cz, w, h) });

const cidade: Cidade = {
  id: "serra-da-saudade-cordilheira",
  nome: "Serra da Saudade (cordilheira)",
  tipo: "regiao",
  raio: 3000,
  chao: "neve",
  especie: "pinheiro",
  arvores: 700,
  chegada: { x: 0, z: -170 },
  predios: [
    { id: "estacao-da-serra", nome: "Parada da Ferrovia", tipo: "estacao", x: 0, z: -216, largura: 16, fundo: 10, altura: 6, entravel: true, porta: "s" },
    { id: "torre-de-vigia", nome: "Torre de Vigia", tipo: "torre", x: -34, z: -216, largura: 8, fundo: 8, altura: 14, entravel: true, porta: "s" },
    { id: "casa-de-turma", nome: "Casa da Turma de Linha", tipo: "casa", x: 30, z: -216, largura: 10, fundo: 9, altura: 4, entravel: false },
    { id: "cabana-do-lago", nome: "Cabana do Lago", tipo: "casa", x: 560, z: 330, largura: 9, fundo: 9, altura: 4, entravel: true, porta: "n" },
    { id: "tenda-de-cacadores", nome: "Acampamento de Caçadores", tipo: "tenda", x: -520, z: 380, largura: 8, fundo: 8, altura: 3, entravel: true, porta: "l" },
    { id: "tenda-1", nome: "Tenda", tipo: "tenda", x: -500, z: 410, largura: 5, fundo: 5, altura: 3, entravel: false },
    { id: "tenda-2", nome: "Tenda", tipo: "tenda", x: -545, z: 405, largura: 5, fundo: 5, altura: 3, entravel: false },
    { id: "tenda-3", nome: "Tenda", tipo: "tenda", x: -535, z: 350, largura: 5, fundo: 5, altura: 3, entravel: false },
    { id: "capela-em-ruinas", nome: "Capela em Ruínas", tipo: "ruina", x: -650, z: -520, largura: 11, fundo: 14, altura: 6, entravel: true, porta: "s" },
    { id: "mina-abandonada", nome: "Mina Abandonada", tipo: "ruina", x: 760, z: -640, largura: 12, fundo: 10, altura: 5, entravel: true, porta: "s" },
    { id: "cabana-do-cacador", nome: "Cabana de Caçador", tipo: "casa", x: -900, z: 620, largura: 9, fundo: 8, altura: 4, entravel: true, porta: "l" },
    { id: "curral-do-pastor", nome: "Curral de Pastor", tipo: "fazenda", x: 1000, z: 200, largura: 14, fundo: 10, altura: 4, entravel: true, porta: "n" },
    { id: "galpao-de-lenha", nome: "Galpão de Lenha", tipo: "galpao", x: 900, z: -215, largura: 14, fundo: 9, altura: 5, entravel: false },
    { id: "casa-1", nome: "Cabana", tipo: "casa", x: 1900, z: -230, largura: 8, fundo: 8, altura: 4, entravel: false },
    { id: "casa-2", nome: "Cabana", tipo: "casa", x: -1400, z: -240, largura: 8, fundo: 8, altura: 4, entravel: false },
    { id: "casa-3", nome: "Cabana", tipo: "casa", x: 480, z: 1250, largura: 8, fundo: 8, altura: 4, entravel: false },
    { id: "casa-4", nome: "Cabana", tipo: "casa", x: -300, z: -1500, largura: 8, fundo: 8, altura: 4, entravel: false },
    { id: "ruina-1", nome: "Ruína", tipo: "ruina", x: 300, z: -1900, largura: 9, fundo: 9, altura: 3, entravel: false },
    { id: "ruina-2", nome: "Ruína", tipo: "ruina", x: -2000, z: -1000, largura: 9, fundo: 9, altura: 3, entravel: false },
    { id: "casa-5", nome: "Cabana", tipo: "casa", x: 2500, z: -600, largura: 8, fundo: 8, altura: 4, entravel: false },
  ],
  ruas: [
    { pts: [[-2950, -330], [-1800, -260], [-600, -200], [0, -200], [800, -200], [1900, -200], [2950, -90]], largura: 6, piso: "trilho" },
    { pts: [[0, -190], [0, 0], [300, 200], [560, 300]], largura: 4, piso: "neve" },
    { pts: [[0, 0], [-300, 200], [-500, 370]], largura: 4, piso: "neve" },
    { pts: [[300, 200], [700, 100], [1000, 100], [1000, 190]], largura: 3, piso: "neve" },
    { pts: [[-500, 390], [-700, 500], [-900, 610]], largura: 3, piso: "neve" },
    { pts: [[-30, -200], [-300, -380], [-650, -510]], largura: 3, piso: "neve" },
    { pts: [[900, -200], [820, -450], [760, -630]], largura: 3, piso: "neve" },
    { pts: [[0, 0], [250, 700], [480, 1240]], largura: 3, piso: "neve" },
    { pts: [[-30, -200], [-250, -900], [-300, -1490]], largura: 3, piso: "neve" },
  ],
  areas: [
    { tipo: "agua", pts: [[300, 420], [560, 380], [820, 450], [900, 620], [700, 780], [420, 720], [280, 560]], nome: "Lago da Saudade" },
    { tipo: "agua", pts: [[-1500, -1300], [-1200, -1380], [-950, -1250], [-1000, -1050], [-1300, -1000], [-1520, -1120]], nome: "Lago Gelado" },
    { tipo: "agua", pts: [[1100, 1800], [1500, 1750], [1700, 1950], [1500, 2200], [1150, 2150]], nome: "Lago do Sul" },
    { tipo: "agua", pts: [[1700, -1900], [2000, -1950], [2150, -1750], [1900, -1600], [1650, -1700]] },
    { tipo: "neve", pts: bloco(-300, -300, 700, 300) },
    { tipo: "neve", pts: bloco(1200, 300, 900, 500) },
    { tipo: "mata", pts: bloco(-700, 1300, 1000, 700), nome: "Pinheiral da Serra" },
    { tipo: "mata", pts: bloco(900, -1500, 900, 600) },
    { tipo: "mata", pts: bloco(-1800, 200, 600, 500) },
    { tipo: "mata", pts: bloco(2300, 600, 500, 700) },
    // Encostas de pedra, com vãos de 25 m ou mais para passar entre elas.
    rocha(-900, -300, 160, 120),
    rocha(-720, -300, 140, 100),
    rocha(-1100, -420, 120, 140),
    rocha(560, -560, 180, 120),
    rocha(1250, -640, 150, 140),
    rocha(1300, -420, 110, 110),
    rocha(-600, 900, 200, 160),
    rocha(-380, 960, 150, 120),
    rocha(-820, 1060, 130, 130),
    rocha(300, -1100, 220, 160),
    rocha(60, -1000, 140, 120),
    rocha(560, -1250, 160, 130),
    rocha(1800, 300, 200, 170),
    rocha(2070, 360, 150, 130),
    rocha(1850, 540, 140, 120),
    rocha(-2300, 500, 220, 180),
    rocha(-2060, 640, 160, 130),
    rocha(-2350, 780, 150, 130),
    rocha(-200, 1800, 260, 200),
    rocha(130, 1900, 160, 140),
    rocha(-1500, -2000, 260, 200),
    rocha(-1200, -1900, 160, 150),
    rocha(2400, -1500, 240, 190),
    rocha(2660, -1380, 160, 140),
  ],
};

export default cidade;
