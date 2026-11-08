// Pedra vermelha do deserto (Araçuaí, Deserto de Mucuri): blocos de pedra vermelha e
// adobe de cantos arredondados, terraços planos com parapeito, arcos vazados, vigas
// aparentes, pouca janela e funda, toldos listrados da Feira da Barganha, torres de
// pedra com cúpula, banco de arenito e estação com arcada. Nada de telhado de telha:
// a silhueta da cidade é de caixas escalonadas, torres e cúpulas.

import { sorteio } from "../../natureza/ferramentas";
import type { NomeMaterial } from "../../natureza/tipos";
import { aoLongo, bloco, Obra, placa, type Face } from "../kit";
import type { Estilo, NivelPredio, PecasDoPredio, PredioLocal } from "../tipos";
import {
  anel,
  arcosAoLongo,
  arqueada,
  cilindro,
  cupula,
  escadaDeMao,
  frontaoCurvo,
  gargula,
  janelaFunda,
  type EstiloDoParapeito,
  type Lado,
  noLado,
  parapeito,
  perfil,
  portaFunda,
  pote,
  ramada,
  toldoListrado,
  torreDePedra,
  vigas,
  volume,
} from "./_pedra-vermelha-pecas";

const PEDRA = ["#a5523a", "#b0603f", "#9a4832", "#b86d4b", "#a85a44", "#94503c", "#ad5a3c"];
const ADOBE = ["#b98a5e", "#c39a6c", "#a97b52", "#c08a62", "#b4805a"];
const ARENITO = ["#c9a07a", "#bf956e", "#d0ab84"];
const FOLHA = ["#2f5a66", "#4a3222", "#6b2e22", "#3a5f4a", "#5a4632", "#2e4a6e", "#7a5a2a"];
const LONA = ["#b8452c", "#d29a3c", "#2f6e6e", "#7c3a5e", "#e0d2ae", "#9a5a2a", "#3e5f86", "#c8b48a"];
const LAJE = ["#7e5e44", "#86644a", "#735540"];
const CAIADO = "#dcc9a8";
const MADEIRA_VELHA = "#4a3222";
const PORTA_DE_ENTRAR = { w: 4.2, h: 3 };
const CANTOS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

type Superior = { L: number; F: number; x: number; z: number; A: number };

/** Tudo o que a forma do prédio sorteia: o mesmo para perto e longe (a silhueta não pula). */
type Plano = {
  mat: NomeMaterial;
  parede: string;
  arenito: string;
  folha: string;
  laje: string;
  caiado?: string;
  rc: number;
  parap: number;
  parapeito: EstiloDoParapeito;
  vigas: boolean;
  arcos: boolean;
  lonas: [string, string];
  /** Altura das paredes do térreo, sem parapeito. */
  A0: number;
  sup?: Superior;
};

function plano(p: PredioLocal, r: () => number): Plano {
  const de = <T,>(l: T[]) => l[Math.floor(r() * l.length)];
  const nobre = p.tipo === "banco" || p.tipo === "igreja" || p.tipo === "publico" || p.tipo === "estacao" || p.tipo === "hotel";
  const adobe = !nobre && r() < 0.38;
  const lona1 = de(LONA);
  let lona2 = de(LONA);
  if (lona2 === lona1) lona2 = "#e0d2ae";
  const parap = p.tipo === "banco" ? 1.0 : 0.6 + r() * 0.35;
  const { largura: L, fundo: F, altura: A } = p;
  const dois = (p.tipo === "casa" || p.tipo === "comercio" || p.tipo === "fazenda") && A >= 6.4;
  const A0 = dois ? Math.max(3.3, A * 0.5 - 0.2) : A - parap;
  let sup: Superior | undefined;
  if (dois) {
    const Ls = L * (0.45 + r() * 0.3);
    const Fs = F * (0.45 + r() * 0.15);
    sup = { L: Ls, F: Fs, x: (r() - 0.5) * (L - Ls), z: -F / 2 + Fs / 2, A: A - parap - A0 };
  }
  return {
    mat: adobe ? "terra" : "pedra-vermelha",
    parede: p.tipo === "banco" ? "#8e3f2e" : adobe ? de(ADOBE) : de(PEDRA),
    arenito: de(ARENITO),
    folha: de(FOLHA),
    laje: de(LAJE),
    caiado: r() < 0.35 ? CAIADO : undefined,
    rc: p.tipo === "banco" || p.tipo === "publico" ? 0 : adobe ? 0.7 + r() * 0.4 : 0.3 + r() * 0.5,
    parap,
    parapeito: p.tipo === "banco" || p.tipo === "publico" ? "escalonado" : p.tipo === "hotel" ? "ameias" : de<EstiloDoParapeito>(adobe ? ["orelhas", "liso", "orelhas"] : ["liso", "escalonado", "orelhas", "ameias", "liso"]),
    vigas: adobe ? r() < 0.8 : r() < 0.35,
    arcos: !adobe && r() < 0.6,
    lonas: [lona1, lona2],
    A0,
    sup,
  };
}

type Obras = { c: Obra; t: Obra; i: Obra };
const novas = (r: () => number): Obras => ({ c: new Obra(Math.floor(r() * 1e6)), t: new Obra(Math.floor(r() * 1e6)), i: new Obra(Math.floor(r() * 1e6)) });
const fim = (o: Obras): PecasDoPredio => ({ corpo: o.c.pecas(), telhado: o.t.pecas(), interior: o.i.pecas() });
const frente = (L: number, F: number): Lado => ({ f: "frente", L, F });

function vaoDeEntrar(A: number) {
  return { u: 0, w: PORTA_DE_ENTRAR.w, h: PORTA_DE_ENTRAR.h, arco: Math.max(0, Math.min(1.3, A - PORTA_DE_ENTRAR.h - 0.45)) };
}

/** Folhas da porta grande abertas para dentro. */
function folhasAbertas(obra: Obra, l: Lado, v: { w: number; h: number }, cor: string) {
  for (const s of [-1, 1]) {
    const folha = bloco(0.08, v.h * 0.97, v.w / 2 - 0.15, 0, 0, -v.w / 4);
    folha.translate(s * (v.w / 2 - 0.1), 0, -0.45);
    obra.por("madeira", noLado(folha, l, 0, 0), cor, 0.08, 0);
  }
}

/** Aro de cantaria em volta do vão de entrar, com as folhas abertas para dentro. */
function aroDeEntrar(obra: Obra, l: Lado, A: number, pl: Plano) {
  const v = vaoDeEntrar(A);
  const b = 0.28;
  obra.por("cantaria", noLado(arqueada(v.w + b * 2, Math.min(A, v.h + v.arco + b), [v], 0.18), l, 0, 0), pl.arenito, 0.06, 0);
  folhasAbertas(obra, l, v, pl.folha);
}

/** Fachada de casa: porta (ou vão de entrar) e poucas janelas fundas; laterais quase cegas. */
function fenestrar(obra: Obra, l: Lado, altura: number, entravel: boolean, pl: Plano, r: () => number, o: { porta?: boolean; grade?: boolean; janelaY?: number } = {}) {
  const comp = l.f === "frente" || l.f === "fundos" ? l.L : l.F;
  const n = Math.max(1, Math.floor((comp - 1) / 3.2));
  const slots = aoLongo(comp, n, 1.5);
  const iPorta = o.porta && !entravel ? (n <= 2 ? Math.floor(r() * n) : Math.floor(n / 2) + (r() < 0.5 ? 0 : -1)) : -1;
  const wj = 0.65 + r() * 0.3;
  const hj = 0.85 + r() * 0.35;
  const arco = pl.arcos ? wj / 2 : 0;
  const yj = o.janelaY ?? Math.min(1.4, altura - hj - arco - 0.7);
  const terra = pl.mat === "terra";
  slots.forEach((u, i) => {
    if (i === iPorta) {
      const w = 1.1 + r() * 0.3;
      const h = Math.min(2.3, altura - 0.9);
      portaFunda(obra, l, u, w, h, pl.arcos || r() < 0.3 ? w / 2 : 0, { folha: pl.folha, moldura: terra ? pl.parede : pl.arenito, materialDaMoldura: terra ? "terra" : "cantaria", caiado: pl.caiado });
      return;
    }
    if (entravel && l.f === "frente" && Math.abs(u) < PORTA_DE_ENTRAR.w / 2 + 0.3 + wj) return;
    if (r() < (l.f === "frente" ? 0.2 : 0.55)) return;
    janelaFunda(obra, l, u, yj, wj, hj, {
      arco,
      moldura: terra ? pl.parede : pl.arenito,
      materialDaMoldura: terra ? "terra" : "cantaria",
      grade: o.grade ? { material: "ferro", cor: "#2c2a28" } : r() < 0.5 ? { material: "madeira-escura", cor: MADEIRA_VELHA } : undefined,
      verga: terra && !pl.arcos ? MADEIRA_VELHA : undefined,
    });
  });
}

