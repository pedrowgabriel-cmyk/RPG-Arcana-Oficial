// Bom Fim (Doc 2 §5.3, pp. 142–151): chuva, lama, produção agrícola, turismo e festas.
// Canônicos: Salão Bom de Gole, Estátua de Ismael, Hotel Versailles, Conselho de Hoteleiros,
// disputa pela universidade, xerife Tonho do Arame (a delegacia é o lugar dele).
// Traçado, praça, fazendas, sítios e prédios de preenchimento são criação nossa.

import type { Area, Cidade, Predio, Rua, XZ } from "../tipos";
import { fileira, quarteirao, sorteio } from "./kit";

type Pt = readonly [number, number];

const principais: Predio[] = [
  { id: "estatua-ismael", nome: "Estátua de Ismael", tipo: "torre", x: 0, z: 0, largura: 4, fundo: 4, altura: 6, entravel: false, canon: true },
  { id: "salao-bom-de-gole", nome: "Salão Bom de Gole", tipo: "saloon", x: -30, z: -50, largura: 24, fundo: 16, altura: 6, entravel: true, porta: "s", canon: true },
  { id: "hotel-versailles", nome: "Hotel Versailles", tipo: "hotel", x: 30, z: -52, largura: 28, fundo: 18, altura: 10, entravel: true, porta: "s", canon: true },
  { id: "conselho-hoteleiros", nome: "Sede do Conselho de Hoteleiros", tipo: "publico", x: 52, z: -24, largura: 14, fundo: 18, altura: 6, entravel: true, porta: "o", canon: true },
  { id: "universidade", nome: "Universidade", tipo: "publico", x: -52, z: -24, largura: 14, fundo: 24, altura: 8, entravel: true, porta: "l", canon: true },
  { id: "delegacia", nome: "Delegacia", tipo: "publico", x: -52, z: 22, largura: 14, fundo: 14, altura: 5, entravel: true, porta: "l", canon: true },
  { id: "casa-espetaculos", nome: "Casa de Espetáculos", tipo: "publico", x: 54, z: 26, largura: 16, fundo: 18, altura: 8, entravel: true, porta: "o" },
  { id: "igreja", nome: "Igreja Matriz", tipo: "igreja", x: 0, z: 52, largura: 18, fundo: 26, altura: 12, entravel: true, porta: "n" },
  { id: "boticario", nome: "Boticário", tipo: "comercio", x: -90, z: -15, largura: 12, fundo: 14, altura: 5, entravel: true, porta: "s" },
  { id: "padaria", nome: "Padaria", tipo: "comercio", x: -90, z: 15, largura: 12, fundo: 14, altura: 5, entravel: true, porta: "n" },
  { id: "ferraria", nome: "Ferraria", tipo: "galpao", x: -170, z: -17, largura: 16, fundo: 18, altura: 5, entravel: true, porta: "s" },
  { id: "pousada-oeste", nome: "Pousada", tipo: "hotel", x: -175, z: 17, largura: 18, fundo: 18, altura: 7, entravel: true, porta: "n" },
  { id: "mercado", nome: "Mercado Coberto", tipo: "comercio", x: 100, z: -16, largura: 24, fundo: 16, altura: 5, entravel: true, porta: "s" },
  { id: "armazem-geral", nome: "Armazém Geral", tipo: "comercio", x: 90, z: 16, largura: 18, fundo: 16, altura: 5, entravel: true, porta: "n" },
  { id: "barbearia", nome: "Barbearia", tipo: "comercio", x: 160, z: -14, largura: 10, fundo: 12, altura: 4, entravel: true, porta: "s" },
  { id: "cantina", nome: "Cantina", tipo: "saloon", x: 170, z: 16, largura: 16, fundo: 16, altura: 5, entravel: true, porta: "n" },
  { id: "pousada-leste", nome: "Pousada", tipo: "hotel", x: 215, z: -17, largura: 20, fundo: 18, altura: 7, entravel: true, porta: "s" },
  { id: "hospedaria", nome: "Hospedaria", tipo: "hotel", x: -225, z: 16, largura: 18, fundo: 16, altura: 6, entravel: true, porta: "n" },
  { id: "barracao-festas", nome: "Barracão de Festas", tipo: "galpao", x: 60, z: -126, largura: 26, fundo: 18, altura: 6, entravel: true, porta: "s" },
  { id: "capela", nome: "Capela", tipo: "igreja", x: -70, z: 124, largura: 12, fundo: 14, altura: 7, entravel: true, porta: "n" },
  { id: "engenho", nome: "Engenho", tipo: "fabrica", x: 300, z: 238, largura: 26, fundo: 22, altura: 9, entravel: true, porta: "n" },
  { id: "fazenda-nordeste", nome: "Fazenda", tipo: "fazenda", x: 560, z: -420, largura: 28, fundo: 18, altura: 6, entravel: true, porta: "s" },
  { id: "celeiro-nordeste", nome: "Celeiro", tipo: "galpao", x: 600, z: -415, largura: 16, fundo: 14, altura: 6, entravel: true, porta: "s" },
  { id: "fazenda-sudeste", nome: "Fazenda", tipo: "fazenda", x: 620, z: 470, largura: 26, fundo: 16, altura: 6, entravel: true, porta: "n" },
  { id: "celeiro-sudeste", nome: "Celeiro", tipo: "galpao", x: 660, z: 468, largura: 16, fundo: 14, altura: 6, entravel: true, porta: "n" },
  { id: "fazenda-oeste", nome: "Fazenda", tipo: "fazenda", x: -640, z: -80, largura: 26, fundo: 16, altura: 6, entravel: true, porta: "s" },
];

