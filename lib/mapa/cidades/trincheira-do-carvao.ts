// Trincheira do Carvão (Doc 2 §5.3, pp. 250–251): restos da guerra e terra devastada.
// Canônicos: valas, mortos e memória do conflito, e o convento isolado.
// Traçado, bunkers, ruínas e postos são criação nossa (a Guerra do Carvão, 1832–1835, é o pano de fundo).

import type { Cidade } from "../tipos";
import { fileira } from "./kit";

const cidade: Cidade = {
  id: "trincheira-do-carvao",
  nome: "Trincheira do Carvão",
  tipo: "regiao",
  raio: 2000,
  chao: "carvao",
  especie: "seca",
  arvores: 160,
  chegada: { x: 0, z: 60 },
  predios: [
    { id: "convento", nome: "Convento isolado", tipo: "igreja", x: 650, z: -780, largura: 20, fundo: 26, altura: 10, entravel: true, porta: "s", canon: true },
    { id: "capela-do-convento", nome: "Capela do convento", tipo: "igreja", x: 695, z: -735, largura: 10, fundo: 12, altura: 6, entravel: true, porta: "o", canon: true },
    { id: "bunker-comando", nome: "Bunker de comando", tipo: "galpao", x: -50, z: -60, largura: 16, fundo: 12, altura: 4, entravel: true, porta: "s" },
    { id: "paiol", nome: "Paiol", tipo: "galpao", x: 70, z: -70, largura: 12, fundo: 10, altura: 4, entravel: true, porta: "s" },
    { id: "posto-de-socorro", nome: "Posto de socorro", tipo: "casa", x: -70, z: 70, largura: 12, fundo: 10, altura: 4, entravel: true, porta: "l" },
    { id: "casamata", nome: "Casamata", tipo: "galpao", x: 520, z: -420, largura: 10, fundo: 9, altura: 3, entravel: true, porta: "o" },
    { id: "barracao-queimado", nome: "Barracão queimado", tipo: "ruina", x: -640, z: 380, largura: 14, fundo: 10, altura: 4, entravel: true, porta: "n" },
    { id: "torre-de-vigia", nome: "Torre de vigia", tipo: "torre", x: -20, z: -300, largura: 5, fundo: 5, altura: 12, entravel: false },
    { id: "torre-de-vigia-leste", nome: "Torre de vigia", tipo: "torre", x: 760, z: 330, largura: 5, fundo: 5, altura: 12, entravel: false },
    ...fileira({ id: "ruina-cabana", nome: "Cabana em ruínas", tipo: "ruina", x: -300, z: 110, eixo: "x", quantidade: 7, largura: [6, 9], fundo: [6, 9], altura: [2, 3], vao: 18, seed: 11 }),
    ...fileira({ id: "bunker-linha", nome: "Bunker", tipo: "galpao", x: 140, z: -140, eixo: "x", quantidade: 5, largura: [7, 9], fundo: [6, 8], altura: [2, 3], vao: 60, seed: 12 }),
    ...fileira({ id: "ruina-sul", nome: "Casa destruída", tipo: "ruina", x: 380, z: 420, eixo: "z", quantidade: 5, largura: [7, 10], fundo: [7, 10], altura: [2, 4], vao: 50, seed: 13 }),
    ...fileira({ id: "ruina-oeste", nome: "Armazém em ruínas", tipo: "ruina", x: -900, z: -300, eixo: "z", quantidade: 4, largura: [8, 11], fundo: [8, 11], altura: [2, 4], vao: 90, seed: 14 }),
    ...fileira({ id: "ruina-convento", nome: "Muro caído", tipo: "ruina", x: 800, z: -820, eixo: "z", quantidade: 4, largura: [6, 8], fundo: [6, 8], altura: [2, 3], vao: 40, seed: 15 }),
  ],
  ruas: [
    { pts: [[-1400, 1350], [-700, 700], [-200, 200], [0, 60]], largura: 6, piso: "terra" },
    { pts: [[0, 60], [250, 1950]], largura: 5, piso: "terra" },
    { pts: [[0, 60], [400, -330], [560, -620], [650, -735]], largura: 4, piso: "terra" },
    { pts: [[-130, 0], [130, 0]], largura: 4, piso: "madeira" },
  ],
  areas: [
    { tipo: "lama", pts: [[-1500, -520], [-800, -480], [-300, -230], [300, -190], [900, -300], [1500, -250], [1500, -225], [900, -275], [300, -165], [-300, -205], [-800, -455], [-1500, -495]], nome: "Vala do Carvão" },
    { tipo: "lama", pts: [[-1200, -80], [-600, -20], [-250, -40], [-250, -22], [-600, -2], [-1200, -62]] },
    { tipo: "lama", pts: [[250, -60], [800, -10], [1400, -90], [1400, -70], [800, 10], [250, -42]] },
    { tipo: "lama", pts: [[-400, 450], [-300, 750], [-380, 1100], [-362, 1100], [-282, 750], [-382, 450]] },
    { tipo: "lama", pts: [[900, 200], [1000, 700], [950, 1200], [968, 1200], [1018, 700], [918, 200]] },
    { tipo: "cemiterio", pts: [[-560, -700], [-400, -700], [-400, -580], [-560, -580]], nome: "Cova dos soldados" },
    { tipo: "cemiterio", pts: [[600, 700], [740, 700], [740, 800], [600, 800]] },
    { tipo: "cinzas", pts: [[-1100, 500], [-800, 500], [-800, 800], [-1100, 800]] },
    { tipo: "cinzas", pts: [[1100, 500], [1500, 500], [1500, 900], [1100, 900]] },
    { tipo: "rochas", pts: [[-1500, -1200], [-1100, -1200], [-1100, -900], [-1500, -900]] },
    { tipo: "rochas", pts: [[300, -1700], [700, -1700], [700, -1500], [300, -1500]] },
    { tipo: "rochas", pts: [[1300, 1000], [1600, 1000], [1600, 1250], [1300, 1250]] },
    { tipo: "pasto", pts: [[560, -850], [740, -850], [740, -815], [560, -815]], nome: "Horta do convento" },
  ],
};

export default cidade;
