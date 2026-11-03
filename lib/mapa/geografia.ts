// Geografia do Oeste lida do mapa impresso. Coordenadas do mapa: 1000 × 736.
// Fonte única do mapa 2D (WorldMap) e do continente 3D.

export type Pt = readonly [number, number];
export type RoadKind = "main" | "sec" | "trail" | "mix";

export const LAKE_DEFS = [
  { cx: 520, cy: 235, rx: 62, ry: 40, seed: 8 }, // Águas de Pólvora
  { cx: 655, cy: 115, rx: 38, ry: 26, seed: 14 }, // lago de Maria da Fé
  { cx: 285, cy: 205, rx: 30, ry: 18, seed: 16 }, // Zói de Deus
];
export const ISLAND_DEF = { cx: 50, cy: 222, rx: 28, ry: 42, seed: 4 };

export const WEST_COAST: Pt[] = [
  [0, 95], [70, 130], [95, 175], [70, 225], [95, 275], [60, 318], [85, 360],
  [60, 405], [88, 450], [65, 495], [92, 540], [68, 585], [95, 628], [78, 668],
  [108, 695], [150, 688], [210, 700], [270, 686], [335, 696], [400, 682],
  [465, 694], [530, 680], [595, 690], [655, 682], [710, 694], [755, 706],
];

export const EAST_COAST: Pt[] = [
  [1000, 320], [945, 342], [908, 385], [932, 428], [884, 452], [838, 492],
  [852, 538], [898, 578], [868, 618], [900, 660], [875, 700], [895, 736],
];

export const RIVER_DEFS: { pts: Pt[]; seed: number; taper: [number, number, number] }[] = [
  // Montanha de Gelo → Águas de Pólvora
  { pts: [[598, 88], [584, 128], [560, 168], [540, 205]], seed: 41, taper: [0.7, 1.1, 1.6] },
  // Lago de Maria da Fé → Baía (passando a leste da Serra)
  {
    pts: [[662, 138], [656, 180], [672, 218], [702, 254], [734, 294], [766, 332], [800, 366], [850, 390]],
    seed: 43,
    taper: [0.9, 1.6, 2.4],
  },
  // Rio Sucuri (largo, do leste para a baía)
  { pts: [[1000, 180], [956, 214], [936, 256], [928, 298], [936, 330]], seed: 45, taper: [1.8, 2.5, 3.2] },
  // Afluente NE do Sucuri
  { pts: [[878, 0], [870, 42], [886, 84], [906, 124], [922, 162], [944, 196], [960, 214]], seed: 47, taper: [0.7, 1.1, 1.6] },
  // Riacho de Araguari (desce do norte e segue à baía)
  { pts: [[760, 0], [756, 40], [770, 80], [792, 116], [812, 152], [830, 190], [846, 232], [862, 276], [884, 314], [910, 336]], seed: 49, taper: [0.7, 1.2, 1.8] },
  // Águas de Pólvora → sertão (some)
  { pts: [[522, 272], [540, 312], [558, 352], [572, 392], [582, 424]], seed: 51, taper: [1.4, 1.0, 0.6] },
  // Zói de Deus → mar do oeste
  { pts: [[268, 212], [225, 235], [180, 258], [138, 282], [100, 300]], seed: 53, taper: [0.7, 1.1, 1.6] },
  // Sertão de Fungos → mar do sul
  { pts: [[600, 470], [610, 520], [600, 570], [586, 622], [576, 668]], seed: 55, taper: [0.6, 1.0, 1.5] },
  // Vale do Sacramento → mar do sul
  { pts: [[430, 478], [420, 528], [406, 578], [392, 630], [382, 672]], seed: 57, taper: [0.6, 1.0, 1.5] },
  // Floresta do Cipó → mar do oeste
  { pts: [[212, 420], [186, 462], [160, 502], [138, 545], [118, 588], [102, 618]], seed: 59, taper: [0.6, 1.0, 1.5] },
];

