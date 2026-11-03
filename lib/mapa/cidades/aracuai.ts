// Araçuaí (Doc 2 §5.3, pp. 220–227): cidade de pedra no Deserto de Mucuri, calor, comércio e artesanato.
// Canônicos: a Feira da Barganha (praça central, a cada três meses) e o banco.
// Ferrovia, estação e os ofícios (cerâmica, tecelagem, selaria...) derivam de "ferrovias, produtos raros e artesanato".
// Traçado das ruas, bairros, sítios e prédios de preenchimento são criação nossa.

import type { Area, Cidade, Predio, Rua, XZ } from "../tipos";
import { fileira, quarteirao } from "./kit";

type Caixa = [number, number, number, number];

const ruas: Rua[] = [
  { pts: [[-1480, 40], [-700, 0], [700, 0]], largura: 10, piso: "pedra" },
  { pts: [[700, 0], [1000, 150], [1400, 350]], largura: 6, piso: "terra" },
  { pts: [[0, -300], [0, 300]], largura: 8, piso: "pedra" },
  { pts: [[0, -300], [-40, -500], [-70, -800], [-120, -1150], [-150, -1480]], largura: 4, piso: "terra" },
  { pts: [[180, -130], [400, -480], [640, -900], [820, -1250]], largura: 3, piso: "terra" },
  { pts: [[-360, -260], [360, -260]], largura: 6, piso: "pedra" },
  { pts: [[-360, -130], [360, -130]], largura: 6, piso: "pedra" },
  { pts: [[-360, 130], [360, 130]], largura: 6, piso: "pedra" },
  { pts: [[-360, 260], [360, 260]], largura: 6, piso: "pedra" },
  { pts: [[-360, -260], [-360, 260]], largura: 6, piso: "terra" },
  { pts: [[-180, -260], [-180, 260]], largura: 6, piso: "pedra" },
  { pts: [[180, -260], [180, 260]], largura: 6, piso: "pedra" },
  { pts: [[360, -260], [360, 260]], largura: 6, piso: "terra" },
  { pts: [[360, -225], [560, -225]], largura: 6, piso: "terra" },
  { pts: [[1480, -110], [1000, -200], [700, -270], [430, -270]], largura: 4, piso: "trilho" },
  { pts: [[-80, 260], [-120, 600], [-300, 900], [-420, 1200]], largura: 3, piso: "terra" },
  { pts: [[-770, 350], [-800, 40]], largura: 3, piso: "terra" },
  { pts: [[-540, 380], [-560, 120]], largura: 3, piso: "terra" },
];

const areas: Area[] = [
  { tipo: "praca", pts: [[-70, -50], [70, -50], [70, 50], [-70, 50]], nome: "Feira da Barganha" },
  { tipo: "agua", pts: [[-790, 415], [-730, 405], [-690, 440], [-720, 485], [-780, 480]] },
  { tipo: "lavoura", pts: [[-870, 330], [-650, 330], [-650, 395], [-870, 395]] },
  { tipo: "lavoura", pts: [[-870, 500], [-650, 500], [-650, 565], [-870, 565]] },
  { tipo: "cemiterio", pts: [[-660, -340], [-570, -340], [-570, -260], [-660, -260]] },
  { tipo: "pasto", pts: [[620, 110], [770, 110], [770, 200], [620, 200]] },
  { tipo: "pasto", pts: [[-1010, -210], [-880, -210], [-880, -110], [-1010, -110]] },
  { tipo: "areia", pts: [[200, 700], [620, 700], [620, 900], [200, 900]] },
  { tipo: "areia", pts: [[-1150, 300], [-950, 300], [-950, 700], [-1150, 700]] },
  { tipo: "rochas", pts: [[980, -780], [1120, -780], [1120, -640], [980, -640]] },
  { tipo: "rochas", pts: [[800, 700], [920, 700], [920, 800], [800, 800]] },
  { tipo: "rochas", pts: [[-1280, 90], [-1170, 90], [-1170, 240], [-1280, 240]] },
  { tipo: "rochas", pts: [[-220, 1100], [-60, 1100], [-60, 1220], [-220, 1220]] },
  { tipo: "rochas", pts: [[-700, -1100], [-540, -1100], [-540, -980], [-700, -980]] },
  { tipo: "rochas", pts: [[520, 420], [590, 420], [590, 480], [520, 480]] },
  { tipo: "rochas", pts: [[1200, 700], [1330, 700], [1330, 820], [1200, 820]] },
  { tipo: "rochas", pts: [[-1000, -760], [-870, -760], [-870, -640], [-1000, -640]] },
];

