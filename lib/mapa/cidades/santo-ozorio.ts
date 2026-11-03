// Santo Ozório (Doc 2 §5.3, pp. 228–233): litoral turístico, hotéis, pesca e arquipélago.
// Canônicos: Hotel Rubro, farol desativado e a Ilha de Sepulcro (que fica a dezenas de km mar adentro;
// aqui só existe o cais de acesso, no fim do píer). Orla, mar a oeste, bairros, hotéis, pousadas e
// peixarias, traçado das ruas, sítios e preenchimento são criação nossa.

import type { Area, Cidade, Predio, Rua, XZ } from "../tipos";
import { fileira } from "./kit";

const orla: XZ[] = [[-500, -1200], [-500, -1000], [-490, -720], [-420, -560], [-390, -380], [-358, -200], [-350, 0], [-340, 200], [-370, 500], [-410, 900], [-460, 1300], [-500, 1470]];

const ruas: Rua[] = [
  { pts: orla, largura: 9, piso: "pedra" },
  { pts: [[-520, 0], [-350, 0]], largura: 6, piso: "madeira" },
  { pts: [[-350, 0], [520, 0]], largura: 10, piso: "pedra" },
  { pts: [[520, 0], [900, 60], [1450, 180]], largura: 8, piso: "terra" },
  { pts: [[-340, -130], [430, -130]], largura: 6, piso: "terra" },
  { pts: [[-345, 140], [460, 140]], largura: 6, piso: "terra" },
  { pts: [[-365, -270], [300, -270]], largura: 6, piso: "terra" },
  { pts: [[-355, 280], [320, 280]], largura: 6, piso: "terra" },
  { pts: [[-330, -400], [-100, -405], [250, -395], [480, -380]], largura: 5, piso: "terra" },
  { pts: [[-390, 420], [-100, 430], [300, 420]], largura: 5, piso: "terra" },
  { pts: [[-190, -270], [-190, 280]], largura: 6, piso: "terra" },
  { pts: [[40, -400], [40, 420]], largura: 6, piso: "terra" },
  { pts: [[260, -395], [260, 280]], largura: 6, piso: "terra" },
  { pts: [[430, -130], [430, 150]], largura: 6, piso: "terra" },
  { pts: [[40, 420], [60, 560], [120, 900], [200, 1200], [260, 1480]], largura: 6, piso: "terra" },
  { pts: [[120, 900], [-100, 980], [-260, 1060]], largura: 5, piso: "terra" },
  { pts: [[430, -130], [470, -300], [560, -520], [640, -760], [700, -1000], [740, -1300]], largura: 5, piso: "terra" },
  { pts: [[480, -290], [600, -270], [730, -262]], largura: 4, piso: "terra" },
  { pts: [[700, 32], [720, 300], [880, 520]], largura: 4, piso: "terra" },
  { pts: [[-490, -740], [-540, -800], [-590, -850], [-605, -870]], largura: 5, piso: "terra" },
  { pts: [[-500, -1200], [-470, -1350], [-430, -1480]], largura: 5, piso: "terra" },
];

