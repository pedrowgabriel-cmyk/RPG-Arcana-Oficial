// Sertão de Fungos (Doc 2 §5.3, pp. 240–243): ambiente úmido, charcos, névoa e toxinas.
// Canônicos: Gangue do Cogumelo (acampamento) e o charco de Akor, o jacaré.
// Traçado das trilhas, palafitas, cabanas, charcos e demais prédios são criação nossa.

import type { Cidade } from "../tipos";
import { fileira } from "./kit";

const cidade: Cidade = {
  id: "sertao-de-fungos",
  nome: "Sertão de Fungos",
  tipo: "regiao",
  raio: 2500,
  chao: "umido",
  especie: "cogumelo",
  arvores: 700,
  chegada: { x: 0, z: 0 },
  predios: [
    { id: "acampamento-cogumelo", nome: "Acampamento da Gangue do Cogumelo", tipo: "tenda", x: -700, z: -520, largura: 22, fundo: 14, altura: 5, entravel: true, porta: "s", canon: true },
    { id: "posto-do-caminho", nome: "Posto do Caminho", tipo: "comercio", x: 30, z: -30, largura: 14, fundo: 10, altura: 4, entravel: true, porta: "o" },
    { id: "cabana-do-cha", nome: "Cabana do Chá", tipo: "casa", x: 420, z: -260, largura: 10, fundo: 9, altura: 4, entravel: true, porta: "o" },
    { id: "palafita-do-barqueiro", nome: "Palafita do Barqueiro", tipo: "casa", x: -380, z: 420, largura: 12, fundo: 10, altura: 4, entravel: true, porta: "n" },
    { id: "capela-alagada", nome: "Capela Alagada", tipo: "ruina", x: 950, z: -980, largura: 14, fundo: 18, altura: 7, entravel: true, porta: "s" },
    { id: "galpao-de-secagem", nome: "Galpão de Secagem", tipo: "galpao", x: -1250, z: -1300, largura: 20, fundo: 14, altura: 6, entravel: true, porta: "s" },
    { id: "cabana-do-coletor", nome: "Cabana do Coletor", tipo: "casa", x: 1100, z: 620, largura: 10, fundo: 10, altura: 4, entravel: true, porta: "o" },
    { id: "torre-de-vigia", nome: "Torre de Vigia", tipo: "torre", x: 640, z: -1500, largura: 8, fundo: 8, altura: 14, entravel: false },
    ...fileira({ id: "palafita-norte", nome: "Palafita", x: -220, z: -20, eixo: "x", quantidade: 8, seed: 11 }),
    ...fileira({ id: "palafita-sul", nome: "Palafita", x: -200, z: 22, eixo: "x", quantidade: 7, seed: 13 }),
    ...fileira({ id: "tenda", nome: "Tenda", tipo: "tenda", x: -660, z: -470, eixo: "x", quantidade: 5, largura: [6, 8], fundo: [6, 8], altura: [3, 4], seed: 17 }),
    { id: "cabana-1", nome: "Cabana", tipo: "casa", x: 1020, z: -300, largura: 8, fundo: 8, altura: 3, entravel: false },
    { id: "cabana-2", nome: "Cabana", tipo: "casa", x: -1500, z: 120, largura: 9, fundo: 8, altura: 3, entravel: false },
    { id: "cabana-3", nome: "Cabana", tipo: "casa", x: 130, z: 1100, largura: 8, fundo: 8, altura: 3, entravel: false },
    { id: "cabana-4", nome: "Cabana", tipo: "casa", x: -860, z: 880, largura: 9, fundo: 9, altura: 3, entravel: false },
    { id: "celeiro", nome: "Celeiro", tipo: "galpao", x: 120, z: -900, largura: 12, fundo: 10, altura: 5, entravel: false },
  ],
  ruas: [
    { pts: [[0, -2450], [-30, -1500], [20, -700], [0, 0]], largura: 6, piso: "lama" },
    { pts: [[-2450, 90], [-1500, 50], [-700, 30], [0, 0]], largura: 6, piso: "lama" },
    { pts: [[0, 0], [60, 900], [30, 1700], [80, 2450]], largura: 5, piso: "lama" },
    { pts: [[0, 0], [400, -260], [950, -950]], largura: 4, piso: "terra" },
    { pts: [[-700, 30], [-700, -500]], largura: 4, piso: "terra" },
    { pts: [[0, 0], [400, 100], [900, 250], [1000, 620], [1092, 620]], largura: 4, piso: "terra" },
  ],
  areas: [
    { tipo: "agua", pts: [[300, 560], [560, 520], [700, 640], [640, 880], [380, 920], [260, 740]], nome: "Charco de Akor" },
    { tipo: "agua", pts: [[-1100, -300], [-800, -380], [-640, -200], [-760, 40], [-1050, 20]] },
    { tipo: "agua", pts: [[-600, 600], [-300, 700], [-250, 950], [-560, 1000], [-720, 800]] },
    { tipo: "agua", pts: [[1050, -700], [1300, -640], [1280, -420], [1060, -440]] },
    { tipo: "agua", pts: [[1500, -400], [1900, -500], [2100, -150], [1800, 100], [1500, -50]] },
    { tipo: "agua", pts: [[-1800, 700], [-1400, 600], [-1200, 900], [-1500, 1200], [-1850, 1000]] },
    { tipo: "agua", pts: [[300, 1500], [700, 1400], [900, 1700], [600, 2000], [300, 1850]] },
    { tipo: "lama", pts: [[-260, 120], [-60, 120], [-60, 360], [-260, 360]] },
    { tipo: "lama", pts: [[100, 80], [330, 90], [330, 250], [100, 240]] },
    { tipo: "lama", pts: [[-1400, -700], [-1000, -750], [-950, -500], [-1380, -480]] },
    { tipo: "lama", pts: [[1000, 300], [1500, 250], [1550, 500], [1050, 560]] },
    { tipo: "lama", pts: [[-300, -1200], [100, -1250], [150, -1000], [-280, -980]] },
    { tipo: "fungos", pts: [[-1000, -1100], [-500, -1150], [-420, -800], [-950, -760]], nome: "Bosque de Cogumelos Gigantes" },
    { tipo: "fungos", pts: [[1200, -1500], [1700, -1450], [1750, -1000], [1250, -1050]] },
    { tipo: "fungos", pts: [[-2000, -500], [-1650, -550], [-1600, -200], [-1950, -150]] },
    { tipo: "fungos", pts: [[1100, 1000], [1600, 950], [1650, 1400], [1150, 1450]] },
    { tipo: "fungos", pts: [[-600, 1500], [-150, 1450], [-100, 1900], [-560, 1950]] },
    { tipo: "fungos", pts: [[200, -400], [350, -420], [360, -330], [210, -310]] },
  ],
};

export default cidade;