/** Remendos de barro e reboco caído na pedra: o gasto de quarenta verões. */
function remendos(obra: Obra, l: Lado, altura: number, pl: Plano, r: () => number) {
  const comp = l.f === "frente" || l.f === "fundos" ? l.L : l.F;
  const n = Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const w = 0.6 + r() * 1.2;
    const h = 0.4 + r() * 0.9;
    const cor = pl.mat === "terra" ? (r() < 0.5 ? "#a06e48" : "#c9a27a") : r() < 0.5 ? "#b98a5e" : "#7e3a28";
    obra.por(pl.mat, noLado(bloco(w, h, 0.03, 0, 0, 0), l, (r() - 0.5) * Math.max(0, comp - w - 2), 0.3 + r() * Math.max(0, altura - h - 0.6)), cor, 0.1, 0);
  }
}

/** Casa de terraço: térreo arredondado, às vezes um quarto em cima, recuado para os fundos. */
function casaBase(o: Obras, p: PredioLocal, pl: Plano, r: () => number) {
  const { largura: L, fundo: F } = p;
  const vao = p.entravel ? vaoDeEntrar(pl.A0) : undefined;
  volume(o.c, L, F, pl.A0, pl.mat, pl.parede, pl.rc, { vao });
  const fr = frente(L, F);
  if (p.entravel) aroDeEntrar(o.c, fr, pl.A0, pl);
  fenestrar(o.c, fr, pl.A0, p.entravel, pl, r, { porta: true });
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
    fenestrar(o.c, { f, L, F }, pl.A0, false, pl, r);
    remendos(o.c, { f, L, F }, pl.A0, pl, r);
  }
  remendos(o.c, fr, pl.A0, pl, r);
  // O terraço some quando alguém entra (vai em `telhado`).
  const teto = p.entravel ? o.t : o.c;
  parapeito(teto, L, F, pl.A0, pl.sup ? 0.75 : pl.parap, pl.mat, pl.parede, pl.rc, pl.sup ? "liso" : pl.parapeito, { laje: pl.laje });
  if (pl.vigas) for (const f of ["frente", "fundos"] as Face[]) vigas(teto, { f, L, F }, pl.A0 - 0.45, MADEIRA_VELHA);
  gargula(teto, fr, (r() - 0.5) * L * 0.6, pl.A0 + 0.05, MADEIRA_VELHA);
  if (r() < 0.6) gargula(teto, { f: r() < 0.5 ? "esquerda" : "direita", L, F }, (r() - 0.5) * F * 0.5, pl.A0 + 0.05, MADEIRA_VELHA);
  if (pl.sup) {
    const s = pl.sup;
    const rs = pl.rc * 0.8;
    volume(teto, s.L, s.F, s.A, pl.mat, pl.parede, rs, { y0: pl.A0, x: s.x, z: s.z });
    parapeito(teto, s.L, s.F, pl.A0 + s.A, pl.parap, pl.mat, pl.parede, rs, pl.parapeito, { x: s.x, z: s.z, laje: pl.laje });
    const ls: Lado = { f: "frente", L: s.L, F: s.F, dx: s.x, dz: s.z };
    const molduraDe = { moldura: pl.mat === "terra" ? pl.parede : pl.arenito, materialDaMoldura: (pl.mat === "terra" ? "terra" : "cantaria") as NomeMaterial };
    portaFunda(teto, ls, s.L > 3.4 ? -s.L * 0.22 : 0, 0.95, Math.min(1.95, s.A - 0.9), pl.arcos ? 0.47 : 0, { folha: pl.folha, ...molduraDe, y: pl.A0 });
    if (s.L > 3.4) janelaFunda(teto, ls, s.L * 0.22, pl.A0 + 1.0, 0.7, 0.9, { arco: pl.arcos ? 0.35 : 0, ...molduraDe });
    janelaFunda(teto, { ...ls, f: "fundos" }, 0, pl.A0 + 1.0, 0.7, 0.9, { arco: pl.arcos ? 0.35 : 0, ...molduraDe });
    if (pl.vigas) vigas(teto, { ...ls, f: "frente" }, pl.A0 + s.A - 0.45, MADEIRA_VELHA);
  } else if (r() < 0.4 && !p.entravel) {
    escadaDeMao(o.c, { f: r() < 0.5 ? "esquerda" : "direita", L, F }, (r() - 0.5) * (F - 2), pl.A0);
  }
  // Talhas d'água no terraço.
  const nPotes = Math.floor(r() * 3);
  for (let i = 0; i < nPotes; i++) pote(teto, (r() - 0.5) * (L - 2), pl.A0 + 0.08, (pl.sup ? F / 2 - 1 : -F / 2 + 0.9) - r() * 0.6, 0.6 + r() * 0.3, "#9a5a3a");
}

function interior(o: Obras, p: PredioLocal, r: () => number, balcao = false) {
  if (!p.entravel) return;
  const { largura: L, fundo: F } = p;
  const i = o.i;
  i.por("pedra-vermelha", bloco(L - 0.9, 0.06, F - 0.9, 0, 0.02, 0), "#8a4a36", 0.12, 0);
  // Banco de adobe corrido no fundo e um fogão de barro arredondado no canto.
  i.por("terra", bloco(L * 0.6, 0.45, 0.6, 0, 0, -F / 2 + 0.8), "#a97b52", 0.08, 0);
  i.por("terra", cilindro(0.6, 0.7, 1.1, 8).translate(L / 2 - 1.2, 0, -F / 2 + 1.2), "#b98a5e", 0.08, 0);
  i.por("terra", cupula(0.6, 8, 2).translate(L / 2 - 1.2, 1.1, -F / 2 + 1.2), "#b98a5e", 0.08, 0);
  if (balcao) i.por("madeira", bloco(L * 0.5, 1.05, 0.7, -L * 0.1, 0, -F / 2 + 2.2), "#5a3a22", 0.08, 0);
  const mesas = L > 9 ? 2 : 1;
  for (let k = 0; k < mesas; k++) {
    const x = mesas === 1 ? -L * 0.2 : (k - 0.5) * L * 0.45;
    i.por("madeira", bloco(1.4, 0.76, 0.9, x, 0, F * 0.08), "#6a4a30", 0.08, 0);
    i.por("madeira", bloco(1.4, 0.44, 0.3, x, 0, F * 0.08 + 0.75), "#5a3a22", 0.08, 0);
  }
  for (let k = 0; k < 3; k++) pote(i, -L / 2 + 0.8 + k * 0.7, 0, -F / 2 + 0.8, 0.7 + r() * 0.3, k % 2 ? "#9a5a3a" : "#b5774f");
}

function casa(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  casaBase(o, p, pl, r);
  const fr = frente(p.largura, p.fundo);
  const x = r();
  if (x < 0.22) toldoListrado(o.c, fr, 0, Math.min(2.6, pl.A0 - 0.5), Math.min(p.largura - 1.5, 3.4), 1.5, pl.lonas, r() < 0.5);
  else if (x < 0.4) ramada(o.c, fr, 0, Math.min(p.largura - 0.6, 7), 2.4, 2.5, r() < 0.5 ? { material: "palha", cor: "#a88a5a" } : { material: "lona", cor: pl.lonas[1] });
  interior(o, p, r);
  return fim(o);
}