const areas: Area[] = [
  { tipo: "agua", pts: [[-1700, -1700], [-545, -1700], [-545, -1100], [-650, -930], [-668, -860], [-645, -800], [-540, -680], [-470, -500], [-420, -200], [-410, -3], [-520, -3], [-520, 3], [-410, 3], [-400, 200], [-430, 500], [-470, 900], [-520, 1300], [-540, 1700], [-1700, 1700]] },
  { tipo: "areia", pts: [[-540, -680], [-470, -500], [-420, -200], [-410, -3], [-410, 3], [-400, 200], [-430, 500], [-470, 900], [-520, 1300], [-475, 1300], [-425, 900], [-385, 500], [-355, 200], [-365, 3], [-365, -3], [-375, -200], [-425, -500], [-495, -680]] },
  { tipo: "areia", pts: [[-650, -930], [-668, -860], [-645, -800], [-540, -680], [-495, -680], [-615, -800], [-635, -860], [-620, -925]] },
  { tipo: "rochas", pts: [[-668, -880], [-655, -878], [-652, -845], [-666, -842]] },
  { tipo: "rochas", pts: [[-455, 700], [-440, 696], [-436, 712], [-452, 716]] },
  { tipo: "rochas", pts: [[-455, -430], [-440, -432], [-438, -418], [-452, -416]] },
  { tipo: "rochas", pts: [[-500, -1000], [-470, -1010], [-455, -985], [-490, -970]] },
  { tipo: "praca", pts: [[100, -50], [200, -50], [200, -6], [100, -6]] },
  { tipo: "cemiterio", pts: [[500, -250], [560, -250], [560, -200], [500, -200]] },
  { tipo: "lavoura", pts: [[640, -360], [840, -360], [840, -170], [640, -170]] },
  { tipo: "pasto", pts: [[780, 330], [1000, 330], [1000, 480], [780, 480]] },
  { tipo: "pasto", pts: [[-120, 700], [60, 690], [80, 820], [-110, 830]] },
  { tipo: "pasto", pts: [[420, 700], [620, 700], [620, 860], [420, 860]] },
  { tipo: "lavoura", pts: [[880, -110], [1080, -110], [1080, -20], [880, -20]] },
  { tipo: "mata", pts: [[-390, 950], [-250, 950], [-250, 1400], [-420, 1400]], nome: "Coqueiral" },
  { tipo: "mata", pts: [[900, -900], [1450, -900], [1450, -300], [1000, -300]] },
  { tipo: "mata", pts: [[300, -900], [560, -900], [520, -600], [300, -600]] },
  { tipo: "mata", pts: [[-200, -1000], [150, -1000], [150, -750], [-200, -750]] },
  { tipo: "mata", pts: [[900, 600], [1400, 600], [1400, 1100], [900, 1100]] },
  { tipo: "rochas", pts: [[1000, -700], [1100, -720], [1150, -640], [1060, -600]] },
  { tipo: "rochas", pts: [[1250, -500], [1340, -520], [1360, -430], [1270, -410]] },
  { tipo: "rochas", pts: [[560, -1100], [640, -1120], [660, -1040], [580, -1020]] },
  { tipo: "rochas", pts: [[1100, 800], [1180, 790], [1200, 880], [1120, 890]] },
];

const bloqueiam = new Set(["agua", "rochas", "praca", "lavoura", "pasto", "cemiterio", "mata"]);

function dentro(x: number, z: number, pts: XZ[]) {
  let d = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i];
    const [xj, zj] = pts[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) d = !d;
  }
  return d;
}

const amostras: { x: number; z: number; m: number }[] = [];
for (const r of ruas) {
  for (let i = 1; i < r.pts.length; i++) {
    const [a, b] = [r.pts[i - 1], r.pts[i]];
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
    for (let k = 0; k <= n; k++) amostras.push({ x: a[0] + ((b[0] - a[0]) * k) / n, z: a[1] + ((b[1] - a[1]) * k) / n, m: r.largura / 2 + 2 });
  }
}

/** Preenchimento só entra onde não pisa em rua, área bloqueada nem prédio já aceito. */
function compor(manuais: Predio[], enchimento: Predio[]) {
  const aceitos = [...manuais];
  for (const p of enchimento) {
    const [hx, hz] = [p.largura / 2, p.fundo / 2];
    const cantos: XZ[] = [[p.x, p.z], [p.x - hx, p.z - hz], [p.x + hx, p.z - hz], [p.x - hx, p.z + hz], [p.x + hx, p.z + hz]];
    if (areas.some((a) => bloqueiam.has(a.tipo) && cantos.some(([x, z]) => dentro(x, z, a.pts)))) continue;
    if (amostras.some((s) => Math.abs(s.x - p.x) < hx + s.m && Math.abs(s.z - p.z) < hz + s.m)) continue;
    if (aceitos.some((q) => Math.abs(q.x - p.x) < (q.largura + p.largura) / 2 + 2 && Math.abs(q.z - p.z) < (q.fundo + p.fundo) / 2 + 2)) continue;
    aceitos.push(p);
  }
  return aceitos;
}