export const FOREST_BLOBS = [
  { cx: 250, cy: 85, rx: 118, ry: 48, seed: 3 }, // Floresta do Céu
  { cx: 415, cy: 192, rx: 50, ry: 34, seed: 7 }, // norte de Bom Fim
  { cx: 545, cy: 150, rx: 55, ry: 27, seed: 17 }, // Serra da Saudade (oeste)
  { cx: 628, cy: 190, rx: 48, ry: 25, seed: 19 }, // Serra da Saudade (leste)
  { cx: 772, cy: 158, rx: 64, ry: 46, seed: 13 }, // mata de Araguari
  { cx: 600, cy: 325, rx: 92, ry: 38, seed: 11 }, // Mata de Tupaciguara
  { cx: 468, cy: 505, rx: 55, ry: 44, seed: 9 }, // sul de Desemboque
  { cx: 185, cy: 398, rx: 88, ry: 54, seed: 5 }, // Floresta do Cipó
  { cx: 332, cy: 398, rx: 34, ry: 22, seed: 23 }, // capoeira de Sacramento
  { cx: 560, cy: 598, rx: 30, ry: 20, seed: 29 }, // capoeira do sul
];

export const RIDGES = [
  { x1: 505, y1: 112, x2: 652, y2: 188, n: 7 },
  { x1: 486, y1: 138, x2: 630, y2: 214, n: 6 },
  { x1: 562, y1: 92, x2: 648, y2: 72, n: 4 },
  { x1: 820, y1: 60, x2: 905, y2: 45, n: 4 },
  { x1: 755, y1: 110, x2: 865, y2: 88, n: 5 },
  { x1: 662, y1: 228, x2: 724, y2: 208, n: 3 },
];

export const HILL_DEFS = [
  { cx: 150, cy: 158, r: 52, seed: 61 },
  { cx: 305, cy: 152, r: 44, seed: 63 },
  { cx: 430, cy: 118, r: 34, seed: 65 },
  { cx: 600, cy: 88, r: 58, seed: 67 }, // massivo da Montanha de Gelo
  { cx: 862, cy: 118, r: 44, seed: 69 },
  { cx: 240, cy: 300, r: 46, seed: 71 },
  { cx: 360, cy: 305, r: 36, seed: 73 },
  { cx: 745, cy: 292, r: 42, seed: 75 },
  { cx: 880, cy: 244, r: 34, seed: 77 },
  { cx: 480, cy: 432, r: 40, seed: 79 },
  { cx: 300, cy: 522, r: 44, seed: 81 },
  { cx: 420, cy: 602, r: 36, seed: 83 },
  { cx: 640, cy: 556, r: 46, seed: 85 },
  { cx: 700, cy: 432, r: 38, seed: 87 },
  { cx: 178, cy: 598, r: 34, seed: 89 },
  { cx: 590, cy: 652, r: 28, seed: 91 },
];

export const ROADS: { pts: Pt[]; seed: number; kind: RoadKind }[] = [
  // Principais
  { pts: [[40, 268], [110, 300], [195, 324], [290, 340]], seed: 1, kind: "main" },
  { pts: [[290, 340], [332, 302], [382, 268], [431, 241]], seed: 2, kind: "main" },
  { pts: [[431, 241], [400, 188], [372, 134], [346, 85]], seed: 3, kind: "main" },
  { pts: [[431, 241], [498, 226], [572, 200], [642, 164]], seed: 4, kind: "main" },
  { pts: [[642, 164], [652, 118], [671, 67]], seed: 5, kind: "main" },
  { pts: [[642, 164], [706, 180], [770, 192], [827, 197]], seed: 6, kind: "main" },
  { pts: [[827, 197], [790, 250], [730, 302], [663, 350]], seed: 7, kind: "main" },
  { pts: [[663, 350], [585, 330], [505, 288], [431, 241]], seed: 8, kind: "main" },
  { pts: [[663, 350], [612, 390], [526, 426]], seed: 9, kind: "main" },
  { pts: [[290, 340], [368, 378], [450, 408], [526, 426]], seed: 10, kind: "main" },
  // Secundárias
  { pts: [[346, 85], [356, 44], [362, 0]], seed: 11, kind: "sec" },
  { pts: [[671, 67], [678, 32], [682, 0]], seed: 12, kind: "sec" },
  { pts: [[827, 197], [900, 186], [1000, 176]], seed: 13, kind: "sec" },
  { pts: [[117, 600], [162, 640], [214, 664], [275, 678]], seed: 14, kind: "sec" },
  { pts: [[526, 426], [518, 492], [498, 560], [468, 622], [432, 662]], seed: 15, kind: "sec" },
  { pts: [[807, 488], [778, 540], [750, 592], [732, 644], [722, 688]], seed: 16, kind: "sec" },
  { pts: [[290, 340], [282, 288], [285, 240], [282, 216]], seed: 17, kind: "sec" },
  // Trilhas
  { pts: [[117, 600], [160, 540], [212, 470], [256, 400], [290, 340]], seed: 18, kind: "trail" },
  { pts: [[40, 268], [70, 322], [92, 382], [110, 452], [104, 522], [118, 578], [117, 600]], seed: 19, kind: "trail" },
  { pts: [[663, 350], [722, 370], [772, 392], [822, 420], [850, 448]], seed: 20, kind: "trail" },
  { pts: [[526, 426], [612, 456], [702, 470], [807, 488]], seed: 21, kind: "mix" },
];