/** Loja da feira: toldo listrado com varas, mercadoria na calçada, placa pintada. */
function comercio(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const { largura: L, fundo: F } = p;
  casaBase(o, p, pl, r);
  const fr = frente(L, F);
  const fina = p.id === "ourivesaria" || p.id === "penhores" || p.id === "boticario";
  if (!fina) toldoListrado(o.c, fr, 0, Math.min(2.8, pl.A0 - 0.4), Math.min(L - 0.8, 7.5), 2.2, pl.lonas);
  else toldoListrado(o.c, fr, 0, Math.min(2.9, pl.A0 - 0.4), Math.min(L - 1.5, 4.8), 1.2, ["#3a2a22", pl.lonas[0]], false);
  placa(o.c, "frente", L, F, 0, Math.min(pl.A0 - 0.75, 3.9), Math.min(L * 0.55, 4.6), 0.6, "#4a3020");
  if (!fina) {
    // Mercadoria na frente: caixotes, cestos, potes de barro da feira.
    for (const s of [-1, 1]) {
      const x = s * Math.min(L / 2 - 0.9, 3.0);
      o.c.por("madeira", bloco(0.8, 0.5, 0.6, x, 0, F / 2 + 0.6), "#7a5a3a", 0.12, 0.2);
      pote(o.c, x - s * 0.9, 0, F / 2 + 0.5, 0.7 + r() * 0.3, "#a8623e");
      if (r() < 0.6) o.c.por("palha", cilindro(0.35, 0.28, 0.45, 7).translate(x, 0.5, F / 2 + 0.6), "#b39a64", 0.1, 0);
    }
  }
  if (p.id === "ceramica" || r() < 0.15) {
    // Forno de barro em cúpula no terraço, com a fornada de potes ao lado.
    const tt = p.entravel ? o.t : o.c;
    const [fx, fz] = [-L * 0.2, pl.sup ? F * 0.3 : -F * 0.15];
    tt.por("terra", cilindro(1.1, 1.2, 0.6, 10).translate(fx, pl.A0, fz), "#a06e48", 0.1, 0);
    tt.por("terra", cupula(1.1, 10, 3).translate(fx, pl.A0 + 0.6, fz), "#a06e48", 0.1, 0);
    for (let k = 0; k < 5; k++) pote(tt, L * 0.15 + (k % 3) * 0.6, pl.A0 + 0.08, fz + Math.floor(k / 3) * 0.6, 0.5, k % 2 ? "#b5774f" : "#8a4a30");
  }
  interior(o, p, r, true);
  return fim(o);
}

/** Pórtico de arcos em frente à fachada (≤ 3 m para fora), com terraço por cima. */
function portico(o: Obras, F: number, w: number, prof: number, alt: number, pl: Plano, entravel: boolean, balaustrada = false) {
  const esp = 0.5;
  const vaos = arcosAoLongo(w, alt, { central: entravel ? 4.4 : 0, pilar: 0.65, alvo: 2.8 });
  o.c.por(pl.mat, arqueada(w, alt, vaos, esp).translate(0, 0, F / 2 + prof - esp), pl.parede);
  const ladoW = prof - esp;
  for (const s of [-1, 1]) {
    const aw = ladoW - 0.6;
    const g = arqueada(ladoW, alt, aw > 1 ? [{ u: 0, w: aw, h: alt - 0.6 - aw / 2, arco: aw / 2 }] : [], 0.45);
    o.c.por(pl.mat, g.rotateY((s * Math.PI) / 2).translate(s * (w / 2 - 0.45), 0, F / 2 + ladoW / 2), pl.parede);
  }
  o.c.por("terra", bloco(w, 0.3, prof, 0, alt, F / 2 + prof / 2), pl.laje, 0.1, 0);
  o.c.por("cantaria", bloco(w + 0.15, 0.22, 0.3, 0, alt - 0.05, F / 2 + prof - 0.1), pl.arenito, 0.05, 0);
  if (balaustrada) {
    o.c.por("madeira", bloco(w, 0.12, 0.12, 0, alt + 1.0, F / 2 + prof - 0.1), "#5a4028", 0.1, 0);
    o.c.por("madeira", bloco(w, 0.08, 0.08, 0, alt + 0.5, F / 2 + prof - 0.1), "#5a4028", 0.1, 0);
    for (const u of aoLongo(w, Math.round(w / 1.2) + 1, 0.1)) o.c.por("madeira", bloco(0.12, 0.95, 0.12, u, alt + 0.1, F / 2 + prof - 0.1), "#5a4028", 0.1, 0);
  } else {
    o.c.por(pl.mat, bloco(w, 0.55, 0.3, 0, alt + 0.3, F / 2 + prof - 0.15), pl.parede, 0.07, 0);
  }
  o.c.por("pedra-vermelha", bloco(w, 0.08, prof, 0, 0, F / 2 + prof / 2), "#8a4a36", 0.1, 0.3);
}

/** Cantina: casa baixa com pórtico de arcos e placa grande em cima. */
function saloon(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const { largura: L, fundo: F } = p;
  casaBase(o, p, pl, r);
  const alt = Math.min(pl.A0 - 0.2, 4.6);
  portico(o, F, L, 2.6, alt, pl, p.entravel);
  placa(o.c, "frente", L, F + 5.2, 0, alt + 0.2, Math.min(L * 0.6, 5.5), 0.75, "#3a2a1c");
  o.c.por("ferro", bloco(0.14, 0.35, 0.14, L * 0.2, alt - 1.0, F / 2 + 2.3), "#2c2a28", 0.02, 0);
  interior(o, p, r, true);
  return fim(o);
}

function portaJanela(obra: Obra, l: Lado, u: number, y: number, pl: Plano) {
  janelaFunda(obra, l, u, y, 1.0, 2.0, { arco: 0.5, moldura: pl.arenito, fundura: 0.26 });
}

/** Hotel e estalagem: dois andares, arcada no térreo e varanda de madeira por cima. */
function hotel(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const { largura: L, fundo: F, altura: A } = p;
  const Aw = A - pl.parap;
  const A1 = Math.min(3.8, Aw * 0.52);
  volume(o.c, L, F, Aw, pl.mat, pl.parede, pl.rc, { vao: p.entravel ? vaoDeEntrar(A1) : undefined });
  const fr = frente(L, F);
  if (p.entravel) aroDeEntrar(o.c, fr, A1, pl);
  o.c.por("cantaria", bloco(L - pl.rc * 2 + 0.1, 0.22, F + 0.1, 0, A1, 0), pl.arenito, 0.05, 0);
  o.c.por("cantaria", bloco(L + 0.1, 0.22, F - pl.rc * 2 + 0.1, 0, A1, 0), pl.arenito, 0.05, 0);
  fenestrar(o.c, fr, A1, p.entravel, pl, r, { porta: !p.entravel });
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
    fenestrar(o.c, { f, L, F }, A1, false, pl, r);
    fenestrar(o.c, { f, L, F }, Aw, false, pl, r, { janelaY: A1 + 1.0 });
  }
  // Andar de cima: portas-janela em arco que dão na varanda.
  for (const u of aoLongo(L, Math.max(2, Math.floor((L - 1.5) / 3)), 1.6)) portaJanela(o.c, fr, u, A1 + 0.3, pl);
  portico(o, F, L - 0.2, 2.5, A1, pl, p.entravel, true);
  parapeito(o.t, L, F, Aw, pl.parap, pl.mat, pl.parede, pl.rc, pl.parapeito, { laje: pl.laje, coroa: pl.arenito });
  if (pl.vigas || r() < 0.5) vigas(o.t, fr, Aw - 0.45, MADEIRA_VELHA);
  placa(o.c, "frente", L, F, 0, Aw - 0.9, Math.min(L * 0.5, 7), 0.7, "#3a2a1c");
  interior(o, p, r, true);
  return fim(o);
}

/** Embasamento de arenito (soco) em volta, aberto na porta. */
function embasamento(obra: Obra, L: number, F: number, h: number, pl: Plano, vao: number) {
  const s = 0.12;
  obra.por("cantaria", bloco(L + s * 2, h, s, 0, 0, -F / 2 - s / 2), pl.arenito, 0.06, 0.25);
  for (const x of [-1, 1]) obra.por("cantaria", bloco(s, h, F + s * 2, x * (L / 2 + s / 2), 0, 0), pl.arenito, 0.06, 0.25);
  const lado = (L + s * 2 - vao) / 2;
  for (const x of [-1, 1]) obra.por("cantaria", bloco(lado, h, s, x * (vao / 2 + lado / 2), 0, F / 2 + s / 2), pl.arenito, 0.06, 0.25);
}

/** Cunhais de cantaria em silharia alternada nos quatro cantos. */
function cunhais(obra: Obra, L: number, F: number, A: number, cor: string) {
  let k = 0;
  for (let y = 0.8; y < A - 0.3; y += 0.55, k++) {
    for (const [sx, sz] of CANTOS) {
      const longoEmX = (k + (sx * sz > 0 ? 0 : 1)) % 2 === 0;
      const [w, d] = longoEmX ? [0.95, 0.5] : [0.5, 0.95];
      obra.por("cantaria", bloco(w, 0.48, d, sx * (L / 2 - w / 2 + 0.06), y, sz * (F / 2 - d / 2 + 0.06)), cor, 0.07, 0);
    }
  }
}

