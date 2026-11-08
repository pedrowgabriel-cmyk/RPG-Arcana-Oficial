// Povo dos platôs (Celestes, antiga Varginha): gente expulsa em 1870 que reconstrói do jeito
// dela, sem nada do colonial português. Pedra empilhada a seco com cantos travados, madeira
// bruta, palha grossa em camadas (cone nas casas redondas, quatro águas nas compridas), lajes
// de pedra nos tetos planos que viram terraço, casas em degrau, varandas de tábua, varais e
// panos tingidos em todo canto. O Templo é um anel de pilares sob dois cones de palha com o
// óculo aberto para o céu, e o Mirante é a torre de troncos sobre pilares de pedra.

import * as THREE from "three";
import { sorteio } from "../../natureza/ferramentas";
import { aoLongo, bloco, empenas, naFace, Obra, telhado, type Face } from "../kit";
import type { Estilo, NivelPredio, PecasDoPredio, PredioLocal } from "../tipos";
import { ruina } from "./colonial";
import {
  cesto,
  cilindro,
  cinta,
  conePalha,
  degraus,
  entrada,
  escadaDeMao,
  escadaDeTabua,
  flamula,
  guardaCorpo,
  lenha,
  palha,
  paredeRedonda,
  paredesY,
  pedrasSoltas,
  pote,
  quinas,
  tom,
  tronco,
  vao,
  varal,
  viga,
  type Cores,
} from "./_platos-pecas";

const PEDRA = ["#8c7a64", "#80705d", "#947f68", "#867763", "#7a6a58", "#917a62"];
const LAJE = ["#6f685d", "#77705f", "#676055"];
const MADEIRA = ["#6e4f35", "#634732", "#78573a", "#5c432e"];
const PALHA = ["#b08d57", "#a6834e", "#bc9862", "#9f804f", "#ab8a58"];
const TECIDOS = ["#b4532f", "#2f4d78", "#d2a646", "#e6dcc4", "#5d8597", "#7c3b4f", "#a8402a", "#e9e2cf"];
const CEU = ["#e9e4d6", "#6d9ab3", "#3f6a8f", "#e8d9a6"];

const PORTA = { largura: 4.2, altura: 3 };
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function paleta(r: () => number): Cores {
  const de = (l: string[]) => l[Math.floor(r() * l.length)];
  const pedra = de(PEDRA);
  const escura = new THREE.Color(pedra).multiplyScalar(0.78);
  const pal = de(PALHA);
  const velha = new THREE.Color(pal).lerp(new THREE.Color("#6e6250"), 0.35);
  const t0 = Math.floor(r() * TECIDOS.length);
  return {
    pedra,
    pedraEscura: "#" + escura.getHexString(),
    laje: de(LAJE),
    madeira: de(MADEIRA),
    madeiraEscura: "#3f2e20",
    palha: pal,
    palhaVelha: "#" + velha.getHexString(),
    tecidos: [TECIDOS[t0], TECIDOS[(t0 + 3) % TECIDOS.length], TECIDOS[(t0 + 5) % TECIDOS.length], "#e6dcc4"],
  };
}

type Forma = "palhoca" | "redonda" | "laje" | "degraus";

/** A forma da casa sai do primeiro sorteio: perto e longe concordam. */
function formaDaCasa(p: PredioLocal, r: () => number): Forma {
  const x = r();
  const quadrada = Math.abs(p.largura - p.fundo) < 2.2;
  if (p.entravel) return quadrada && x < 0.4 ? "redonda" : "palhoca";
  if (quadrada && x < 0.3) return "redonda";
  if (x < 0.58) return "palhoca";
  if (x < 0.8 && p.fundo >= 7) return "degraus";
  return "laje";
}

const CANTOS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

// ---------------------------------------------------------------- casas

/** Casa comprida: embasamento de pedra, parede de tábua, palha de quatro águas em camadas. */
function palhoca(p: PredioLocal, r: () => number, c: Cores, extra: { alpendre?: boolean; portaLarga?: boolean } = {}): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(Math.floor(r() * 1e6));
  const t = new Obra(Math.floor(r() * 1e6));
  const vaoE = p.entravel ? PORTA : undefined;
  const hs = Math.min(A - 0.9, 1.1 + r() * 1.1);
  paredesY(obra, L, F, 0, hs, "pedra", c.pedra, vaoE);
  paredesY(obra, L - 0.16, F - 0.16, hs, A - hs, "madeira", c.madeira, vaoE);
  quinas(obra, L, F, 0, hs, c.pedra, r);
  cinta(obra, L, F, hs - 0.05, 0.2, "madeira", c.madeiraEscura, 0.04);
  cinta(obra, L, F, A - 0.3, 0.3, "madeira", c.madeiraEscura, 0.1);
  for (const [sx, sz] of CANTOS) obra.por("madeira", bloco(0.26, A - hs, 0.26, sx * (L / 2 - 0.1), hs, sz * (F / 2 - 0.1)), c.madeiraEscura, 0.1, 0);
  for (const f of ["frente", "esquerda", "direita"] as Face[]) pedrasSoltas(obra, f, L, F, 0, hs, f === "frente" ? 4 : 2, c.pedra, r);

  const largaDaPorta = p.entravel ? PORTA.largura : extra.portaLarga ? 2.4 : 1.15;
  const uPorta = p.entravel || extra.portaLarga ? 0 : (r() - 0.5) * L * 0.25;
  entrada(obra, "frente", L, F, uPorta, largaDaPorta, p.entravel ? PORTA.altura : 2.15, c, { aberta: p.entravel, cortina: c.tecidos[0] });
  for (const u of aoLongo(L, Math.max(2, Math.floor(L / 3.2)), 1.5)) {
    if (Math.abs(u - uPorta) < largaDaPorta / 2 + 1.2) continue;
    vao(obra, "frente", L, F, u, Math.max(1.0, hs - 0.4), 0.8, 0.85, c, r() < 0.5 ? { postigo: true } : { cortina: c.tecidos[1] });
  }
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
    if (r() < 0.35) continue;
    vao(obra, f, L, F, (r() - 0.5) * 2, Math.max(1.0, hs - 0.3), 0.7, 0.75, c, { postigo: r() < 0.5 });
  }

  const H = Math.min(L, F) * (0.5 + r() * 0.14);
  palha(t, "quatro-aguas", L, F, A, H, c, r, 2, 0.95);

  const alpendre = extra.alpendre ?? (p.entravel || r() < 0.55);
  if (alpendre) {
    const comp = Math.min(L - 0.6, Math.max(4.6, L * (0.6 + r() * 0.3)));
    const prof = 2.0;
    obra.por("madeira", bloco(comp, 0.28, prof, 0, 0, F / 2 + prof / 2), c.madeira, 0.1, 0.3);
    for (const u of aoLongo(comp, Math.max(2, Math.round(comp / 2.6)), 0.25)) {
      if (p.entravel && Math.abs(u) < PORTA.largura / 2 + 0.2) continue;
      obra.por("madeira", bloco(0.22, A - 0.9, 0.22, u, 0.28, F / 2 + prof - 0.2), c.madeiraEscura, 0.1, 0);
    }
    obra.por("madeira", bloco(comp, 0.2, 0.2, 0, A - 0.72, F / 2 + prof - 0.2), c.madeiraEscura, 0.1, 0);
    for (const g of telhado("uma-agua", comp, prof, 0, 0.55, 0.35, 0.3)) t.por("palha", g.translate(0, A - 0.55, F / 2 + prof / 2), tom(c.palha, r), 0.14, 0);
    degraus(obra, "frente", L, F, 0, 1.6, 0.28, 0.4, c.pedra, r, 0, prof);
  } else {
    degraus(obra, "frente", L, F, uPorta, largaDaPorta + 0.6, 0.3, 0.45, c.pedra, r);
  }

  if (r() < 0.45) obra.por("pedra", bloco(0.9, A + H * 0.75, 0.9, L / 2 - 1.0, 0, -F / 2 + 0.9), tom(c.pedraEscura, r), 0.12, 0);
  if (r() < 0.5) lenha(obra, r() < 0.5 ? "esquerda" : "direita", L, F, (r() - 0.5) * 2, c, r);
  if (r() < 0.5) varal(obra, [-L / 2 + 0.3, F / 2 + 2.6], [-L / 2 + 0.3 + 2.6 + r() * 1.5, F / 2 + 2.7], 0, 1.9, c, r);
  pote(obra, uPorta + largaDaPorta / 2 + 0.7, F / 2 + (alpendre ? 2.4 : 0.5), r);
  if (r() < 0.6) cesto(obra, uPorta - largaDaPorta / 2 - 0.7, F / 2 + (alpendre ? 2.4 : 0.5), c, r);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r) };
}

