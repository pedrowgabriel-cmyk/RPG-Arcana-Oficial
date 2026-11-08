// Balneário de 1880 (Santo Ozório): litoral de veraneio e pesca. Casas e hotéis claros
// (branco, creme, azul e verde-água, amarelo, rosa) com galerias de madeira branca em
// todos os andares, balaústres e lambrequins recortados; chalés de empena para a rua;
// casas de pescador de tábua salgada ou cal, com rede e canoa; armazéns de peixe de
// tábua cinza com lanternim; igreja branca de torre central e cúpula; farol de pedra
// e tijolo. Canônicos com desenho próprio: Hotel Rubro, Farol desativado e o Cais da
// Ilha de Sepulcro.

import * as THREE from "three";
import { sorteio } from "../../natureza/ferramentas";
import type { NomeMaterial } from "../../natureza/tipos";
import { aoLongo, bloco, chamine, empenas, interiorBasico, janela, malha, naFace, Obra, paredes, porta, telhado, type Face } from "../kit";
import type { Estilo, NivelPredio, PecasDoPredio, PredioLocal } from "../tipos";
import { ruina } from "./colonial";
import {
  barco,
  barril,
  cilindro,
  deslocar,
  dupla,
  franja,
  galeria,
  guardaCorpo,
  janelaBarata,
  portaJanela,
  prisma,
  rede,
  somar,
  type Acabamento,
} from "./_balneario-pecas";

const PAREDE = ["#f1ece0", "#ebe0c6", "#cddce0", "#d5e2cf", "#efdcab", "#ecd2c6", "#e3e6e2", "#f1ece0"];
const MADEIRA = ["#f3efe6", "#f3efe6", "#f3efe6", "#e8e0cc", "#2f5f72", "#3f6a52", "#8a3a2c"];
const VENEZIANA = ["#2f5f72", "#3f6a52", "#6b2a22", "#3a4a5a", "#5f8a96", "#b59a5e"];
const PORTA = ["#3a2a1e", "#2f4a5a", "#4a3a2a", "#5a2a22", "#35503f"];
const TELHA = ["#b45c3e", "#a6513a", "#c06e4c", "#9a5640"];
const ZINCO = ["#6e726c", "#5d6560", "#74706a"];
const ARREMATE = ["#f3efe6", "#f3efe6", "#e9e2d2"];
const PORTA_DE_ENTRAR = { largura: 4.2, altura: 3 };

type Plano = Acabamento & {
  parede: string;
  arremate: string;
  veneziana: string;
  porta: string;
  chale: boolean;
  varanda: boolean;
  lados: boolean;
  platibanda: boolean;
  chamine: boolean;
  pescador: boolean;
};

/** Tudo o que varia é sorteado aqui, na mesma ordem, para perto e longe baterem. */
function planejar(r: () => number): Plano {
  const de = <T,>(l: T[]) => l[Math.floor(r() * l.length)];
  const zinco = r() < 0.18;
  return {
    parede: de(PAREDE),
    madeira: de(MADEIRA),
    arremate: de(ARREMATE),
    veneziana: de(VENEZIANA),
    porta: de(PORTA),
    telha: zinco ? de(ZINCO) : de(TELHA),
    telhaMat: zinco ? "telha-escura" : "telha",
    forma: Math.floor(r() * 3),
    dente: 0.3 + r() * 0.14,
    chale: r() < 0.45,
    varanda: r() < 0.72,
    lados: r() < 0.4,
    platibanda: r() < 0.35,
    chamine: r() < 0.5,
    pescador: r() < 0.32,
  };
}

const RUBRO = {
  parede: "#8a2b22",
  madeira: "#f1ece2",
  arremate: "#f1ece2",
  veneziana: "#2b4436",
  porta: "#3a1e18",
  telha: "#4a3d38",
  telhaMat: "telha-escura" as NomeMaterial,
  forma: 2,
  dente: 0.42,
};

type TipoTelhado = "chale" | "quatro" | "duas" | "plat";

/** Volume do prédio: corpo (menor que a planta quando há galeria) e telhado. */
type Layout = {
  Lb: number;
  Fb: number;
  dz: number;
  pav: number;
  H: number;
  galeria: boolean;
  prof: number;
  /** Comprimento das galerias que dobram a esquina (0 = só na frente). */
  lados: number;
  telhado: TipoTelhado;
  alto: number;
};

function ehCabana(p: PredioLocal, pl: Plano) {
  if (p.tipo !== "casa") return false;
  if (/cabana|rancho|pescador/i.test(p.nome)) return true;
  return !p.entravel && pl.pescador && p.altura <= 4.6 && p.largura <= 10;
}

function planta(p: PredioLocal, pl: Plano, rubro: boolean): Layout {
  const { largura: L, fundo: F, altura: A } = p;
  let pav = A >= 6.4 ? 2 : 1;
  let gal = false;
  let prof = 2.2;
  let lados = 0;
  let tel: TipoTelhado = pl.chale ? "chale" : "quatro";
  switch (p.tipo) {
    case "hotel":
      pav = rubro ? 3 : Math.max(2, Math.min(3, Math.round(A / 3.4)));
      gal = true;
      prof = rubro ? 2.8 : 2.4;
      tel = "quatro";
      if (rubro) lados = Math.min(10, (F - prof) * 0.45);
      else if (pl.lados && L >= 14) lados = Math.min(7, (F - prof) * 0.5);
      break;
    case "comercio":
      pav = A >= 6 ? 2 : 1;
      gal = pav === 2 || pl.varanda;
      if (pav === 1 && pl.platibanda) tel = "plat";
      break;
    case "saloon":
      pav = A >= 6.5 ? 2 : 1;
      gal = true;
      if (pl.platibanda) tel = "plat";
      break;
    case "publico":
    case "banco":
      pav = A >= 7 ? 2 : 1;
      tel = "plat";
      break;
    case "fazenda":
      pav = 1;
      gal = true;
      prof = 2.6;
      tel = "quatro";
      break;
    case "galpao":
    case "fabrica":
      pav = 1;
      tel = "duas";
      break;
    case "estacao":
      pav = 1;
      gal = true;
      prof = 2.8;
      tel = "duas";
      break;
    default:
      gal = pl.varanda;
  }
  if (F - prof < 5) gal = false;
  const Fb = F - (gal ? prof : 0);
  const Lb = L - (lados > 0 ? prof * 2 : 0);
  const alto = tel === "chale" ? Lb * 0.46 : tel === "duas" ? Fb * 0.3 : tel === "plat" ? 0.9 : Math.min(Lb, Fb) * (p.tipo === "hotel" ? 0.22 : 0.27);
  return { Lb, Fb, dz: -(F - Fb) / 2, pav, H: A / pav, galeria: gal, prof, lados, telhado: tel, alto };
}

function cunhais(obra: Obra, L: number, F: number, A: number, cor: THREE.ColorRepresentation, c = 0.3) {
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    obra.por("reboco", bloco(c, A, c, x * (L / 2 - c / 2 + 0.03), 0, z * (F / 2 - c / 2 + 0.03)), cor, 0.04, 0.15);
  }
}

/** Telhado do corpo. Chalé: empena para a rua com lambrequim nas tesouras e pináculo. */
function cobrir(obra: Obra, t: Obra, lay: Layout, A: number, pl: Plano) {
  const { Lb, Fb, alto } = lay;
  if (lay.telhado === "quatro") {
    for (const g of telhado("quatro-aguas", Lb, Fb, A, alto, 0.7)) t.por(pl.telhaMat, g, pl.telha, 0.12, 0);
  } else if (lay.telhado === "duas") {
    for (const g of telhado("duas-aguas", Lb, Fb, A, alto, 0.5)) t.por(pl.telhaMat, g, pl.telha, 0.12, 0);
    for (const g of empenas(Lb, Fb, A, alto)) obra.por("reboco", g, pl.parede, 0.06);
  } else if (lay.telhado === "chale") {
    const b = 0.55;
    for (const g of telhado("duas-aguas", Fb, Lb, A, alto, b)) t.por(pl.telhaMat, g.rotateY(Math.PI / 2), pl.telha, 0.12, 0);
    for (const g of empenas(Fb, Lb, A, alto)) obra.por("reboco", g.rotateY(Math.PI / 2), pl.parede, 0.05);
    const zf = Fb / 2 + b - 0.06;
    const e = 0.2;
    for (const s of [-1, 1]) t.por("madeira", franja([s * (Lb / 2 + b), A - e], [0, A + alto - e], pl.forma, pl.dente * 0.9, 0.22).translate(0, 0, zf), pl.madeira, 0.04, 0);
    // Linha da tesoura, pendural e pináculo no vértice.
    t.por("madeira", bloco(Lb * 0.55, 0.14, 0.1, 0, A + alto * 0.4, zf - 0.04), pl.madeira, 0.04, 0);
    t.por("madeira", bloco(0.12, alto * 0.6, 0.1, 0, A + alto * 0.4, zf - 0.04), pl.madeira, 0.04, 0);
    t.por("madeira", bloco(0.14, 1.1, 0.14, 0, A + alto - 0.3, zf), pl.madeira, 0.04, 0);
  } else {
    // Platibanda: parapeito com cornija e frontão; o telhado fica escondido atrás.
    const h = alto;
    const e = 0.25;
    obra.por("reboco", bloco(Lb + 0.16, 0.22, Fb + 0.16, 0, A - 0.12, 0), pl.arremate, 0.04, 0);
    obra.por("reboco", bloco(Lb, h, e, 0, A, Fb / 2 - e / 2), pl.parede, 0.05);
    obra.por("reboco", bloco(Lb, h, e, 0, A, -Fb / 2 + e / 2), pl.parede, 0.05);
    for (const s of [-1, 1]) obra.por("reboco", bloco(e, h, Fb - e * 2, s * (Lb / 2 - e / 2), A, 0), pl.parede, 0.05);
    obra.por("reboco", bloco(Lb + 0.2, 0.12, e + 0.12, 0, A + h, Fb / 2 - e / 2), pl.arremate, 0.04, 0);
    const w = Math.min(Lb * 0.45, 5);
    obra.por("reboco", prisma([[-w / 2, A + h], [w / 2, A + h], [0, A + h + Math.min(1.3, w * 0.28)]], Fb / 2 - e, Fb / 2 + 0.02), pl.parede, 0.05);
    for (const s of [-1, 1]) obra.por("reboco", bloco(0.3, 0.45, 0.3, s * (Lb / 2 - 0.15), A + h + 0.1, Fb / 2 - 0.15), pl.arremate, 0.04, 0);
    for (const g of telhado("quatro-aguas", Lb - 0.5, Fb - 0.5, A, 0.7, 0)) t.por(pl.telhaMat, g, pl.telha, 0.1, 0);
  }
}