const ruas: Rua[] = [
  { pts: [[-480, 0], [-48, 0]], largura: 10, piso: "pedra" },
  { pts: [[48, 0], [480, 0]], largura: 10, piso: "pedra" },
  { pts: [[0, -330], [0, -40]], largura: 8, piso: "pedra" },
  { pts: [[0, 70], [0, 330]], largura: 8, piso: "pedra" },
  ...[-330, -220, -110, 110, 220, 330].map((z): Rua => ({ pts: [[-480, z], [480, z]], largura: Math.abs(z) === 330 ? 6 : 8, piso: Math.abs(z) === 110 ? "pedra" : "lama" })),
  ...[-480, -360, -240, -120, 120, 240, 360, 480].map((x): Rua => ({ pts: [[x, -330], [x, 330]], largura: Math.abs(x) === 480 ? 6 : 8, piso: Math.abs(x) <= 120 ? "pedra" : "lama" })),
  // Saídas para Sacramento (sudoeste), Varginha (norte-noroeste), Serra da Saudade (leste-nordeste) e Tupaciguara (leste-sudeste)
  { pts: [[-480, 0], [-760, 200], [-1000, 470], [-1160, 780]], largura: 7, piso: "lama" },
  { pts: [[0, -330], [-150, -520], [-420, -800], [-740, -1250]], largura: 7, piso: "lama" },
  { pts: [[480, 0], [740, -135], [1000, -300], [1340, -520]], largura: 7, piso: "lama" },
  { pts: [[480, 110], [700, 260], [1000, 420], [1310, 610]], largura: 7, piso: "lama" },
  // Acessos às fazendas
  { pts: [[560, -42], [560, -400]], largura: 5, piso: "lama" },
  { pts: [[620, 205], [620, 455]], largura: 5, piso: "lama" },
  { pts: [[-640, 114], [-640, -64]], largura: 5, piso: "lama" },
];

const retangulo = (x0: number, z0: number, x1: number, z1: number): XZ[] => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

const areas: Area[] = [
  { tipo: "praca", pts: retangulo(-40, -30, 40, 30) },
  { tipo: "lama", pts: retangulo(-30, -42, 30, -34) },
  { tipo: "lama", pts: retangulo(46, -4, 120, 4) },
  { tipo: "lama", pts: retangulo(-150, 100, -90, 120) },
  { tipo: "lama", pts: retangulo(130, 215, 230, 235) },
  { tipo: "lama", pts: retangulo(-360, -120, -240, -100) },
  { tipo: "lama", pts: retangulo(240, -230, 360, -210) },
  { tipo: "cemiterio", pts: retangulo(420, 230, 500, 300) },
  { tipo: "lavoura", pts: [[400, -640], [900, -620], [900, -480], [400, -460]] },
  { tipo: "lavoura", pts: [[-250, 420], [250, 420], [250, 700], [-250, 700]] },
  { tipo: "lavoura", pts: [[450, 480], [950, 640], [800, 900], [400, 820]] },
  { tipo: "pasto", pts: [[-900, -380], [-500, -380], [-500, -120], [-900, -120]] },
  { tipo: "pasto", pts: [[-950, 600], [-450, 560], [-450, 900], [-900, 950]] },
  { tipo: "agua", pts: retangulo(-720, -270, -680, -240) },
  { tipo: "agua", pts: retangulo(-640, 700, -600, 730) },
  { tipo: "mata", pts: [[60, -760], [640, -820], [980, -1060], [620, -1330], [180, -1380], [60, -1100]] },
  { tipo: "mata", pts: [[-1050, -650], [-700, -560], [-640, -800], [-860, -1100], [-1050, -900]] },
  { tipo: "mata", pts: [[-1300, -200], [-1000, -300], [-900, 100], [-1250, 200]] },
  { tipo: "rochas", pts: retangulo(1100, -900, 1140, -870) },
  { tipo: "rochas", pts: retangulo(-1280, -520, -1240, -490) },
];

function distSeg(x: number, z: number, [ax, az]: Pt, [bx, bz]: Pt) {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - (ax + t * dx), z - (az + t * dz));
}