/** Casa redonda: pedra em fiadas, cinta de madeira, cone de palha com topete. */
function redonda(p: PredioLocal, r: () => number, c: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const R = Math.min(L, F) / 2 - 0.15;
  const obra = new Obra(Math.floor(r() * 1e6));
  const t = new Obra(Math.floor(r() * 1e6));
  obra.por("pedra", cilindro(R + 0.25, 0.45, 14, 0, 0, 0, true), c.pedraEscura, 0.1, 0.3);
  if (p.entravel) paredeRedonda(obra, R, 0, A, 0.45, 16, "pedra", c.pedra, r, PORTA.largura);
  else obra.por("pedra", cilindro(R, A, 14, 0, 0, 0), c.pedra, 0.1);
  for (const y of [0.95, 1.9]) if (y < A - 0.8) obra.por("pedra", cilindro(R + 0.05, 0.14, 14, 0, y, 0), c.pedraEscura, 0.1, 0);
  obra.por("madeira", cilindro(R + 0.08, 0.28, 14, 0, A - 0.3, 0), c.madeiraEscura, 0.1, 0);
  const D = R * 2;
  entrada(obra, "frente", D, D, 0, p.entravel ? PORTA.largura : 1.1, p.entravel ? PORTA.altura : 2.1, c, { aberta: p.entravel, cortina: c.tecidos[0] });
  degraus(obra, "frente", D, D, 0, p.entravel ? 5 : 1.8, 0.3, 0.45, c.pedra, r);
  for (const f of ["esquerda", "direita"] as Face[]) if (r() < 0.75) vao(obra, f, D, D, (r() - 0.5) * 1.2, 1.1, 0.65, 0.7, c, { cortina: c.tecidos[2] });
  conePalha(t, R + 1.05, A, R * 1.15 + 0.8, c, r, R > 3.5 ? 3 : 2, 14);
  // Banco de tora encostado e o varal de lado.
  obra.por("madeira", bloco(1.6, 0.42, 0.45, 0, 0, 0).rotateY(-0.5).translate(R * 0.55 + 0.6, 0, R * 0.9 + 0.3), c.madeira, 0.1, 0.2);
  if (r() < 0.6) varal(obra, [-R - 0.4, R * 0.6 + 1.6], [-R + 2.6, R + 2.4], 0, 1.9, c, r);
  else lenha(obra, "direita", D, D, 0, c, r);
  pote(obra, -1.0, R + 0.9, r);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r) };
}

/** Teto de laje: pedra até em cima, lajes sobrepostas, terraço com sombra de lona e escada de mão. */
function casaLaje(p: PredioLocal, r: () => number, c: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(Math.floor(r() * 1e6));
  const t = new Obra(Math.floor(r() * 1e6));
  paredesY(obra, L, F, 0, A, "pedra", c.pedra);
  quinas(obra, L, F, 0, A, c.pedra, r);
  for (const f of ["frente", "esquerda", "direita", "fundos"] as Face[]) pedrasSoltas(obra, f, L, F, 0, A, f === "frente" ? 6 : 3, c.pedra, r);
  const uPorta = (r() - 0.5) * L * 0.3;
  entrada(obra, "frente", L, F, uPorta, 1.15, 2.15, c, { cortina: c.tecidos[0] });
  degraus(obra, "frente", L, F, uPorta, 1.8, 0.3, 0.45, c.pedra, r);
  for (const u of aoLongo(L, Math.max(2, Math.floor(L / 3.2)), 1.5)) {
    if (Math.abs(u - uPorta) < 1.8) continue;
    vao(obra, "frente", L, F, u, 1.2, 0.75, 0.8, c, { verga: "pedra", cortina: r() < 0.6 ? c.tecidos[1] : undefined });
  }
  for (const f of ["esquerda", "direita"] as Face[]) if (r() < 0.6) vao(obra, f, L, F, 0, 1.3, 0.6, 0.6, c, { verga: "pedra" });
  // Lajes: uma base larga e placas soltas por cima, cada uma num tom.
  t.por("pedra", bloco(L + 0.6, 0.22, F + 0.6, 0, A, 0), c.laje, 0.08, 0);
  const nx = Math.max(2, Math.round(L / 3));
  const nz = Math.max(2, Math.round(F / 3));
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const w = (L + 0.3) / nx - 0.08;
      const d = (F + 0.3) / nz - 0.08;
      t.por("pedra", bloco(w, 0.12, d, -L / 2 - 0.15 + (i + 0.5) * (w + 0.08), A + 0.22, -F / 2 - 0.15 + (k + 0.5) * (d + 0.08)), tom(c.laje, r, 0.14), 0.08, 0);
    }
  }
  // Mureta de pedra no fundo e nos lados do terraço.
  t.por("pedra", bloco(L, 0.5, 0.4, 0, A + 0.34, -F / 2 + 0.2), tom(c.pedra, r), 0.1, 0);
  for (const s of [-1, 1]) t.por("pedra", bloco(0.4, 0.5, F * 0.6, s * (L / 2 - 0.2), A + 0.34, -F * 0.2), tom(c.pedra, r), 0.1, 0);
  // Sombra de lona em quatro paus.
  const [sw, sd] = [Math.min(4, L * 0.45), Math.min(3, F * 0.4)];
  const sx = (r() < 0.5 ? -1 : 1) * (L / 2 - sw / 2 - 0.5);
  for (const [px, pz] of CANTOS) t.por("madeira", bloco(0.1, 2.1, 0.1, sx + (px * sw) / 2, A + 0.34, -F / 2 + 0.6 + sd / 2 + (pz * sd) / 2), c.madeiraEscura, 0.1, 0);
  t.por("lona", bloco(sw + 0.3, 0.04, sd + 0.3, 0, 0, 0).rotateX(0.06).translate(sx, A + 2.44, -F / 2 + 0.6 + sd / 2), c.tecidos[(r() * 3) | 0], 0.12, 0);
  if (r() < 0.7) varal(t, [-sx * 0.2 - 1.5, F / 2 - 1.2], [-sx * 0.2 + 1.5, F / 2 - 1.0], A + 0.34, 1.6, c, r);
  // Escada de mão para o terraço e bica de madeira.
  const ex = (sx > 0 ? -1 : 1) * (L / 2 - 0.7);
  escadaDeMao(obra, V(ex, 0, F / 2 + 1.5), V(ex, A + 1.1, F / 2 + 0.1), 0.55, c);
  t.por("madeira", bloco(0.2, 0.14, 0.9, -ex * 0.4, A + 0.1, F / 2 + 0.6), c.madeiraEscura, 0.1, 0);
  pote(obra, uPorta + 1.3, F / 2 + 0.5, r);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