type Ctx = { obra: Obra; t: Obra; dentro: Obra; lay: Layout; pl: Plano; p: PredioLocal };

/**
 * Sobrado ou casa de veraneio: paredes claras, cunhais e cimalha brancos, porta-janelas
 * para a galeria (ou janelas de veneziana sem ela), laterais simples, telhado do layout.
 */
function erguer(p: PredioLocal, r: () => number, pl: Plano, lay: Layout, op: { grade?: boolean; embasamento?: boolean } = {}): Ctx {
  const A = p.altura;
  const { Lb, Fb, pav, H } = lay;
  const obra = new Obra(Math.floor(r() * 1e6));
  const t = new Obra(Math.floor(r() * 1e6));
  const dentro = new Obra(3);
  paredes(obra, Lb, Fb, A, "reboco", pl.parede, p.entravel ? PORTA_DE_ENTRAR : undefined);
  if (op.embasamento && !p.entravel) obra.por("cantaria", bloco(Lb + 0.24, 0.42, Fb + 0.24, 0, 0, 0), "#a2988a", 0.08, 0.3);
  cunhais(obra, Lb, Fb, A, pl.arremate);
  if (lay.telhado !== "plat") obra.por("reboco", bloco(Lb + 0.16, 0.26, Fb + 0.16, 0, A - 0.26, 0), pl.arremate, 0.04, 0);
  for (let k = 1; k < pav; k++) obra.por("reboco", bloco(Lb + 0.1, 0.16, Fb + 0.1, 0, k * H - 0.08, 0), pl.arremate, 0.04, 0);
  // Fachada.
  const vaos = Math.max(1, Math.floor((Lb - 1.2) / 2.5));
  const pos = aoLongo(Lb, vaos, 1.25);
  let meio = 0;
  pos.forEach((u, i) => {
    if (Math.abs(u) < Math.abs(pos[meio])) meio = i;
  });
  if (p.entravel) porta(obra, "frente", Lb, Fb, 0, PORTA_DE_ENTRAR.largura, PORTA_DE_ENTRAR.altura, pl.porta, true, pl.arremate);
  for (let k = 0; k < pav; k++) {
    pos.forEach((u, i) => {
      if (k === 0 && p.entravel && Math.abs(u) < 2.85) return;
      if (k === 0 && !p.entravel && i === meio) {
        porta(obra, "frente", Lb, Fb, u, 1.3, Math.min(2.7, H - 0.6), pl.porta, false, pl.arremate);
        return;
      }
      if (lay.galeria) portaJanela(obra, "frente", Lb, Fb, u, k * H + (k ? 0.12 : 0.35), 1.05, Math.min(2.4, H - 0.85), pl.arremate, pl.veneziana);
      else janela(obra, "frente", Lb, Fb, u, k * H + (k ? 0.9 : 1.0), 1.0, 1.55, { veneziana: pl.veneziana, moldura: pl.arremate, grade: op.grade && k === 0 });
    });
  }
  // Laterais e fundos.
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
    const comp = f === "fundos" ? Lb : Fb;
    const n = Math.max(0, Math.floor((comp - 1.6) / 4));
    for (const u of aoLongo(comp, n, 1.5)) {
      const z = f === "esquerda" ? u : -u;
      const naGaleria = lay.lados > 0 && f !== "fundos" && z > Fb / 2 - lay.lados + 0.6;
      for (let k = 0; k < pav; k++) {
        if (naGaleria) portaJanela(obra, f, Lb, Fb, u, k * H + (k ? 0.12 : 0.35), 1.0, Math.min(2.3, H - 0.85), pl.arremate, pl.veneziana);
        else if (r() > 0.22) janelaBarata(obra, f, Lb, Fb, u, k * H + (k ? 0.9 : 1.0), 0.9, 1.4, pl.arremate);
      }
    }
  }
  if (lay.galeria) {
    galeria(obra, t, "frente", Lb, Fb, { comp: Lb + (lay.lados ? lay.prof * 2 : 0), prof: lay.prof, pav, H, terreo: true, vao: p.entravel ? 4.6 : 1.6 }, pl);
    if (lay.lados) {
      for (const f of ["esquerda", "direita"] as Face[]) {
        const u = (f === "esquerda" ? 1 : -1) * (Fb / 2 - lay.lados / 2);
        galeria(obra, t, f, Lb, Fb, { comp: lay.lados, prof: lay.prof, pav, H, u, terreo: lay.lados < 8 }, pl);
      }
    }
  }
  cobrir(obra, t, lay, A, pl);
  if (p.entravel) interiorBasico(dentro, Lb, Fb, { piso: "#a08660", madeira: "#5a3e28" });
  return { obra, t, dentro, lay, pl, p };
}

function fechar(c: Ctx, extra?: Obra): PecasDoPredio {
  const r = deslocar({ corpo: c.obra.pecas(), telhado: c.t.pecas(), interior: c.dentro.pecas() }, 0, 0, c.lay.dz);
  return extra ? somar(r, { corpo: extra.pecas(), telhado: [], interior: [] }) : r;
}

// ---------------------------------------------------------------- tipos

function casa(p: PredioLocal, r: () => number, pl: Plano): PecasDoPredio {
  const lay = planta(p, pl, false);
  const c = erguer(p, r, pl, lay, { embasamento: true });
  if (pl.chamine) chamine(c.obra, (r() - 0.5) * lay.Lb * 0.4, -lay.Fb * 0.25, p.altura, lay.alto * 0.8, "#9a7a68");
  return fechar(c);
}

/** Casa de pescador: tábua salgada ou cal com barrado, telhado de sapé ou telha, rede e canoa. */
function cabana(p: PredioLocal, r: () => number, pl: Plano): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const Lb = p.entravel ? L : Math.max(4, L * 0.62);
  const Fb = p.entravel ? F : Math.max(4, F * 0.66);
  const [dx, dz] = [-(L - Lb) / 2, -(F - Fb) / 2];
  const obra = new Obra(Math.floor(r() * 1e6));
  const t = new Obra(5);
  const tabua = r() < 0.5;
  const parede = tabua ? ["#8d8778", "#7f8a86", "#a09582", "#8a7a66"][Math.floor(r() * 4)] : "#ece7da";
  const moldura = tabua ? "#6a5e4e" : "#e0d8c6";
  const Ab = Math.min(A, 3.2);
  paredes(obra, Lb, Fb, Ab, tabua ? "madeira" : "reboco", parede, p.entravel ? PORTA_DE_ENTRAR : undefined);
  if (tabua) {
    for (const f of ["frente", "fundos"] as Face[]) for (const u of aoLongo(Lb, Math.floor(Lb / 0.8), 0.25)) obra.por("madeira", naFace(bloco(0.07, Ab, 0.04, 0, 0, 0.02), f, Lb, Fb, u, 0), "#5e564a", 0.1, 0);
  } else {
    obra.por("reboco", bloco(Lb + 0.04, 0.6, Fb + 0.04, 0, 0, 0), ["#4f7a96", "#c08a3e", "#5a7a5a"][Math.floor(r() * 3)], 0.06, 0.3);
  }
  const palha = r() < 0.55;
  const alto = Fb * 0.42;
  for (const g of telhado("duas-aguas", Lb, Fb, Ab, alto, 0.55, palha ? 0.32 : 0.15)) t.por(palha ? "palha" : pl.telhaMat, g, palha ? "#9a8458" : pl.telha, 0.14, 0);
  for (const g of empenas(Lb, Fb, Ab, alto)) obra.por(tabua ? "madeira" : "reboco", g, parede, 0.08);
  const ladoDaPorta = p.entravel ? 0 : (r() - 0.5) * Lb * 0.3;
  if (p.entravel) porta(obra, "frente", Lb, Fb, 0, PORTA_DE_ENTRAR.largura, PORTA_DE_ENTRAR.altura, pl.porta, true, moldura);
  else porta(obra, "frente", Lb, Fb, ladoDaPorta, 1.0, 2.1, pl.porta, false, moldura);
  const uj = ladoDaPorta > 0 ? -Lb * 0.28 : Lb * 0.28;
  if (!p.entravel) janela(obra, "frente", Lb, Fb, uj, 1.0, 0.8, 0.9, { fechada: pl.veneziana, moldura, materialDaMoldura: "madeira" });
  janelaBarata(obra, "esquerda", Lb, Fb, 0, 1.1, 0.7, 0.8, moldura);
  const dentro = new Obra(4);
  if (p.entravel) interiorBasico(dentro, Lb, Fb, { piso: "#8a7458", madeira: "#5a4430" });
  const casaPronta = deslocar({ corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() }, dx, 0, dz);
  // Quintal de pescador: rede no varal, canoa, cesto e barrica.
  const q = new Obra(6);
  if (!p.entravel) {
    const zr = F / 2 - 0.55;
    rede(q, new THREE.Vector3(-L / 2 + 0.4, 0, zr), new THREE.Vector3(-L / 2 + Math.max(2.4, Lb - 0.4), 0, zr), 1.9, 1.2, ["#5b4a36", "#4a5a5a", "#6a5238"][Math.floor(r() * 3)], Math.floor(r() * 100));
    const cascos = ["#e9e4d6", "#2f5f72", "#8a3a2c", "#3f6a52", "#c9a24a"];
    const livre = L - Lb;
    if (livre > 1.6) barco(q, L / 2 - livre / 2, 0, -F * 0.05, Math.PI / 2, Math.min(F * 0.85, 5.2), cascos[Math.floor(r() * cascos.length)], r() < 0.5);
    else barco(q, Lb * 0.1, 0, F / 2 + 1.2, 0, Math.min(L * 0.7, 4.6), cascos[Math.floor(r() * cascos.length)], true);
    q.por("palha", cilindro(0.38, 0.3, 0.45, 7, false).translate(-L / 2 + Lb + 0.3, 0, F / 2 - 1.3), "#a08a5a", 0.12, 0);
    if (r() < 0.6) barril(q, dx + Lb / 2 - 0.5, dz + Fb / 2 + 0.5, 0.8, "#6a5038");
  }
  return somar(casaPronta, { corpo: q.pecas(), telhado: [], interior: [] });
}