export const RAILS: Pt[][] = [
  [[807, 488], [762, 452], [710, 398], [663, 350]],
  [[827, 197], [770, 185], [702, 172], [642, 164], [598, 148], [566, 126], [542, 102]],
];

export const CITIES: { id: string; nome: string; x: number; y: number; anchor: "left" | "right" }[] = [
  { id: "santo-ozorio", nome: "Santo Ozório", x: 40, y: 268, anchor: "right" },
  { id: "celestes", nome: "Varginha", x: 346, y: 85, anchor: "right" },
  { id: "maria-da-fe", nome: "Maria da Fé", x: 671, y: 67, anchor: "right" },
  { id: "serra-da-saudade-povoado", nome: "Serra da Saudade", x: 642, y: 164, anchor: "right" },
  { id: "araguari", nome: "Araguari", x: 827, y: 197, anchor: "right" },
  { id: "bom-fim", nome: "Bom Fim", x: 431, y: 241, anchor: "left" },
  { id: "sacramento-cidade", nome: "Sacramento", x: 290, y: 340, anchor: "left" },
  { id: "tupaciguara", nome: "Tupaciguara", x: 663, y: 350, anchor: "right" },
  { id: "vila-de-desemboque", nome: "Vila do Desemboque", x: 526, y: 426, anchor: "right" },
  { id: "belo-horizonte", nome: "Belo Horizonte", x: 807, y: 488, anchor: "right" },
  { id: "aracuai", nome: "Araçuaí", x: 117, y: 600, anchor: "right" },
];

export const REGION_PLACES: { id: string; nome: string; x: number; y: number; rotate?: number }[] = [
  { id: "floresta-do-cipo", nome: "Floresta\ndo Cipó", x: 172, y: 398 },
  { id: "sertao-de-fungos", nome: "Sertão\nde Fungos", x: 560, y: 508 },
  { id: "deserto-de-mucuri", nome: "Ravina\nVermelha", x: 172, y: 632 },
  { id: "serra-da-saudade-cordilheira", nome: "Serra da Saudade", x: 566, y: 142, rotate: 27 },
  // Não consta no mapa oficial — posição aproximada (campo da Guerra do
  // Carvão, na região das minas de Araguari); a mesa pode reposicionar.
  { id: "trincheira-do-carvao", nome: "Trincheira\ndo Carvão", x: 745, y: 252 },
];

export const DECOR_LABELS: { nome: string; x: number; y: number; rotate?: number }[] = [
  { nome: "Costa do\nSepulcro", x: 74, y: 44 },
  { nome: "Ilha do\nSepulcro", x: 50, y: 214 },
  { nome: "Floresta\ndo Céu", x: 248, y: 76 },
  { nome: "Chapada\ndo Morto", x: 246, y: 152 },
  { nome: "Montanha\nde Gelo", x: 600, y: 46 },
  { nome: "Alto da\nFriaca", x: 862, y: 46 },
  { nome: "Zói de\nDeus", x: 224, y: 262 },
  { nome: "Águas de\nPólvora", x: 520, y: 230 },
  { nome: "Mata de\nTupaciguara", x: 598, y: 316 },
  { nome: "Vale do\nSacramento", x: 305, y: 458 },
  { nome: "Baixada de\nSão José", x: 768, y: 405 },
  { nome: "Rio Sucuri", x: 946, y: 262, rotate: 70 },
  { nome: "Baía\nde BH", x: 916, y: 452 },
  { nome: "Reta dos\nVentos", x: 305, y: 636 },
  { nome: "Para o\nLeste ➤", x: 952, y: 152 },
];