/** Casa em degrau: corpo da frente baixo com teto-terraço, corpo de trás num socalco mais alto. */
function casaDegraus(p: PredioLocal, r: () => number, c: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(Math.floor(r() * 1e6));
  const t = new Obra(Math.floor(r() * 1e6));
  const Fr = F * (0.5 + r() * 0.1);
  const Ff = F - Fr;
  const [zr, zf] = [-F / 2 + Fr / 2, F / 2 - Ff / 2];
  const ht = 0.9 + r() * 0.5;
  const Af = Math.max(2.3, A - 1.3);
  const topoTras = Math.max(A + 0.4, Af + 2.6);
  // Socalco de pedra e o corpo de trás (madeira ou pedra).
  obra.por("pedra", bloco(L, ht, Fr, 0, 0, zr), c.pedraEscura, 0.1, 0.3);
  const madeiraAtras = r() < 0.6;
  paredesY(obra, L - 0.3, Fr - 0.3, ht, topoTras - ht, madeiraAtras ? "madeira" : "pedra", madeiraAtras ? c.madeira : c.pedra, undefined, zr);
  cinta(obra, L - 0.3, Fr - 0.3, topoTras - 0.3, 0.3, "madeira", c.madeiraEscura, 0.1, zr);
  quinas(obra, L, Fr, 0, ht, c.pedra, r, zr);
  // Corpo da frente, todo de pedra.
  paredesY(obra, L, Ff, 0, Af, "pedra", c.pedra, undefined, zf);
  quinas(obra, L, Ff, 0, Af, c.pedra, r, zf);
  pedrasSoltas(obra, "frente", L, Ff, 0, Af, 5, c.pedra, r, zf);
  const uPorta = L * 0.18;
  entrada(obra, "frente", L, Ff, uPorta, 1.1, 2.05, c, { dz: zf, cortina: c.tecidos[0] });
  vao(obra, "frente", L, Ff, L / 2 - 1.0, 1.0, 0.7, 0.75, c, { dz: zf, verga: "pedra" });
  // Porta de cima abre para o terraço; janela com postigo.
  entrada(obra, "frente", L - 0.3, Fr - 0.3, -L * 0.15, 1.0, 1.95, c, { dz: zr, y: Af + 0.3, cortina: c.tecidos[1] });
  vao(obra, "frente", L - 0.3, Fr - 0.3, L * 0.22, Af + 1.2, 0.7, 0.7, c, { dz: zr, postigo: true });
  // Terraço: laje, guarda-corpo, varal.
  t.por("pedra", bloco(L + 0.3, 0.25, Ff + 0.3, 0, Af, zf + 0.15), c.laje, 0.1, 0);
  guardaCorpo(t, [-L / 2, F / 2 + 0.1], [L / 2, F / 2 + 0.1], Af + 0.25, c);
  for (const s of [-1, 1]) guardaCorpo(t, [s * L * 0.5, F / 2 + 0.1], [s * L * 0.5, F / 2 - Ff + 0.3], Af + 0.25, c);
  if (r() < 0.7) varal(t, [L * 0.1, zf + 0.2], [L * 0.45, zf - 0.4], Af + 0.25, 1.6, c, r);
  escadaDeTabua(obra, -L / 2 + 0.4, F / 2 + 0.6, Af + 0.25, 1, c);
  palha(t, "quatro-aguas", L - 0.3, Fr - 0.3, topoTras, Math.min(L, Fr) * 0.55, c, r, 2, 0.8, zr);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

// ---------------------------------------------------------------- interiores

function interior(p: PredioLocal, c: Cores, r: () => number, comprido = false) {
  if (!p.entravel) return [];
  const { largura: L, fundo: F } = p;
  const obra = new Obra(3);
  obra.por("pedra", bloco(L - 0.8, 0.06, F - 0.8, 0, 0.0, 0), "#6c6152", 0.1, 0);
  obra.por("lona", bloco(Math.min(4, L * 0.35), 0.03, Math.min(3, F * 0.3), -L * 0.18, 0.06, -F * 0.12), c.tecidos[1], 0.1, 0);
  if (comprido) {
    // Mesas compridas e bancos de tábua (refeitório).
    for (const x of [-L * 0.22, L * 0.22]) {
      obra.por("madeira", bloco(1.0, 0.78, F * 0.55, x, 0, 0), c.madeira, 0.08, 0);
      for (const s of [-1, 1]) obra.por("madeira", bloco(0.35, 0.45, F * 0.55, x + s * 0.85, 0, 0), c.madeiraEscura, 0.08, 0);
    }
  } else {
    // Fogo no chão cercado de pedras, toras de sentar em volta.
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      obra.por("pedra", bloco(0.35, 0.22, 0.3, 0, 0, 0).rotateY(a).translate(Math.sin(a) * 0.7, 0.04, Math.cos(a) * 0.7 - F * 0.05), tom(c.pedra, r), 0.1, 0);
    }
    obra.por("madeira-escura", bloco(0.8, 0.1, 0.8, 0, 0.06, -F * 0.05), "#2a1f18", 0.1, 0);
    for (const a of [0.9, 2.4, 4.0, 5.4]) obra.por("madeira", bloco(1.4, 0.4, 0.4, 0, 0, 0).rotateY(a + Math.PI / 2).translate(Math.sin(a) * 2.0, 0.04, Math.cos(a) * 2.0 - F * 0.05), c.madeira, 0.1, 0);
  }
  // Prateleira de tábua no fundo, com potes.
  obra.por("madeira", bloco(L * 0.5, 0.08, 0.5, 0, 1.4, -F / 2 + 0.75), c.madeira, 0.08, 0);
  for (const x of [-L * 0.15, 0, L * 0.12]) obra.por("tijolo", cilindro(0.16, 0.35, 6, x, 1.48, -F / 2 + 0.75, true, 0.11), "#8f5a3c", 0.1, 0);
  return obra.pecas();
}

// ---------------------------------------------------------------- canônicos e tipos grandes

