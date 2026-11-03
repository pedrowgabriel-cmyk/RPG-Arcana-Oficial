// Floresta do Cipó (Doc 2 §5.3, pp. 234–239): vegetação densa, baixa visibilidade, fauna e trilhas.
// Canon: só o lugar em si e seus conflitos (Curupira, Kaapuã); o livro não cita prédios, então
// nenhum prédio é canônico. Trilhas, acampamentos, cabanas e ruínas são criação nossa.
// Geografia: mar a oeste, riacho que desce para o sudoeste, Sacramento a leste (trilha principal).

import type { Cidade, Predio, TipoPredio } from "../tipos";

const pequeno = (id: string, nome: string, tipo: TipoPredio, x: number, z: number, largura: number, fundo: number): Predio => ({ id, nome, tipo, x, z, largura, fundo, altura: tipo === "tenda" ? 3 : 4, entravel: false });

const cidade: Cidade = {
  id: "floresta-do-cipo",
  nome: "Floresta do Cipó",
  tipo: "regiao",
  raio: 2500,
  chao: "umido",
  especie: "copa",
  arvores: 700,
  chegada: { x: 150, z: -8 },
  predios: [
    { id: "cabana-guarda-mato", nome: "Cabana do Guarda-mato", tipo: "casa", x: -14, z: -18, largura: 10, fundo: 9, altura: 4, entravel: true, porta: "s" },
    { id: "posto-madeireiros", nome: "Posto dos Madeireiros", tipo: "galpao", x: 24, z: 18, largura: 14, fundo: 10, altura: 5, entravel: true, porta: "n" },
    { id: "capela-ruina", nome: "Capela em Ruínas", tipo: "ruina", x: -18, z: -505, largura: 12, fundo: 10, altura: 5, entravel: true, porta: "l" },
    { id: "cabana-ribeirinho", nome: "Cabana do Ribeirinho", tipo: "casa", x: 232, z: 500, largura: 10, fundo: 9, altura: 4, entravel: true, porta: "l" },
    { id: "torre-vigia", nome: "Torre de Vigia Caída", tipo: "torre", x: 1800, z: -52, largura: 9, fundo: 9, altura: 7, entravel: true, porta: "s" },
    { id: "pouso-mateiros", nome: "Pouso dos Mateiros", tipo: "casa", x: 77, z: -1800, largura: 10, fundo: 9, altura: 4, entravel: true, porta: "o" },
    { id: "casa-grande-ruina", nome: "Casa-grande em Ruínas", tipo: "ruina", x: -1400, z: -44, largura: 16, fundo: 12, altura: 6, entravel: true, porta: "s" },
    { id: "acampamento-abandonado", nome: "Acampamento Abandonado", tipo: "tenda", x: -566, z: 1500, largura: 8, fundo: 8, altura: 3, entravel: true, porta: "l" },
    { id: "acampamento-cacadores", nome: "Tenda dos Caçadores", tipo: "tenda", x: 1316, z: -1300, largura: 8, fundo: 8, altura: 3, entravel: true, porta: "o" },
    pequeno("tenda-cacador-1", "Tenda", "tenda", 1340, -1318, 6, 6),
    pequeno("tenda-cacador-2", "Tenda", "tenda", 1342, -1282, 6, 6),
    pequeno("tenda-cacador-3", "Tenda", "tenda", 1300, -1330, 6, 6),
    pequeno("tenda-cacador-4", "Tenda", "tenda", 1296, -1272, 6, 6),
    pequeno("cabana-300", "Cabana", "casa", 300, -30, 7, 6),
    pequeno("cabana-330", "Cabana", "casa", 340, 4, 7, 6),
    pequeno("cabana-900", "Cabana", "casa", 900, -18, 8, 7),
    pequeno("cabana-1500", "Cabana", "casa", 1500, 14, 8, 7),
    pequeno("cabana-oeste-1", "Cabana", "casa", -350, 48, 8, 7),
    pequeno("cabana-oeste-2", "Cabana", "casa", -1000, 3, 7, 6),
    pequeno("cabana-oeste-3", "Cabana", "casa", -1800, 50, 7, 6),
    pequeno("cabana-norte-1", "Cabana", "casa", -30, -1100, 7, 6),
    pequeno("cabana-norte-2", "Cabana", "casa", -12, -1500, 7, 6),
    pequeno("cabana-sul-1", "Cabana", "casa", -168, 500, 7, 6),
    pequeno("cabana-sul-2", "Cabana", "casa", -332, 1000, 7, 6),
    pequeno("cabana-sul-3", "Cabana", "casa", -818, 2100, 7, 6),
    pequeno("cabana-rio-1", "Cabana de Pesca", "casa", 150, 920, 6, 6),
    pequeno("ruina-casa-grande-1", "Ruína", "ruina", -1430, -62, 7, 6),
    pequeno("ruina-casa-grande-2", "Ruína", "ruina", -1370, -58, 7, 6),
    pequeno("ruina-mata-1", "Ruína", "ruina", -900, -600, 8, 7),
    pequeno("ruina-mata-2", "Ruína", "ruina", 900, 500, 8, 7),
    pequeno("ruina-mata-3", "Ruína", "ruina", 1700, 700, 7, 6),
    pequeno("ruina-mata-4", "Ruína", "ruina", -1600, -1000, 8, 7),
    pequeno("ruina-mata-5", "Ruína", "ruina", 300, -1300, 7, 6),
  ],
  ruas: [
    // Trilha principal: de Sacramento (leste) ao mar (oeste)
    { pts: [[2450, 60], [2100, 10], [1800, -40], [1500, -5], [1200, 30], [900, 0], [600, -30], [300, -15], [0, 0], [-350, 30], [-700, 60], [-1000, 21], [-1400, -30], [-1800, 33], [-2100, 80], [-2400, 60]], largura: 4, piso: "terra" },
    // Trilha do norte
    { pts: [[0, -2450], [60, -1800], [20, -1500], [-50, -1100], [-20, -800], [0, -500], [10, -250], [0, 0]], largura: 3, piso: "terra" },
    // Trilha do sul, ao longo do riacho
    { pts: [[0, 0], [-80, 250], [-150, 500], [-250, 750], [-350, 1000], [-450, 1250], [-550, 1500], [-680, 1800], [-800, 2100], [-950, 2400]], largura: 3, piso: "terra" },
    // Margem leste do riacho
    { pts: [[400, 0], [330, 250], [250, 500], [190, 700], [130, 900]], largura: 2, piso: "terra" },
    // Trilha dos caçadores
    { pts: [[600, -30], [800, -400], [1000, -800], [1150, -1050], [1300, -1300]], largura: 2, piso: "terra" },
  ],
  areas: [
    { tipo: "praca", pts: [[-30, -34], [40, -34], [40, 34], [-30, 34]] },
    { tipo: "praca", pts: [[1270, -1345], [1370, -1345], [1370, -1255], [1270, -1255]] },
    // Riacho do centro-sul até perto do mar, com um vau para atravessar
    { tipo: "agua", pts: [[246, 200], [183, 380], [211, 380], [274, 200]] },
    { tipo: "agua", pts: [[162, 440], [106, 600], [-114, 1100], [-364, 1600], [-664, 2150], [-864, 2300], [-836, 2300], [-636, 2150], [-336, 1600], [-86, 1100], [134, 600], [190, 440]] },
    { tipo: "rochas", pts: [[-1130, -1230], [-1070, -1230], [-1070, -1180], [-1130, -1180]] },
    { tipo: "mata", pts: [[-2200, -1900], [-700, -1900], [-700, -600], [-2200, -600]] },
    { tipo: "mata", pts: [[-700, -2300], [700, -2300], [700, -600], [-700, -600]] },
    { tipo: "mata", pts: [[700, -2200], [2200, -2200], [2200, -1000], [700, -1000]] },
    { tipo: "mata", pts: [[1000, -1000], [2300, -1000], [2300, -150], [1000, -150]] },
    { tipo: "mata", pts: [[700, 150], [2300, 150], [2300, 1400], [700, 1400]] },
    { tipo: "mata", pts: [[350, 300], [950, 300], [950, 1200], [350, 1200]] },
    { tipo: "mata", pts: [[-2200, -600], [-700, -600], [-700, 150], [-2200, 150]] },
    { tipo: "mata", pts: [[-2200, 150], [-600, 150], [-600, 1300], [-2200, 1300]] },
    { tipo: "mata", pts: [[-1500, 1300], [-900, 1300], [-900, 2300], [-1500, 2300]] },
    { tipo: "mata", pts: [[0, 1200], [1200, 1200], [1200, 2300], [0, 2300]] },
    { tipo: "mata", pts: [[100, -600], [700, -600], [700, -100], [100, -100]] },
    { tipo: "mata", pts: [[-700, -600], [-100, -600], [-100, -100], [-700, -100]] },
  ],
};

export default cidade;