function hotel(p: PredioLocal, r: () => number, pl: Plano, rubro: boolean): PecasDoPredio {
  const lay = planta(p, pl, rubro);
  const c = erguer(p, r, pl, lay, { embasamento: !rubro });
  const { Lb, Fb, prof, alto } = lay;
  const A = p.altura;
  // Placa do hotel em pé sobre o beiral da galeria.
  const zp = Fb / 2 + prof + 0.15;
  const w = Math.min(Lb * (rubro ? 0.5 : 0.4), rubro ? 9 : 5.5);
  c.t.por("madeira", bloco(w, rubro ? 1.2 : 0.85, 0.1, 0, A - 0.5, zp), rubro ? "#2a1612" : "#2f3a3e", 0.05, 0);
  c.t.por("madeira", bloco(w + 0.3, 0.12, 0.16, 0, A - 0.5 + (rubro ? 1.2 : 0.85), zp), rubro ? "#c9a24a" : pl.madeira, 0.05, 0);
  if (rubro) {
    // Base de cantaria e o mirante no alto, com o mastro da bandeira vermelha.
    c.obra.por("cantaria", bloco(Lb + 0.2, 0.9, Fb + 0.2, 0, 0, 0), "#9c9082", 0.06, 0.2);
    const m = 4.2;
    const hm = 3.4;
    const ym = A + alto * 0.55;
    c.t.por("reboco", bloco(m, hm + alto * 0.45, m, 0, A + alto * 0.1, 0), RUBRO.parede, 0.06, 0);
    for (const s of [-1, 1]) {
      for (const sz of [-1, 1]) c.t.por("reboco", bloco(0.3, hm + alto * 0.45, 0.3, s * (m / 2 - 0.1), A + alto * 0.1, sz * (m / 2 - 0.1)), "#f1ece2", 0.04, 0);
    }
    for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
      for (const u of [-0.9, 0.9]) {
        c.t.por("madeira", naFace(bloco(1.1, 1.9, 0.04, 0, -0.1, 0), f, m, m, u, ym + 0.9, 0), "#f1ece2", 0.04, 0);
        c.t.por("vidro", naFace(bloco(0.9, 1.7, 0.04, 0, 0, 0), f, m, m, u, ym + 0.9, 0.03), "#263034", 0.04, 0);
      }
    }
    const topo = ym + hm;
    c.t.por("reboco", bloco(m + 0.4, 0.25, m + 0.4, 0, topo - 0.1, 0), "#f1ece2", 0.04, 0);
    for (const g of telhado("quatro-aguas", m, m, topo + 0.1, 1.6, 0.5)) c.t.por("telha-escura", g, RUBRO.telha, 0.1, 0);
    c.t.por("madeira", franja([-m / 2 - 0.5, topo], [m / 2 + 0.5, topo], 1, 0.36).translate(0, 0, m / 2 + 0.45), "#f1ece2", 0.04, 0);
    c.t.por("ferro", bloco(0.1, 4.5, 0.1, 0, topo + 1.6, 0), "#2c2a28", 0.02, 0);
    c.t.por("lona", dupla([new THREE.Vector3(0.05, topo + 5.9, 0), new THREE.Vector3(1.9, topo + 5.6, 0.12), new THREE.Vector3(1.85, topo + 4.9, 0.08), new THREE.Vector3(0.05, topo + 5.0, 0)], [0, 2, 1, 0, 3, 2]), "#9a1e1a", 0.08, 0);
    // Escada para os andares, à vista com o telhado aberto.
    if (p.entravel) for (let i = 0; i < 10; i++) c.dentro.por("madeira", bloco(1.4, 0.3 * (i + 1), 0.32, Lb / 2 - 1.3, 0, -Fb / 2 + 1 + i * 0.32), "#5a3a26", 0.06, 0);
  } else if (pl.chamine) {
    chamine(c.obra, Lb * 0.3, -Fb * 0.2, A, alto + 0.7, "#9a7a68");
  }
  return fechar(c);
}

function comercio(p: PredioLocal, r: () => number, pl: Plano): PecasDoPredio {
  if (/mercado/i.test(p.nome) || p.id === "mercado-peixe") return mercado(p, r, pl);
  const lay = planta(p, pl, false);
  const c = erguer(p, r, pl, lay);
  const { Lb, Fb } = lay;
  const peixe = /peix|salg/i.test(p.nome);
  const tabuleta = peixe ? "#2f5f72" : "#3a2a1e";
  if (lay.telhado === "plat") c.obra.por("madeira", bloco(Math.min(Lb * 0.6, 5.5), 0.75, 0.08, 0, p.altura + 0.05, Fb / 2 + 0.06), tabuleta, 0.05, 0);
  else if (lay.galeria && lay.pav === 2) c.obra.por("madeira", naFace(bloco(Math.min(Lb * 0.55, 5), 0.6, 0.08, 0, 0, 0), "frente", Lb, Fb, 0, lay.H + 1.15, lay.prof + 0.02), tabuleta, 0.05, 0);
  else if (lay.galeria) c.t.por("madeira", naFace(bloco(Math.min(Lb * 0.55, 5), 0.7, 0.08, 0, 0, 0), "frente", Lb, Fb, 0, p.altura - 0.4, lay.prof + 0.15), tabuleta, 0.05, 0);
  else c.obra.por("madeira", naFace(bloco(Math.min(Lb * 0.55, 5), 0.7, 0.08, 0, 0, 0.06), "frente", Lb, Fb, 0, Math.min(p.altura - 0.9, 3.9), 0), tabuleta, 0.05, 0);
  if (!lay.galeria) {
    // Toldo listrado sobre a porta (lona de praia), com beirada recortada.
    const w = Math.min(Lb - 1, 6);
    const cores = [pl.veneziana, "#efe9da"];
    const n = Math.max(3, Math.round(w / 0.7));
    for (let i = 0; i < n; i++) {
      const [x0, x1] = [-w / 2 + (i * w) / n, -w / 2 + ((i + 1) * w) / n];
      const g = malha([new THREE.Vector3(x0, 0.6, 0), new THREE.Vector3(x1, 0.6, 0), new THREE.Vector3(x1, 0, 1.5), new THREE.Vector3(x0, 0, 1.5)], [0, 3, 2, 0, 2, 1]);
      c.obra.por("lona", naFace(g, "frente", Lb, Fb, 0, 3.0, 0.05), cores[i % 2], 0.08, 0);
    }
    c.obra.por("lona", naFace(franja([-w / 2, 3.0], [w / 2, 3.0], pl.forma, 0.3, 0.12), "frente", Lb, Fb, 0, 0, 1.56), cores[0], 0.06, 0);
  }
  const extra = new Obra(9);
  if (peixe || r() < 0.4) {
    const zf = p.fundo / 2 - 0.5;
    barril(extra, -p.largura / 2 + 0.7, zf, 0.9, "#6a5038");
    barril(extra, -p.largura / 2 + 1.5, zf - 0.1, 0.9, "#7a5a3a");
    if (peixe) extra.por("palha", cilindro(0.4, 0.32, 0.4, 7, false).translate(p.largura / 2 - 0.7, 0, zf), "#a08a5a", 0.1, 0);
  }
  return fechar(c, extra);
}

