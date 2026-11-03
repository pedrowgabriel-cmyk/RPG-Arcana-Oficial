// Serra da Saudade, povoado (Doc 2 §5.3, pp. 198–201): pequena vila fria de cerca de 40 pessoas,
// ocupada por Fivela de Cobra e sobreviventes deslocados. O Doc 2 não cita prédios nem marcos.
// Criação nossa: o traçado, a capela, a venda, a pousada, a ferraria, o estábulo e a parada do trem
// (a ferrovia de geografia.ts cruza a serra ao sul da vila), inspirados na arte oficial.

import type { Cidade } from "../tipos";

const cidade: Cidade = {
  id: "serra-da-saudade-povoado",
  nome: "Serra da Saudade",
  tipo: "vila",
  raio: 500,
  chao: "campo",
  especie: "pinheiro",
  arvores: 120,
  chegada: { x: 440, z: -34 },
  predios: [
    { id: "capela", nome: "Capela", tipo: "igreja", x: 130, z: -62, largura: 12, fundo: 16, altura: 9, entravel: true, porta: "s" },
    { id: "venda", nome: "Venda", tipo: "comercio", x: -40, z: -16, largura: 12, fundo: 10, altura: 5, entravel: true, porta: "s" },
    { id: "pousada", nome: "Pousada", tipo: "hotel", x: 40, z: 18, largura: 16, fundo: 10, altura: 6, entravel: true, porta: "n" },
    { id: "ferraria", nome: "Ferraria", tipo: "galpao", x: -110, z: 16, largura: 12, fundo: 10, altura: 5, entravel: true, porta: "n" },
    { id: "estabulo", nome: "Estábulo", tipo: "fazenda", x: -200, z: -30, largura: 14, fundo: 10, altura: 5, entravel: true, porta: "s" },
    { id: "casa-de-pedra", nome: "Casa de Pedra", tipo: "casa", x: 200, z: 28, largura: 9, fundo: 8, altura: 4, entravel: true, porta: "n" },
    { id: "parada", nome: "Parada do Trem", tipo: "estacao", x: 40, z: 90, largura: 14, fundo: 8, altura: 5, entravel: true, porta: "s" },
    { id: "casa-n1", nome: "Casa", tipo: "casa", x: -75, z: -17, largura: 8, fundo: 8, altura: 4, entravel: false },
    { id: "casa-n2", nome: "Casa", tipo: "casa", x: -8, z: -16, largura: 9, fundo: 8, altura: 4, entravel: false },
    { id: "casa-n3", nome: "Casa", tipo: "casa", x: 60, z: -12, largura: 8, fundo: 8, altura: 4, entravel: false },
    { id: "casa-n4", nome: "Casa", tipo: "casa", x: 95, z: -14, largura: 9, fundo: 8, altura: 4, entravel: false },
    { id: "casa-n5", nome: "Casa", tipo: "casa", x: 170, z: -6, largura: 10, fundo: 8, altura: 4, entravel: false },
    { id: "casa-n6", nome: "Casa", tipo: "casa", x: 245, z: -8, largura: 9, fundo: 8, altura: 4, entravel: false },
    { id: "casa-s1", nome: "Casa", tipo: "casa", x: -160, z: 20, largura: 9, fundo: 8, altura: 4, entravel: false },
    { id: "casa-s2", nome: "Casa", tipo: "casa", x: -60, z: 14, largura: 9, fundo: 8, altura: 4, entravel: false },
    { id: "casa-s3", nome: "Casa", tipo: "casa", x: 110, z: 28, largura: 8, fundo: 8, altura: 4, entravel: false },
    { id: "casa-s4", nome: "Casa", tipo: "casa", x: -300, z: 40, largura: 9, fundo: 8, altura: 4, entravel: false },
    { id: "sitio-1", nome: "Casa", tipo: "casa", x: -340, z: -45, largura: 10, fundo: 8, altura: 4, entravel: false },
    { id: "sitio-2", nome: "Galpão", tipo: "galpao", x: -372, z: -30, largura: 12, fundo: 8, altura: 4, entravel: false },
    { id: "sitio-3", nome: "Casa", tipo: "casa", x: 360, z: 60, largura: 10, fundo: 8, altura: 4, entravel: false },
    { id: "sitio-4", nome: "Celeiro", tipo: "fazenda", x: 392, z: 80, largura: 12, fundo: 9, altura: 5, entravel: false },
  ],
  ruas: [
    { pts: [[-490, 34], [-300, 20], [-150, -10], [0, 0], [150, 15], [300, -5], [490, -40]], largura: 6, piso: "terra" },
    { pts: [[120, 10], [125, -30], [130, -50]], largura: 4, piso: "terra" },
    { pts: [[75, 8], [70, 50], [55, 100]], largura: 4, piso: "terra" },
    { pts: [[250, -2], [300, -150], [380, -300], [440, -440]], largura: 4, piso: "terra" },
    { pts: [[-480, -83], [480, 263]], largura: 4, piso: "trilho" },
  ],
  areas: [
    { tipo: "praca", pts: [[115, -48], [145, -48], [145, -36], [115, -36]] },
    { tipo: "cemiterio", pts: [[152, -92], [196, -92], [196, -56], [152, -56]] },
    { tipo: "pasto", pts: [[-240, -90], [-170, -90], [-170, -48], [-240, -48]] },
    { tipo: "pasto", pts: [[-420, -90], [-310, -90], [-310, -56], [-420, -56]] },
    { tipo: "pasto", pts: [[340, 20], [440, 20], [440, 54], [340, 54]] },
    { tipo: "neve", pts: [[-480, -480], [-120, -480], [-120, -300], [-480, -300]] },
    { tipo: "neve", pts: [[150, -480], [480, -480], [480, -330], [150, -330]] },
    { tipo: "rochas", pts: [[-380, -400], [-220, -420], [-120, -340], [-200, -250], [-360, -280]] },
    { tipo: "rochas", pts: [[170, -420], [320, -400], [380, -330], [290, -250], [190, -290]] },
    { tipo: "rochas", pts: [[-100, 300], [60, 280], [170, 360], [60, 440], [-90, 410]] },
    { tipo: "rochas", pts: [[-60, -200], [-20, -190], [-30, -160], [-70, -170]] },
    { tipo: "mata", pts: [[-480, 120], [-250, 120], [-250, 300], [-480, 300]] },
    { tipo: "mata", pts: [[220, 330], [480, 300], [480, 480], [230, 480]] },
    { tipo: "mata", pts: [[-60, -150], [60, -140], [70, -90], [-50, -80]] },
    { tipo: "neve", pts: [[-480, 330], [-300, 330], [-300, 480], [-480, 480]] },
  ],
};

export default cidade;
