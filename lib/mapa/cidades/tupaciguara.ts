// Tupaciguara (Doc 2 §5.3, pp. 136–141): café, pecuária, moinhos, vida comunitária.
// Canônicos: Bar do Tião, fazendas Esperança, Vasconcelos e Domingues, moinhos e a Mata de Tupaciguara.
// Criação nossa: traçado das ruas, praça, igreja, serviços, sítios, parada do trem (a linha de BH termina aqui no mapa) e todo o preenchimento.

import type { Cidade, Predio } from "../tipos";
import { fileira, quarteirao } from "./kit";

const sitio = (id: string, x: number, z: number, seed: number): Predio[] => [
  ...fileira({ id: `${id}-casa`, nome: "Casa", x, z, eixo: "x", quantidade: 1, largura: [9, 12], seed }),
  ...fileira({ id: `${id}-celeiro`, nome: "Celeiro", tipo: "galpao", x: x + 22, z: z + 5, eixo: "x", quantidade: 1, largura: [10, 14], seed: seed + 1 }),
];

const sitios: [number, number][] = [
  [-460, 70], [-420, 160], [-250, 420], [-420, 640], [-60, 380], [-10, 560], [120, 640], [320, 600], [560, 380], [880, 60],
  [1000, 330], [880, 260], [360, -300], [150, -420], [-620, -300], [-260, -520], [800, -300], [1000, -100], [-900, 200], [-1100, 420],
  [700, 420], [-200, -250],
];