/** Repartição (delegacia, escola, câmara): bloco de arestas vivas, grade e frontão escalonado. */
function publico(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const { largura: L, fundo: F, altura: A } = p;
  const Aw = A - pl.parap;
  const dois = Aw >= 6;
  const A1 = dois ? Math.min(3.8, Aw * 0.5) : Aw;
  volume(o.c, L, F, Aw, pl.mat, pl.parede, 0, { vao: p.entravel ? vaoDeEntrar(A1) : undefined });
  const fr = frente(L, F);
  if (p.entravel) {
    aroDeEntrar(o.c, fr, A1, pl);
    embasamento(o.c, L, F, 0.8, pl, PORTA_DE_ENTRAR.w + 0.6);
  } else portaFunda(o.c, fr, 0, 1.6, 2.5, 0.8, { folha: pl.folha, moldura: pl.arenito });
  cunhais(o.c, L, F, Aw, pl.arenito);
  fenestrar(o.c, fr, A1, true, pl, r, { grade: true });
  if (dois) {
    o.c.por("cantaria", bloco(L + 0.1, 0.22, F + 0.1, 0, A1, 0), pl.arenito, 0.05, 0);
    for (const u of aoLongo(L, Math.max(2, Math.floor((L - 1) / 2.6)), 1.4)) janelaFunda(o.c, fr, u, A1 + 0.8, 0.9, 1.4, { arco: 0.45, moldura: pl.arenito, grade: { material: "ferro", cor: "#2c2a28" } });
  }
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) fenestrar(o.c, { f, L, F }, A1, false, pl, r, { grade: true });
  parapeito(o.t, L, F, Aw, pl.parap, pl.mat, pl.parede, 0, "escalonado", { laje: pl.laje, coroa: pl.arenito });
  placa(o.c, "frente", L, F, 0, Aw + pl.parap - 0.05, Math.min(L * 0.3, 3.4), 0.55, "#3a2a1c");
  // Mastro com bandeira desbotada.
  o.c.por("ferro", bloco(0.08, 4, 0.08, L / 2 - 0.6, Aw, F / 2 - 0.6), "#2c2a28", 0.02, 0);
  o.c.por("lona", bloco(1.2, 0.8, 0.02, L / 2, Aw + 3.0, F / 2 - 0.6), "#3e6a4a", 0.1, 0);
  interior(o, p, r, true);
  return fim(o);
}

/** Banco: o prédio mais imponente da praça. Arenito sobre pedra escura, escadaria, grades e frontão. */
function banco(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const { largura: L, fundo: F, altura: A } = p;
  const Aw = A - pl.parap;
  const A1 = Math.min(3.9, Aw * 0.56);
  const v = p.entravel ? vaoDeEntrar(Aw - 0.4) : { u: 0, w: 2.2, h: 3, arco: 1.1 };
  volume(o.c, L, F, Aw, "pedra-vermelha", pl.parede, 0, { vao: p.entravel ? v : undefined });
  const fr = frente(L, F);
  embasamento(o.c, L, F, 1.0, pl, v.w + 0.8);
  cunhais(o.c, L, F, Aw, pl.arenito);
  // Portal: arco alto de arenito com pilastras e chave.
  o.c.por("cantaria", noLado(arqueada(v.w + 0.7, v.h + v.arco + 0.4, [v], 0.25), fr, 0, 0), pl.arenito, 0.05, 0);
  for (const s of [-1, 1]) o.c.por("cantaria", noLado(bloco(0.6, Aw - 0.2, 0.35, s * (v.w / 2 + 0.75), 0, 0.17), fr, 0, 0), pl.arenito, 0.05, 0);
  o.c.por("cantaria", noLado(bloco(0.5, 0.6, 0.35, 0, v.h + v.arco - 0.15, 0.2), fr, 0, 0), "#d8b892", 0.04, 0);
  if (p.entravel) folhasAbertas(o.c, fr, v, "#3a2418");
  else o.c.por("madeira", noLado(perfil(v.w, v.h, v.arco, 0.06), fr, 0, 0), "#3a2418", 0.06, 0);
  // Janelas altas em arco, gradeadas, dos dois lados do portal e no andar nobre.
  const ladoUtil = L / 2 - (v.w / 2 + 1.1);
  const nLado = Math.min(2, Math.max(1, Math.floor(ladoUtil / 2.4)));
  for (const s of [-1, 1]) {
    for (let i = 0; i < nLado; i++) {
      const u = s * (v.w / 2 + 1.1 + ((i + 0.5) * ladoUtil) / nLado);
      const grade = { material: "ferro" as NomeMaterial, cor: "#24221f" };
      janelaFunda(o.c, fr, u, 1.3, 1.0, Math.min(1.8, A1 - 1.9), { arco: 0.5, moldura: pl.arenito, aro: 0.22, fundura: 0.3, grade });
      janelaFunda(o.c, fr, u, A1 + 0.6, 0.9, Math.min(1.5, Aw - A1 - 1.6), { arco: 0.45, moldura: pl.arenito, aro: 0.2, fundura: 0.26, grade });
    }
  }
  for (const f of ["esquerda", "direita"] as Face[]) {
    for (const u of aoLongo(F, Math.max(1, Math.floor(F / 5)), 2)) janelaFunda(o.c, { f, L, F }, u, 1.6, 0.8, 1.3, { arco: 0.4, moldura: pl.arenito, grade: { material: "ferro", cor: "#24221f" } });
  }
  o.c.por("cantaria", bloco(L + 0.12, 0.25, F + 0.12, 0, A1, 0), pl.arenito, 0.05, 0);
  o.c.por("cantaria", bloco(L + 0.5, 0.4, F + 0.5, 0, Aw - 0.4, 0), pl.arenito, 0.05, 0);
  for (const u of aoLongo(L, Math.round(L / 0.9), 0.3)) o.c.por("cantaria", noLado(bloco(0.22, 0.2, 0.2, 0, 0, 0.1), fr, u, Aw - 0.62), pl.arenito, 0.05, 0);
  // Escadaria de três degraus.
  for (let k = 0; k < 3; k++) o.c.por("cantaria", bloco(v.w + 2.6 - k * 0.5, 0.18 * (k + 1), 0.45, 0, 0, F / 2 + 1.25 - k * 0.42), "#b48a66", 0.06, 0.2);
  // Frontão escalonado com placa e pináculos nos cantos.
  parapeito(o.t, L, F, Aw, pl.parap, "pedra-vermelha", pl.parede, 0, "escalonado", { laje: pl.laje, coroa: pl.arenito });
  placa(o.c, "frente", L, F, 0, Aw + pl.parap + 0.08, Math.min(L * 0.38, 6), 0.6, "#2a1e16");
  for (const [sx, sz] of CANTOS) {
    const [x, z] = [sx * (L / 2 - 0.3), sz * (F / 2 - 0.3)];
    o.c.por("cantaria", bloco(0.6, 0.6, 0.6, x, Aw + pl.parap, z), pl.arenito, 0.05, 0);
    o.c.por("cantaria", cilindro(0.01, 0.32, 0.9, 4).translate(x, Aw + pl.parap + 0.6, z), pl.arenito, 0.05, 0);
  }
  if (p.id === "banco") {
    // O Banco de Araçuaí: relógio no frontão e lampiões de ferro no portal.
    o.c.por("pedra-vermelha", bloco(L * 0.16, 1.5, 0.32, 0, Aw + pl.parap + 0.85, F / 2 - 0.16), pl.parede, 0.07, 0);
    o.c.por("cantaria", cilindro(0.6, 0.6, 0.15, 12).rotateX(Math.PI / 2).translate(0, Aw + pl.parap + 1.65, F / 2 + 0.05), "#e8dcc0", 0.03, 0);
    o.c.por("ferro", bloco(0.05, 0.45, 0.05, 0, Aw + pl.parap + 1.55, F / 2 + 0.14), "#1e1c1a", 0.02, 0);
    for (const s of [-1, 1]) o.c.por("ferro", bloco(0.25, 0.5, 0.25, s * (v.w / 2 + 0.75), 2.6, F / 2 + 0.6), "#24221f", 0.02, 0);
  }
  if (p.entravel) {
    o.i.por("pedra-vermelha", bloco(L - 0.9, 0.06, F - 0.9, 0, 0.02, 0), "#6e3a2c", 0.08, 0);
    o.i.por("madeira", bloco(L * 0.7, 1.15, 0.6, 0, 0, -F * 0.12), "#4a2e1c", 0.06, 0);
    for (const u of aoLongo(L * 0.7, 4, 0.4)) o.i.por("ferro", bloco(0.04, 0.8, 0.04, u, 1.15, -F * 0.12), "#2c2a28", 0.02, 0);
    o.i.por("ferro", bloco(1.4, 2.0, 1.0, L / 2 - 1.4, 0, -F / 2 + 1.0), "#2a2a2c", 0.04, 0);
  }
  return fim(o);
}