const manuais: Predio[] = [
  { id: "hotel-rubro", nome: "Hotel Rubro", tipo: "hotel", x: -330, z: -70, largura: 22, fundo: 36, altura: 14, entravel: true, porta: "o", canon: true },
  { id: "farol", nome: "Farol desativado", tipo: "torre", x: -620, z: -870, largura: 10, fundo: 10, altura: 26, entravel: true, porta: "l", canon: true },
  { id: "cais-sepulcro", nome: "Cais da Ilha de Sepulcro", tipo: "publico", x: -395, z: -18, largura: 12, fundo: 10, altura: 5, entravel: true, porta: "s", canon: true },
  { id: "hotel-orla-norte", nome: "Hotel da Orla", tipo: "hotel", x: -335, z: -160, largura: 20, fundo: 30, altura: 12, entravel: true, porta: "o" },
  { id: "hotel-orla-sul", nome: "Hotel Beira-Mar", tipo: "hotel", x: -325, z: 90, largura: 20, fundo: 30, altura: 12, entravel: true, porta: "o" },
  { id: "pousada-sul", nome: "Pousada", tipo: "hotel", x: -322, z: 205, largura: 16, fundo: 18, altura: 8, entravel: true, porta: "o" },
  { id: "pousada-norte", nome: "Pousada", tipo: "hotel", x: -348, z: -230, largura: 16, fundo: 18, altura: 8, entravel: true, porta: "o" },
  { id: "mercado-peixe", nome: "Mercado de Peixe", tipo: "comercio", x: -387, z: 50, largura: 14, fundo: 12, altura: 5, entravel: true, porta: "l" },
  { id: "colonia-pescadores", nome: "Colônia de Pescadores", tipo: "galpao", x: -385, z: -60, largura: 16, fundo: 12, altura: 5, entravel: true, porta: "l" },
  { id: "salgadeira", nome: "Salgadeira", tipo: "galpao", x: -392, z: 330, largura: 16, fundo: 12, altura: 5, entravel: true, porta: "l" },
  { id: "igreja-matriz", nome: "Igreja Matriz", tipo: "igreja", x: 150, z: -65, largura: 14, fundo: 22, altura: 12, entravel: true, porta: "s" },
  { id: "delegacia", nome: "Delegacia", tipo: "publico", x: -100, z: -16, largura: 14, fundo: 12, altura: 5, entravel: true, porta: "s" },
  { id: "emporio", nome: "Empório", tipo: "comercio", x: -250, z: -16, largura: 16, fundo: 12, altura: 5, entravel: true, porta: "s" },
  { id: "bar", nome: "Bar", tipo: "saloon", x: -60, z: 16, largura: 16, fundo: 12, altura: 5, entravel: true, porta: "n" },
  { id: "armazem", nome: "Armazém", tipo: "comercio", x: 60, z: 16, largura: 18, fundo: 12, altura: 5, entravel: true, porta: "n" },
  { id: "peixaria", nome: "Peixaria", tipo: "comercio", x: -150, z: 16, largura: 14, fundo: 12, altura: 5, entravel: true, porta: "n" },
  { id: "oficina", nome: "Oficina", tipo: "comercio", x: -290, z: 16, largura: 14, fundo: 12, altura: 5, entravel: true, porta: "n" },
  { id: "estalagem", nome: "Estalagem", tipo: "hotel", x: 200, z: 16, largura: 20, fundo: 14, altura: 7, entravel: true, porta: "n" },
  { id: "mercearia", nome: "Mercearia", tipo: "comercio", x: 330, z: -16, largura: 14, fundo: 12, altura: 5, entravel: true, porta: "s" },
  { id: "escola", nome: "Escola", tipo: "publico", x: 300, z: -70, largura: 16, fundo: 14, altura: 5, entravel: true, porta: "o" },
  { id: "sitio-estrada", nome: "Sítio", tipo: "fazenda", x: 880, z: 110, largura: 20, fundo: 14, altura: 6, entravel: true, porta: "n" },
  { id: "sitio-1", nome: "Sítio", tipo: "fazenda", x: 730, z: -240, largura: 18, fundo: 12, altura: 5, entravel: false },
  { id: "celeiro-1", nome: "Celeiro", tipo: "galpao", x: 760, z: -300, largura: 12, fundo: 10, altura: 6, entravel: false },
  { id: "sitio-2", nome: "Sítio", tipo: "fazenda", x: 900, z: 545, largura: 18, fundo: 12, altura: 5, entravel: false },
  { id: "celeiro-2", nome: "Celeiro", tipo: "galpao", x: 930, z: 500, largura: 12, fundo: 10, altura: 6, entravel: false },
  { id: "sitio-3", nome: "Sítio", tipo: "fazenda", x: 120, z: 780, largura: 18, fundo: 12, altura: 5, entravel: false },
  { id: "sitio-4", nome: "Sítio", tipo: "fazenda", x: 520, z: 900, largura: 18, fundo: 12, altura: 5, entravel: false },
  { id: "sitio-5", nome: "Sítio", tipo: "fazenda", x: 680, z: -780, largura: 18, fundo: 12, altura: 5, entravel: false },
  { id: "sitio-6", nome: "Sítio", tipo: "fazenda", x: 1000, z: 220, largura: 18, fundo: 12, altura: 5, entravel: false },
  { id: "rancho-pesca-1", nome: "Rancho de Pesca", tipo: "casa", x: -380, z: 1060, largura: 9, fundo: 8, altura: 3, entravel: false },
  { id: "rancho-pesca-2", nome: "Rancho de Pesca", tipo: "casa", x: -250, z: 1090, largura: 9, fundo: 8, altura: 3, entravel: false },
  { id: "casa-faroleiro", nome: "Casa", tipo: "casa", x: -560, z: -830, largura: 9, fundo: 8, altura: 4, entravel: false },
];