/** Templo: socalcos redondos, anel de pilares de pedra, palha em dois cones com óculo para o céu. */
function templo(p: PredioLocal, r: () => number, c: Cores, nivel: NivelPredio): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const R = Math.min(L, F) / 2 - 0.2;
  const Ri = R - 1.7;
  const Hp = Math.max(3.6, A * 0.42);
  const obra = new Obra(201);
  const t = new Obra(202);
  const rTopo = Ri * 0.5;
  const topo = Hp + 11;
  if (nivel === 1) {
    obra.por("pedra", cilindro(R, 0.9, 10, 0, 0, 0, true), c.pedraEscura, 0.1, 0);
    obra.por("pedra", cilindro(Ri, Hp, 10, 0, 0, 0), c.pedra, 0.1, 0);
    for (const g of tronco(Ri + 1.8, rTopo, 2.1, 10, Hp + 0.6, 0.3, true)) t.por("palha", g, c.palha, 0.1, 0);
    obra.por("madeira", cilindro(rTopo, 1.0, 8, 0, Hp + 2.5, 0), c.madeiraEscura, 0.1, 0);
    for (const g of tronco(rTopo + 1.0, 0.75, 3.3, 10, Hp + 3.5, 0.3, true)) t.por("palha", g, c.palhaVelha, 0.1, 0);
    obra.por("madeira", bloco(0.25, topo - Hp, 0.25, 0, Hp, 0), c.madeiraEscura, 0.1, 0);
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  // Dois socalcos baixos de pedra, abertos na frente.
  paredeRedonda(obra, R, 0, 0.6, 0.8, 18, "pedra", c.pedraEscura, r, PORTA.largura + 0.6);
  paredeRedonda(obra, R - 0.8, 0, 1.2, 0.7, 16, "pedra", c.pedra, r, PORTA.largura + 0.2);
  // Anel de pilares de pedra empilhada (três pedras cada, nenhuma igual).
  const nPil = 12;
  for (let k = 0; k < nPil; k++) {
    const a = (k / nPil) * Math.PI * 2;
    const [x, z] = [Math.sin(a) * Ri, Math.cos(a) * Ri];
    if (z > 0 && Math.abs(x) < PORTA.largura / 2 + 0.5) continue;
    let y = 0;
    for (let i = 0; i < 3; i++) {
      const h = Hp / 3;
      const w = 0.95 - i * 0.1 + r() * 0.12;
      obra.por("pedra", bloco(w, h - 0.04, w, 0, 0, 0).rotateY(a + (r() - 0.5) * 0.3).translate(x, y, z), tom(c.pedra, r, 0.14), 0.1, 0.1);
      y += h;
    }
    obra.por("pedra", bloco(1.2, 0.2, 1.2, 0, 0, 0).rotateY(a).translate(x, Hp - 0.05, z), c.laje, 0.08, 0);
  }
  // Cinta redonda de madeira sobre os pilares.
  paredeRedonda(obra, Ri + 0.3, Hp + 0.15, 0.45, 0.5, 14, "madeira", c.madeiraEscura, r);
  // Saia de palha, tambor de esteios (a luz entra por entre eles), cone alto com óculo aberto.
  tronco(Ri + 1.8, rTopo, 2.1, 16, Hp + 0.6, 0.45).forEach((g, k) => t.por("palha", g, k ? c.palhaVelha : c.palha, 0.14, 0));
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    t.por("madeira", bloco(0.2, 1.1, 0.2, Math.sin(a) * rTopo, Hp + 2.4, Math.cos(a) * rTopo), c.madeiraEscura, 0.1, 0);
  }
  for (const g of tronco(rTopo + 1.0, 0.75, 3.3, 14, Hp + 3.5, 0.4)) t.por("palha", g, tom(c.palha, r), 0.14, 0);
  paredeRedonda(t, 0.85, Hp + 6.75, 0.3, 0.25, 8, "madeira", c.madeiraEscura, r);
  // Mastro pelo óculo, aro do céu no alto e fitas compridas.
  obra.por("madeira", cilindro(0.16, topo, 6, 0, 0, 0, false, 0.1), c.madeiraEscura, 0.1, 0);
  const passo = (Math.PI * 2) / 14;
  for (let k = 0; k < 14; k++) {
    const [a, b] = [k * passo, (k + 1) * passo];
    obra.por("madeira", viga(V(Math.sin(a) * 1.3, topo - 1.3 + Math.cos(a) * 1.3, 0), V(Math.sin(b) * 1.3, topo - 1.3 + Math.cos(b) * 1.3, 0), 0.12), "#b9925a", 0.06, 0);
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    const comp = 3 + r() * 2;
    obra.por("lona", bloco(0.22, comp, 0.02, 0, -comp, 0).rotateX(0.12).rotateY(a).translate(Math.sin(a) * 0.3, topo - 2.6, Math.cos(a) * 0.3), CEU[k % CEU.length], 0.1, 0);
  }
  // Escadaria de pedra, dois marcos de pedra e dois mastros de pano ladeando a entrada.
  degraus(obra, "frente", 2 * R, 2 * R, 0, PORTA.largura + 1.4, 0.6, 0.45, c.pedra, r);
  for (const s of [-1, 1]) flamula(obra, s * (L / 2 - 0.8), F / 2 - 0.6, A + 1.5, CEU[s > 0 ? 1 : 2], c, r, 5);
  for (const s of [-1, 1]) obra.por("pedra", bloco(1.0, 2.4 + r() * 0.6, 0.6, s * (PORTA.largura / 2 + 1.6), 0, R + 0.4), tom(c.pedraEscura, r), 0.12, 0.1);
  // Dentro: piso de lajes, bancos em anel e a bacia d'água que espelha o céu sob o óculo.
  const dentro = new Obra(203);
  if (p.entravel) {
    dentro.por("pedra", cilindro(R - 1.5, 0.08, 16, 0, 0, 0, true), "#7a705f", 0.1, 0);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      if (Math.cos(a) > 0.7) continue;
      dentro.por("madeira", bloco(2.0, 0.45, 0.5, 0, 0, 0).rotateY(a + Math.PI / 2).translate(Math.sin(a) * (Ri - 1.2), 0, Math.cos(a) * (Ri - 1.2)), c.madeira, 0.1, 0);
    }
    for (let i = 0; i < 3; i++) dentro.por("pedra", cilindro(1.6 - i * 0.35, 0.25, 12, 0, i * 0.25, 0, true), tom(c.laje, r), 0.08, 0);
    dentro.por("agua", cilindro(0.7, 0.05, 12, 0, 0.75, 0, true), "#6d9ab3", 0.02, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

/** Mirante: pilares de pedra empilhada, esteios de tronco com mãos-francesas, dois pisos e cone de palha. */
function mirante(p: PredioLocal, r: () => number, c: Cores, nivel: NivelPredio): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(301);
  const t = new Obra(302);
  const [hx, hz] = [L / 2 - 0.8, F / 2 - 0.8];
  const yPiso = A - 3.4;
  const yMeio = yPiso / 2 + 1.2;
  if (nivel === 1) {
    for (const [sx, sz] of CANTOS) obra.por("madeira", bloco(0.5, yPiso, 0.5, sx * hx, 0, sz * hz), c.madeiraEscura, 0.1, 0);
    obra.por("madeira", bloco(L, 1.2, F, 0, yPiso, 0), c.madeira, 0.1, 0);
    for (const g of tronco(Math.max(L, F) * 0.68, 0, 3.8, 8, yPiso + 2.7, 0.3, true)) t.por("palha", g, c.palha, 0.1, 0);
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  for (const [sx, sz] of CANTOS) {
    let y = 0;
    for (let i = 0; i < 4; i++) {
      const w = 1.5 - i * 0.12 + r() * 0.1;
      obra.por("pedra", bloco(w, 0.6, w, sx * hx + (r() - 0.5) * 0.08, y, sz * hz), tom(c.pedra, r, 0.14), 0.1, 0.2);
      y += 0.6;
    }
    obra.por("madeira", bloco(0.42, A - 2.4, 0.42, sx * hx, 2.4, sz * hz), c.madeiraEscura, 0.1, 0);
  }
  // Mãos-francesas em X em cada lado (a frente fica livre embaixo para entrar).
  for (const [f, y0, y1] of [
    ["fundos", 2.4, yMeio],
    ["esquerda", 2.4, yMeio],
    ["direita", 2.4, yMeio],
    ["frente", yMeio, yPiso],
    ["fundos", yMeio, yPiso],
    ["esquerda", yMeio, yPiso],
    ["direita", yMeio, yPiso],
  ] as [Face, number, number][]) {
    const fz = f === "frente" ? hz : f === "fundos" ? -hz : 0;
    const fx = f === "direita" ? hx : f === "esquerda" ? -hx : 0;
    const [a, b] = fx === 0 ? [V(-hx, y0, fz), V(hx, y1, fz)] : [V(fx, y0, -hz), V(fx, y1, hz)];
    obra.por("madeira", viga(a, b, 0.18), c.madeira, 0.1, 0);
    obra.por("madeira", viga(a.clone().setY(y1), b.clone().setY(y0), 0.18), c.madeira, 0.1, 0);
  }
  // Piso do meio e piso de cima, com guarda-corpo e panos.
  obra.por("madeira", bloco(hx * 2 + 0.6, 0.2, hz * 2 + 0.6, 0, yMeio, 0), c.madeira, 0.1, 0);
  obra.por("madeira", bloco(L, 0.3, F, 0, yPiso, 0), c.madeira, 0.1, 0);
  const borda: [number, number][] = [
    [-L / 2, F / 2],
    [L / 2, F / 2],
    [L / 2, -F / 2],
    [-L / 2, -F / 2],
  ];
  borda.forEach((a, i) => guardaCorpo(obra, a, borda[(i + 1) % 4], yPiso + 0.3, c, 1.0));
  for (let i = 0; i < 3; i++) obra.por("lona", bloco(1.0, 0.9, 0.03, -L / 3 + (i * L) / 3, yPiso - 0.6, F / 2 + 0.04), c.tecidos[i % c.tecidos.length], 0.1, 0);
  // Escadas de mão: chão ao piso do meio, piso do meio ao de cima.
  escadaDeMao(obra, V(-hx + 1.0, 0, -hz + 1.6), V(-hx + 1.0, yMeio + 0.2, -hz + 0.5), 0.6, c);
  escadaDeMao(obra, V(hx - 1.0, yMeio + 0.2, hz - 1.6), V(hx - 1.0, yPiso + 0.3, hz - 0.5), 0.6, c);
  // Cobertura: quatro esteios curtos e cone de palha largo, com flâmula no pináculo.
  for (const [sx, sz] of CANTOS) obra.por("madeira", bloco(0.25, 2.4, 0.25, sx * (L / 2 - 0.3), yPiso + 0.3, sz * (F / 2 - 0.3)), c.madeiraEscura, 0.1, 0);
  conePalha(t, Math.max(L, F) * 0.66, yPiso + 2.7, 3.8, c, r, 2, 12);
  t.por("lona", bloco(0.5, 2.4, 0.03, 0, 0, 0).rotateZ(0.3).translate(0.3, yPiso + 7.0, 0), CEU[1], 0.1, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

/** Salão (Casa de Reunião, Conselho, Cura): pedra alta, frestas de luz, palha grande, alpendre de esteios. */
function salao(p: PredioLocal, r: () => number, c: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(401);
  const t = new Obra(402);
  const vaoE = p.entravel ? PORTA : undefined;
  const hs = Math.min(A - 1.4, 2.6);
  paredesY(obra, L, F, 0, hs, "pedra", c.pedra, vaoE);
  paredesY(obra, L - 0.2, F - 0.2, hs, A - hs, "madeira", c.madeira, vaoE);
  quinas(obra, L, F, 0, hs, c.pedra, r);
  cinta(obra, L, F, hs - 0.05, 0.22, "madeira", c.madeiraEscura, 0.05);
  cinta(obra, L, F, A - 0.35, 0.35, "madeira", c.madeiraEscura, 0.12);
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
    pedrasSoltas(obra, f, L, F, 0, hs, 4, c.pedra, r);
    const comp = f === "frente" || f === "fundos" ? L : F;
    // Frestas altas na madeira: a luz entra por cima, o vento do platô não.
    for (const u of aoLongo(comp, Math.floor(comp / 2.2), 1.2)) {
      if (f === "frente" && Math.abs(u) < PORTA.largura / 2 + 0.8) continue;
      obra.por("madeira-escura", naFace(bloco(0.9, 0.5, 0.05, 0, 0, 0.01), f, L, F, u, A - 1.1), "#1d1611", 0.03, 0);
    }
  }
  entrada(obra, "frente", L, F, 0, p.entravel ? PORTA.largura : 2.4, p.entravel ? PORTA.altura : 2.6, c, { aberta: p.entravel, cortina: c.tecidos[0] });
  for (const u of [-L * 0.32, L * 0.32]) vao(obra, "frente", L, F, u, 1.1, 0.9, 1.0, c, { verga: "pedra", cortina: c.tecidos[1] });
  const H = Math.min(L, F) * 0.48;
  palha(t, "quatro-aguas", L, F, A, H, c, r, 3, 1.1);
  // Respiro da fumaça: telhadinho de palha sobre a cumeeira.
  const lr = Math.abs(L - F) * 0.5 + 1.2;
  for (const g of telhado("duas-aguas", lr, 1.4, A + H + 0.35, 0.8, 0.3, 0.2)) t.por("palha", g, c.palhaVelha, 0.12, 0);
  t.por("madeira-escura", bloco(lr, 0.5, 1.0, 0, A + H - 0.2, 0), "#1d1611", 0.03, 0);
  // Alpendre: esteios com capitel de pedra, cobertura de palha, panos entre os esteios.
  const prof = 2.6;
  const comp = L - 1.0;
  obra.por("pedra", bloco(comp, 0.35, prof, 0, 0, F / 2 + prof / 2), c.laje, 0.1, 0.3);
  const us = aoLongo(comp, Math.max(4, Math.round(comp / 3)), 0.3);
  for (const u of us) {
    if (Math.abs(u) < PORTA.largura / 2 + 0.25) continue;
    obra.por("madeira", bloco(0.3, A - 1.25, 0.3, u, 0.35, F / 2 + prof - 0.25), c.madeiraEscura, 0.1, 0);
    obra.por("pedra", bloco(0.5, 0.3, 0.5, u, A - 1.2, F / 2 + prof - 0.25), c.laje, 0.08, 0);
  }
  obra.por("madeira", bloco(comp, 0.28, 0.3, 0, A - 0.9, F / 2 + prof - 0.25), c.madeiraEscura, 0.1, 0);
  us.slice(0, -1).forEach((u, i) => {
    const meio = (u + us[i + 1]) / 2;
    if (Math.abs(meio) < PORTA.largura / 2 + 0.4) return;
    obra.por("lona", bloco(0.9, 1.6, 0.03, meio, A - 2.5, F / 2 + prof - 0.2), c.tecidos[i % c.tecidos.length], 0.1, 0);
  });
  for (const g of telhado("uma-agua", comp, prof, 0, 0.6, 0.4, 0.32)) t.por("palha", g.translate(0, A - 0.62, F / 2 + prof / 2), tom(c.palha, r), 0.14, 0);
  degraus(obra, "frente", L, F, 0, PORTA.largura + 0.8, 0.35, 0.4, c.pedra, r, 0, prof);
  // Casa de Cura: varal de ervas secando e potes ao lado do alpendre.
  if (p.id === "casa-de-cura") {
    varal(obra, [-L / 2 + 0.2, F / 2 + prof + 0.4], [-PORTA.largura / 2 - 0.6, F / 2 + prof + 0.4], 0, 1.8, { ...c, tecidos: ["#6f7a45", "#8a8a52", "#5c6a3a", "#e6dcc4"] }, r);
    for (const s of [0.5, 1.2, 1.9]) pote(obra, L / 2 - s, F / 2 + prof + 0.5, r);
  }
  // Salão do Conselho: dois marcos de pedra altos diante da escada.
  if (p.id === "salao-do-conselho") {
    for (const s of [-1, 1]) obra.por("pedra", bloco(0.9, 3.2, 0.6, s * (PORTA.largura / 2 + 1.2), 0, F / 2 + prof + 0.8), tom(c.pedraEscura, r), 0.12, 0.1);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r) };
}

/** Casa dos Hóspedes: térreo de pedra com teto-terraço, andar de tábua recuado, passarela e escada de fora. */
function hospedaria(p: PredioLocal, r: () => number, c: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(501);
  const t = new Obra(502);
  const A1 = Math.max(3.2, Math.min(3.4, A - 2.4));
  const vaoE = p.entravel ? PORTA : undefined;
  paredesY(obra, L, F, 0, A1, "pedra", c.pedra, vaoE);
  quinas(obra, L, F, 0, A1, c.pedra, r);
  for (const f of ["frente", "esquerda", "direita"] as Face[]) pedrasSoltas(obra, f, L, F, 0, A1, 5, c.pedra, r);
  entrada(obra, "frente", L, F, 0, p.entravel ? PORTA.largura : 1.6, p.entravel ? PORTA.altura : 2.4, c, { aberta: p.entravel, cortina: c.tecidos[0] });
  aoLongo(L, Math.max(2, Math.floor(L / 3)), 1.4).forEach((u, i) => {
    if (Math.abs(u) < PORTA.largura / 2 + 1) return;
    vao(obra, "frente", L, F, u, 1.1, 0.85, 0.9, c, { verga: "pedra", cortina: c.tecidos[i % 3] });
  });
  // Andar de cima no fundo, de tábua, com postigos e palha própria. Tudo isso some ao entrar.
  const Fu = F * 0.55;
  const zu = -F / 2 + Fu / 2;
  const A2 = Math.max(A, A1 + 2.6);
  t.por("pedra", bloco(L + 0.4, 0.25, F + 0.4, 0, A1, 0), c.laje, 0.1, 0);
  paredesY(t, L - 0.6, Fu - 0.4, A1 + 0.25, A2 - A1 - 0.25, "madeira", c.madeira, undefined, zu);
  cinta(t, L - 0.6, Fu - 0.4, A2 - 0.3, 0.3, "madeira", c.madeiraEscura, 0.1, zu);
  for (const u of aoLongo(L - 0.6, Math.max(3, Math.floor(L / 3)), 1.2)) vao(t, "frente", L - 0.6, Fu - 0.4, u, A1 + 1.0, 0.8, 0.9, c, { dz: zu, postigo: true });
  palha(t, "quatro-aguas", L - 0.6, Fu - 0.4, A2, Math.min(L, Fu) * 0.55, c, r, 2, 0.9, zu);
  // Terraço da frente: passarela com guarda-corpo, varal e escada de tábua pela fachada.
  guardaCorpo(t, [-L / 2, F / 2 + 0.15], [L / 2, F / 2 + 0.15], A1 + 0.25, c);
  for (const s of [-1, 1]) guardaCorpo(t, [s * (L / 2 + 0.15), F / 2], [s * (L / 2 + 0.15), zu + Fu / 2], A1 + 0.25, c);
  varal(t, [-L * 0.35, F / 2 - 1.0], [L * 0.1, F / 2 - 1.3], A1 + 0.25, 1.7, c, r);
  escadaDeTabua(obra, L / 2 - 0.5, F / 2 + 0.7, A1 + 0.25, -1, c);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r) };
}