/** Igreja de pedra vermelha: frontão curvo, torre com cúpula, contrafortes e cúpula sobre o altar. */
function igreja(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const { largura: L, fundo: F, altura: A } = p;
  const Aw = A - 0.8;
  const cf = 0.8;
  const Ln = L - cf * 2;
  const v = p.entravel ? vaoDeEntrar(Aw - 1.2) : { u: 0, w: 2.4, h: 3.2, arco: 1.2 };
  volume(o.c, Ln, F, Aw, "pedra-vermelha", pl.parede, 0.4, { vao: p.entravel ? v : undefined });
  const fr = frente(Ln, F);
  // Contrafortes escalonados ao longo da nave, dentro da planta.
  for (const u of aoLongo(F, Math.max(3, Math.floor(F / 4.5)), 1.5)) {
    for (const s of [-1, 1]) {
      o.c.por("pedra-vermelha", bloco(cf, Aw * 0.72, 1.0, s * (Ln / 2 + cf / 2), 0, -u), pl.parede, 0.08, 0.2);
      o.c.por("pedra-vermelha", bloco(cf * 0.55, Aw * 0.18, 1.0, s * (Ln / 2 + cf * 0.28), Aw * 0.72, -u), pl.parede, 0.08, 0);
    }
  }
  for (const f of ["esquerda", "direita"] as Face[]) {
    for (const u of aoLongo(F - 4, Math.max(2, Math.floor(F / 4.5) - 1), 1.5)) janelaFunda(o.c, { f, L: Ln, F }, u + (f === "esquerda" ? -2 : 2), Aw * 0.45, 0.8, 1.8, { arco: 0.4, moldura: pl.arenito, aro: 0.2, fundura: 0.3 });
  }
  // Portal de arenito e óculo no alto.
  o.c.por("cantaria", noLado(arqueada(v.w + 0.9, v.h + v.arco + 0.5, [v], 0.3), fr, 0, 0), pl.arenito, 0.05, 0);
  if (p.entravel) folhasAbertas(o.c, fr, v, "#3a2418");
  else o.c.por("madeira", noLado(perfil(v.w, v.h, v.arco, 0.06), fr, 0, 0), "#3a2418", 0.06, 0);
  const yo = Math.max(v.h + v.arco + 1.4, Aw - 1.1);
  o.c.por("cantaria", noLado(cilindro(0.85, 0.85, 0.2, 12).rotateX(Math.PI / 2), fr, 0, yo, 0.1), pl.arenito, 0.05, 0);
  o.c.por("vidro", noLado(cilindro(0.6, 0.6, 0.06, 12).rotateX(Math.PI / 2), fr, 0, yo, 0.22), "#18120e", 0.04, 0);
  // Frontão curvo acima da fachada, com cruz.
  const flecha = Math.min(3.2, Ln * 0.22);
  o.c.por("pedra-vermelha", frontaoCurvo(Ln, 0.9, flecha, 0.6).translate(0, Aw, F / 2 - 0.6), pl.parede);
  o.c.por("cantaria", bloco(Ln + 0.3, 0.3, 0.75, 0, Aw - 0.1, F / 2 - 0.35), pl.arenito, 0.05, 0);
  const yc = Aw + 0.9 + flecha;
  o.c.por("ferro", bloco(0.1, 1.4, 0.1, 0, yc, F / 2 - 0.3), "#2c2a28", 0.02, 0);
  o.c.por("ferro", bloco(0.7, 0.1, 0.1, 0, yc + 0.9, F / 2 - 0.3), "#2c2a28", 0.02, 0);
  // Torre (ou duas, se a igreja for larga) na frente, com sineira e cúpula.
  const lado = Math.max(3.2, L * 0.26);
  const alturaDaTorre = A + Math.max(6, L * 0.5);
  const cores = { pedra: pl.parede, arenito: pl.arenito, cupula: "#b88a62" };
  if (L >= 16 && r() < 0.5) for (const s of [-1, 1]) torreDePedra(o.c, s * (L / 2 - lado / 2), F / 2 - lado / 2, lado, alturaDaTorre, cores, "cupula");
  else torreDePedra(o.c, L / 2 - lado / 2, F / 2 - lado / 2, lado, alturaDaTorre, cores, "cupula");
  // Terraço da nave e cúpula sobre o altar.
  parapeito(o.t, Ln, F, Aw, 0.8, "pedra-vermelha", pl.parede, 0.4, "liso", { laje: pl.laje });
  const rd = Math.min(Ln * 0.3, 3.4);
  const zd = -F / 2 + rd + 1.2;
  o.t.por("pedra-vermelha", cilindro(rd, rd, 1.6, 12).translate(0, Aw, zd), pl.parede);
  o.t.por("cantaria", cilindro(rd + 0.15, rd + 0.15, 0.25, 12).translate(0, Aw + 1.6, zd), pl.arenito, 0.05, 0);
  o.t.por("terra", cupula(rd, 12, 5).translate(0, Aw + 1.85, zd), "#b88a62", 0.08, 0);
  o.t.por("pedra-vermelha", cilindro(0.35, 0.4, 0.9, 6).translate(0, Aw + 1.85 + rd * 0.97, zd), pl.parede, 0.06, 0);
  if (p.entravel) {
    o.i.por("pedra-vermelha", bloco(Ln - 1, 0.06, F - 1, 0, 0.02, 0), "#7a4232", 0.08, 0);
    for (let i = 0; i < Math.floor(F / 2.4) - 3; i++) {
      for (const s of [-1, 1]) o.i.por("madeira", bloco(Ln * 0.3, 0.5, 0.45, s * Ln * 0.22, 0, F / 2 - 3.5 - i * 2.2), "#5a3a22", 0.08, 0);
    }
    o.i.por("cantaria", bloco(Ln * 0.4, 1.3, 1.2, 0, 0, -F / 2 + 1.3), pl.arenito, 0.04, 0);
  }
  return fim(o);
}

/** Estação: alas baixas de pedra, pavilhão central mais alto com relógio, arcada da plataforma. */
function estacao(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const { largura: L, fundo: F, altura: A } = p;
  const Lc = Math.min(10, L * 0.36);
  const Ac = A - 0.8;
  const Aa = Math.max(3.6, A * 0.7 - 0.6);
  const Lw = (L - Lc) / 2 + 0.3;
  for (const s of [-1, 1]) {
    volume(o.c, Lw, F - 0.2, Aa, "pedra-vermelha", pl.parede, 0.4, { x: s * (L / 2 - Lw / 2), z: -0.1 });
    parapeito(o.c, Lw, F - 0.2, Aa, 0.6, "pedra-vermelha", pl.parede, 0.4, "liso", { x: s * (L / 2 - Lw / 2), z: -0.1, laje: pl.laje, coroa: pl.arenito });
    for (const u of aoLongo(Lw - 0.3, Math.max(1, Math.floor(Lw / 3.5)), 1.2)) {
      janelaFunda(o.c, frente(L, F - 0.2), s * (Lc / 2 + (Lw - 0.3) / 2) + u, 1.3, 0.9, 1.3, { arco: 0.45, moldura: pl.arenito, grade: { material: "madeira-escura", cor: MADEIRA_VELHA } });
    }
  }
  const va = vaoDeEntrar(Math.min(Ac, 4.4));
  volume(o.c, Lc, F, Ac, "pedra-vermelha", pl.parede, 0, { vao: p.entravel ? va : undefined });
  const fc = frente(Lc, F);
  if (p.entravel) aroDeEntrar(o.c, fc, Math.min(Ac, 4.4), pl);
  else portaFunda(o.c, fc, 0, 1.6, 2.6, 0.8, { folha: pl.folha, moldura: pl.arenito });
  cunhais(o.c, Lc, F, Ac, pl.arenito);
  for (const u of aoLongo(Lc, 2, 1.4)) janelaFunda(o.c, fc, u, Ac - 1.9, 0.8, 1.0, { arco: 0.4, moldura: pl.arenito });
  parapeito(o.t, Lc, F, Ac, 0.8, "pedra-vermelha", pl.parede, 0, "escalonado", { laje: pl.laje, coroa: pl.arenito });
  // Relógio no frontão do pavilhão e placa da estação.
  o.c.por("cantaria", cilindro(0.55, 0.55, 0.12, 12).rotateX(Math.PI / 2).translate(0, Ac + 0.95, F / 2 + 0.02), "#e8dcc0", 0.03, 0);
  o.c.por("ferro", bloco(0.05, 0.42, 0.05, 0, Ac + 0.8, F / 2 + 0.1), "#1e1c1a", 0.02, 0);
  placa(o.c, "frente", L, F + 5.6, 0, Math.min(Aa - 0.3, 4.2) + 0.25, Math.min(Lc * 0.7, 6), 0.55, "#2a1e16");
  // Arcada da plataforma de ponta a ponta (≤ 3 m para fora).
  portico(o, F, L, 2.8, Math.min(Aa - 0.3, 4.2), pl, p.entravel);
  // Caixa d'água de madeira sobre uma ala, para as locomotivas.
  const xa = (L / 2 - Lw / 2) * (r() < 0.5 ? -1 : 1);
  o.c.por("madeira", cilindro(1.3, 1.3, 1.8, 10).translate(xa, Aa + 0.1, -F * 0.15), "#6a5038", 0.1, 0);
  for (const y of [0.6, 1.4]) o.c.por("ferro", cilindro(1.34, 1.34, 0.08, 10).translate(xa, Aa + y, -F * 0.15), "#2c2a28", 0.02, 0);
  interior(o, p, r, true);
  return fim(o);
}