const enchimento: Predio[] = [
  // Comércio
  ...fileira({ id: "com-n1", nome: "Loja", tipo: "comercio", x: -305, z: -13, eixo: "x", quantidade: 12, seed: 11 }),
  ...fileira({ id: "com-n2", nome: "Casa", x: -100, z: -13, eixo: "x", quantidade: 10, seed: 12 }),
  ...fileira({ id: "com-n3", nome: "Casa", x: 250, z: -13, eixo: "x", quantidade: 5, vao: 12, seed: 14 }),
  ...fileira({ id: "com-n4", nome: "Casa", x: 420, z: -13, eixo: "x", quantidade: 4, vao: 20, seed: 15 }),
  ...fileira({ id: "com-s1", nome: "Loja", tipo: "comercio", x: -305, z: 13, eixo: "x", quantidade: 10, seed: 21 }),
  ...fileira({ id: "com-s2", nome: "Casa", x: -100, z: 13, eixo: "x", quantidade: 8, vao: 5, seed: 22 }),
  ...fileira({ id: "com-s3", nome: "Casa", x: 250, z: 13, eixo: "x", quantidade: 5, vao: 12, seed: 24 }),
  ...fileira({ id: "com-s4", nome: "Casa", x: 420, z: 13, eixo: "x", quantidade: 3, vao: 20, seed: 25 }),
  // Ruas transversais
  ...fileira({ id: "ra-n", nome: "Casa", x: -300, z: -141, eixo: "x", quantidade: 10, vao: 22, seed: 31 }),
  ...fileira({ id: "ra-s", nome: "Casa", x: -300, z: -119, eixo: "x", quantidade: 10, vao: 22, seed: 32 }),
  ...fileira({ id: "rb-n", nome: "Casa", x: -300, z: 129, eixo: "x", quantidade: 9, vao: 24, seed: 33 }),
  ...fileira({ id: "rb-s", nome: "Casa", x: -300, z: 151, eixo: "x", quantidade: 9, vao: 24, seed: 34 }),
  ...fileira({ id: "rc-n", nome: "Casa", x: -320, z: -281, eixo: "x", quantidade: 7, vao: 30, seed: 35 }),
  ...fileira({ id: "rc-s", nome: "Casa", x: -320, z: -259, eixo: "x", quantidade: 7, vao: 30, seed: 36 }),
  ...fileira({ id: "rd-n", nome: "Casa", x: -300, z: 269, eixo: "x", quantidade: 6, vao: 32, seed: 37 }),
  ...fileira({ id: "rd-s", nome: "Casa", x: -300, z: 291, eixo: "x", quantidade: 6, vao: 32, seed: 38 }),
  ...fileira({ id: "re-n", nome: "Casa", x: -300, z: -411, eixo: "x", quantidade: 3, vao: 30, seed: 39 }),
  ...fileira({ id: "re-s", nome: "Casa", x: -300, z: -389, eixo: "x", quantidade: 4, vao: 30, seed: 40 }),
  ...fileira({ id: "rf-n", nome: "Casa", x: -340, z: 409, eixo: "x", quantidade: 5, vao: 30, seed: 41 }),
  ...fileira({ id: "rf-s", nome: "Casa", x: -340, z: 431, eixo: "x", quantidade: 3, vao: 40, seed: 42 }),
  // Ruas norte-sul
  ...fileira({ id: "n1-l", nome: "Casa", x: -179, z: -250, eixo: "z", quantidade: 7, vao: 24, seed: 51 }),
  ...fileira({ id: "n1-o", nome: "Casa", x: -201, z: -250, eixo: "z", quantidade: 7, vao: 24, seed: 52 }),
  ...fileira({ id: "n2-l", nome: "Casa", x: 51, z: -380, eixo: "z", quantidade: 9, vao: 24, seed: 53 }),
  ...fileira({ id: "n2-o", nome: "Casa", x: 29, z: -380, eixo: "z", quantidade: 9, vao: 24, seed: 54 }),
  ...fileira({ id: "n3-l", nome: "Casa", x: 271, z: -380, eixo: "z", quantidade: 6, vao: 30, seed: 55 }),
  ...fileira({ id: "n3-o", nome: "Casa", x: 249, z: -380, eixo: "z", quantidade: 6, vao: 30, seed: 56 }),
  ...fileira({ id: "n4-l", nome: "Casa", x: 441, z: -120, eixo: "z", quantidade: 3, vao: 30, seed: 57 }),
  ...fileira({ id: "n4-o", nome: "Casa", x: 419, z: -120, eixo: "z", quantidade: 3, vao: 30, seed: 58 }),
  // Orla: sobrados do lado de terra e cabanas na praia
  ...fileira({ id: "orla-1", nome: "Sobrado", tipo: "comercio", x: -402, z: -700, eixo: "z", quantidade: 7, vao: 12, largura: [9, 13], fundo: [10, 14], altura: [6, 9], seed: 61 }),
  ...fileira({ id: "orla-2", nome: "Sobrado", tipo: "comercio", x: -372, z: -540, eixo: "z", quantidade: 8, vao: 12, largura: [9, 13], fundo: [10, 14], altura: [6, 9], seed: 62 }),
  ...fileira({ id: "orla-3", nome: "Sobrado", tipo: "comercio", x: -342, z: -370, eixo: "z", quantidade: 7, vao: 14, largura: [9, 13], fundo: [10, 14], altura: [6, 9], seed: 63 }),
  ...fileira({ id: "orla-4", nome: "Sobrado", tipo: "comercio", x: -330, z: 10, eixo: "z", quantidade: 5, vao: 8, largura: [9, 13], fundo: [10, 14], altura: [6, 9], seed: 64 }),
  ...fileira({ id: "orla-5", nome: "Sobrado", tipo: "comercio", x: -333, z: 300, eixo: "z", quantidade: 7, vao: 12, largura: [8, 12], fundo: [9, 13], altura: [5, 8], seed: 65 }),
  ...fileira({ id: "orla-6", nome: "Casa", x: -351, z: 480, eixo: "z", quantidade: 9, vao: 20, seed: 66 }),
  ...fileira({ id: "orla-7", nome: "Casa", x: -393, z: 880, eixo: "z", quantidade: 4, vao: 30, seed: 67 }),
  ...fileira({ id: "orla-n", nome: "Casa", x: -440, z: -1190, eixo: "z", quantidade: 5, vao: 40, seed: 68 }),
  ...fileira({ id: "praia-1", nome: "Cabana", x: -388, z: 30, eixo: "z", quantidade: 9, vao: 22, largura: [6, 8], fundo: [6, 8], altura: [3, 4], seed: 71 }),
  ...fileira({ id: "praia-2", nome: "Cabana", x: -395, z: -180, eixo: "z", quantidade: 4, vao: 20, largura: [6, 8], fundo: [6, 8], altura: [3, 4], seed: 72 }),
  ...fileira({ id: "praia-3", nome: "Cabana", x: -394, z: 360, eixo: "z", quantidade: 6, vao: 30, largura: [6, 8], fundo: [6, 8], altura: [3, 4], seed: 73 }),
  // Periferia
  ...fileira({ id: "est-n", nome: "Casa", x: 560, z: -17, eixo: "x", quantidade: 6, vao: 30, seed: 81 }),
  ...fileira({ id: "sul-1", nome: "Casa", x: 55, z: 450, eixo: "z", quantidade: 8, vao: 40, seed: 82 }),
  ...fileira({ id: "sul-2", nome: "Casa", x: 125, z: 910, eixo: "z", quantidade: 6, vao: 60, seed: 83 }),
  ...fileira({ id: "norte-1", nome: "Casa", x: 450, z: -320, eixo: "z", quantidade: 6, vao: 50, seed: 84 }),
];

const cidade: Cidade = {
  id: "santo-ozorio",
  nome: "Santo Ozório",
  tipo: "cidade",
  raio: 1500,
  chao: "campo",
  especie: "copa",
  arvores: 700,
  chegada: { x: 150, z: 0 },
  predios: compor(manuais, enchimento),
  ruas,
  areas,
};

export default cidade;