/** Refeitório: mureta de pedra, esteios abertos, palha comprida com respiro, fogão de pedra nos fundos. */
function refeitorio(p: PredioLocal, r: () => number, c: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(601);
  const t = new Obra(602);
  paredesY(obra, L, F, 0, 1.1, "pedra", c.pedra, PORTA);
  quinas(obra, L, F, 0, 1.1, c.pedra, r);
  // Esteios em volta, com panos enrolados em cima entre eles.
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
    const comp = f === "frente" || f === "fundos" ? L : F;
    for (const u of aoLongo(comp, Math.max(3, Math.round(comp / 2.6)), 0.25)) {
      if (f === "frente" && Math.abs(u) < PORTA.largura / 2 - 0.1) continue;
      obra.por("madeira", naFace(bloco(0.28, A - 1.1, 0.28, 0, 0, -0.2), f, L, F, u, 1.1), c.madeiraEscura, 0.1, 0);
    }
    obra.por("lona", naFace(bloco(comp - 0.8, 0.35, 0.3, 0, 0, -0.05), f, L, F, 0, A - 0.75), c.tecidos[f.length % c.tecidos.length], 0.1, 0);
  }
  cinta(obra, L, F, A - 0.35, 0.35, "madeira", c.madeiraEscura, 0.1);
  const H = Math.min(L, F) * 0.5;
  palha(t, "quatro-aguas", L, F, A, H, c, r, 2, 1.1);
  const lr = Math.abs(L - F) * 0.5 + 1.2;
  for (const g of telhado("duas-aguas", lr, 1.4, A + H + 0.35, 0.8, 0.3, 0.2)) t.por("palha", g, c.palhaVelha, 0.12, 0);
  // Fogão de pedra encostado nos fundos, com chaminé larga.
  obra.por("pedra", bloco(3.0, 1.2, 1.4, -L * 0.2, 0, -F / 2 + 0.5), c.pedraEscura, 0.1, 0.2);
  obra.por("pedra", bloco(1.2, A + H * 0.8, 1.1, -L * 0.2, 1.2, -F / 2 + 0.55), tom(c.pedra, r), 0.12, 0);
  entrada(obra, "frente", L, F, 0, PORTA.largura, PORTA.altura, c, { aberta: true, cortina: c.tecidos[0] });
  degraus(obra, "frente", L, F, 0, PORTA.largura + 0.6, 0.3, 0.45, c.pedra, r);
  for (const s of [-1, 1]) pote(obra, s * (PORTA.largura / 2 + 1.0), F / 2 + 0.6, r);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r, true) };
}