/** Galpão de adobe: grande arco de carga, contrafortes, respiros altos, terraço de vigas. */
function galpao(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const { largura: L, fundo: F, altura: A } = p;
  const Aw = A - 0.6;
  const cf = 0.6;
  const Ln = L - cf * 2;
  const mat: NomeMaterial = r() < 0.5 ? "terra" : "pedra-vermelha";
  const cor = mat === "terra" ? ADOBE[Math.floor(r() * ADOBE.length)] : pl.parede;
  const v = p.entravel ? vaoDeEntrar(Aw) : { u: 0, w: Math.min(4, Ln * 0.5), h: Math.min(3, Aw - 1.4), arco: Aw > 4.8 ? 1.4 : 0.8 };
  volume(o.c, Ln, F, Aw, mat, cor, 0.5, { vao: v });
  const fr = frente(Ln, F);
  o.c.por("cantaria", noLado(arqueada(v.w + 0.6, Math.min(Aw, v.h + v.arco + 0.3), [v], 0.18), fr, 0, 0), pl.arenito, 0.06, 0);
  if (p.entravel) folhasAbertas(o.c, fr, v, "#4a3222");
  else o.c.por("madeira-escura", noLado(perfil(v.w, v.h, v.arco, 0.05), fr, 0, 0), "#3a2a1c", 0.08, 0);
  for (const u of aoLongo(F, Math.max(2, Math.floor(F / 4)), 1)) {
    for (const s of [-1, 1]) o.c.por(mat, bloco(cf, Aw * 0.7, 0.9, s * (Ln / 2 + cf / 2), 0, u), cor, 0.08, 0.2);
  }
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
    const comp = f === "fundos" ? Ln : F;
    for (const u of aoLongo(comp, Math.max(1, Math.floor(comp / 4)), 1.5)) {
      if (f !== "fundos" && aoLongo(F, Math.max(2, Math.floor(F / 4)), 1).some((c) => Math.abs(c + u) < 1.0)) continue;
      janelaFunda(o.c, { f, L: Ln, F }, u, Aw - 1.3, 0.6, 0.5, { moldura: cor, materialDaMoldura: mat, aro: 0.12, grade: { material: "madeira-escura", cor: MADEIRA_VELHA } });
    }
  }
  parapeito(o.t, Ln, F, Aw, 0.6, mat, cor, 0.5, r() < 0.5 ? "liso" : "orelhas", { laje: pl.laje });
  for (const f of ["frente", "fundos"] as Face[]) vigas(o.t, { f, L: Ln, F }, Aw - 0.45, MADEIRA_VELHA, 1.2);
  // Fardos e sacaria encostados.
  for (let k = 0; k < 3; k++) o.c.por("lona", bloco(0.9, 0.5, 0.6, -Ln / 2 + 1 + k * 1.0, 0, F / 2 + 0.4), "#c8b48a", 0.12, 0.2);
  interior(o, p, r);
  return fim(o);
}

/** Oficina: galpão com chaminé de pedra; tinturaria e tecelagem estendem panos coloridos. */
function fabrica(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const base = galpao(p, pl, r);
  const o = novas(r);
  const { largura: L, fundo: F, altura: A } = p;
  const x = L / 2 - 1.4;
  o.c.por("pedra-vermelha", cilindro(0.55, 0.85, A * 1.9, 8).translate(x, 0, -F / 2 + 1.2), pl.parede, 0.1, 0.2);
  o.c.por("cantaria", cilindro(0.7, 0.7, 0.3, 8).translate(x, A * 1.9, -F / 2 + 1.2), pl.arenito, 0.05, 0);
  o.c.por("carvao", cilindro(0.5, 0.55, 0.05, 8).translate(x, A * 1.9 + 0.3, -F / 2 + 1.2), "#1c1a18", 0.02, 0);
  if (p.id === "tinturaria" || p.id === "tecelagem" || r() < 0.3) {
    // Varal de pano tingido na frente: urucum, anil, açafrão.
    const panos = ["#b8452c", "#2f4f86", "#d29a3c", "#7c3a5e", "#2f6e6e"];
    const w = Math.min(L - 1, 8);
    for (const s of [-1, 1]) o.c.por("madeira", bloco(0.1, 2.6, 0.1, (s * w) / 2, 0, F / 2 + 2.2), "#5a4028", 0.1, 0.2);
    o.c.por("madeira", bloco(w, 0.05, 0.05, 0, 2.55, F / 2 + 2.2), "#5a4028", 0.1, 0);
    const n = Math.max(3, Math.floor(w / 1.1));
    const h0 = Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const h = 1.3 + r() * 0.5;
      o.c.por("lona", bloco(w / n - 0.12, h, 0.02, -w / 2 + (i + 0.5) * (w / n), 2.55 - h, F / 2 + 2.2), panos[(i + h0) % panos.length], 0.1, 0);
    }
  }
  return { ...base, corpo: [...base.corpo, ...o.c.pecas()] };
}

/** Sítio, cavalariça: casa baixa de adobe com ramada de palha e cocho. */
function fazenda(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const pa: Plano = { ...pl, mat: "terra", parede: ADOBE[Math.floor(r() * ADOBE.length)], rc: 0.9, arcos: false };
  casaBase(o, p, pa, r);
  const { largura: L, fundo: F } = p;
  ramada(o.c, frente(L, F), 0, L * 0.85, 2.8, 2.6, { material: "palha", cor: "#a88a5a" });
  o.c.por("madeira", bloco(2.2, 0.5, 0.6, L / 2 - 1.6, 0, F / 2 + 2.3), "#5a4028", 0.12, 0.2);
  interior(o, p, r);
  return fim(o);
}

/** Moinho de vento numa torre redonda de pedra, cúpula de barro e velas de lona. */
function moinho(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const raio = Math.min(p.largura, p.fundo) / 2;
  const A = p.altura;
  o.c.por("pedra-vermelha", cilindro(raio * 0.72, raio, A, 12), pl.parede, 0.08, 0.25);
  o.c.por("cantaria", cilindro(raio * 0.78, raio * 0.78, 0.3, 12).translate(0, A, 0), pl.arenito, 0.05, 0);
  portaFunda(o.c, { f: "frente", L: raio * 1.9, F: raio * 1.9 }, 0, 1.1, 2.1, 0.55, { folha: pl.folha, moldura: pl.arenito });
  janelaFunda(o.c, { f: "frente", L: raio * 1.62, F: raio * 1.62 }, 0, A * 0.6, 0.5, 0.7, { arco: 0.25, moldura: pl.arenito });
  o.t.por("terra", cupula(raio * 0.78, 12, 4).translate(0, A + 0.3, 0), "#9a6a48", 0.1, 0);
  const giro = r() * Math.PI;
  const yc = A * 0.9;
  const zc = raio * 0.75 + 0.3;
  o.c.por("madeira", bloco(0.4, 0.4, 0.9, 0, yc - 0.2, zc), "#4a3222", 0.08, 0);
  for (let i = 0; i < 4; i++) {
    const ang = giro + (i * Math.PI) / 2;
    o.c.por("madeira", bloco(0.14, raio * 1.4, 0.1, 0, 0, 0).rotateZ(ang).translate(0, yc, zc + 0.5), "#5a4028", 0.1, 0);
    o.c.por("lona", bloco(raio * 0.38, raio * 1.1, 0.03, raio * 0.22, raio * 0.3, 0).rotateZ(ang).translate(0, yc, zc + 0.55), "#e0d2ae", 0.1, 0);
  }
  return fim(o);
}