/** Mercado de peixe: alpendre aberto em esteios, telhado alto com lanternim e bancas. */
function mercado(p: PredioLocal, r: () => number, pl: Plano): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(31);
  const t = new Obra(32);
  const dentro = new Obra(33);
  const Ae = Math.max(3.4, A - 1.2);
  obra.por("cantaria", bloco(L, 0.25, F, 0, 0, 0), "#9c9284", 0.08, 0.2);
  const nx = Math.max(3, Math.round(L / 3.2) + 1);
  const nz = Math.max(2, Math.round(F / 3.2) + 1);
  for (const x of aoLongo(L, nx, 0.3)) {
    for (const z of [-F / 2 + 0.3, F / 2 - 0.3]) {
      if (z > 0 && Math.abs(x) < 2.3) continue;
      obra.por("madeira", bloco(0.24, Ae, 0.24, x, 0.25, z), pl.madeira, 0.06, 0);
    }
  }
  for (const z of aoLongo(F, nz, 0.3)) for (const s of [-1, 1]) obra.por("madeira", bloco(0.24, Ae, 0.24, s * (L / 2 - 0.3), 0.25, z), pl.madeira, 0.06, 0);
  obra.por("madeira", bloco(L - 0.4, 1.0, 0.1, 0, 0.25, -F / 2 + 0.3), "#8a8070", 0.1, 0);
  const alto = F * 0.32;
  for (const g of telhado("duas-aguas", L, F, Ae + 0.25, alto, 0.6)) t.por(pl.telhaMat, g, pl.telha, 0.12, 0);
  for (const g of telhado("duas-aguas", L * 0.7, F * 0.25, Ae + 0.25 + alto + 0.35, 0.5, 0.25)) t.por(pl.telhaMat, g, pl.telha, 0.1, 0);
  for (const s of [-1, 1]) t.por("madeira", bloco(L * 0.7, 0.45, 0.06, 0, Ae + 0.25 + alto - 0.15, s * F * 0.11), "#6a6258", 0.08, 0);
  for (const g of empenas(L, F, Ae + 0.25, alto)) t.por("madeira", g, "#d9d2c2", 0.06, 0);
  t.por("madeira", franja([-L / 2 - 0.6, Ae + 0.1], [L / 2 + 0.6, Ae + 0.1], pl.forma, pl.dente).translate(0, 0, F / 2 + 0.55), pl.madeira, 0.04, 0);
  t.por("madeira", bloco(Math.min(L * 0.5, 5), 0.8, 0.08, 0, Ae + 0.4, F / 2 + 0.55), "#2f5f72", 0.05, 0);
  // Bancas com peixe, cestos.
  for (const x of [-L * 0.25, L * 0.25]) {
    dentro.por("madeira", bloco(L * 0.3, 0.9, F * 0.45, x, 0.25, -F * 0.05), "#7a6248", 0.08, 0);
    for (let i = 0; i < 5; i++) dentro.por("cantaria", bloco(0.5, 0.1, 0.16, x + (r() - 0.5) * L * 0.22, 1.15, (r() - 0.5) * F * 0.35), "#a9b4b6", 0.1, 0);
  }
  for (let i = 0; i < 4; i++) dentro.por("palha", cilindro(0.35, 0.28, 0.4, 7, false).translate((r() - 0.5) * L * 0.8, 0.25, F * 0.3), "#a08a5a", 0.1, 0);
  barril(obra, L / 2 - 0.8, F / 2 + 0.6, 0.9);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

function saloon(p: PredioLocal, r: () => number, pl: Plano): PecasDoPredio {
  const lay = planta(p, pl, false);
  const c = erguer(p, r, pl, lay);
  const extra = new Obra(14);
  // Tabuleta do bar sobre a galeria e barris na calçada.
  c.t.por("madeira", bloco(Math.min(lay.Lb * 0.55, 5.5), 0.85, 0.1, 0, p.altura - 0.45, lay.Fb / 2 + lay.prof + 0.15), "#5a2a22", 0.05, 0);
  barril(extra, p.largura / 2 - 0.7, p.fundo / 2 - 0.6, 0.95);
  barril(extra, p.largura / 2 - 1.5, p.fundo / 2 - 0.5, 0.95, "#6a5038");
  return fechar(c, extra);
}

function publico(p: PredioLocal, r: () => number, pl: Plano, banco: boolean): PecasDoPredio {
  const lay = planta(p, pl, false);
  const pal = { ...pl, parede: banco ? "#e3dccb" : pl.parede };
  const c = erguer(p, r, pal, lay, { grade: banco || /delegacia|cadeia/i.test(p.nome), embasamento: true });
  const { Lb, Fb, H } = lay;
  if (banco) c.obra.por("cantaria", bloco(Lb + 0.2, 1.0, Fb + 0.2, 0, 0, 0), "#9c9284", 0.06, 0.2);
  // Pilastras entre os vãos e sacada central no andar de cima.
  const vaos = Math.max(1, Math.floor((Lb - 1.2) / 2.5));
  const pos = aoLongo(Lb, vaos, 1.25);
  for (let i = 1; i < pos.length; i++) c.obra.por("reboco", naFace(bloco(0.32, p.altura - 0.3, 0.1, 0, 0, 0), "frente", Lb, Fb, (pos[i - 1] + pos[i]) / 2, 0, 0.02), pal.arremate, 0.04, 0);
  if (lay.pav === 2) {
    c.obra.por("cantaria", naFace(bloco(3.2, 0.16, 0.8, 0, 0, 0.4), "frente", Lb, Fb, 0, H - 0.05), "#bdb4a2", 0.04, 0);
    guardaCorpo(c.obra, "frente", Lb, Fb, 0, H + 0.1, 0.72, 3.1, pal.arremate, 0.35);
  }
  return fechar(c);
}

function igreja(p: PredioLocal, r: () => number, pl: Plano): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const branco = "#f2eee6";
  const trim = r() < 0.5 ? "#c9a35a" : "#5a82a6";
  const proj = 1.4;
  const Fn = F - proj;
  const obra = new Obra(21);
  const t = new Obra(22);
  const dentro = new Obra(23);
  // Nave.
  paredes(obra, L, Fn, A, "reboco", branco, p.entravel ? PORTA_DE_ENTRAR : undefined);
  cunhais(obra, L, Fn, A, trim, 0.45);
  obra.por("reboco", bloco(L + 0.24, 0.35, Fn + 0.24, 0, A - 0.35, 0), trim, 0.04, 0);
  obra.por("cantaria", bloco(L + 0.3, 0.6, Fn + 0.3, 0, 0, 0), "#a2988a", 0.06, 0.2);
  const alto = L * 0.4;
  for (const g of telhado("duas-aguas", Fn, L, A, alto, 0.5)) t.por("telha", g.rotateY(Math.PI / 2), pl.telhaMat === "telha" ? pl.telha : "#a6513a", 0.1, 0);
  for (const g of empenas(Fn, L, A, alto)) obra.por("reboco", g.rotateY(Math.PI / 2), branco);
  for (const u of aoLongo(Fn, Math.max(2, Math.floor(Fn / 5)), 2.2)) {
    for (const f of ["esquerda", "direita"] as Face[]) janela(obra, f, L, Fn, u, A * 0.42, 1.1, 2.3, { moldura: trim });
  }
  if (p.entravel) {
    dentro.por("madeira", bloco(L - 1, 0.08, Fn - 1, 0, 0.02, 0), "#8a6a48", 0.08, 0);
    for (let i = 0; i < Math.floor(Fn / 2.4) - 2; i++) for (const s of [-1, 1]) dentro.por("madeira", bloco(L * 0.3, 0.5, 0.45, s * L * 0.22, 0, Fn / 2 - 4 - i * 2.2), "#5a3a22", 0.08, 0);
    dentro.por("reboco", bloco(L * 0.4, 1.4, 1.2, 0, 0, -Fn / 2 + 1.2), "#efe6cf", 0.04, 0);
  }
  const nave = deslocar({ corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() }, 0, 0, -proj / 2);
  // Torre central na fachada: base vazada (a porta passa por ela), sineira e cúpula.
  const tw = new Obra(24);
  const lado = Math.min(Math.max(5.2, L * 0.38), L - 2);
  const zt = F / 2 - lado / 2;
  const e = 0.5;
  const vao = p.entravel ? PORTA_DE_ENTRAR : { largura: 2.4, altura: 3.4 };
  for (const s of [-1, 1]) tw.por("reboco", bloco(e, A, lado, s * (lado / 2 - e / 2), 0, zt), branco);
  for (const zf of [zt + lado / 2 - e / 2, zt - lado / 2 + e / 2]) {
    const resto = (lado - vao.largura) / 2;
    for (const s of [-1, 1]) tw.por("reboco", bloco(resto, A, e, s * (vao.largura / 2 + resto / 2), 0, zf), branco);
    tw.por("reboco", bloco(vao.largura, A - vao.altura, e, 0, vao.altura, zf), branco);
  }
  tw.por("cantaria", bloco(lado + 0.3, 0.6, lado + 0.3, 0, 0, zt), "#a2988a", 0.06, 0.2);
  porta(tw, "frente", L, F, 0, vao.largura, vao.altura, pl.porta, p.entravel, trim);
  // Óculo.
  tw.por("reboco", cilindro(0.9, 0.9, 0.08, 10, false).rotateX(Math.PI / 2).translate(0, A * 0.74, F / 2 + 0.01), trim, 0.04, 0);
  tw.por("vidro", cilindro(0.7, 0.7, 0.1, 10, false).rotateX(Math.PI / 2).translate(0, A * 0.74, F / 2 + 0.05), "#2a3236", 0.04, 0);
  const hT = alto + 1.6;
  tw.por("reboco", bloco(lado + 0.3, 0.35, lado + 0.3, 0, A - 0.35, zt), trim, 0.04, 0);
  tw.por("reboco", bloco(lado, hT, lado, 0, A, zt), branco);
  const cunhalTorre = new Obra(25);
  cunhais(cunhalTorre, lado, lado, A + hT, trim, 0.4);
  const ys = A + hT;
  tw.por("reboco", bloco(lado + 0.3, 0.3, lado + 0.3, 0, ys, zt), trim, 0.04, 0);
  const s2 = lado * 0.86;
  const hs = 3.2;
  tw.por("reboco", bloco(s2, hs, s2, 0, ys + 0.3, zt), branco);
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
    tw.por("madeira-escura", naFace(bloco(s2 * 0.42, hs * 0.62, 0.06, 0, 0, 0), f, s2, s2, 0, ys + 0.3 + hs * 0.18, 0.01).translate(0, 0, zt), "#2a2420", 0.04, 0);
  }
  tw.por("reboco", bloco(s2 + 0.3, 0.3, s2 + 0.3, 0, ys + 0.3 + hs, zt), trim, 0.04, 0);
  const yd = ys + 0.6 + hs;
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    tw.por("reboco", new THREE.ConeGeometry(0.22, 0.9, 6).translate(x * (s2 / 2 - 0.1), yd + 0.45, zt + z * (s2 / 2 - 0.1)), trim, 0.04, 0);
  }
  const rd = s2 * 0.38;
  tw.por("reboco", cilindro(rd, rd, 1.2, 8).translate(0, yd, zt), branco);
  tw.por("telha", new THREE.SphereGeometry(rd * 1.06, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, yd + 1.2, zt), trim === "#5a82a6" ? "#4f7a96" : "#b4683e", 0.08, 0);
  tw.por("reboco", cilindro(0.3, 0.3, 0.7, 6, false).translate(0, yd + 1.2 + rd, zt), branco, 0.04, 0);
  tw.por("ferro", bloco(0.09, 1.3, 0.09, 0, yd + 1.9 + rd, zt), "#2c2a28", 0.02, 0);
  tw.por("ferro", bloco(0.7, 0.09, 0.09, 0, yd + 2.75 + rd, zt), "#2c2a28", 0.02, 0);
  // Adro: dois degraus na frente.
  for (let k = 0; k < 2; k++) tw.por("cantaria", bloco(lado + 2 - k * 0.8, 0.15, 1.2 - k * 0.5, 0, k * 0.15, F / 2 + 0.6 - k * 0.25), "#b0a696", 0.06, 0);
  const cunhalPecas = deslocar({ corpo: cunhalTorre.pecas(), telhado: [], interior: [] }, 0, 0, zt);
  return somar(nave, { corpo: tw.pecas(), telhado: [], interior: [] }, cunhalPecas);
}