const cidade: Cidade = {
  id: "tupaciguara",
  nome: "Tupaciguara",
  tipo: "cidade",
  raio: 1400,
  chao: "campo",
  especie: "copa",
  arvores: 1100,
  chegada: { x: 0, z: 3 },
  predios: [
    { id: "bar-do-tiao", nome: "Bar do Tião", tipo: "saloon", x: -58, z: -16, largura: 18, fundo: 14, altura: 5, entravel: true, porta: "s", canon: true },
    { id: "armazem", nome: "Armazém", tipo: "comercio", x: 58, z: -16, largura: 16, fundo: 14, altura: 5, entravel: true, porta: "s" },
    { id: "igreja", nome: "Igreja", tipo: "igreja", x: 0, z: -96, largura: 14, fundo: 24, altura: 11, entravel: true, porta: "s" },
    { id: "intendencia", nome: "Intendência", tipo: "publico", x: -62, z: -62, largura: 14, fundo: 12, altura: 5, entravel: true, porta: "l" },
    { id: "escola", nome: "Escola", tipo: "publico", x: 62, z: -62, largura: 14, fundo: 12, altura: 5, entravel: true, porta: "o" },
    { id: "pousada", nome: "Pousada", tipo: "hotel", x: -110, z: -16, largura: 16, fundo: 14, altura: 6, entravel: true, porta: "s" },
    { id: "ferraria", nome: "Ferraria", tipo: "comercio", x: 110, z: -16, largura: 12, fundo: 10, altura: 4, entravel: true, porta: "s" },
    { id: "boticario", nome: "Boticário", tipo: "comercio", x: -20, z: 19, largura: 12, fundo: 10, altura: 4, entravel: true, porta: "n" },
    { id: "venda", nome: "Venda", tipo: "comercio", x: 20, z: 19, largura: 12, fundo: 10, altura: 4, entravel: true, porta: "n" },
    { id: "moinho-do-povoado", nome: "Moinho", tipo: "moinho", x: -190, z: 100, largura: 10, fundo: 10, altura: 13, entravel: true, porta: "n", canon: true },
    { id: "moinho-do-alto", nome: "Moinho", tipo: "moinho", x: 330, z: -250, largura: 10, fundo: 10, altura: 13, entravel: true, porta: "s", canon: true },
    { id: "moinho-da-mata", nome: "Moinho", tipo: "moinho", x: -420, z: -380, largura: 10, fundo: 10, altura: 13, entravel: true, porta: "s", canon: true },
    { id: "secador-de-cafe", nome: "Secador de Café", tipo: "galpao", x: -110, z: 100, largura: 24, fundo: 14, altura: 6, entravel: true, porta: "n" },
    { id: "curral", nome: "Curral do Gado", tipo: "galpao", x: 250, z: 100, largura: 20, fundo: 14, altura: 5, entravel: true, porta: "n" },
    { id: "capela", nome: "Capela", tipo: "igreja", x: -590, z: 260, largura: 9, fundo: 10, altura: 7, entravel: true, porta: "s" },
    { id: "parada", nome: "Parada do Trem", tipo: "estacao", x: 300, z: 226, largura: 14, fundo: 10, altura: 5, entravel: true, porta: "l" },
    { id: "fazenda-esperanca", nome: "Fazenda Esperança", tipo: "fazenda", x: 720, z: -640, largura: 26, fundo: 16, altura: 6, entravel: true, porta: "s", canon: true },
    { id: "celeiro-esperanca", nome: "Celeiro", tipo: "galpao", x: 765, z: -640, largura: 12, fundo: 10, altura: 5, entravel: true, porta: "s" },
    { id: "fazenda-vasconcelos", nome: "Fazenda Vasconcelos", tipo: "fazenda", x: -780, z: 560, largura: 26, fundo: 16, altura: 6, entravel: true, porta: "n", canon: true },
    { id: "fazenda-domingues", nome: "Fazenda Domingues", tipo: "fazenda", x: 680, z: 700, largura: 26, fundo: 16, altura: 6, entravel: true, porta: "n", canon: true },
    { id: "celeiro-domingues", nome: "Celeiro", tipo: "galpao", x: 725, z: 704, largura: 12, fundo: 10, altura: 5, entravel: true, porta: "n" },
    ...fileira({ id: "norte-oeste", nome: "Casa", x: -300, z: -14, eixo: "x", quantidade: 14, seed: 3 }),
    ...fileira({ id: "norte-leste", nome: "Casa", x: 135, z: -14, eixo: "x", quantidade: 4, seed: 4 }),
    ...fileira({ id: "norte-alem", nome: "Casa", x: 245, z: -14, eixo: "x", quantidade: 8, seed: 8 }),
    ...fileira({ id: "sul-oeste", nome: "Casa", x: -300, z: 14, eixo: "x", quantidade: 21, seed: 5 }),
    ...fileira({ id: "sul-leste", nome: "Casa", x: 36, z: 14, eixo: "x", quantidade: 24, seed: 6 }),
    ...quarteirao({ id: "sw-a", nome: "Casa", x0: -330, z0: 26, x1: -176, z1: 58, vao: 6, seed: 11 }),
    ...quarteirao({ id: "sw-b", nome: "Casa", x0: -164, z0: 26, x1: -8, z1: 58, vao: 6, seed: 12 }),
    ...quarteirao({ id: "se-a", nome: "Casa", x0: 8, z0: 26, x1: 164, z1: 58, vao: 6, seed: 13 }),
    ...quarteirao({ id: "se-b", nome: "Casa", x0: 176, z0: 26, x1: 330, z1: 58, vao: 8, seed: 14 }),
    ...quarteirao({ id: "alto-oeste", nome: "Casa", x0: -330, z0: -128, x1: -190, z1: -80, vao: 12, seed: 16 }),
    ...quarteirao({ id: "alto-leste", nome: "Casa", x0: 90, z0: -128, x1: 160, z1: -80, vao: 12, seed: 17 }),
    ...quarteirao({ id: "baixo-oeste", nome: "Casa", x0: -330, z0: 124, x1: -200, z1: 190, vao: 14, seed: 18 }),
    ...quarteirao({ id: "baixo-centro", nome: "Casa", x0: 8, z0: 76, x1: 160, z1: 130, vao: 10, seed: 19 }),
    ...sitios.flatMap(([x, z], i) => sitio(`sitio-${i + 1}`, x, z, 100 + i * 3)),
    ...fileira({ id: "colonos-esperanca", nome: "Casa", x: 740, z: -585, eixo: "x", quantidade: 4, vao: 6, seed: 61 }),
    ...fileira({ id: "colonos-vasconcelos", nome: "Casa", x: -800, z: 600, eixo: "x", quantidade: 4, vao: 6, seed: 62 }),
    ...fileira({ id: "colonos-domingues", nome: "Casa", x: 660, z: 740, eixo: "x", quantidade: 4, vao: 6, seed: 63 }),
  ],
  ruas: [
    { pts: [[-1330, -340], [-900, -200], [-600, -80], [-350, 0], [350, 0], [600, 40], [900, 140], [1100, 230], [1330, 330]], largura: 10, piso: "terra" },
    { pts: [[200, 0], [290, -110], [500, -420], [750, -760], [920, -960]], largura: 8, piso: "terra" },
    { pts: [[-170, 200], [-300, 300], [-550, 520], [-800, 740], [-1000, 900]], largura: 8, piso: "terra" },
    { pts: [[900, 880], [600, 560], [400, 330], [335, 232]], largura: 3, piso: "trilho" },
    { pts: [[720, -622], [640, -500], [500, -420]], largura: 5, piso: "terra" },
    { pts: [[-780, 545], [-560, 430], [-300, 300]], largura: 5, piso: "terra" },
    { pts: [[680, 684], [520, 610], [330, 520], [170, 420], [172, 260]], largura: 5, piso: "terra" },
    { pts: [[0, 10], [0, 330]], largura: 6, piso: "terra" },
    { pts: [[-170, 66], [-170, 200]], largura: 6, piso: "terra" },
    { pts: [[170, 66], [170, 260]], largura: 6, piso: "terra" },
    { pts: [[-330, 66], [330, 66]], largura: 6, piso: "terra" },
    { pts: [[-300, -140], [300, -140]], largura: 6, piso: "terra" },
    { pts: [[0, -140], [0, -340]], largura: 5, piso: "terra" },
    { pts: [[-170, -140], [-300, -280], [-420, -366]], largura: 4, piso: "terra" },
    { pts: [[320, -175], [330, -238]], largura: 4, piso: "terra" },
  ],
  areas: [
    { tipo: "praca", pts: [[-34, -78], [34, -78], [34, -14], [-34, -14]] },
    { tipo: "praca", pts: [[-150, 114], [-62, 114], [-62, 164], [-150, 164]], nome: "Terreiro de Café" },
    { tipo: "lavoura", pts: [[640, -620], [940, -620], [940, -430], [640, -430]], nome: "Cafezal da Esperança" },
    { tipo: "lavoura", pts: [[-680, 60], [-520, 50], [-500, 190], [-660, 210]] },
    { tipo: "lavoura", pts: [[440, 600], [640, 600], [640, 760], [440, 760]] },
    { tipo: "pasto", pts: [[-1000, 300], [-500, 300], [-500, 520], [-1000, 520]] },
    { tipo: "pasto", pts: [[760, 560], [980, 560], [980, 780], [760, 780]] },
    { tipo: "pasto", pts: [[420, 150], [760, 220], [760, 330], [480, 280]] },
    { tipo: "mata", pts: [[-1180, -640], [-900, -780], [-640, -700], [-600, -480], [-720, -340], [-980, -320], [-1160, -400]], nome: "Mata de Tupaciguara" },
    { tipo: "mata", pts: [[-300, 480], [100, 500], [140, 740], [-250, 760]] },
    { tipo: "mata", pts: [[950, 420], [1150, 500], [1100, 680], [960, 650]] },
    { tipo: "agua", pts: [[-300, -440], [-180, -480], [0, -470], [80, -420], [40, -380], [-120, -372], [-260, -390]] },
    { tipo: "rochas", pts: [[930, -330], [1060, -380], [1130, -260], [1020, -190], [940, -220]] },
    { tipo: "rochas", pts: [[-200, 790], [-90, 750], [-40, 840], [-170, 880]] },
    { tipo: "cemiterio", pts: [[220, -300], [290, -300], [290, -245], [220, -245]] },
  ],
};

export default cidade;