/** Torre d'água em arcos (a cara do aqueduto): pilares vazados e cisterna de pedra em cima. */
function torreDagua(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const { largura: L, fundo: F, altura: A } = p;
  const Ab = A * 0.6;
  anel(o.c, 0, 0, 0, L, F, Ab, 0.7, (W) => [{ u: 0, w: W - 1.6, h: Ab - 0.8 - (W - 1.6) / 2, arco: (W - 1.6) / 2 }], "pedra-vermelha", pl.parede);
  o.c.por("cantaria", bloco(L + 0.3, 0.35, F + 0.3, 0, Ab, 0), pl.arenito, 0.05, 0);
  const At = A - Ab - 0.35 - 0.5;
  volume(o.c, L, F, At, "pedra-vermelha", pl.parede, 0.3, { y0: Ab + 0.35 });
  parapeito(o.c, L, F, Ab + 0.35 + At, 0.5, "pedra-vermelha", pl.parede, 0.3, "ameias", { laje: "#3a5a5a" });
  // Bica de madeira e a mancha da água escorrida.
  o.c.por("madeira-escura", noLado(bloco(0.25, 0.2, 1.2, 0, 0, 0.6), frente(L, F), L * 0.2, Ab + 1.0), MADEIRA_VELHA, 0.1, 0);
  o.c.por("pedra-vermelha", noLado(bloco(0.7, Ab + 1.0, 0.02, 0, 0, 0), frente(L, F), L * 0.2, 0), "#6e3424", 0.15, 0);
  if (r() < 0.7) escadaDeMao(o.c, { f: "direita", L, F }, 0, A - 0.5);
  return fim(o);
}

/** Barraca da Feira da Barganha: varas, lona listrada, balcão de tábua e potes. */
function tenda(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const { largura: L, fundo: F, altura: A } = p;
  for (const [sx, sz] of CANTOS) o.c.por("madeira", bloco(0.12, sz > 0 ? A - 0.5 : A, 0.12, sx * (L / 2 - 0.15), 0, sz * (F / 2 - 0.15)), "#5a4028", 0.12, 0.2);
  const n = Math.max(3, Math.round(L / 0.9));
  for (let i = 0; i < n; i++) {
    const w = L / n;
    const g = bloco(w, 0.04, Math.hypot(F, 0.5), 0, 0, 0).rotateX(Math.atan2(0.5, F)).translate(-L / 2 + (i + 0.5) * w, A - 0.25, 0);
    o.c.por("lona", g, pl.lonas[i % 2], 0.1, 0);
  }
  o.c.por("lona", bloco(L, 0.35, 0.02, 0, A - 0.85, F / 2 + 0.02), pl.lonas[1], 0.1, 0);
  o.c.por("madeira", bloco(L - 0.6, 0.9, 0.7, 0, 0, F / 2 - 0.6), "#6a4a30", 0.12, 0.2);
  o.c.por("lona", bloco(L - 0.5, 0.05, 0.9, 0, 0.9, F / 2 - 0.6), pl.lonas[0], 0.1, 0);
  for (let k = 0; k < 4; k++) pote(o.c, -L / 2 + 0.8 + k * ((L - 1.6) / 3), 0.95, F / 2 - 0.6, 0.35 + r() * 0.2, k % 2 ? "#a8623e" : "#7e4a30");
  for (let k = 0; k < 3; k++) o.c.por("palha", cilindro(0.35, 0.3, 0.5, 7).translate(-L / 2 + 0.7 + k * 0.8, 0, -F / 2 + 0.8), "#b39a64", 0.12, 0);
  return fim(o);
}

/** Ruína: paredes de pedra roídas, cantos redondos de pé e o arco da porta que sobrou. */
function ruina(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const { largura: L, fundo: F, altura: A } = p;
  const e = 0.55;
  const cor = pl.mat === "terra" ? pl.parede : "#9a5a44";
  const trecho = (w: number, d: number, x: number, z: number) => {
    const partes = Math.max(1, Math.round(Math.max(w, d) / 1.8));
    for (let i = 0; i < partes; i++) {
      if (r() < 0.2) continue;
      const h = A * (0.15 + r() * 0.65);
      const t = i / partes - 0.5 + 0.5 / partes;
      const [bx, bz] = w > d ? [x + t * w, z] : [x, z + t * d];
      o.c.por("pedra-vermelha", bloco(w > d ? w / partes : e, h, w > d ? e : d / partes, bx, 0, bz), cor, 0.15, 0.3);
    }
  };
  trecho(L - 2, e, 0, -F / 2 + e / 2);
  trecho(e, F - 2, -L / 2 + e / 2, 0);
  trecho(e, F - 2, L / 2 - e / 2, 0);
  for (const [sx, sz] of CANTOS) {
    if (r() < 0.25) continue;
    o.c.por("pedra-vermelha", cilindro(0.7, 0.75, A * (0.4 + r() * 0.6), 8).translate(sx * (L / 2 - 0.75), 0, sz * (F / 2 - 0.75)), cor, 0.15, 0.3);
  }
  const wa = Math.min(L * 0.55, 5.2);
  o.c.por("pedra-vermelha", arqueada(wa, A * 0.92, [{ u: 0, w: wa - 1.4, h: A * 0.92 - 0.6 - (wa - 1.4) / 2, arco: (wa - 1.4) / 2 }], e).translate(0, 0, F / 2 - e), cor, 0.12, 0.3);
  for (let i = 0; i < 7; i++) {
    const g = bloco(0.5 + r() * 0.8, 0.25 + r() * 0.4, 0.4 + r() * 0.7, 0, 0, 0).rotateY(r() * 3);
    o.c.por("pedra-vermelha", g.translate((r() - 0.5) * L * 0.7, 0, (r() - 0.5) * F * 0.7), cor, 0.15, 0);
  }
  interior(o, p, r);
  return fim(o);
}

/** Mercado Coberto: pavilhão aberto de arcos nos quatro lados, bancas dentro. */
function mercado(p: PredioLocal, pl: Plano, r: () => number): PecasDoPredio {
  const o = novas(r);
  const { largura: L, fundo: F, altura: A } = p;
  const Aw = A - 0.7;
  anel(o.c, 0, 0, 0, L, F, Aw, 0.6, (W, fr) => arcosAoLongo(W, Aw, { central: fr && p.entravel ? 4.4 : 0, pilar: 0.75, alvo: 2.6 }), "pedra-vermelha", pl.parede);
  o.c.por("cantaria", bloco(L + 0.12, 0.25, F + 0.12, 0, Aw - 0.6, 0), pl.arenito, 0.05, 0);
  parapeito(o.t, L, F, Aw, 0.7, "pedra-vermelha", pl.parede, 0, "ameias", { laje: pl.laje, coroa: pl.arenito });
  placa(o.c, "frente", L, F, 0, Aw + 0.75, L * 0.4, 0.5, "#2a1e16");
  for (const [s, zz] of CANTOS) {
    o.i.por("madeira", bloco(2.2, 0.9, 1.0, s * (L / 2 - 2.2), 0, zz * (F / 2 - 2.4)), "#6a4a30", 0.12, 0.2);
    o.i.por("lona", bloco(2.4, 0.06, 1.6, s * (L / 2 - 2.2), 2.4, zz * (F / 2 - 2.4)), LONA[Math.floor(r() * LONA.length)], 0.1, 0);
    pote(o.i, s * (L / 2 - 2.2), 0.92, zz * (F / 2 - 2.4), 0.45, "#a8623e");
  }
  o.i.por("pedra-vermelha", bloco(L - 1.2, 0.06, F - 1.2, 0, 0.02, 0), "#8a4a36", 0.12, 0);
  return fim(o);
}

