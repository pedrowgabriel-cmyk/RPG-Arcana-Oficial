// Vila de Desemboque (Doc 2 §5.3, pp. 202–207): cidade arruinada pela peste, com bens abandonados.
// Canônico: o Coveiro e o cemitério (o livro cita Coveiro e risco de contágio); a água local é perigosa (p. 204).
// Traçado, nomes de prédios, igreja, praça e preenchimento são criação nossa.

import type { Cidade } from "../tipos";
import { fileira, quarteirao } from "./kit";

const cidade: Cidade = {
  id: "vila-de-desemboque",
  nome: "Vila de Desemboque",
  tipo: "vila",
  raio: 1000,
  chao: "campo",
  especie: "seca",
  arvores: 260,
  chegada: { x: 300, z: 0 },
  predios: [
    { id: "igreja", nome: "Igreja", tipo: "igreja", x: 0, z: -62, largura: 14, fundo: 24, altura: 10, entravel: true, porta: "s" },
    { id: "saloon", nome: "Saloon", tipo: "saloon", x: -60, z: -14, largura: 18, fundo: 12, altura: 5, entravel: true, porta: "s" },
    { id: "hotel", nome: "Hotel", tipo: "hotel", x: 62, z: -15, largura: 18, fundo: 14, altura: 7, entravel: true, porta: "s" },
    { id: "cadeia", nome: "Cadeia", tipo: "publico", x: -62, z: 16, largura: 14, fundo: 12, altura: 4, entravel: true, porta: "n" },
    { id: "botica", nome: "Botica", tipo: "comercio", x: 60, z: 16, largura: 12, fundo: 10, altura: 4, entravel: true, porta: "n" },
    { id: "armazem", nome: "Armazém", tipo: "comercio", x: -110, z: 16, largura: 16, fundo: 12, altura: 5, entravel: true, porta: "n" },
    { id: "camara", nome: "Casa da Câmara", tipo: "publico", x: 110, z: -16, largura: 16, fundo: 12, altura: 6, entravel: true, porta: "s" },
    { id: "ferraria", nome: "Ferraria", tipo: "galpao", x: 150, z: 14, largura: 14, fundo: 12, altura: 4, entravel: true, porta: "n" },
    { id: "casarao", nome: "Casarão", tipo: "casa", x: -150, z: -17, largura: 16, fundo: 14, altura: 7, entravel: true, porta: "s" },
    { id: "estabulo", nome: "Estábulo", tipo: "galpao", x: 200, z: 22, largura: 18, fundo: 12, altura: 5, entravel: true, porta: "n" },
    { id: "sobrado", nome: "Sobrado", tipo: "casa", x: 230, z: -18, largura: 14, fundo: 12, altura: 7, entravel: true, porta: "s" },
    { id: "capela-cemiterio", nome: "Capela do Cemitério", tipo: "igreja", x: -335, z: -205, largura: 10, fundo: 10, altura: 6, entravel: true, porta: "s" },
    { id: "casa-coveiro", nome: "Casa do Coveiro", tipo: "casa", x: -364, z: -146, largura: 10, fundo: 9, altura: 4, entravel: true, porta: "l", canon: true },
    { id: "fazenda-abandonada", nome: "Fazenda Abandonada", tipo: "fazenda", x: -520, z: 262, largura: 20, fundo: 14, altura: 6, entravel: true, porta: "n" },

    ...fileira({ id: "oeste-n", nome: "Casa", x: -420, z: -12, eixo: "x", quantidade: 9, seed: 11 }),
    ...fileira({ id: "oeste-s", nome: "Casa", x: -420, z: 12, eixo: "x", quantidade: 9, seed: 12 }),
    ...fileira({ id: "leste-n", nome: "Casa", x: 262, z: -12, eixo: "x", quantidade: 7, seed: 13 }),
    ...fileira({ id: "leste-s", nome: "Casa", x: 262, z: 12, eixo: "x", quantidade: 7, seed: 14 }),
    ...quarteirao({ id: "bairro-so", nome: "Casa", x0: -170, z0: 28, x1: -12, vao: 5, z1: 60, seed: 21 }),
    ...quarteirao({ id: "bairro-se", nome: "Casa", x0: 12, z0: 28, x1: 150, vao: 5, z1: 60, seed: 22 }),
    ...quarteirao({ id: "bairro-no", nome: "Casa", x0: -200, z0: -66, x1: -90, z1: -34, vao: 5, seed: 23 }),
    ...quarteirao({ id: "bairro-ne", nome: "Casa", x0: 90, z0: -66, x1: 190, z1: -34, vao: 5, seed: 24 }),
    ...fileira({ id: "sul-o", nome: "Casa", x: -14, z: 90, eixo: "z", quantidade: 5, seed: 15 }),
    ...fileira({ id: "sul-l", nome: "Casa", x: 14, z: 90, eixo: "z", quantidade: 5, seed: 16 }),
    ...fileira({ id: "norte-o", nome: "Casa", x: -14, z: -160, eixo: "z", quantidade: 4, seed: 17 }),
    ...fileira({ id: "norte-l", nome: "Casa", x: 14, z: -160, eixo: "z", quantidade: 4, seed: 18 }),

    ...fileira({ id: "periferia-o1", nome: "Casa", x: -880, z: -66, eixo: "x", quantidade: 4, vao: 40, seed: 31 }),
    ...fileira({ id: "periferia-o2", nome: "Casa", x: -880, z: 22, eixo: "x", quantidade: 4, vao: 50, seed: 32 }),
    ...fileira({ id: "periferia-l1", nome: "Casa", x: 560, z: -26, eixo: "x", quantidade: 4, vao: 28, seed: 33 }),
    ...fileira({ id: "periferia-l2", nome: "Casa", x: 600, z: 60, eixo: "x", quantidade: 5, vao: 35, seed: 34 }),
    ...fileira({ id: "periferia-s1", nome: "Casa", x: -14, z: 320, eixo: "z", quantidade: 6, vao: 35, seed: 35 }),
    ...fileira({ id: "periferia-s2", nome: "Casa", x: 14, z: 350, eixo: "z", quantidade: 5, vao: 40, seed: 36 }),
    ...fileira({ id: "periferia-n1", nome: "Casa", x: 14, z: -420, eixo: "z", quantidade: 5, vao: 45, seed: 37 }),
    ...fileira({ id: "sitio-ne1", nome: "Casa", x: 440, z: -300, eixo: "z", quantidade: 3, vao: 12, seed: 38 }),
    ...fileira({ id: "sitio-ne2", nome: "Casa", x: 575, z: -440, eixo: "z", quantidade: 2, vao: 14, seed: 39 }),
  ],
  ruas: [
    { pts: [[-960, -45], [-620, -6], [-560, 0], [560, 0], [620, 6], [960, 50]], largura: 9, piso: "terra" },
    { pts: [[0, 960], [0, 40]], largura: 8, piso: "terra" },
    { pts: [[-12, -40], [-30, -62], [-30, -100], [0, -140], [0, -960]], largura: 8, piso: "terra" },
    { pts: [[240, -6], [400, -200], [620, -520], [800, -760], [920, -900]], largura: 6, piso: "terra" },
    { pts: [[-240, -4], [-300, -60], [-335, -148]], largura: 5, piso: "terra" },
    { pts: [[-596, -4], [-620, 120], [-520, 238]], largura: 5, piso: "terra" },
    { pts: [[-290, 70], [290, 70]], largura: 5, piso: "terra" },
    { pts: [[-255, -92], [230, -92]], largura: 5, piso: "terra" },
  ],
  areas: [
    { tipo: "praca", pts: [[-40, -40], [40, -40], [40, 40], [-40, 40]] },
    { tipo: "cemiterio", pts: [[-440, -330], [-230, -330], [-230, -168], [-440, -168]], nome: "Cemitério de Desemboque" },
    { tipo: "agua", pts: [[320, 150], [400, 140], [410, 210], [330, 215]] },
    { tipo: "agua", pts: [[-480, 340], [-400, 330], [-390, 400], [-470, 410]] },
    { tipo: "lavoura", pts: [[300, 260], [520, 260], [520, 400], [300, 400]] },
    { tipo: "pasto", pts: [[560, 140], [820, 140], [820, 320], [560, 320]] },
    { tipo: "pasto", pts: [[-840, 120], [-660, 120], [-660, 300], [-840, 300]] },
    { tipo: "mata", pts: [[-920, 480], [-440, 480], [-440, 900], [-920, 900]] },
    { tipo: "mata", pts: [[-760, -760], [-420, -760], [-420, -520], [-760, -520]] },
    { tipo: "rochas", pts: [[-300, -820], [-180, -820], [-180, -700], [-300, -700]] },
    { tipo: "rochas", pts: [[120, -860], [260, -860], [260, -740], [120, -740]] },
  ],
};

export default cidade;