function naRua(p: Predio) {
  const folga = Math.max(p.largura, p.fundo) / 2 + 1;
  return ruas.some((r) => r.pts.slice(1).some((b, i) => distSeg(p.x, p.z, r.pts[i], b) - r.largura / 2 < folga));
}

const reservas = [
  { x0: -46, z0: -36, x1: 46, z1: 36 },
  ...principais.map((p) => ({ x0: p.x - p.largura / 2 - 5, z0: p.z - p.fundo / 2 - 5, x1: p.x + p.largura / 2 + 5, z1: p.z + p.fundo / 2 + 5 })),
];

function livre(p: Predio) {
  const w = p.largura / 2;
  const d = p.fundo / 2;
  return !naRua(p) && !reservas.some((r) => p.x + w > r.x0 && p.x - w < r.x1 && p.z + d > r.z0 && p.z - d < r.z1);
}

// Bairros: a grade enche perto da praça e vai rareando para as bordas.
function bairros(): Predio[] {
  const xs = [-480, -360, -240, -120, 0, 120, 240, 360, 480];
  const zs = [-330, -220, -110, 0, 110, 220, 330];
  const lista: Predio[] = [];
  const r = sorteio(11);
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < zs.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cz = (zs[j] + zs[j + 1]) / 2;
      const dens = Math.max(0.15, 1 - Math.hypot(cx, cz) / 620);
      const bloco = quarteirao({ id: `q${i}${j}`, nome: "Casa", x0: xs[i] + 7, z0: zs[j] + 8, x1: xs[i + 1] - 7, z1: zs[j + 1] - 8, vao: 3 + Math.round((1 - dens) * 14), largura: [7, 12], fundo: [7, 11], seed: 100 + i * 10 + j });
      for (const p of bloco) if (r() < dens ** 3 * 0.75 && livre(p)) lista.push(p);
    }
  }
  return lista.map((p, n) => (n % 9 === 4 ? { ...p, nome: "Oficina", tipo: "galpao" } : n % 13 === 6 ? { ...p, nome: "Armazém", tipo: "comercio" } : p));
}

// Sítios e casas soltas ao longo das estradas de saída.
function sitios(id: string, pts: Pt[], desde: number, ate: number, quantidade: number, seed: number): Predio[] {
  const r = sorteio(seed);
  const trechos = pts.slice(1).map((b, i) => ({ a: pts[i], b, c: Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1]) }));
  const total = trechos.reduce((s, t) => s + t.c, 0);
  const lista: Predio[] = [];
  for (let n = 0; n < quantidade; n++) {
    let s = (desde + ((ate - desde) * (n + r())) / quantidade) * total;
    const t = trechos.find((t) => (s -= t.c) <= 0) ?? trechos[trechos.length - 1];
    const f = 1 + s / t.c;
    const px = t.a[0] + (t.b[0] - t.a[0]) * f;
    const pz = t.a[1] + (t.b[1] - t.a[1]) * f;
    const nx = -(t.b[1] - t.a[1]) / t.c;
    const nz = (t.b[0] - t.a[0]) / t.c;
    const lado = n % 2 ? 1 : -1;
    const off = lado * (34 + r() * 90);
    const celeiro = n % 7 === 3;
    lista.push({ id: `${id}-${n + 1}`, nome: celeiro ? "Celeiro" : "Casa", tipo: celeiro ? "galpao" : "casa", x: Math.round(px + nx * off), z: Math.round(pz + nz * off), largura: 7 + Math.round(r() * 4), fundo: 7 + Math.round(r() * 3), altura: 3 + Math.round(r() * 2), entravel: false });
  }
  return lista.filter(livre);
}

const estradas = ruas.slice(-7, -3).map((r) => r.pts as Pt[]);

const cidade: Cidade = {
  id: "bom-fim",
  nome: "Bom Fim",
  tipo: "cidade",
  raio: 1500,
  chao: "lama",
  especie: "copa",
  arvores: 1100,
  chegada: { x: 20, z: 18 },
  predios: [
    ...principais,
    ...bairros(),
    ...fileira({ id: "colonos-ne", nome: "Casa", x: 640, z: -360, eixo: "x", quantidade: 4, seed: 21 }),
    ...fileira({ id: "colonos-se", nome: "Casa", x: 700, z: 430, eixo: "x", quantidade: 4, seed: 22 }),
    ...fileira({ id: "colonos-o", nome: "Casa", x: -600, z: -40, eixo: "x", quantidade: 3, seed: 23 }),
    ...sitios("sitio-sw", estradas[0], 0.12, 0.98, 16, 31),
    ...sitios("sitio-n", estradas[1], 0.1, 0.9, 14, 32),
    ...sitios("sitio-ne", estradas[2], 0.12, 0.98, 16, 33),
    ...sitios("sitio-se", estradas[3], 0.12, 0.98, 16, 34),
  ],
  ruas,
  areas,
};

export default cidade;