const marcos: Predio[] = [
  { id: "banco", nome: "Banco de Araçuaí", tipo: "banco", x: -40, z: -61, largura: 22, fundo: 14, altura: 7, entravel: true, porta: "s", canon: true },
  { id: "cantina", nome: "Cantina", tipo: "saloon", x: -13, z: -61, largura: 12, fundo: 14, altura: 5, entravel: true, porta: "s" },
  { id: "igreja", nome: "Igreja", tipo: "igreja", x: 45, z: -65, largura: 18, fundo: 22, altura: 11, entravel: true, porta: "s" },
  { id: "hotel", nome: "Hotel", tipo: "hotel", x: -40, z: 62, largura: 24, fundo: 16, altura: 7, entravel: true, porta: "n" },
  { id: "emporio", nome: "Empório", tipo: "comercio", x: -13, z: 62, largura: 12, fundo: 14, altura: 5, entravel: true, porta: "n" },
  { id: "estalagem", nome: "Estalagem dos Tropeiros", tipo: "hotel", x: 40, z: 62, largura: 20, fundo: 16, altura: 6, entravel: true, porta: "n" },
  { id: "ferraria", nome: "Ferraria", tipo: "fabrica", x: -82, z: -25, largura: 14, fundo: 16, altura: 5, entravel: true, porta: "l" },
  { id: "delegacia", nome: "Delegacia", tipo: "publico", x: -82, z: 25, largura: 14, fundo: 16, altura: 5, entravel: true, porta: "l" },
  { id: "ourivesaria", nome: "Ourivesaria", tipo: "comercio", x: 82, z: -25, largura: 14, fundo: 16, altura: 5, entravel: true, porta: "o" },
  { id: "penhores", nome: "Casa de Penhores", tipo: "comercio", x: 82, z: 25, largura: 14, fundo: 16, altura: 5, entravel: true, porta: "o" },
  { id: "estacao", nome: "Estação", tipo: "estacao", x: 470, z: -250, largura: 32, fundo: 12, altura: 6, entravel: true, porta: "s" },
  { id: "armazem-estacao", nome: "Armazém da Estação", tipo: "galpao", x: 530, z: -250, largura: 20, fundo: 12, altura: 6, entravel: true, porta: "s" },
  { id: "ceramica", nome: "Ateliê de Cerâmica", tipo: "comercio", x: -260, z: -13, largura: 12, fundo: 10, altura: 4, entravel: true, porta: "s" },
  { id: "tecelagem", nome: "Tecelagem", tipo: "fabrica", x: -300, z: 13, largura: 14, fundo: 10, altura: 4, entravel: true, porta: "n" },
  { id: "selaria", nome: "Selaria", tipo: "comercio", x: -420, z: -13, largura: 12, fundo: 10, altura: 4, entravel: true, porta: "s" },
  { id: "funilaria", nome: "Funilaria", tipo: "fabrica", x: 300, z: 13, largura: 12, fundo: 10, altura: 4, entravel: true, porta: "n" },
  { id: "tinturaria", nome: "Tinturaria", tipo: "fabrica", x: 420, z: -13, largura: 12, fundo: 10, altura: 4, entravel: true, porta: "s" },
  { id: "escola", nome: "Escola", tipo: "publico", x: -194, z: -70, largura: 14, fundo: 12, altura: 5, entravel: true, porta: "l" },
  { id: "boticario", nome: "Boticário", tipo: "comercio", x: -166, z: 80, largura: 12, fundo: 12, altura: 4, entravel: true, porta: "o" },
  { id: "padaria", nome: "Padaria", tipo: "comercio", x: 166, z: -80, largura: 12, fundo: 12, altura: 4, entravel: true, porta: "l" },
  { id: "mercado", nome: "Mercado Coberto", tipo: "comercio", x: 196, z: 90, largura: 14, fundo: 14, altura: 5, entravel: true, porta: "o" },
  { id: "cavalarica", nome: "Cavalariça", tipo: "fazenda", x: 14, z: 190, largura: 14, fundo: 12, altura: 4, entravel: true, porta: "o" },
];

const caixa = (p: Predio, m: number): Caixa => [p.x - p.largura / 2 - m, p.z - p.fundo / 2 - m, p.x + p.largura / 2 + m, p.z + p.fundo / 2 + m];
const bate = (a: Caixa, b: Caixa) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