/** Armazém: palhoça larga com toldo de lona em varas, cestos e sacos na frente. */
function armazem(p: PredioLocal, r: () => number, c: Cores): PecasDoPredio {
  const base = palhoca(p, r, c, { alpendre: false, portaLarga: true });
  const obra = new Obra(701);
  const { largura: L, fundo: F, altura: A } = p;
  const w = Math.min(L - 1, 7.5);
  for (const s of [-1, 1]) obra.por("madeira", bloco(0.14, A - 1.6, 0.14, s * (w / 2), 0, F / 2 + 2.6), c.madeiraEscura, 0.1, 0);
  obra.por("madeira", bloco(w, 0.12, 0.12, 0, A - 1.6, F / 2 + 2.6), c.madeiraEscura, 0.1, 0);
  const caimento = Math.atan2(0.7, 2.45);
  obra.por("lona", bloco(w, 0.04, 2.55, 0, 0, 0).rotateX(caimento).translate(0, A - 1.15, F / 2 + 1.42), c.tecidos[0], 0.1, 0);
  for (let i = 0; i < 5; i++) {
    const largaDaPorta = p.entravel ? PORTA.largura : 2.4;
    const x = (r() < 0.5 ? -1 : 1) * (largaDaPorta / 2 + 0.6 + r() * Math.max(0.2, w / 2 - largaDaPorta / 2 - 0.6));
    const z = F / 2 + 0.6 + r() * 1.6;
    if (r() < 0.5) cesto(obra, x, z, c, r);
    else obra.por("lona", bloco(0.6, 0.55, 0.45, 0, 0, 0).rotateY(r()).translate(x, 0, z), "#cdbf9c", 0.12, 0.2);
  }
  return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
}

/** Tulha: celeiro de tábua sobre pilares de pedra com chapéu (o rato não sobe). */
function tulha(p: PredioLocal, r: () => number, c: Cores, nivel: NivelPredio): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(801);
  const t = new Obra(802);
  const ys = 1.3;
  const H = F * 0.5;
  if (nivel === 1) {
    obra.por("madeira", bloco(L - 0.4, A - ys, F - 0.4, 0, ys, 0), c.madeira, 0.1, 0);
    obra.por("pedra", bloco(L - 1, ys, F - 1, 0, 0, 0), c.pedraEscura, 0.1, 0);
    for (const g of telhado("duas-aguas", L - 0.4, F - 0.4, A, H, 0.8).slice(0, 1)) t.por("palha", g, c.palha, 0.1, 0);
    for (const g of empenas(L - 0.4, F - 0.4, A, H)) obra.por("madeira", g, c.madeira);
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  for (const x of aoLongo(L, Math.max(2, Math.round(L / 3)), 0.6)) {
    for (const z of aoLongo(F, Math.max(2, Math.round(F / 3)), 0.6)) {
      obra.por("pedra", bloco(0.5, ys - 0.2, 0.5, x, 0, z), tom(c.pedra, r), 0.12, 0.2);
      obra.por("pedra", cilindro(0.55, 0.16, 8, x, ys - 0.2, z, true), c.laje, 0.08, 0);
    }
  }
  obra.por("madeira", bloco(L - 0.2, 0.25, F - 0.2, 0, ys - 0.04, 0), c.madeiraEscura, 0.1, 0);
  paredesY(obra, L - 0.4, F - 0.4, ys + 0.2, A - ys - 0.2, "madeira", c.madeira);
  for (const f of ["frente", "fundos"] as Face[]) {
    for (const u of aoLongo(L - 0.4, Math.floor(L / 1.1), 0.2)) obra.por("madeira", naFace(bloco(0.09, A - ys - 0.2, 0.05, 0, 0, 0.02), f, L - 0.4, F - 0.4, u, ys + 0.2), c.madeiraEscura, 0.1, 0);
  }
  obra.por("madeira-escura", naFace(bloco(1.2, 1.7, 0.06, 0, 0, 0.06), "frente", L - 0.4, F - 0.4, 0, ys + 0.4), "#2a1f18", 0.06, 0);
  escadaDeMao(obra, V(0, 0, F / 2 + 1.4), V(0, ys + 0.3, F / 2 - 0.1), 0.6, c);
  palha(t, "duas-aguas", L - 0.4, F - 0.4, A, H, c, r, 2, 0.8);
  for (const g of empenas(L - 0.4, F - 0.4, A, H)) obra.por("madeira", g, c.madeira);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

/** Galpão de entrar (Oficina, Celeiro, Casa de Colheita): tábua sobre pedra, palha de duas águas. */
function galpao(p: PredioLocal, r: () => number, c: Cores, papel: "oficina" | "colheita" | "comum"): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(901);
  const t = new Obra(902);
  const vaoE = p.entravel ? PORTA : undefined;
  paredesY(obra, L, F, 0, 0.9, "pedra", c.pedra, vaoE);
  paredesY(obra, L - 0.16, F - 0.16, 0.9, A - 0.9, "madeira", c.madeira, vaoE);
  quinas(obra, L, F, 0, 0.9, c.pedra, r);
  for (const f of ["frente", "fundos"] as Face[]) {
    for (const u of aoLongo(L, Math.floor(L / 1.0), 0.3)) {
      if (p.entravel && f === "frente" && Math.abs(u) < PORTA.largura / 2 + 0.1) continue;
      obra.por("madeira", naFace(bloco(0.08, A - 0.9, 0.05, 0, 0, 0.02), f, L, F, u, 0.9), c.madeiraEscura, 0.1, 0);
    }
  }
  cinta(obra, L, F, A - 0.3, 0.3, "madeira", c.madeiraEscura, 0.08);
  entrada(obra, "frente", L, F, 0, p.entravel ? PORTA.largura : 3.0, p.entravel ? PORTA.altura : 2.8, c, { aberta: p.entravel });
  const H = F * (0.48 + r() * 0.08);
  palha(t, "duas-aguas", L, F, A, H, c, r, 2, 0.8);
  for (const g of empenas(L, F, A, H)) obra.por("madeira", g, c.madeira);
  for (const f of ["esquerda", "direita"] as Face[]) vao(obra, f, L, F, 0, A + 0.4, 0.9, 0.8, c, {});
  if (papel === "oficina") {
    obra.por("pedra", bloco(1.6, 1.0, 1.6, L / 2 - 1.3, 0, -F / 2 + 1.3), c.pedraEscura, 0.1, 0.2);
    obra.por("pedra", bloco(1.0, A + H + 0.6, 1.0, L / 2 - 1.3, 1.0, -F / 2 + 1.3), tom(c.pedra, r), 0.12, 0);
    lenha(obra, "esquerda", L, F, 0, c, r);
    obra.por("pedra", bloco(0.7, 0.8, 0.5, PORTA.largura / 2 + 1.0, 0, F / 2 + 1.0), c.laje, 0.08, 0);
  } else {
    for (let i = 0; i < 4; i++) cesto(obra, (i % 2 ? 1 : -1) * (PORTA.largura / 2 + 0.6 + (i >> 1) * 0.7), F / 2 + 0.6 + (i >> 1) * 0.5, c, r);
    if (papel === "colheita") varal(obra, [-L / 2 + 0.3, F / 2 + 2.4], [-PORTA.largura / 2 - 0.4, F / 2 + 2.6], 0, 2.0, { ...c, tecidos: ["#c9a24a", "#b8913e", "#8a7a3a"] }, r);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r) };
}