/** Galpão de tábua leva às vezes telha escura de barro queimado; decidido pelo plano. */
function telhaDoGalpao(pl: Plano, tijolo: boolean): [NomeMaterial, THREE.ColorRepresentation] {
  return !tijolo && pl.telhaMat === "telha" && pl.forma === 0 ? ["telha-escura", "#6a4e42"] : [pl.telhaMat, pl.telha];
}

/** Armazém de peixe, salgadeira, colônia: tábua cinza do sal, lanternim e barricas. */
function galpao(p: PredioLocal, r: () => number, pl: Plano, op: { tijolo?: boolean; varanda?: boolean } = {}): PecasDoPredio {
  const lay = planta(p, pl, false);
  const { Lb, Fb, alto } = lay;
  const A = p.altura;
  const obra = new Obra(41);
  const t = new Obra(42);
  const dentro = new Obra(43);
  const celeiro = /celeiro/i.test(p.nome);
  const cor = op.tijolo ? "#9a5a44" : celeiro ? "#8a4a34" : ["#8e918a", "#7f8a86", "#a09582", "#8d8778"][Math.floor(r() * 4)];
  const mat: NomeMaterial = op.tijolo ? "tijolo" : "madeira";
  paredes(obra, Lb, Fb, A, mat, cor, p.entravel ? PORTA_DE_ENTRAR : undefined);
  if (op.tijolo) {
    obra.por("cantaria", bloco(Lb + 0.2, 0.3, Fb + 0.2, 0, A - 0.3, 0), "#c9bfae", 0.04, 0);
    obra.por("cantaria", bloco(Lb + 0.1, 0.7, Fb + 0.1, 0, 0, 0), "#8f8676", 0.06, 0.2);
    for (const f of ["esquerda", "direita"] as Face[]) for (const u of aoLongo(Fb, Math.max(2, Math.floor(Fb / 3)), 1.4)) janelaBarata(obra, f, Lb, Fb, u, 1.6, 1.1, 2.0, "#c9bfae");
  } else {
    for (const f of ["frente", "fundos"] as Face[]) for (const u of aoLongo(Lb, Math.floor(Lb / 0.9), 0.3)) obra.por("madeira", naFace(bloco(0.08, A, 0.05, 0, 0, 0.02), f, Lb, Fb, u, 0), "#5a564c", 0.1, 0);
    for (const f of ["esquerda", "direita"] as Face[]) for (const u of aoLongo(Fb, Math.max(1, Math.floor(Fb / 5)), 1.6)) janela(obra, f, Lb, Fb, u, 1.6, 0.9, 0.8, { fechada: "#5a5048", moldura: "#d9d2c2", materialDaMoldura: "madeira" });
  }
  if (p.entravel) porta(obra, "frente", Lb, Fb, 0, PORTA_DE_ENTRAR.largura, PORTA_DE_ENTRAR.altura, "#4a4038", true, "#d9d2c2");
  else porta(obra, "frente", Lb, Fb, 0, Math.min(3.4, Lb * 0.35), Math.min(3, A * 0.65), "#4a4038", false, "#d9d2c2");
  const [telhaMat, telhaCor] = telhaDoGalpao(pl, !!op.tijolo);
  for (const g of telhado("duas-aguas", Lb, Fb, A, alto, 0.5)) t.por(telhaMat, g, telhaCor, 0.12, 0);
  for (const g of empenas(Lb, Fb, A, alto)) obra.por(mat, g, cor, 0.08);
  // Lanternim: o respiro na cumeeira, com venezianas.
  const ll = Lb * 0.6;
  for (const g of telhado("duas-aguas", ll, Fb * 0.22, A + alto + 0.5, 0.45, 0.2)) t.por(telhaMat, g, telhaCor, 0.1, 0);
  for (const s of [-1, 1]) t.por("madeira", bloco(ll, 0.6, 0.06, 0, A + alto - 0.1, s * Fb * 0.1), "#4a463e", 0.08, 0);
  if (!op.tijolo) obra.por("madeira", naFace(bloco(1.4, 1.0, 0.06, 0, 0, 0.03), "esquerda", Lb, Fb, 0, A + alto * 0.3), "#4a4038", 0.06, 0);
  if (op.varanda) galeria(obra, t, "frente", Lb, Fb, { comp: Lb, prof: lay.prof, pav: 1, H: A, vao: p.entravel ? 4.6 : 0 }, pl);
  if (p.entravel) interiorBasico(dentro, Lb, Fb, { piso: "#8a7a62", madeira: "#5a4a38" });
  const res = deslocar({ corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() }, 0, 0, lay.dz);
  // Na porta: barricas de salga, caixotes e, às vezes, uma canoa emborcada.
  const q = new Obra(44);
  const zf = p.fundo / 2 + 0.7;
  if (!op.varanda) {
    const xs = -p.largura / 2 + 0.7;
    barril(q, xs, zf, 0.95, "#6a5038");
    barril(q, xs + 0.8, zf + 0.1, 0.95);
    barril(q, xs + 0.4, zf - 0.05, 0.95, "#7a5a3a", 0.95);
    q.por("madeira", bloco(1.0, 0.7, 0.8, p.largura / 2 - 0.8, 0, zf), "#8a7656", 0.1, 0);
    q.por("madeira", bloco(0.8, 0.6, 0.7, p.largura / 2 - 0.85, 0.7, zf), "#7a6648", 0.1, 0);
    if (/salg/i.test(p.nome)) q.por("pedra", new THREE.ConeGeometry(1.0, 0.9, 7).translate(p.largura / 2 - 2.4, 0.45, zf), "#e8e4da", 0.06, 0);
    if (/col[oô]nia|pescador/i.test(p.nome) || r() < 0.25) barco(q, -p.largura * 0.08, 0, zf + 1.1, 0, Math.min(p.largura * 0.5, 5.5), "#2f5f72", true);
  }
  return somar(res, { corpo: q.pecas(), telhado: [], interior: [] });
}

function fazenda(p: PredioLocal, r: () => number, pl: Plano): PecasDoPredio {
  const q = { ...p, altura: Math.min(p.altura, 5) };
  const lay = planta(q, pl, false);
  const c = erguer(q, r, pl, lay, { embasamento: true });
  chamine(c.obra, lay.Lb * 0.3, -lay.Fb * 0.25, q.altura, lay.alto * 0.8, "#9a7a68");
  const quintal = new Obra(35);
  if (!p.entravel) rede(quintal, new THREE.Vector3(-p.largura / 2 + 0.5, 0, -p.fundo / 2 + 0.3), new THREE.Vector3(-p.largura / 2 + 0.5, 0, -p.fundo / 2 + 3), 1.8, 1.1, "#6a5238", 7);
  return fechar(c, quintal);
}

