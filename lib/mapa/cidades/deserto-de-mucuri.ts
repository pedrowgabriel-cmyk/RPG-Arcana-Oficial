// Deserto de Mucuri / Ravina Vermelha (Doc 2 §5.3, pp. 246–249): deserto, cânion, vestígios de exploração e templo.
// Canônicos: o templo e os vestígios de exploração (acampamento da expedição).
// Traçado do cânion, trilhas, ruínas, oásis e prédios de preenchimento são criação nossa.
// O cânion corre de norte a sul; a estrada de Araçuaí chega pelo noroeste.

import type { Cidade } from "../tipos";
import { fileira } from "./kit";

const cidade: Cidade = {
  id: "deserto-de-mucuri",
  nome: "Deserto de Mucuri / Ravina Vermelha",
  tipo: "regiao",
  raio: 3000,
  chao: "areia",
  especie: "cacto",
  arvores: 450,
  chegada: { x: -200, z: -200 },
  predios: [
    { id: "templo", nome: "Templo", tipo: "ruina", x: 520, z: 800, largura: 22, fundo: 26, altura: 12, entravel: true, porta: "o", canon: true },
    { id: "tenda-expedicao", nome: "Tenda da Expedição", tipo: "tenda", x: -250, z: -420, largura: 10, fundo: 10, altura: 4, entravel: true, porta: "s", canon: true },
    { id: "barracao-expedicao", nome: "Barracão da Expedição", tipo: "galpao", x: -330, z: -60, largura: 14, fundo: 10, altura: 5, entravel: true, porta: "l", canon: true },
    { id: "mina", nome: "Mina Abandonada", tipo: "ruina", x: -1400, z: -900, largura: 12, fundo: 10, altura: 5, entravel: true, porta: "l" },
    { id: "pouso", nome: "Pouso de Beira de Estrada", tipo: "comercio", x: -880, z: -960, largura: 16, fundo: 12, altura: 5, entravel: true, porta: "s" },
    { id: "torre-mirante", nome: "Torre de Vigia", tipo: "torre", x: -520, z: -1500, largura: 8, fundo: 8, altura: 14, entravel: true, porta: "l" },
    { id: "rancho", nome: "Rancho Abandonado", tipo: "fazenda", x: 1100, z: 200, largura: 12, fundo: 10, altura: 5, entravel: true, porta: "s" },
    ...fileira({ id: "tendas", nome: "Tenda", tipo: "tenda", x: -400, z: -420, eixo: "x", quantidade: 3, largura: [6, 8], fundo: [6, 8], altura: [3, 4], seed: 11 }),
    ...fileira({ id: "casebres", nome: "Casebre abandonado", tipo: "ruina", x: -840, z: -960, eixo: "x", quantidade: 3, seed: 12 }),
    ...fileira({ id: "currais", nome: "Curral", tipo: "galpao", x: 1140, z: 200, eixo: "x", quantidade: 2, seed: 13 }),
    { id: "ruina-1", nome: "Ruína", tipo: "ruina", x: -300, z: 260, largura: 9, fundo: 8, altura: 3, entravel: false },
    { id: "ruina-2", nome: "Ruína", tipo: "ruina", x: -1700, z: 500, largura: 10, fundo: 9, altura: 3, entravel: false },
    { id: "ruina-3", nome: "Ruína", tipo: "ruina", x: 2000, z: 1900, largura: 9, fundo: 9, altura: 3, entravel: false },
    { id: "ruina-4", nome: "Ruína", tipo: "ruina", x: 900, z: -1800, largura: 11, fundo: 8, altura: 3, entravel: false },
    { id: "ruina-5", nome: "Ruína", tipo: "ruina", x: -1000, z: 1700, largura: 10, fundo: 8, altura: 3, entravel: false },
    { id: "ruina-6", nome: "Ruína", tipo: "ruina", x: 2000, z: -1400, largura: 9, fundo: 8, altura: 3, entravel: false },
  ],
  ruas: [
    { pts: [[-120, -2400], [100, -1500], [-80, -600], [60, 300], [-60, 1300], [120, 2400]], largura: 6, piso: "areia" },
    { pts: [[-150, -200], [-500, -500], [-1200, -1200], [-2100, -2100]], largura: 6, piso: "terra" },
    { pts: [[-480, -500], [-440, -1500]], largura: 4, piso: "terra" },
    { pts: [[-1100, -1100], [-1380, -900]], largura: 4, piso: "terra" },
    { pts: [[40, 100], [900, 300], [1900, -100], [2800, -400]], largura: 6, piso: "terra" },
    { pts: [[30, 800], [495, 800]], largura: 4, piso: "areia" },
  ],
  areas: [
    { tipo: "rochas", pts: [[-190, -2400], [30, -1500], [-150, -600], [-410, -600], [-230, -1500], [-450, -2400]], nome: "Paredão Oeste" },
    { tipo: "rochas", pts: [[-10, 300], [-130, 1300], [50, 2400], [-210, 2400], [-390, 1300], [-270, 300]] },
    { tipo: "rochas", pts: [[-50, -2400], [170, -1500], [-10, -600], [250, -600], [430, -1500], [210, -2400]], nome: "Paredão Leste" },
    { tipo: "rochas", pts: [[10, 1300], [190, 2400], [450, 2400], [270, 1300]] },
    { tipo: "rochas", pts: [[-2000, 0], [-1750, -40], [-1650, 200], [-1900, 320]] },
    { tipo: "rochas", pts: [[1400, -1100], [1700, -1050], [1750, -850], [1450, -800]] },
    { tipo: "rochas", pts: [[800, 1800], [1100, 1850], [1150, 2100], [850, 2150]] },
    { tipo: "rochas", pts: [[-1300, 1000], [-1000, 1050], [-950, 1300], [-1250, 1350]] },
    { tipo: "rochas", pts: [[2000, 600], [2300, 650], [2350, 900], [2050, 850]] },
    { tipo: "rochas", pts: [[-2400, -1000], [-2150, -1050], [-2100, -800], [-2350, -750]] },
    { tipo: "rochas", pts: [[800, -2400], [1100, -2350], [1150, -2150], [850, -2100]] },
    { tipo: "rochas", pts: [[480, -1220], [520, -1220], [520, -1180], [480, -1180]] },
    { tipo: "areia", pts: [[-2800, 1000], [-1800, 1000], [-1800, 2200], [-2800, 2200]], nome: "Dunas do Poente" },
    { tipo: "areia", pts: [[1200, -2400], [2400, -2400], [2400, -1700], [1200, -1700]] },
    { tipo: "agua", pts: [[1450, 1550], [1600, 1560], [1620, 1660], [1470, 1670]], nome: "Oásis" },
    { tipo: "mata", pts: [[1300, 1500], [1440, 1500], [1440, 1700], [1300, 1700]] },
    { tipo: "mata", pts: [[1640, 1500], [1780, 1500], [1780, 1700], [1640, 1700]] },
    { tipo: "mata", pts: [[-1700, 1400], [-1300, 1400], [-1300, 1800], [-1700, 1800]], nome: "Cactal" },
  ],
};

export default cidade;