const vetos: Caixa[] = [
  ...ruas.flatMap((r) =>
    r.pts.slice(1).flatMap((p, i): Caixa[] => {
      const q = r.pts[i];
      const m = r.largura / 2 + 1.5;
      if (p[0] === q[0]) return [[p[0] - m, Math.min(p[1], q[1]) - m, p[0] + m, Math.max(p[1], q[1]) + m]];
      if (p[1] === q[1]) return [[Math.min(p[0], q[0]) - m, p[1] - m, Math.max(p[0], q[0]) + m, p[1] + m]];
      return [];
    }),
  ),
  ...areas.map((a): Caixa => [Math.min(...a.pts.map((p) => p[0])) - 2, Math.min(...a.pts.map((p) => p[1])) - 2, Math.max(...a.pts.map((p) => p[0])) + 2, Math.max(...a.pts.map((p) => p[1])) + 2]),
];

/** Descarta prédios de preenchimento que cairiam sobre rua, área, marco ou vizinho. */
function livres(gerados: Predio[]): Predio[] {
  const aceitos: Predio[] = [];
  for (const g of gerados) {
    const c = caixa(g, 0);
    const solto = !vetos.some((v) => bate(c, v)) && !marcos.some((m) => bate(caixa(g, 6), caixa(m, 0))) && !aceitos.some((a) => bate(caixa(g, 2), caixa(a, 0)));
    if (solto) aceitos.push(g);
  }
  return aceitos;
}

/** Sítios soltos de um lado e do outro de uma estrada ou trilha. */
function aoLongo(pts: XZ[], passo: number, afasta: number, id: string, seed: number): Predio[] {
  const lista: Predio[] = [];
  let n = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, z0] = pts[i - 1];
    const [x1, z1] = pts[i];
    const len = Math.hypot(x1 - x0, z1 - z0);
    for (let d = passo / 2; d < len; d += passo) {
      const lado = n % 2 === 0 ? 1 : -1;
      const cx = x0 + ((x1 - x0) * d) / len + (-(z1 - z0) / len) * afasta * lado;
      const cz = z0 + ((z1 - z0) * d) / len + ((x1 - x0) / len) * afasta * lado;
      lista.push(...quarteirao({ id: `${id}-${n}`, nome: "Sítio", x0: cx - 22, z0: cz - 14, x1: cx + 22, z1: cz + 14, vao: 8, seed: seed + n }));
      n++;
    }
  }
  return lista;
}