/** Moinho de vento da costa: torre caiada, capelo escuro e velas triangulares de lona. */
function moinho(p: PredioLocal, r: () => number): PecasDoPredio {
  const R = (Math.min(p.largura, p.fundo) / 2) * 0.78;
  const A = p.altura;
  const obra = new Obra(51);
  const t = new Obra(52);
  obra.por("reboco", cilindro(R * 0.84, R, A, 10, false), "#efeae0", 0.05, 0.2);
  obra.por("reboco", cilindro(R * 1.02, R * 1.03, 0.6, 10), "#4f7a96", 0.05, 0);
  obra.por("madeira", bloco(1.0, 2.1, 0.3, 0, 0, R - 0.1), "#3a4a5a", 0.08, 0);
  for (const y of [A * 0.45, A * 0.72]) obra.por("vidro", bloco(0.5, 0.6, 0.3, 0, y, R * (1 - (y / A) * 0.16) - 0.1), "#263034", 0.04, 0);
  t.por("madeira-escura", new THREE.ConeGeometry(R * 0.95, R * 1.1, 10).translate(0, A + R * 0.55, 0), "#4a3a2c", 0.1, 0);
  const hub = new THREE.Vector3(0, A - R * 0.1, R * 0.9 + 0.3);
  obra.por("madeira", bloco(0.3, 0.3, R * 0.9, 0, hub.y - 0.15, R * 0.55), "#5a4636", 0.08, 0);
  const giro = r() * Math.PI;
  const comp = Math.min(A * 0.48, p.largura * 0.7);
  for (let i = 0; i < 4; i++) {
    const a = giro + (i * Math.PI) / 2;
    const d = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    const ponta = hub.clone().addScaledVector(d, comp);
    obra.por("madeira", bloco(0.12, comp, 0.1, 0, 0, 0).rotateZ(a - Math.PI / 2).translate(hub.x, hub.y, hub.z), "#6a5642", 0.08, 0);
    const lateral = new THREE.Vector3(-d.y, d.x, 0).multiplyScalar(comp * 0.32);
    const base = hub.clone().addScaledVector(d, comp * 0.25);
    obra.por("lona", dupla([base, ponta, base.clone().add(lateral).addScaledVector(d, comp * 0.25)], [0, 1, 2]), "#e8e0cc", 0.08, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

/**
 * Farol: fuste de cantaria embaixo e tijolo em cima, balcão de ferro, lanterna e cúpula
 * de cobre. Entrável: casa do faroleiro na frente, com a porta larga.
 * Desativado (canônico): lanterna apagada, vidraças tapadas com tábua, guarda-corpo
 * falhado, ferrugem escorrendo e cobre verde.
 */
function farol(p: PredioLocal, desativado: boolean): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const Fs = p.entravel ? Math.min(F * 0.36, 4.2) : 0;
  const R = (Math.min(L, F - Fs) / 2) * (p.entravel ? 0.85 : 0.8);
  const zt = p.entravel ? -F / 2 + (F - Fs) / 2 : 0;
  const obra = new Obra(71);
  const rT = R * 0.66;
  const rl = rT * 0.78;
  const Hl = Math.max(1.6, rl * 1.5);
  const Hc = rl * 0.9;
  const Hf = A - Hl - Hc - 1.3;
  const rM = R + (rT - R) * 0.55;
  const v = desativado ? 0.14 : 0.07;
  const em = (g: THREE.BufferGeometry) => g.translate(0, 0, zt);
  obra.por("cantaria", em(cilindro(R * 1.12, R * 1.18, 1.0, 10, false)), "#8f877a", 0.08, 0.2);
  obra.por("cantaria", em(cilindro(rM, R, Hf * 0.55, 10).translate(0, 1.0, 0)), "#bdb4a0", v, 0);
  obra.por("cantaria", em(cilindro(rM * 1.06, rM * 1.06, 0.3, 10).translate(0, 1.0 + Hf * 0.55, 0)), "#a49a88", 0.06, 0);
  obra.por("tijolo", em(cilindro(rT, rM, Hf * 0.45, 10).translate(0, 1.0 + Hf * 0.55, 0)), desativado ? "#8e5642" : "#a35a44", v, 0);
  const yb = 1.0 + Hf;
  obra.por("cantaria", em(cilindro(rT * 1.36, rT, 0.7, 10).translate(0, yb, 0)), "#a49a88", 0.06, 0);
  obra.por("ferro", em(cilindro(rT * 1.4, rT * 1.4, 0.18, 10, false).translate(0, yb + 0.7, 0)), "#2f3330", 0.05, 0);
  const yg = yb + 0.88;
  const n = 14;
  for (let i = 0; i < n; i++) {
    if (desativado && (i === 3 || i === 4)) continue;
    const a = (i / n) * Math.PI * 2;
    obra.por("ferro", em(bloco(0.06, 1.0, 0.06, Math.cos(a) * rT * 1.34, yg, Math.sin(a) * rT * 1.34)), "#2f3330", 0.04, 0);
  }
  obra.por("ferro", em(cilindro(rT * 1.34, rT * 1.34, 0.06, 14).translate(0, yg + 1.0, 0)), "#2f3330", 0.04, 0);
  // Lanterna: mureta de ferro, vidraças (algumas tapadas) e montantes.
  obra.por("ferro", em(cilindro(rl, rl, 0.7, 8, false).translate(0, yg, 0)), "#2f3a36", 0.05, 0);
  const yv = yg + 0.7;
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const a1 = ((i + 1) / 8) * Math.PI * 2 + Math.PI / 8;
    const p0 = new THREE.Vector3(Math.cos(a0) * rl, yv, Math.sin(a0) * rl);
    const p1 = new THREE.Vector3(Math.cos(a1) * rl, yv, Math.sin(a1) * rl);
    const tapado = desativado && (i === 1 || i === 5 || i === 6);
    const g = dupla([p0, p1, p1.clone().setY(yv + Hl), p0.clone().setY(yv + Hl)], [0, 2, 1, 0, 3, 2]);
    obra.por(tapado ? "madeira" : "vidro", em(g), tapado ? "#6a5a48" : desativado ? "#1a2224" : "#c9c08a", 0.06, 0);
    obra.por("ferro", em(bloco(0.08, Hl, 0.08, p0.x, yv, p0.z)), "#2f3a36", 0.04, 0);
  }
  if (!desativado) obra.por("vidro", em(cilindro(rl * 0.4, rl * 0.4, Hl * 0.6, 8, false).translate(0, yv + Hl * 0.2, 0)), "#f0d890", 0.04, 0);
  const yc = yv + Hl;
  obra.por("ferro", em(cilindro(rl * 1.12, rl * 1.12, 0.16, 8, false).translate(0, yc, 0)), "#2f3a36", 0.04, 0);
  obra.por("ferro", em(new THREE.ConeGeometry(rl * 1.1, Hc, 8).translate(0, yc + 0.16 + Hc / 2, 0)), desativado ? "#4c6a5e" : "#3a4a44", 0.1, 0);
  obra.por("ferro", em(new THREE.SphereGeometry(0.22, 6, 4).translate(0, yc + 0.2 + Hc, 0)), "#4c6a5e", 0.06, 0);
  obra.por("ferro", em(bloco(0.05, 1.0, 0.05, 0, yc + 0.3 + Hc, 0)), "#2c2a28", 0.02, 0);
  // Seteiras subindo a escada em caracol.
  for (let k = 0; k < 4; k++) {
    const y = 3 + k * (Hf - 4) * 0.3;
    const rr = R + (rT - R) * Math.min(1, (y - 1) / Hf);
    const a = Math.PI / 2 + (k % 2 ? 0.5 : -0.5);
    obra.por("vidro", em(bloco(0.4, 0.8, 0.3, Math.cos(a) * (rr - 0.08), y, Math.sin(a) * (rr - 0.08))), "#1e2628", 0.04, 0);
  }
  if (desativado) {
    // Escorridos de ferrugem sob o balcão.
    for (const a of [1.2, 1.9, 2.4]) obra.por("tijolo", em(bloco(0.25, Hf * 0.3, 0.06, Math.cos(a) * (rT + 0.02), yb - Hf * 0.3, Math.sin(a) * (rT + 0.02)).rotateY(0)), "#5a3a2c", 0.12, 0);
  }
  if (!p.entravel) {
    obra.por("madeira", bloco(1.1, 2.2, 0.4, 0, 0, R - 0.1), "#3a4a5a", 0.08, 0);
    return { corpo: obra.pecas(), telhado: [], interior: [] };
  }
  // Casa do faroleiro, encostada no pé da torre.
  const z0 = zt + R * 0.55;
  const Fa = F / 2 - z0;
  const La = L * 0.92;
  const Aa = 3.6;
  const casaF = new Obra(74);
  const tc = new Obra(75);
  const dentro = new Obra(73);
  paredes(casaF, La, Fa, Aa, "reboco", "#e6e0d2", PORTA_DE_ENTRAR);
  cunhais(casaF, La, Fa, Aa, "#9c9282");
  casaF.por("cantaria", bloco(La + 0.2, 0.6, Fa + 0.2, 0, 0, 0), "#8f877a", 0.08, 0.2);
  porta(casaF, "frente", La, Fa, 0, PORTA_DE_ENTRAR.largura, PORTA_DE_ENTRAR.altura, "#3a4a5a", true, "#efe9dc");
  for (const f of ["esquerda", "direita"] as Face[]) janela(casaF, f, La, Fa, 0, 1.1, 0.9, 1.3, { fechada: desativado ? "#5a4a3a" : undefined, veneziana: "#3a4a5a" });
  for (const g of telhado("duas-aguas", La, Fa, Aa, Fa * 0.32, 0.5)) tc.por("telha", g, desativado ? "#8a5a44" : "#a6513a", 0.14, 0);
  for (const g of empenas(La, Fa, Aa, Fa * 0.32)) casaF.por("reboco", g, "#e6e0d2", 0.06);
  chamine(casaF, La * 0.3, 0, Aa, Fa * 0.32 + 0.5, "#8a6a58");
  dentro.por("madeira", bloco(La - 0.8, 0.08, Fa - 0.8, 0, 0.02, 0), "#8a7458", 0.08, 0);
  dentro.por("madeira", bloco(1.6, 0.8, 0.9, -La * 0.25, 0, 0), "#5a3e28", 0.08, 0);
  for (let i = 0; i < 3; i++) barril(dentro, La * 0.3 + (i % 2) * 0.8, -Fa / 2 + 0.7 + i * 0.25, 0.9, "#4a5a5a");
  const anexo = deslocar({ corpo: casaF.pecas(), telhado: tc.pecas(), interior: dentro.pecas() }, 0, 0, z0 + Fa / 2);
  return somar({ corpo: obra.pecas(), telhado: [], interior: [] }, anexo);
}

/**
 * Cais da Ilha de Sepulcro: plataforma de tábua sobre estacas no fim do píer, casa de
 * embarque com lambrequim e tabuleta, cabeços de amarração, lampião, escada e o bote.
 */
function cais(p: PredioLocal): PecasDoPredio {
  const { largura: L, fundo: F } = p;
  const obra = new Obra(81);
  const yd = 0.55;
  obra.por("madeira", bloco(L, 0.25, F, 0, yd - 0.25, 0), "#7d6c56", 0.12, 0);
  for (const u of aoLongo(L, Math.floor(L / 0.5), 0.2)) obra.por("madeira", bloco(0.03, 0.02, F, u, yd, 0), "#5a4c3c", 0.06, 0);
  for (const x of aoLongo(L, Math.max(3, Math.round(L / 2.5)), 0.2)) {
    for (const z of aoLongo(F, Math.max(3, Math.round(F / 2.5)), 0.2)) {
      if (Math.abs(x) < L / 2 - 0.3 && Math.abs(z) < F / 2 - 0.3) continue;
      obra.por("madeira-escura", cilindro(0.17, 0.2, 2.6, 6, false).translate(x, -2.0, z), "#4a3c2e", 0.12, 0);
    }
  }
  // Cabeços de ferro, rolo de cabo e lampião.
  for (const [x, z] of [
    [-L / 2 + 0.5, F / 2 - 0.5],
    [L / 2 - 0.5, F / 2 - 0.5],
    [-L / 2 + 0.5, 0],
    [L / 2 - 0.5, 0],
  ]) {
    obra.por("ferro", cilindro(0.16, 0.2, 0.55, 8, false).translate(x, yd, z), "#2c2a28", 0.04, 0);
    obra.por("ferro", cilindro(0.24, 0.24, 0.08, 8, false).translate(x, yd + 0.55, z), "#2c2a28", 0.04, 0);
  }
  obra.por("lona", new THREE.TorusGeometry(0.42, 0.1, 4, 10).rotateX(Math.PI / 2).translate(-L / 2 + 1.4, yd + 0.1, F / 2 - 0.9), "#a08a62", 0.1, 0);
  obra.por("ferro", bloco(0.12, 3.4, 0.12, L / 2 - 1.2, yd, F / 2 - 1.2), "#2c2a28", 0.02, 0);
  obra.por("vidro", bloco(0.4, 0.55, 0.4, L / 2 - 1.2, yd + 3.4, F / 2 - 1.2), "#3a3a2c", 0.04, 0);
  obra.por("ferro", new THREE.ConeGeometry(0.34, 0.3, 4).rotateY(Math.PI / 4).translate(L / 2 - 1.2, yd + 4.1, F / 2 - 1.2), "#2c2a28", 0.04, 0);
  // Escada de mão descendo para o bote e o próprio bote.
  for (const s of [-1, 1]) obra.por("madeira", bloco(0.08, 2.4, 0.08, -L * 0.2 + s * 0.3, yd - 2.2, F / 2 + 0.05), "#5a4c3c", 0.08, 0);
  for (let i = 0; i < 5; i++) obra.por("madeira", bloco(0.6, 0.05, 0.05, -L * 0.2, yd - 0.4 - i * 0.4, F / 2 + 0.05), "#5a4c3c", 0.08, 0);
  barco(obra, L * 0.12, -0.6, F / 2 + 1.3, 0, Math.min(L * 0.55, 6), "#3a4a4a", false);
  // Corrimão nas laterais do píer.
  for (const f of ["esquerda", "direita"] as Face[]) {
    obra.por("madeira", naFace(bloco(F * 0.5, 0.1, 0.1, 0, 0.95, 0), f, L, F, -F * 0.2, yd, -0.1), "#6a5a46", 0.08, 0);
    for (const u of aoLongo(F * 0.5, 4, 0.1)) obra.por("madeira", naFace(bloco(0.12, 1.0, 0.12, u, 0, 0), f, L, F, -F * 0.2, yd, -0.1), "#6a5a46", 0.08, 0);
  }
  // Casa de embarque.
  const Ls = Math.min(L - 1.2, 9);
  const Fs = Math.min(F * 0.5, 5);
  const As = 3.5;
  const casaE = new Obra(82);
  const tc = new Obra(83);
  const dentro = new Obra(84);
  paredes(casaE, Ls, Fs, As, "madeira", "#dfe4e0", p.entravel ? PORTA_DE_ENTRAR : undefined);
  for (const f of ["fundos", "esquerda", "direita"] as Face[]) {
    const comp = f === "fundos" ? Ls : Fs;
    for (const u of aoLongo(comp, Math.floor(comp / 0.8), 0.2)) casaE.por("madeira", naFace(bloco(0.07, As, 0.04, 0, 0, 0.02), f, Ls, Fs, u, 0), "#c4ccc8", 0.06, 0);
  }
  cunhais(casaE, Ls, Fs, As, "#2f5f72", 0.2);
  if (p.entravel) porta(casaE, "frente", Ls, Fs, 0, PORTA_DE_ENTRAR.largura, PORTA_DE_ENTRAR.altura, "#2f5f72", true, "#2f5f72");
  else porta(casaE, "frente", Ls, Fs, 0, 1.4, 2.5, "#2f5f72", false, "#2f5f72");
  for (const s of [-1, 1]) janela(casaE, "frente", Ls, Fs, s * (Ls / 2 - 1.1), 1.1, 0.9, 1.2, { moldura: "#2f5f72", materialDaMoldura: "madeira", veneziana: "#2f5f72" });
  for (const g of telhado("quatro-aguas", Ls, Fs, As, Fs * 0.35, 0.8)) tc.por("telha", g, "#8e4e3a", 0.14, 0);
  tc.por("madeira", franja([-Ls / 2 - 0.8, As - 0.15], [Ls / 2 + 0.8, As - 0.15], 1, 0.34).translate(0, 0, Fs / 2 + 0.76), "#2f5f72", 0.04, 0);
  tc.por("madeira", bloco(Math.min(Ls * 0.7, 6), 0.75, 0.08, 0, As + 0.05, Fs / 2 + 0.85), "#1e2626", 0.05, 0);
  tc.por("madeira", bloco(Math.min(Ls * 0.7, 6) + 0.2, 0.1, 0.12, 0, As + 0.8, Fs / 2 + 0.85), "#c9b48a", 0.05, 0);
  dentro.por("madeira", bloco(Ls * 0.5, 1.05, 0.7, 0, 0, -Fs / 2 + 1.0), "#4a3a2a", 0.08, 0);
  for (const s of [-1, 1]) dentro.por("madeira", bloco(0.5, 0.45, Fs * 0.5, s * (Ls / 2 - 0.7), 0, 0.3), "#5a4a38", 0.08, 0);
  const embarque = deslocar({ corpo: casaE.pecas(), telhado: tc.pecas(), interior: dentro.pecas() }, 0, yd, -F / 2 + Fs / 2 + 0.3);
  // Caixotes e barrica esperando o barco.
  const q = new Obra(85);
  q.por("madeira", bloco(0.9, 0.7, 0.9, -L / 2 + 1.0, yd, -F * 0.05), "#8a7656", 0.1, 0);
  q.por("madeira", bloco(0.8, 0.6, 0.8, -L / 2 + 1.0, yd + 0.7, -F * 0.05), "#7a6648", 0.1, 0);
  barril(q, -L / 2 + 2.0, -F * 0.02, 0.9, "#5a4a3a", yd);
  return somar({ corpo: obra.pecas(), telhado: [], interior: [] }, embarque, { corpo: q.pecas(), telhado: [], interior: [] });
}

/** Barraca de praia de lona listrada, com lambrequim de lona nas beiradas. */
function tenda(p: PredioLocal, r: () => number, pl: Plano): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(91);
  const cor = ["#2f5f72", "#8a3a2c", "#3f6a52", "#c9a24a"][Math.floor(r() * 4)];
  const n = Math.max(3, Math.round(F / 1.1));
  const seg = F / n;
  for (let i = 0; i < n; i++) {
    const g = telhado("duas-aguas", seg, L, 0.3, A - 0.3, 0, 0.04)[0];
    obra.por("lona", g.rotateY(Math.PI / 2).translate(0, 0, -F / 2 + seg * (i + 0.5)), i % 2 ? cor : "#efe9da", 0.08, 0);
  }
  for (const s of [-1, 1]) {
    const fr = franja([-F / 2, 0.36], [F / 2, 0.36], pl.forma, 0.32, 0.1, true).rotateY(Math.PI / 2).translate(s * (L / 2 + 0.02), 0, 0);
    obra.por("lona", fr, cor, 0.06, 0);
  }
  obra.por("lona", dupla([new THREE.Vector3(L / 2, 0.3, -F / 2), new THREE.Vector3(-L / 2, 0.3, -F / 2), new THREE.Vector3(0, A, -F / 2)], [0, 1, 2]), "#efe9da", 0.08, 0);
  for (const s of [-1, 1]) obra.por("lona", dupla([new THREE.Vector3(s * L * 0.05, A - 0.1, F / 2), new THREE.Vector3(s * L * 0.42, 0.3, F / 2 + 0.25), new THREE.Vector3(s * L * 0.22, 0.3, F / 2 + 0.05)], [0, 1, 2]), cor, 0.08, 0);
  for (const z of [-F / 2, F / 2]) obra.por("madeira", bloco(0.1, A + 0.3, 0.1, 0, 0, z), "#5a4028", 0.1, 0);
  obra.por("madeira", bloco(0.08, 0.08, F + 0.4, 0, A - 0.02, 0), "#5a4028", 0.1, 0);
  const dentro = new Obra(92);
  if (p.entravel) interiorBasico(dentro, L, F, { piso: "#c9b48a", madeira: "#6a5038" });
  return { corpo: obra.pecas(), telhado: [], interior: dentro.pecas() };
}