/** Sítio: casa comprida no meio, tulha redonda de um lado, curral de pedra e varal do outro. */
function sitio(p: PredioLocal, r: () => number, c: Cores): PecasDoPredio {
  const { largura: L, fundo: F } = p;
  const Lc = Math.min(L - 6, Math.max(9, L * 0.6));
  const casa = palhoca({ ...p, largura: Lc }, r, c, { alpendre: true });
  const obra = new Obra(1001);
  const t = new Obra(1002);
  const lado = (L - Lc) / 2;
  // Tulha redonda em pilares, à esquerda.
  const R = Math.min(lado / 2 - 0.2, 2.0);
  const xg = -L / 2 + lado / 2;
  const zg = -F / 2 + R + 0.6;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    obra.por("pedra", bloco(0.4, 0.9, 0.4, xg + Math.sin(a) * R * 0.65, 0, zg + Math.cos(a) * R * 0.65), tom(c.pedra, r), 0.12, 0.2);
  }
  obra.por("madeira", cilindro(R, 0.2, 10, xg, 0.9, zg, true), c.madeiraEscura, 0.1, 0);
  obra.por("palha", cilindro(R - 0.15, 2.2, 10, xg, 1.1, zg), c.palhaVelha, 0.12, 0);
  conePalha(t, R + 0.5, 3.3, R * 1.3, c, r, 1, 10, xg, zg);
  // Curral de pedra solta à direita.
  const xc = L / 2 - lado / 2;
  for (const [w, d, x, z] of [
    [lado - 0.3, 0.6, xc, -F / 2 + 0.3],
    [0.6, F * 0.6, L / 2 - 0.3, -F / 2 + F * 0.3],
    [lado - 0.3, 0.6, xc, -F / 2 + F * 0.6],
  ]) {
    obra.por("pedra", bloco(w, 1.0 + r() * 0.2, d, x, 0, z), tom(c.pedraEscura, r), 0.14, 0.2);
  }
  varal(obra, [xc - lado / 2 + 0.4, F / 2 - 0.6], [xc + lado / 2 - 0.4, F / 2 + 0.6], 0, 1.9, c, r);
  lenha(obra, "esquerda", Lc, F, F * 0.25, c, r);
  return { corpo: [...casa.corpo, ...obra.pecas()], telhado: [...casa.telhado, ...t.pecas()], interior: casa.interior };
}

/** Casa-forte (banco): pedra grossa, frestas, porta pesada, lajes por cima. */
function casaForte(p: PredioLocal, r: () => number, c: Cores): PecasDoPredio {
  if (!p.entravel) return casaLaje(p, r, c);
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(1101);
  const t = new Obra(1102);
  paredesY(obra, L, F, 0, A, "pedra", c.pedra, PORTA);
  quinas(obra, L, F, 0, A, c.pedra, r);
  for (const f of ["frente", "esquerda", "direita"] as Face[]) pedrasSoltas(obra, f, L, F, 0, A, 5, c.pedra, r);
  entrada(obra, "frente", L, F, 0, PORTA.largura, PORTA.altura, c, { aberta: true });
  for (const u of [-L * 0.35, L * 0.35]) obra.por("madeira-escura", naFace(bloco(0.2, 1.0, 0.05, 0, 0, 0.01), "frente", L, F, u, 1.5), "#1d1611", 0.03, 0);
  t.por("pedra", bloco(L + 0.6, 0.35, F + 0.6, 0, A, 0), c.laje, 0.1, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r) };
}

/** Pouso (estação): plataforma de pedra e abrigo aberto de palha sobre esteios. */
function pouso(p: PredioLocal, r: () => number, c: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(1201);
  const t = new Obra(1202);
  obra.por("pedra", bloco(L, 0.7, F, 0, 0, 0), c.pedraEscura, 0.1, 0.3);
  quinas(obra, L, F, 0, 0.7, c.pedra, r);
  for (const x of aoLongo(L, Math.max(3, Math.round(L / 3.5)), 0.5)) {
    for (const z of [-F / 2 + 0.5, F / 2 - 0.5]) obra.por("madeira", bloco(0.3, A - 0.7, 0.3, x, 0.7, z), c.madeiraEscura, 0.1, 0);
  }
  cinta(obra, L - 0.6, F - 0.6, A - 0.3, 0.3, "madeira", c.madeiraEscura, 0.1);
  obra.por("madeira", bloco(L * 0.5, 0.45, 0.5, 0, 0.7, -F / 2 + 1.0), c.madeira, 0.1, 0);
  palha(t, "quatro-aguas", L, F, A, Math.min(L, F) * 0.45, c, r, 2, 0.9);
  degraus(obra, "frente", L, F, 0, 3.5, 0.7, 0.4, c.pedra, r);
  flamula(obra, L / 2 + 0.6, F / 2 + 0.6, A + 2, c.tecidos[0], c, r, 2.5);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r) };
}

/** Moinho d'água: torre redonda de pedra, roda de tábua do lado, cone de palha. */
function moinho(p: PredioLocal, r: () => number, c: Cores): PecasDoPredio {
  const R = Math.min(p.largura, p.fundo) / 2 - 0.9;
  const obra = new Obra(1301);
  const t = new Obra(1302);
  obra.por("pedra", cilindro(R + 0.2, p.altura, 14, 0, 0, 0, false, R - 0.2), c.pedra, 0.12, 0.2);
  for (const y of [1.0, 2.2, 3.4]) if (y < p.altura - 0.5) obra.por("pedra", cilindro(R + 0.12, 0.14, 14, 0, y, 0), c.pedraEscura, 0.1, 0);
  entrada(obra, "frente", 2 * R, 2 * R, 0, 1.1, 2.1, c, { cortina: c.tecidos[0] });
  const Rr = Math.min(p.altura * 0.4, 2.6);
  const cx = R + 0.5;
  const cy = Rr + 0.2;
  const ponto = (a: number, raio = Rr) => V(cx, cy + Math.cos(a) * raio, Math.sin(a) * raio);
  for (let k = 0; k < 12; k++) {
    const [a, b] = [(k / 12) * Math.PI * 2, ((k + 1) / 12) * Math.PI * 2];
    obra.por("madeira", viga(ponto(a), ponto(b), 0.16), c.madeira, 0.1, 0);
    const pa = ponto(a);
    obra.por("madeira", bloco(0.5, 0.06, 0.6, 0, 0, 0).rotateX(a).translate(pa.x, pa.y, pa.z), c.madeiraEscura, 0.1, 0);
  }
  for (let k = 0; k < 4; k++) obra.por("madeira", viga(ponto(k * 0.785), ponto(k * 0.785 + Math.PI), 0.1), c.madeiraEscura, 0.1, 0);
  obra.por("madeira", viga(V(R - 0.3, cy, 0), V(cx + 0.4, cy, 0), 0.2), c.madeiraEscura, 0.1, 0);
  conePalha(t, R + 0.9, p.altura, R * 1.2 + 0.8, c, r, 2, 14);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

/** Tenda: cone de lona com varas saindo da ponta e faixa tingida; comprida vira lona de duas águas. */
function tenda(p: PredioLocal, r: () => number, c: Cores, nivel: NivelPredio): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(1401);
  const cru = r() < 0.5 ? "#dccfb2" : "#cdbd98";
  if (L > F * 1.5) {
    for (const g of telhado("duas-aguas", L, F, 0.1, A, 0.1, 0.05).slice(0, nivel === 1 ? 1 : 3)) obra.por("lona", g, cru, 0.12, 0);
    for (const s of [-1, 1]) obra.por("madeira", bloco(0.12, A + 0.5, 0.12, s * (L / 2 - 0.2), 0, 0), c.madeiraEscura, 0.1, 0);
    return { corpo: obra.pecas(), telhado: [], interior: interior(p, c, r) };
  }
  const R = Math.min(L, F) / 2;
  for (const g of tronco(R, 0, A, nivel === 1 ? 8 : 12, 0, 0.05, nivel === 1)) obra.por("lona", g, cru, 0.12, 0.2);
  if (nivel === 1) return { corpo: obra.pecas(), telhado: [], interior: [] };
  // Faixa tingida em volta (um tronco de cone por fora da lona).
  const y0 = A * 0.28;
  const [ra, rb] = [R * (1 - y0 / A) + 0.03, R * (1 - (y0 + A * 0.12) / A) + 0.03];
  for (const g of tronco(ra, rb, A * 0.12, 12, y0, 0.02, true)) obra.por("lona", g, c.tecidos[0], 0.1, 0);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    obra.por("madeira", viga(V(Math.sin(a) * R * 0.98, 0, Math.cos(a) * R * 0.98), V(-Math.sin(a) * 0.35, A + 1.0, -Math.cos(a) * 0.35), 0.08), c.madeiraEscura, 0.1, 0);
  }
  obra.por("madeira-escura", bloco(1.0, 1.6, 0.05, 0, 0, R * (1 - 0.8 / A) + 0.05), "#2a1f18", 0.04, 0);
  return { corpo: obra.pecas(), telhado: [], interior: interior(p, c, r) };
}