const preenchimento = livres([
  ...fileira({ id: "pl-n", nome: "Casa", x: 100, z: -12, eixo: "x", quantidade: 14, seed: 11 }),
  ...fileira({ id: "pl-s", nome: "Casa", x: 100, z: 12, eixo: "x", quantidade: 14, seed: 12 }),
  ...fileira({ id: "po-n", nome: "Casa", x: -310, z: -12, eixo: "x", quantidade: 18, seed: 13 }),
  ...fileira({ id: "po-s", nome: "Casa", x: -310, z: 12, eixo: "x", quantidade: 18, seed: 14 }),
  ...fileira({ id: "v0-n", nome: "Casa", x: 14, z: -150, eixo: "z", quantidade: 8, seed: 15, vao: 6 }),
  ...fileira({ id: "v0-o", nome: "Casa", x: -14, z: -150, eixo: "z", quantidade: 8, seed: 16, vao: 6 }),
  ...fileira({ id: "v0-s", nome: "Casa", x: 14, z: 70, eixo: "z", quantidade: 6, seed: 17, vao: 6 }),
  ...fileira({ id: "v0-p", nome: "Casa", x: -14, z: 70, eixo: "z", quantidade: 6, seed: 18, vao: 6 }),
  ...fileira({ id: "ve-n", nome: "Casa", x: 192, z: -120, eixo: "z", quantidade: 6, seed: 19, vao: 5 }),
  ...fileira({ id: "ve-s", nome: "Casa", x: 192, z: 12, eixo: "z", quantidade: 6, seed: 20, vao: 5 }),
  ...fileira({ id: "vo-n", nome: "Casa", x: -168, z: -120, eixo: "z", quantidade: 6, seed: 21, vao: 5 }),
  ...fileira({ id: "vo-s", nome: "Casa", x: -168, z: 12, eixo: "z", quantidade: 6, seed: 22, vao: 5 }),
  ...fileira({ id: "ve2-n", nome: "Casa", x: 168, z: -120, eixo: "z", quantidade: 6, seed: 23, vao: 5 }),
  ...fileira({ id: "vo2-s", nome: "Casa", x: -192, z: 12, eixo: "z", quantidade: 6, seed: 26, vao: 5 }),
  ...fileira({ id: "h1-n", nome: "Oficina", tipo: "galpao", x: -340, z: -142, eixo: "x", quantidade: 6, seed: 27, vao: 12 }),
  ...fileira({ id: "h1-s", nome: "Casa", x: 30, z: -118, eixo: "x", quantidade: 6, seed: 28, vao: 12 }),
  ...fileira({ id: "h2-n", nome: "Casa", x: -340, z: 118, eixo: "x", quantidade: 6, seed: 29, vao: 12 }),
  ...fileira({ id: "h2-s", nome: "Armazém", tipo: "galpao", x: 30, z: 142, eixo: "x", quantidade: 6, seed: 30, vao: 12 }),
  ...fileira({ id: "h3-n", nome: "Casa", x: 20, z: 248, eixo: "x", quantidade: 5, seed: 32, vao: 14 }),
  ...fileira({ id: "h4-s", nome: "Casa", x: 20, z: -272, eixo: "x", quantidade: 5, seed: 34, vao: 14 }),
  ...quarteirao({ id: "bo-1", nome: "Casa", x0: -540, z0: 30, x1: -440, z1: 110, vao: 20, seed: 41 }),
  ...quarteirao({ id: "bl-1", nome: "Casa", x0: 440, z0: 30, x1: 540, z1: 110, vao: 20, seed: 42 }),
  ...quarteirao({ id: "bo-2", nome: "Casa", x0: -540, z0: -110, x1: -440, z1: -30, vao: 20, seed: 43 }),
  ...quarteirao({ id: "bl-2", nome: "Casa", x0: 440, z0: -150, x1: 540, z1: -30, vao: 20, seed: 44 }),
  ...quarteirao({ id: "bs-1", nome: "Casa", x0: -300, z0: 290, x1: -140, z1: 370, vao: 26, seed: 45 }),
  ...quarteirao({ id: "bs-2", nome: "Casa", x0: 60, z0: 290, x1: 220, z1: 370, vao: 26, seed: 46 }),
  ...quarteirao({ id: "bn-1", nome: "Casa", x0: -300, z0: -380, x1: -140, z1: -300, vao: 28, seed: 47 }),
  ...quarteirao({ id: "bn-2", nome: "Casa", x0: 100, z0: -380, x1: 260, z1: -300, vao: 28, seed: 48 }),
  ...quarteirao({ id: "ba-1", nome: "Casa", x0: -700, z0: 60, x1: -600, z1: 150, vao: 26, seed: 49 }),
  ...quarteirao({ id: "ba-2", nome: "Casa", x0: 580, z0: -100, x1: 700, z1: 20, vao: 26, seed: 50 }),
  ...quarteirao({ id: "ba-3", nome: "Casa", x0: -520, z0: 300, x1: -420, z1: 400, vao: 26, seed: 51 }),
  ...quarteirao({ id: "ba-4", nome: "Casa", x0: 380, z0: 290, x1: 520, z1: 370, vao: 26, seed: 52 }),
  ...quarteirao({ id: "ba-5", nome: "Casa", x0: 580, z0: -460, x1: 680, z1: -380, vao: 40, seed: 53 }),
  ...quarteirao({ id: "ba-6", nome: "Casa", x0: -520, z0: -520, x1: -420, z1: -440, vao: 40, seed: 54 }),
  ...aoLongo(ruas[1].pts.slice(1), 450, 40, "sl", 100),
  ...aoLongo(ruas[3].pts.slice(1), 500, 36, "sn", 200),
  ...aoLongo(ruas[4].pts, 600, 36, "sne", 300),
  ...aoLongo(ruas[0].pts.slice(0, 2), 500, 40, "so", 400),
  ...aoLongo(ruas[15].pts, 500, 36, "ss", 500),
]);

const cidade: Cidade = {
  id: "aracuai",
  nome: "Araçuaí",
  tipo: "cidade",
  raio: 1500,
  chao: "areia",
  especie: "cacto",
  arvores: 500,
  chegada: { x: 0, z: 8 },
  predios: [...marcos, ...preenchimento],
  ruas,
  areas,
};

export default cidade;