// ---------------------------------------------------------------- longe

/** Longe: volume, telhado, galerias como faixas brancas e cor da parede. */
function longe(p: PredioLocal, pl: Plano, rubro: boolean): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(1);
  const t = new Obra(2);
  const fim = (dz = 0) => deslocar({ corpo: obra.pecas(), telhado: t.pecas(), interior: [] }, 0, 0, dz);
  if (p.tipo === "torre") {
    const R = (Math.min(L, F) / 2) * 0.8;
    obra.por("cantaria", cilindro(R * 0.66, R, A * 0.55, 8), "#bdb4a0", 0.06, 0);
    obra.por("tijolo", cilindro(R * 0.5, R * 0.66, A * 0.25, 8).translate(0, A * 0.55, 0), "#9a5a44", 0.06, 0);
    obra.por("ferro", cilindro(R * 0.45, R * 0.45, A * 0.1, 8).translate(0, A * 0.8, 0), "#2f3a36", 0.04, 0);
    t.por("ferro", new THREE.ConeGeometry(R * 0.5, A * 0.1, 8).translate(0, A * 0.95, 0), "#4c6a5e", 0.06, 0);
    if (p.entravel) obra.por("reboco", bloco(L * 0.92, 3.6, F * 0.4, 0, 0, F * 0.3), "#e6e0d2", 0.05, 0);
    return fim();
  }
  if (p.tipo === "moinho") {
    const R = (Math.min(L, F) / 2) * 0.78;
    obra.por("reboco", cilindro(R * 0.84, R, A, 8), "#efeae0", 0.05, 0);
    t.por("madeira-escura", new THREE.ConeGeometry(R * 0.95, R * 1.1, 8).translate(0, A + R * 0.55, 0), "#4a3a2c", 0.1, 0);
    for (const a of [0.4, 0.4 + Math.PI / 2]) obra.por("lona", bloco(A * 0.9, 0.5, 0.1, 0, 0, 0).rotateZ(a).translate(0, A * 0.9, R + 0.3), "#e8e0cc", 0.05, 0);
    return fim();
  }
  if (p.tipo === "tenda") {
    t.por("lona", telhado("duas-aguas", F, L, 0.3, A - 0.3, 0, 0.04)[0].rotateY(Math.PI / 2), "#efe9da", 0.06, 0);
    return fim();
  }
  if (p.tipo === "igreja") {
    obra.por("reboco", bloco(L, A, F - 1.4, 0, 0, -0.7), "#f2eee6", 0.05, 0);
    t.por("telha", telhado("duas-aguas", F - 1.4, L, A, L * 0.4, 0.5)[0].rotateY(Math.PI / 2).translate(0, 0, -0.7), pl.telhaMat === "telha" ? pl.telha : "#a6513a", 0.08, 0);
    const lado = Math.min(Math.max(5.2, L * 0.38), L - 2);
    const hT = A + L * 0.4 + 1.6 + 3.8;
    obra.por("reboco", bloco(lado, hT, lado, 0, 0, F / 2 - lado / 2), "#f2eee6", 0.05, 0);
    obra.por("telha", new THREE.ConeGeometry(lado * 0.36, 2.2, 8).translate(0, hT + 1.1, F / 2 - lado / 2), "#b4683e", 0.06, 0);
    return fim();
  }
  if (p.id === "cais-sepulcro" || /^cais/i.test(p.nome)) {
    obra.por("madeira", bloco(L, 0.55, F, 0, 0, 0), "#7d6c56", 0.08, 0);
    const Fs = Math.min(F * 0.5, 5);
    const zs = -F / 2 + Fs / 2 + 0.3;
    obra.por("madeira", bloco(Math.min(L - 1.2, 9), 3.5, Fs, 0, 0.55, zs), "#dfe4e0", 0.05, 0);
    t.por("telha", telhado("quatro-aguas", Math.min(L - 1.2, 9), Fs, 4.05, Fs * 0.35, 0.8)[0].translate(0, 0, zs), "#8e4e3a", 0.08, 0);
    return fim();
  }
  if (ehCabana(p, pl)) {
    const Lb = Math.max(4, L * 0.62);
    const Fb = Math.max(4, F * 0.66);
    const Ab = Math.min(A, 3.2);
    obra.por("madeira", bloco(Lb, Ab, Fb, -(L - Lb) / 2, 0, -(F - Fb) / 2), "#9a9384", 0.06, 0);
    t.por("palha", telhado("duas-aguas", Lb, Fb, Ab, Fb * 0.42, 0.55)[0].translate(-(L - Lb) / 2, 0, -(F - Fb) / 2), "#9a8458", 0.08, 0);
    return fim();
  }
  const lay = planta(p, pl, rubro);
  const { Lb, Fb, pav, H, prof, alto } = lay;
  const mat: NomeMaterial = p.tipo === "galpao" || p.tipo === "estacao" ? "madeira" : p.tipo === "fabrica" ? "tijolo" : "reboco";
  const parede = mat === "madeira" ? "#8e918a" : mat === "tijolo" ? "#9a5a44" : pl.parede;
  obra.por(mat, bloco(Lb, A, Fb, 0, 0, 0), parede, 0.05, 0);
  if (lay.telhado === "chale") {
    t.por(pl.telhaMat, telhado("duas-aguas", Fb, Lb, A, alto, 0.55)[0].rotateY(Math.PI / 2), pl.telha, 0.08, 0);
    for (const g of empenas(Fb, Lb, A, alto)) obra.por("reboco", g.rotateY(Math.PI / 2), parede, 0.05, 0);
  } else if (lay.telhado === "duas") {
    const [tm, tc] = telhaDoGalpao(pl, mat === "tijolo");
    t.por(tm, telhado("duas-aguas", Lb, Fb, A, alto, 0.5)[0], tc, 0.08, 0);
    for (const g of empenas(Lb, Fb, A, alto)) obra.por(mat, g, parede, 0.05, 0);
    if (p.tipo === "fabrica") obra.por("tijolo", bloco(0.8, p.altura * 2.3, 0.8, p.largura * 0.32, 0, -p.fundo * 0.3 - lay.dz), "#8a4a38", 0.05, 0);
  } else if (lay.telhado === "plat") {
    obra.por("reboco", bloco(Lb + 0.1, alto, Fb + 0.1, 0, A, 0), pl.arremate, 0.04, 0);
  } else {
    t.por(pl.telhaMat, telhado("quatro-aguas", Lb, Fb, A, alto, 0.7)[0], pl.telha, 0.08, 0);
  }
  if (lay.galeria) {
    const faixa = (f: Face, comp: number, u: number) => {
      for (let k = 1; k < pav; k++) obra.por("madeira", naFace(bloco(comp, 0.35, prof, 0, k * H - 0.3, prof / 2), f, Lb, Fb, u, 0), pl.madeira, 0.04, 0);
      obra.por("madeira", naFace(bloco(comp, 0.3, prof, 0, 0, prof / 2), f, Lb, Fb, u, 0), "#8f8068", 0.04, 0);
      for (const s of [-1, 1]) obra.por("madeira", naFace(bloco(0.25, pav * H - 0.45, 0.25, s * (comp / 2 - 0.15), 0, prof - 0.15), f, Lb, Fb, u, 0), pl.madeira, 0.04, 0);
      t.por(pl.telhaMat, naFace(telhado("uma-agua", comp, prof, pav * H - 0.45, 0.45, 0.3, 0.1)[0].translate(0, 0, prof / 2), f, Lb, Fb, u, 0), pl.telha, 0.08, 0);
    };
    faixa("frente", Lb + (lay.lados ? prof * 2 : 0), 0);
    if (lay.lados) for (const f of ["esquerda", "direita"] as Face[]) faixa(f, lay.lados, (f === "esquerda" ? 1 : -1) * (Fb / 2 - lay.lados / 2));
  }
  if (rubro) {
    obra.por("reboco", bloco(4.2, 3.4 + alto * 0.45, 4.2, 0, A + alto * 0.1, 0), RUBRO.parede, 0.05, 0);
    t.por("telha-escura", telhado("quatro-aguas", 4.2, 4.2, A + alto * 0.55 + 3.5, 1.6, 0.5)[0], RUBRO.telha, 0.06, 0);
  }
  return fim(lay.dz);
}