/** Longe (nível 1): o mesmo volume, terraço e parapeito, a torre e o toldo que dá cor. */
function longe(p: PredioLocal, pl: Plano): PecasDoPredio {
  const c = new Obra(1);
  const t = new Obra(2);
  const { largura: L, fundo: F, altura: A } = p;
  const corpo = (Lx: number, Fz: number, H: number, x = 0, z = 0, y0 = 0, rc = pl.rc, mat = pl.mat, cor = pl.parede) => {
    if (rc > 0.05) {
      c.por(mat, bloco(Lx - rc * 1.2, H, Fz, x, y0, z), cor);
      c.por(mat, bloco(Lx, H, Fz - rc * 1.2, x, y0, z), cor);
    } else c.por(mat, bloco(Lx, H, Fz, x, y0, z), cor);
  };
  const terraco = (Lx: number, Fz: number, y: number, h: number, x = 0, z = 0, mat = pl.mat, cor = pl.parede) => {
    t.por("terra", bloco(Lx - 0.6, 0.1, Fz - 0.6, x, y, z), pl.laje, 0.08, 0);
    for (const s of [-1, 1]) {
      t.por(mat, bloco(Lx, h, 0.3, x, y, z + s * (Fz / 2 - 0.15)), cor, 0.06, 0);
      t.por(mat, bloco(0.3, h, Fz - 0.6, x + s * (Lx / 2 - 0.15), y, z), cor, 0.06, 0);
    }
  };
  const fim1 = (): PecasDoPredio => ({ corpo: c.pecas(), telhado: t.pecas(), interior: [] });
  switch (p.tipo) {
    case "tenda":
      c.por("lona", bloco(L, 0.15, F, 0, A - 0.4, 0), pl.lonas[0], 0.1, 0);
      c.por("madeira", bloco(L - 0.6, 0.9, 0.7, 0, 0, F / 2 - 0.6), "#6a4a30", 0.1, 0);
      return fim1();
    case "moinho": {
      const raio = Math.min(L, F) / 2;
      c.por("pedra-vermelha", cilindro(raio * 0.72, raio, A, 6), pl.parede);
      t.por("terra", cupula(raio * 0.78, 6, 2).translate(0, A, 0), "#9a6a48", 0.1, 0);
      for (const a of [0.4, 0.4 + Math.PI / 2]) c.por("lona", bloco(0.5, raio * 2.6, 0.05, 0, 0, 0).translate(0, -raio * 1.3, 0).rotateZ(a).translate(0, A * 0.9, raio + 0.6), "#e0d2ae", 0.08, 0);
      return fim1();
    }
    case "ruina":
      for (const s of [-1, 1]) c.por("pedra-vermelha", bloco(0.6, A * 0.5, F - 1, s * (L / 2 - 0.3), 0, 0), "#9a5a44", 0.12, 0.2);
      c.por("pedra-vermelha", bloco(L * 0.55, A * 0.9, 0.5, 0, 0, F / 2 - 0.25), "#9a5a44", 0.12, 0.2);
      return fim1();
    case "torre":
      for (const [sx, sz] of CANTOS) c.por("pedra-vermelha", bloco(0.8, A * 0.6, 0.8, sx * (L / 2 - 0.4), 0, sz * (F / 2 - 0.4)), pl.parede);
      corpo(L, F, A * 0.4 - 0.5, 0, 0, A * 0.6, 0, "pedra-vermelha");
      terraco(L, F, A - 0.5, 0.5, 0, 0, "pedra-vermelha");
      return fim1();
    case "igreja": {
      const Aw = A - 0.8;
      corpo(L - 1.6, F, Aw, 0, 0, 0, 0.4, "pedra-vermelha");
      terraco(L - 1.6, F, Aw, 0.8, 0, 0, "pedra-vermelha");
      const lado = Math.max(3.2, L * 0.26);
      const alt = A + Math.max(6, L * 0.5);
      c.por("pedra-vermelha", bloco(lado, alt, lado, L / 2 - lado / 2, 0, F / 2 - lado / 2), pl.parede);
      c.por("terra", cupula(lado * 0.4, 6, 2).translate(L / 2 - lado / 2, alt, F / 2 - lado / 2), "#b88a62", 0.08, 0);
      const rd = Math.min((L - 1.6) * 0.3, 3.4);
      t.por("pedra-vermelha", cilindro(rd, rd, 1.6, 8).translate(0, Aw, -F / 2 + rd + 1.2), pl.parede);
      t.por("terra", cupula(rd, 8, 3).translate(0, Aw + 1.6, -F / 2 + rd + 1.2), "#b88a62", 0.08, 0);
      return fim1();
    }
    case "estacao": {
      const Lc = Math.min(10, L * 0.36);
      const Aa = Math.max(3.6, A * 0.7 - 0.6);
      corpo(L, F - 0.2, Aa, 0, -0.1, 0, 0.4, "pedra-vermelha");
      terraco(L, F - 0.2, Aa, 0.6, 0, -0.1, "pedra-vermelha");
      c.por("pedra-vermelha", bloco(Lc, A - 0.8, F, 0, 0, 0), pl.parede);
      terraco(Lc, F, A - 0.8, 0.8, 0, 0, "pedra-vermelha");
      c.por("pedra-vermelha", bloco(L, Math.min(Aa - 0.3, 4.2), 0.5, 0, 0, F / 2 + 2.55), pl.parede);
      return fim1();
    }
    case "galpao":
    case "fabrica": {
      corpo(L - 1.2, F, A - 0.6, 0, 0, 0, 0.5);
      terraco(L - 1.2, F, A - 0.6, 0.6);
      if (p.tipo === "fabrica") c.por("pedra-vermelha", cilindro(0.55, 0.85, A * 1.9, 5).translate(L / 2 - 1.4, 0, -F / 2 + 1.2), pl.parede);
      return fim1();
    }
    default: {
      const casaDeTerraco = p.tipo === "casa" || p.tipo === "comercio" || p.tipo === "fazenda" || p.tipo === "saloon";
      const rc = p.tipo === "banco" || p.tipo === "publico" ? 0 : pl.rc;
      const Aw = casaDeTerraco ? pl.A0 : A - pl.parap;
      const mat = p.tipo === "fazenda" ? "terra" : pl.mat;
      const cor = p.tipo === "fazenda" ? ADOBE[0] : pl.parede;
      corpo(L, F, Aw, 0, 0, 0, rc, mat, cor);
      terraco(L, F, Aw, pl.sup ? 0.75 : pl.parap, 0, 0, mat, cor);
      if (pl.sup) {
        const s = pl.sup;
        corpo(s.L, s.F, s.A, s.x, s.z, Aw, pl.rc * 0.8, mat, cor);
        terraco(s.L, s.F, Aw + s.A, pl.parap, s.x, s.z, mat, cor);
      }
      if (p.tipo === "comercio") c.por("lona", bloco(Math.min(L - 0.8, 7.5), 0.1, 2.2, 0, 2.6, F / 2 + 1.1), pl.lonas[0], 0.08, 0);
      if (p.tipo === "fazenda") c.por("palha", bloco(L * 0.85, 0.15, 2.8, 0, 2.8, F / 2 + 1.4), "#a88a5a", 0.08, 0);
      if (p.tipo === "saloon" || p.tipo === "hotel") c.por(pl.mat, bloco(L, Math.min(Aw - 0.2, 4), 2.5, 0, 0, F / 2 + 1.25), pl.parede);
      if (p.tipo === "banco" || p.tipo === "publico") c.por("pedra-vermelha", bloco(L * 0.42, 0.45, 0.3, 0, A, F / 2 - 0.15), pl.parede);
      return fim1();
    }
  }
}

export function gerarPedraVermelha(p: PredioLocal, nivel: NivelPredio, semente: number): PecasDoPredio {
  const r = sorteio(semente);
  const pl = plano(p, r);
  if (nivel === 1) return longe(p, pl);
  if (p.id === "mercado") return mercado(p, pl, r);
  switch (p.tipo) {
    case "igreja":
      return igreja(p, pl, r);
    case "banco":
      return banco(p, pl, r);
    case "comercio":
      return comercio(p, pl, r);
    case "saloon":
      return saloon(p, pl, r);
    case "hotel":
      return hotel(p, pl, r);
    case "publico":
      return publico(p, pl, r);
    case "estacao":
      return estacao(p, pl, r);
    case "galpao":
      return galpao(p, pl, r);
    case "fabrica":
      return fabrica(p, pl, r);
    case "fazenda":
      return fazenda(p, pl, r);
    case "moinho":
      return moinho(p, pl, r);
    case "torre":
      return torreDagua(p, pl, r);
    case "tenda":
      return tenda(p, pl, r);
    case "ruina":
      return ruina(p, pl, r);
    default:
      return casa(p, pl, r);
  }
}

const estilo: Estilo = { id: "pedra-vermelha", nome: "Pedra vermelha do deserto (Araçuaí)", gerar: gerarPedraVermelha };

export default estilo;
