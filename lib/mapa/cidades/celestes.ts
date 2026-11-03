// Celestes, antiga Varginha (Doc 2 §5.3, pp. 182–189): platôs, Floresta do Céu, povo de tradições próprias.
// Canônicos: a Floresta do Céu e os platôs (Doc 2 cita ainda a ocupação dos platôs em 420 e a expulsão em 1870).
// Traçado, prédios nomeados e preenchimento são criação nossa; nenhum prédio específico é citado pelo Doc 2.

import type { Cidade } from "../tipos";
import { fileira, quarteirao } from "./kit";

const cidade: Cidade = {
  id: "celestes",
  nome: "Celestes",
  tipo: "cidade",
  raio: 1200,
  chao: "campo",
  especie: "copa",
  arvores: 500,
  chegada: { x: 0, z: 28 },
  predios: [
    { id: "casa-de-reuniao", nome: "Casa de Reunião", tipo: "publico", x: -130, z: -14, largura: 18, fundo: 12, altura: 6, entravel: true, porta: "s" },
    { id: "armazem", nome: "Armazém", tipo: "comercio", x: -82, z: -14, largura: 14, fundo: 12, altura: 5, entravel: true, porta: "s" },
    { id: "casa-dos-hospedes", nome: "Casa dos Hóspedes", tipo: "hotel", x: -44, z: -14, largura: 16, fundo: 12, altura: 6, entravel: true, porta: "s" },
    { id: "refeitorio", nome: "Refeitório", tipo: "saloon", x: 44, z: -14, largura: 16, fundo: 12, altura: 5, entravel: true, porta: "s" },
    { id: "oficina", nome: "Oficina", tipo: "galpao", x: 88, z: -14, largura: 14, fundo: 12, altura: 5, entravel: true, porta: "s" },
    { id: "casa-de-cura", nome: "Casa de Cura", tipo: "publico", x: 132, z: -14, largura: 14, fundo: 12, altura: 5, entravel: true, porta: "s" },
    { id: "templo", nome: "Templo", tipo: "igreja", x: -100, z: -136, largura: 22, fundo: 16, altura: 10, entravel: true, porta: "s" },
    { id: "salao-do-conselho", nome: "Salão do Conselho", tipo: "publico", x: 110, z: -136, largura: 20, fundo: 14, altura: 7, entravel: true, porta: "s" },
    { id: "mirante", nome: "Mirante", tipo: "torre", x: -10, z: -140, largura: 9, fundo: 9, altura: 16, entravel: true, porta: "s" },
    { id: "celeiro", nome: "Celeiro", tipo: "galpao", x: 345, z: 14, largura: 18, fundo: 12, altura: 6, entravel: true, porta: "n" },
    { id: "sitio-do-plato-norte", nome: "Sítio", tipo: "fazenda", x: 320, z: -260, largura: 20, fundo: 14, altura: 5, entravel: true, porta: "s" },
    { id: "sitio-da-borda", nome: "Sítio", tipo: "fazenda", x: -440, z: 300, largura: 20, fundo: 14, altura: 5, entravel: true, porta: "n" },
    { id: "sitio-da-roca", nome: "Sítio", tipo: "fazenda", x: 520, z: 120, largura: 20, fundo: 14, altura: 5, entravel: true, porta: "o" },
    { id: "casa-da-colheita", nome: "Casa de Colheita", tipo: "galpao", x: 300, z: 470, largura: 16, fundo: 12, altura: 5, entravel: true, porta: "n" },

    ...fileira({ id: "eixo-no", nome: "Casa", x: -14, z: -108, eixo: "z", quantidade: 8, seed: 11 }),
    ...fileira({ id: "eixo-ne", nome: "Casa", x: 14, z: -108, eixo: "z", quantidade: 8, seed: 12 }),
    ...fileira({ id: "eixo-so", nome: "Casa", x: -14, z: 26, eixo: "z", quantidade: 12, seed: 13 }),
    ...fileira({ id: "eixo-se", nome: "Casa", x: 14, z: 26, eixo: "z", quantidade: 12, seed: 14 }),
    ...fileira({ id: "cruz-so", nome: "Casa", x: -280, z: 14, eixo: "x", quantidade: 18, seed: 15, vao: 4 }),
    ...fileira({ id: "cruz-se", nome: "Casa", x: 40, z: 14, eixo: "x", quantidade: 20, seed: 16, vao: 4 }),
    ...fileira({ id: "cruz-no", nome: "Casa", x: -300, z: -14, eixo: "x", quantidade: 12, seed: 17, vao: 4 }),
    ...fileira({ id: "cruz-ne", nome: "Casa", x: 170, z: -14, eixo: "x", quantidade: 10, seed: 18, vao: 4 }),
    ...fileira({ id: "alto-o", nome: "Casa", x: -300, z: -108, eixo: "x", quantidade: 12, seed: 19, vao: 4 }),
    ...fileira({ id: "alto-l", nome: "Casa", x: 170, z: -108, eixo: "x", quantidade: 12, seed: 20, vao: 4 }),
    ...quarteirao({ id: "bairro-ne", nome: "Casa", x0: 60, z0: -360, x1: 220, z1: -270, vao: 24, seed: 21 }),
    ...quarteirao({ id: "bairro-no", nome: "Casa", x0: -380, z0: -360, x1: -220, z1: -270, vao: 24, seed: 22 }),
    ...quarteirao({ id: "bairro-so", nome: "Casa", x0: -330, z0: 110, x1: -170, z1: 200, vao: 24, seed: 23 }),
    ...quarteirao({ id: "bairro-se", nome: "Casa", x0: 140, z0: 480, x1: 280, z1: 610, vao: 26, seed: 24 }),
  ],
  ruas: [
    { pts: [[0, -420], [0, 420]], largura: 8, piso: "terra" },
    { pts: [[0, -420], [100, -480], [300, -700], [400, -1090]], largura: 7, piso: "terra" },
    { pts: [[0, 420], [120, 640], [300, 850], [550, 1030]], largura: 7, piso: "terra" },
    { pts: [[-600, 30], [-300, 0], [300, 0], [650, -20]], largura: 6, piso: "terra" },
    { pts: [[-320, -120], [320, -120]], largura: 5, piso: "terra" },
    { pts: [[-440, 290], [-300, 150], [-20, 60]], largura: 4, piso: "terra" },
    { pts: [[320, -250], [200, -200], [30, -120]], largura: 4, piso: "terra" },
    { pts: [[520, 110], [400, 60], [300, 0]], largura: 4, piso: "terra" },
    { pts: [[300, 460], [200, 440], [0, 420]], largura: 4, piso: "terra" },
  ],
  areas: [
    { tipo: "praca", pts: [[-18, -18], [18, -18], [18, 18], [-18, 18]] },
    { tipo: "lavoura", pts: [[150, 200], [420, 200], [420, 420], [150, 420]], nome: "Roças do Platô" },
    { tipo: "pasto", pts: [[-700, 330], [-500, 330], [-500, 520], [-700, 520]] },
    { tipo: "pasto", pts: [[400, -600], [650, -600], [650, -420], [400, -420]] },
    { tipo: "mata", pts: [[-640, -1100], [-250, -1100], [-250, -560], [-640, -560]], nome: "Floresta do Céu" },
    { tipo: "mata", pts: [[700, 500], [1000, 500], [1000, 900], [700, 900]], nome: "Floresta do Céu" },
    { tipo: "rochas", pts: [[-1190, -500], [-760, -460], [-720, 0], [-780, 500], [-1190, 600]], nome: "Borda do Platô" },
    { tipo: "agua", pts: [[-800, 60], [-740, 60], [-740, 140], [-800, 140]], nome: "Cachoeira do Platô" },
    { tipo: "rochas", pts: [[-700, 900], [-120, 880], [-100, 1150], [-700, 1150]], nome: "Penhasco Sul" },
    { tipo: "rochas", pts: [[830, -300], [1150, -220], [1150, 380], [880, 300]], nome: "Penhasco Leste" },
  ],
};

export default cidade;