// ---------------------------------------------------------------- entrada

export function gerarBalneario(p: PredioLocal, nivel: NivelPredio, semente: number): PecasDoPredio {
  const r = sorteio(semente);
  const rubro = p.id === "hotel-rubro" || /hotel rubro/i.test(p.nome);
  const base = planejar(r);
  const pl: Plano = rubro ? { ...base, ...RUBRO } : base;
  if (p.tipo === "ruina") return ruina(p, r, "#a59a86");
  if (nivel === 1) return longe(p, pl, rubro);
  if (p.id === "cais-sepulcro" || /^cais/i.test(p.nome)) return cais(p);
  switch (p.tipo) {
    case "casa":
      return ehCabana(p, pl) ? cabana(p, r, pl) : casa(p, r, pl);
    case "hotel":
      return hotel(p, r, pl, rubro);
    case "comercio":
      return comercio(p, r, pl);
    case "saloon":
      return saloon(p, r, pl);
    case "publico":
      return publico(p, r, pl, false);
    case "banco":
      return publico(p, r, pl, true);
    case "igreja":
      return igreja(p, r, pl);
    case "galpao":
      return galpao(p, r, pl);
    case "estacao":
      return galpao(p, r, pl, { varanda: true });
    case "fabrica": {
      const base2 = galpao(p, r, pl, { tijolo: true });
      const o = new Obra(61);
      chamine(o, p.largura * 0.32, -p.fundo * 0.3, 0, p.altura * 2.3, "#8a4a38");
      o.por("cantaria", bloco(0.9, 0.3, 0.9, p.largura * 0.32, p.altura * 1.4, -p.fundo * 0.3), "#c9bfae", 0.04, 0);
      return somar(base2, { corpo: o.pecas(), telhado: [], interior: [] });
    }
    case "fazenda":
      return fazenda(p, r, pl);
    case "moinho":
      return moinho(p, r);
    case "torre":
      // Em Santo Ozório toda torre é farol; o canônico é o desativado.
      return farol(p, p.id === "farol" || /desativ/i.test(p.nome));
    case "tenda":
      return tenda(p, r, pl);
    default:
      return casa(p, r, pl);
  }
}

const estilo: Estilo = { id: "balneario", nome: "Balneário (Santo Ozório)", gerar: gerarBalneario };

export default estilo;