/** Oficina de fogo (fábrica): galpão com forno redondo de pedra e chaminé alta empilhada. */
function forja(p: PredioLocal, r: () => number, c: Cores): PecasDoPredio {
  const base = galpao(p, r, c, "oficina");
  const obra = new Obra(1501);
  const x = -p.largura / 2 + 1.6;
  const z = -p.fundo / 2 + 1.6;
  for (const g of tronco(1.5, 0.5, 1.8, 10, 0, 0.3, true)) obra.por("pedra", g.translate(x, 0, z), c.pedraEscura, 0.12, 0.2);
  let y = 1.6;
  for (let i = 0; i < 5; i++) {
    const w = 1.1 - i * 0.06;
    const h = (p.altura * 1.6) / 5;
    obra.por("pedra", bloco(w, h, w, x + (r() - 0.5) * 0.05, y, z), tom(c.pedra, r, 0.14), 0.1, 0);
    y += h;
  }
  return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
}

/** Ruína da expulsão: pedra quebrada, esteio queimado, palha caída. */
function escombro(p: PredioLocal, r: () => number, c: Cores, nivel: NivelPredio): PecasDoPredio {
  const base = ruina(p, r, c.pedra);
  if (nivel === 1) return base;
  const obra = new Obra(1601);
  for (let i = 0; i < 3; i++) {
    const x = (r() - 0.5) * p.largura * 0.6;
    const z = (r() - 0.5) * p.fundo * 0.6;
    obra.por("madeira-escura", viga(V(x, 0, z), V(x + (r() - 0.5) * 2, p.altura * (0.5 + r() * 0.4), z + (r() - 0.5) * 2), 0.25), "#2b2420", 0.12, 0);
  }
  for (const g of tronco(Math.min(p.largura, p.fundo) * 0.3, 0, 0.8, 7, 0, 0.1, true)) obra.por("palha", g.translate((r() - 0.5) * 2, 0, (r() - 0.5) * 2), "#6e6250", 0.14, 0);
  return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
}

// ---------------------------------------------------------------- longe (nível 1)

function longeCasa(p: PredioLocal, forma: Forma, c: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(1);
  const t = new Obra(2);
  if (forma === "redonda") {
    const R = Math.min(L, F) / 2 - 0.15;
    obra.por("pedra", cilindro(R, A, 8, 0, 0, 0), c.pedra, 0.1, 0.2);
    for (const g of tronco(R + 1.05, 0, R * 1.15 + 1.0, 8, A, 0.3, true)) t.por("palha", g, c.palha, 0.1, 0);
  } else if (forma === "laje") {
    obra.por("pedra", bloco(L, A, F, 0, 0, 0), c.pedra, 0.1, 0.2);
    t.por("pedra", bloco(L + 0.6, 0.3, F + 0.6, 0, A, 0), c.laje, 0.08, 0);
    t.por("lona", bloco(L * 0.4, 0.05, F * 0.35, L * 0.2, A + 2.4, -F * 0.25), c.tecidos[0], 0.1, 0);
  } else if (forma === "degraus") {
    const Fr = F * 0.55;
    const Af = Math.max(2.3, A - 1.3);
    const topo = Math.max(A + 0.4, Af + 2.6);
    obra.por("madeira", bloco(L, topo, Fr, 0, 0, -F / 2 + Fr / 2), c.madeira, 0.1, 0.2);
    obra.por("pedra", bloco(L, Af, F - Fr, 0, 0, F / 2 - (F - Fr) / 2), c.pedra, 0.1, 0.2);
    for (const g of telhado("quatro-aguas", L, Fr, topo, Math.min(L, Fr) * 0.55, 0.8).slice(0, 1)) t.por("palha", g.translate(0, 0, -F / 2 + Fr / 2), c.palha, 0.1, 0);
  } else {
    obra.por("pedra", bloco(L, 1.5, F, 0, 0, 0), c.pedra, 0.1, 0.2);
    obra.por("madeira", bloco(L - 0.16, A - 1.5, F - 0.16, 0, 1.5, 0), c.madeira, 0.1, 0);
    for (const g of telhado("quatro-aguas", L, F, A, Math.min(L, F) * 0.57, 0.95).slice(0, 1)) t.por("palha", g, c.palha, 0.1, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

function longeComprido(p: PredioLocal, c: Cores, tipo: "quatro-aguas" | "duas-aguas", pedra: number, dz = 0, laje = false): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(1);
  const t = new Obra(2);
  if (pedra > 0) obra.por("pedra", bloco(L, Math.min(pedra, A), F, 0, 0, dz), c.pedra, 0.1, 0.2);
  if (A > pedra) obra.por("madeira", bloco(L - 0.2, A - pedra, F - 0.2, 0, pedra, dz), c.madeira, 0.1, 0);
  if (laje) t.por("pedra", bloco(L + 0.4, 0.3, F + 0.4, 0, A, dz), c.laje, 0.08, 0);
  else {
    const H = tipo === "duas-aguas" ? F * 0.5 : Math.min(L, F) * 0.5;
    for (const g of telhado(tipo, L, F, A, H, 1.0).slice(0, 1)) t.por("palha", g.translate(0, 0, dz), c.palha, 0.1, 0);
    if (tipo === "duas-aguas") for (const g of empenas(L, F, A, H)) obra.por("madeira", g.translate(0, 0, dz), c.madeira);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

function longe(p: PredioLocal, forma: Forma, c: Cores): PecasDoPredio {
  switch (p.tipo) {
    case "casa":
      return longeCasa(p, forma, c);
    case "moinho":
      return longeCasa({ ...p, largura: p.largura - 1.8, fundo: p.fundo - 1.8 }, "redonda", c);
    case "banco":
      return longeCasa(p, "laje", c);
    case "estacao":
      return longeComprido({ ...p }, c, "quatro-aguas", 0.7);
    case "hotel": {
      const A1 = Math.max(3.2, Math.min(3.4, p.altura - 2.4));
      const baixo = longeComprido({ ...p, altura: A1 }, c, "quatro-aguas", A1, 0, true);
      const Fu = p.fundo * 0.55;
      const cima = longeComprido({ ...p, fundo: Fu - 0.4, altura: Math.max(p.altura, A1 + 2.6) }, c, "quatro-aguas", 0, -p.fundo / 2 + Fu / 2);
      return { corpo: baixo.corpo, telhado: [...baixo.telhado, ...cima.corpo, ...cima.telhado], interior: [] };
    }
    case "galpao":
    case "fabrica":
      return longeComprido(p, c, "duas-aguas", 0.9);
    case "fazenda":
      return longeCasa({ ...p, largura: Math.min(p.largura - 6, Math.max(9, p.largura * 0.6)) }, "palhoca", c);
    default:
      return longeComprido(p, c, "quatro-aguas", p.tipo === "publico" ? 2.6 : 1.1);
  }
}

// ---------------------------------------------------------------- entrada do estilo

export function gerarPlatos(p: PredioLocal, nivel: NivelPredio, semente: number): PecasDoPredio {
  const r = sorteio(semente);
  const forma = formaDaCasa(p, r);
  const c = paleta(r);
  if (p.tipo === "ruina") return escombro(p, r, c, nivel);
  if (p.tipo === "igreja") return templo(p, r, c, nivel);
  if (p.tipo === "torre") return mirante(p, r, c, nivel);
  if (p.tipo === "tenda") return tenda(p, r, c, nivel);
  if (p.tipo === "galpao" && !p.entravel) return tulha(p, r, c, nivel);
  if (nivel === 1) return longe(p, forma, c);
  switch (p.tipo) {
    case "comercio":
      return armazem(p, r, c);
    case "saloon":
      return refeitorio(p, r, c);
    case "hotel":
      return hospedaria(p, r, c);
    case "publico":
      return salao(p, r, c);
    case "banco":
      return casaForte(p, r, c);
    case "estacao":
      return pouso(p, r, c);
    case "galpao":
      return galpao(p, r, c, p.id === "oficina" ? "oficina" : p.id === "casa-da-colheita" ? "colheita" : "comum");
    case "fabrica":
      return forja(p, r, c);
    case "fazenda":
      return sitio(p, r, c);
    case "moinho":
      return moinho(p, r, c);
    default:
      if (forma === "redonda") return redonda(p, r, c);
      if (forma === "laje") return casaLaje(p, r, c);
      if (forma === "degraus") return casaDegraus(p, r, c);
      return palhoca(p, r, c);
  }
}

const estilo: Estilo = { id: "platos", nome: "Povo dos platôs (Celestes)", gerar: gerarPlatos };

export default estilo;
