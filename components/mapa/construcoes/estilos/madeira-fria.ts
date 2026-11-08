// Madeira e gelo (Maria da Fé): vale gelado de caça e pesca. Cabanas de tora escura
// empilhada com as pontas cruzadas nos cantos, embasamento de pedra, oitão de tábua,
// telhado íngreme coberto de neve grossa com pingentes de gelo, chaminé de pedra
// ou cano de ferro fumegando. Casas de pesca sobre palafitas com deque e rede, defumador
// de tábua preta, cabana de caça com couro esticado e galhada. Igreja de tábua de torre
// na fachada, Salão Comunitário de oitão para a rua, Casa Grande da anciã de dois andares.

import * as THREE from "three";
import { sorteio } from "../../natureza/ferramentas";
import { aoLongo, bloco, interiorBasico, naFace, Obra, type Face } from "../kit";
import type { Estilo, NivelPredio, PecasDoPredio, PredioLocal } from "../tipos";
import { ruina } from "./colonial";
import { alpendre, barril, caixote, chamineDePedra, cobrir, de, fumaca, lenha, oitoes, PORTA_DE_ENTRAR, variar, type Telhado } from "./_pedra-fria-frio";

const TORA = ["#4a3626", "#3f2e21", "#55402c", "#5a4632", "#4d4238", "#5b5248"];
const TELHADO = ["#3d3530", "#463a33", "#4a3c30", "#3a3634"];
const PORTA = ["#3a2c20", "#6a2e26", "#4a5a4a", "#2e3a44", "#4b3423"];
const PEDRA = ["#6a655d", "#5f5b55", "#77705f"];

type Cor = { tora: string; telhado: string; porta: string; pedra: string; tabua: string };

function paleta(r: () => number): Cor {
  const tora = de(r, TORA);
  return { tora, telhado: de(r, TELHADO), porta: de(r, PORTA), pedra: de(r, PEDRA), tabua: variar(tora, r, 0.1) };
}

/** Raio da tora e recuo da linha de toras: a ponta cruzada do canto fica dentro da planta. */
const R = 0.26;
const RECUO = 0.45;

type Vao = { u0: number; u1: number; y0: number; y1: number };

/** Uma tora: cilindro de seis faces com UV em metros, ao longo de x ou de z. */
function tora(obra: Obra, a: number, b: number, y: number, outro: number, eixo: "x" | "z", cor: string, r: () => number) {
  const comp = b - a;
  const raio = R * (0.94 + r() * 0.1);
  const g = new THREE.CylinderGeometry(raio, raio, comp, 5, 1, false);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.PI * raio * 2) / 2, (uv.getY(i) * comp) / 2);
  if (eixo === "x") g.rotateZ(Math.PI / 2).translate((a + b) / 2, y, outro);
  else g.rotateX(Math.PI / 2).translate(outro, y, (a + b) / 2);
  obra.por("madeira-escura", g, variar(cor, r, 0.12), 0.1, 0.25);
}

/** Tira de [a, b] os trechos ocupados por vãos. */
function recortar(a: number, b: number, buracos: [number, number][]) {
  let trechos: [number, number][] = [[a, b]];
  for (const [c, d] of buracos) {
    trechos = trechos.flatMap(([x0, x1]): [number, number][] => {
      if (d <= x0 || c >= x1) return [[x0, x1]];
      const fora: [number, number][] = [];
      if (c > x0) fora.push([x0, c]);
      if (d < x1) fora.push([d, x1]);
      return fora;
    });
  }
  return trechos.filter(([x0, x1]) => x1 - x0 > 0.2);
}

/**
 * Paredes de tora com cantos cruzados. As toras da frente e dos fundos correm em x,
 * as dos lados em z, meia tora acima: o encaixe de cabana. Vãos em coordenada de face.
 * Devolve o topo da última fiada.
 */
function paredesDeToras(obra: Obra, L: number, F: number, y0: number, A: number, cor: string, vaos: Partial<Record<Face, Vao[]>>, r: () => number, dx = 0) {
  const xw = L / 2 - RECUO;
  const zw = F / 2 - RECUO;
  let topo = y0;
  const corta = (f: Face, y: number): [number, number][] =>
    (vaos[f] ?? [])
      .filter((v) => y + R * 0.5 > v.y0 && y - R * 0.5 < v.y1)
      .map((v) => (f === "frente" || f === "esquerda" ? [v.u0, v.u1] : [-v.u1, -v.u0]));
  for (let y = y0 + R; y + R <= A + 0.01; y += R * 2) {
    for (const [f, z] of [["frente", zw], ["fundos", -zw]] as const) {
      for (const [a, b] of recortar(-L / 2, L / 2, corta(f, y))) tora(obra, a + dx, b + dx, y, z, "x", cor, r);
    }
    topo = y + R;
    const ys = y + R;
    if (ys + R > A + 0.01) continue;
    for (const [f, x] of [["esquerda", -xw], ["direita", xw]] as const) {
      for (const [a, b] of recortar(-F / 2, F / 2, corta(f, ys))) tora(obra, a, b, ys, x + dx, "z", cor, r);
    }
    topo = ys + R;
  }
  // Barreado: miolo escuro um pouco atrás da linha das toras, fecha as frestas entre os
  // cilindros. Só a porta fura o miolo; a janela tem o vidro na frente dele.
  const miolo = "#2a241e";
  const e = 0.08;
  const h = topo - y0;
  obra.por("madeira-escura", bloco(2 * xw, h, e, dx, y0, -zw + 0.06), miolo, 0.06, 0);
  for (const s of [-1, 1]) obra.por("madeira-escura", bloco(e, h, 2 * zw, dx + s * (xw - 0.06), y0, 0), miolo, 0.06, 0);
  const portas = (vaos.frente ?? []).filter((v) => v.y0 <= 0.01);
  for (const [a, b] of recortar(-xw, xw, portas.map((v): [number, number] => [v.u0, v.u1]))) obra.por("madeira-escura", bloco(b - a, h, e, dx + (a + b) / 2, y0, zw - 0.06), miolo, 0.06, 0);
  for (const v of portas) if (topo > v.y1) obra.por("madeira-escura", bloco(v.u1 - v.u0, topo - v.y1, e, dx + (v.u0 + v.u1) / 2, v.y1, zw - 0.06), miolo, 0.06, 0);
  return topo;
}

/** Janela de cabana: vidro na linha da parede, caixilho de tábua grossa e folhas abertas. */
function janelaDeTora(obra: Obra, f: Face, Lw: number, Fw: number, u: number, y: number, w: number, h: number, cor: Cor, r: () => number, dx = 0, plano = false) {
  const nf = (g: THREE.BufferGeometry) => naFace(g, f, Lw, Fw, u, y).translate(dx, 0, 0);
  // Na tora o caixilho atravessa a parede; na tábua (plano) fica na face de fora.
  const d = plano ? 0.14 : R * 2 + 0.1;
  const z = plano ? R + 0.04 : 0;
  obra.por("vidro", nf(new THREE.PlaneGeometry(w, h).translate(0, h / 2, plano ? R + 0.01 : 0)), r() < 0.25 ? "#8a6a3a" : "#232a2e", 0.04, 0);
  for (const s of [-1, 1]) obra.por("madeira", nf(bloco(0.14, h + 0.28, d, s * (w / 2 + 0.07), -0.14, z)), cor.tabua, 0.08, 0);
  obra.por("madeira", nf(bloco(w + 0.5, 0.16, d, 0, h, z)), cor.tabua, 0.08, 0);
  obra.por("madeira", nf(bloco(w + 0.4, 0.12, d + 0.12, 0, -0.14, z + 0.06)), cor.tabua, 0.08, 0);
  if (r() < 0.5) {
    for (const s of [-1, 1]) obra.por("madeira", nf(bloco(w / 2, h, 0.05, s * (w * 0.75 + 0.16), 0, R + 0.05)), cor.porta, 0.08, 0);
  }
}

/** Porta de tábua com ombreiras grossas; aberta e larga no entrável. */
function portaDeTora(obra: Obra, Lw: number, Fw: number, u: number, y0: number, w: number, h: number, cor: Cor, aberta: boolean, dx = 0) {
  const nf = (g: THREE.BufferGeometry) => naFace(g, "frente", Lw, Fw, u, y0).translate(dx, 0, 0);
  const d = R * 2 + 0.12;
  for (const s of [-1, 1]) obra.por("madeira", nf(bloco(0.2, h, d, s * (w / 2 + 0.1), 0, 0)), cor.tabua, 0.08, 0);
  obra.por("madeira", nf(bloco(w + 0.6, 0.24, d, 0, h, 0)), cor.tabua, 0.08, 0);
  if (aberta) {
    for (const s of [-1, 1]) obra.por("madeira", nf(bloco(0.07, h * 0.97, w / 2, 0, 0, -w / 4).translate(s * (w / 2 - 0.04), 0, -0.1)), cor.porta, 0.08, 0);
  } else {
    obra.por("madeira", nf(bloco(w, h, 0.07, 0, 0, 0)), cor.porta, 0.08, 0);
    for (const y of [0.3, h / 2, h - 0.3]) obra.por("madeira", nf(bloco(w, 0.12, 0.05, 0, y, 0.05)), cor.porta, 0.08, 0);
  }
  // Degrau de tábua até o chão.
  if (y0 > 0.1) obra.por("madeira", nf(bloco(w + 0.6, y0, 0.7, 0, -y0, R + 0.35)), "#4a3a2c", 0.1, 0.2);
}

/** Oitão de tábua em pé (mata-junta) sobre as toras. */
function oitaoDeTabua(obra: Obra, c: Telhado, cor: string, r: () => number) {
  oitoes(obra, c, "madeira", cor);
  const alto = c.s * (c.F / 2 + c.beiral) - c.s * c.beiral;
  const n = Math.max(3, Math.floor(c.F / 1.5));
  const pos = (g: THREE.BufferGeometry) => {
    if (c.giro) g.rotateY(c.giro);
    return g.translate(c.x ?? 0, 0, c.z ?? 0);
  };
  for (const s of [-1, 1]) {
    for (let i = 1; i < n; i++) {
      const zz = -c.F / 2 + (i * c.F) / n;
      const h = alto * (1 - Math.abs(zz) / (c.F / 2)) - 0.1;
      if (h < 0.3) continue;
      obra.por("madeira", pos(bloco(0.05, h, 0.09, (s * c.L) / 2 + s * 0.03, c.A, zz)), variar(cor, r, 0.15), 0.08, 0);
    }
  }
}

type Cabana = { obra: Obra; t: Obra; dentro: Obra; topo: number; A: number; y0: number; Lw: number; Fw: number; dx: number; frontal: boolean };

type OpcoesDeCabana = {
  L?: number;
  dx?: number;
  y0?: number;
  A?: number;
  frontal?: boolean;
  pavimentos?: number;
  chamine?: "pedra" | "cano" | null;
  s?: number;
  janelasNaFrente?: number;
};

/** Cabana de tora: o corpo de quase tudo em Maria da Fé. */
function cabana(p: PredioLocal, r: () => number, cor: Cor, o: OpcoesDeCabana = {}): Cabana {
  const L = o.L ?? p.largura;
  const F = p.fundo;
  const dx = o.dx ?? 0;
  const y0 = o.y0 ?? 0.35;
  const A = Math.max(o.A ?? p.altura, y0 + 2.6);
  const obra = new Obra(Math.floor(r() * 1e6));
  const t = new Obra(Math.floor(r() * 1e6));
  const dentro = new Obra(9);
  const pavimentos = o.pavimentos ?? (A - y0 >= 5.5 ? 2 : 1);
  const frontal = o.frontal ?? (F >= 7 && r() < 0.55);
  const Lw = L - 2 * RECUO;
  const Fw = F - 2 * RECUO;

  // Embasamento: pedra (no chão) ou palafita (o chamador põe os esteios).
  if (y0 < 0.6) obra.por("pedra-escura", bloco(Lw + 0.5, y0, Fw + 0.5, dx, 0, 0), cor.pedra, 0.12, 0.2);
  else obra.por("madeira", bloco(Lw + 0.5, 0.2, Fw + 0.5, dx, y0 - 0.2, 0), "#4a3a2c", 0.1, 0);

  // Vãos.
  const entravel = p.entravel;
  const larguraPorta = entravel ? PORTA_DE_ENTRAR.largura : 1.1;
  const alturaPorta = entravel ? PORTA_DE_ENTRAR.altura : 2.1;
  const nJanelas = o.janelasNaFrente ?? Math.max(1, Math.floor((Lw - 1.6) / 3.2));
  const slots = aoLongo(Lw, nJanelas + 1, 1.1);
  const iPorta = entravel || frontal ? Math.floor(slots.length / 2) : Math.floor(r() * slots.length);
  const uPorta = entravel ? 0 : slots[iPorta];
  const vaos: Partial<Record<Face, Vao[]>> = { frente: [], fundos: [], esquerda: [], direita: [] };
  vaos.frente!.push({ u0: uPorta - larguraPorta / 2, u1: uPorta + larguraPorta / 2, y0: 0, y1: y0 + alturaPorta });
  const janelas: { f: Face; u: number; y: number; w: number; h: number }[] = [];
  const andar = (A - y0) / pavimentos;
  slots.forEach((u, i) => {
    if (i === iPorta || (entravel && Math.abs(u) < larguraPorta / 2 + 0.8)) return;
    janelas.push({ f: "frente", u, y: y0 + 1.0, w: 0.9, h: 1.1 });
  });
  for (let k = 1; k < pavimentos; k++) for (const u of slots) janelas.push({ f: "frente", u, y: y0 + k * andar + 0.7, w: 0.9, h: 1.1 });
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
    const comp = f === "fundos" ? Lw : Fw;
    for (const u of aoLongo(comp, Math.max(1, Math.floor(comp / 5.5)), 1.4)) {
      for (let k = 0; k < pavimentos; k++) if (r() < 0.6) janelas.push({ f, u, y: y0 + 1.1 + k * andar, w: 0.75, h: 0.9 });
    }
  }
  for (const j of janelas) vaos[j.f]!.push({ u0: j.u - j.w / 2 - 0.14, u1: j.u + j.w / 2 + 0.14, y0: j.y - 0.1, y1: j.y + j.h + 0.08 });

  // Dois andares: tora no térreo, tábua em pé no de cima (mais leve, e é como se fazia).
  const topoDasToras = paredesDeToras(obra, L, F, y0, pavimentos > 1 ? y0 + andar : A, cor.tora, vaos, r, dx);
  let topoDaParede = topoDasToras;
  if (pavimentos > 1) {
    const Lo = Lw + 2 * R;
    const Fo = Fw + 2 * R;
    topoDaParede = A;
    obra.por("madeira", bloco(Lo, A - topoDasToras, Fo, dx, topoDasToras, 0), cor.tabua, 0.1, 0);
    obra.por("madeira", bloco(Lo + 0.1, 0.18, Fo + 0.1, dx, topoDasToras, 0), "#3a3028", 0.1, 0);
    for (const f of ["frente", "fundos"] as Face[]) {
      for (const u of aoLongo(Lo, Math.floor(Lo / 1.3), 0.2)) obra.por("madeira", naFace(bloco(0.08, A - topoDasToras, 0.05, 0, 0, 0.02), f, Lo, Fo, u, topoDasToras).translate(dx, 0, 0), variar(cor.tabua, r, 0.15), 0.08, 0);
    }
  }
  for (const j of janelas) janelaDeTora(obra, j.f, Lw, Fw, j.u, j.y, j.w, j.h, cor, r, dx, j.y > topoDasToras);
  portaDeTora(obra, Lw, Fw, uPorta, y0, larguraPorta, alturaPorta, cor, entravel, dx);

  // Telhado íngreme, coberto de neve grossa, com pingentes.
  const Lo = Lw + 2 * R;
  const Fo = Fw + 2 * R;
  const c: Telhado = {
    tipo: "duas-aguas",
    L: frontal ? Fo : Lo,
    F: frontal ? Lo : Fo,
    A: topoDaParede,
    s: o.s ?? 0.9 + r() * 0.25,
    beiral: 0.65,
    esp: 0.2,
    giro: frontal ? Math.PI / 2 : 0,
    x: dx,
    material: "telha-escura",
    cor: cor.telhado,
    neve: { recuo: -0.08, espessura: 0.24 + r() * 0.08 },
    pingentes: Math.round(Lo * 0.5),
    semente: Math.floor(r() * 1e6),
  };
  const a = cobrir(t, c);
  oitaoDeTabua(obra, c, cor.tabua, r);
  if (frontal) janelaDeTora(obra, "frente", Lw, Fw, 0, topoDaParede + 0.4, 0.6, 0.6, cor, r, dx);

  const tipoCh = o.chamine === undefined ? (r() < 0.65 ? "pedra" : "cano") : o.chamine;
  if (tipoCh === "pedra") {
    const s = r() < 0.5 ? -1 : 1;
    const [cx, cz] = frontal ? [dx + s * Lw * 0.22, -Fw / 2 + 0.2] : [dx + s * (Lw / 2 - 0.2), (r() - 0.5) * Fw * 0.3];
    chamineDePedra(obra, cx, cz, y0, a.topo + 0.6, cor.pedra, Math.floor(r() * 1e6), 0.95);
  } else if (tipoCh === "cano") {
    const [cx, cz] = frontal ? [dx + (r() - 0.5) * Lw * 0.3, -Fw * 0.2] : [dx + (r() - 0.5) * Lw * 0.5, -Fw * 0.15];
    obra.por("ferro", new THREE.CylinderGeometry(0.13, 0.13, a.topo + 0.9 - topoDaParede, 8, 1, true).translate(cx, (a.topo + 0.9 + topoDaParede) / 2, cz), "#2c2a28", 0.04, 0);
    obra.por("ferro", new THREE.ConeGeometry(0.3, 0.25, 8).translate(cx, a.topo + 1.15, cz), "#2c2a28", 0.04, 0);
    fumaca(obra, cx, a.topo + 1.0, cz, Math.floor(r() * 1e6));
  }

  if (entravel) {
    interiorBasico(dentro, Lw, Fw, { piso: "#6a5a42", madeira: "#3e2f22" });
    dentro.por("pedra", bloco(1.6, 1.8, 0.8, dx + Lw * 0.25, y0, -Fw / 2 + 0.6), cor.pedra, 0.1, 0);
    dentro.por("carvao", bloco(0.9, 0.6, 0.3, dx + Lw * 0.25, y0 + 0.1, -Fw / 2 + 1.05), "#2b2826", 0.05, 0);
  }
  return { obra, t, dentro, topo: a.topo, A: topoDaParede, y0, Lw, Fw, dx, frontal };
}

const fechar = (c: Cabana): PecasDoPredio => ({ corpo: c.obra.pecas(), telhado: c.t.pecas(), interior: c.dentro.pecas() });

/** Esteios da palafita: troncos sob o assoalho, travessas e escada. */
function palafita(obra: Obra, L: number, F: number, y0: number, r: () => number, dx = 0) {
  const nx = Math.max(2, Math.round(L / 3));
  const nz = Math.max(2, Math.round(F / 3));
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const x = dx - L / 2 + RECUO + (i * (L - 2 * RECUO)) / (nx - 1);
      const z = -F / 2 + RECUO + (k * (F - 2 * RECUO)) / (nz - 1);
      obra.por("madeira-escura", new THREE.CylinderGeometry(0.14, 0.16, y0, 6).translate(x, y0 / 2, z), variar("#3a3028", r, 0.1), 0.1, 0.3);
    }
  }
  for (const z of [-F / 2 + RECUO, F / 2 - RECUO]) obra.por("madeira", bloco(L - 2 * RECUO, 0.16, 0.12, dx, y0 * 0.45, z), "#3a3028", 0.1, 0);
}

/** Deque na frente da palafita: tábua, guarda-corpo, escada e rede de pesca pendurada. */
function deque(obra: Obra, L: number, F: number, y0: number, r: () => number, dx = 0) {
  const P = 1.9;
  const zf = F / 2 - RECUO + R;
  obra.por("madeira", bloco(L - 0.4, 0.14, P, dx, y0 - 0.14, zf + P / 2), "#5a4a38", 0.12, 0);
  obra.por("neve", bloco(L - 0.9, 0.05, P - 0.5, dx + (r() - 0.5) * 0.4, y0, zf + P / 2 - 0.1), "#eef1f3", 0.04, 0);
  for (const s of [-1, 1]) obra.por("madeira-escura", new THREE.CylinderGeometry(0.12, 0.14, y0 + 1.0, 6).translate(dx + s * (L / 2 - 0.3), (y0 + 1.0) / 2, zf + P - 0.15), "#3a3028", 0.1, 0.3);
  obra.por("madeira", bloco(L - 0.6, 0.09, 0.09, dx, y0 + 0.95, zf + P - 0.15), "#4a3a2c", 0.1, 0);
  // Escada de lado.
  const ladoEscada = r() < 0.5 ? -1 : 1;
  const xe = dx + ladoEscada * (L / 2 - 1.2);
  const degraus = Math.max(2, Math.round(y0 / 0.3));
  for (let i = 0; i < degraus; i++) obra.por("madeira", bloco(1.0, 0.08, 0.32, xe, (i * y0) / degraus, zf + P + 0.2 + (degraus - 1 - i) * 0.28 - 0.1).translate(0, 0, -0.1), "#4a3a2c", 0.1, 0);
  // Rede pendurada no guarda-corpo.
  const g = new THREE.PlaneGeometry(1.8, 0.9).translate(-ladoEscada * L * 0.2 + dx, y0 + 0.5, zf + P - 0.08);
  obra.por("lona", g, "#6b6456", 0.1, 0);
  obra.por("lona", g.clone().rotateY(Math.PI).translate(2 * (-ladoEscada * L * 0.2 + dx), 0, 2 * (zf + P - 0.08) - 0.02), "#6b6456", 0.1, 0);
}

/** Defumador: barraco alto de tábua enegrecida, respiro no cume, fumaça e varal de peixe. */
function defumador(obra: Obra, t: Obra, x: number, z: number, w: number, d: number, h: number, r: () => number) {
  obra.por("madeira-escura", bloco(w, h, d, x, 0, z), "#2e2620", 0.12, 0.3);
  for (const u of aoLongo(w, Math.max(2, Math.floor(w / 0.6)), 0.15)) obra.por("madeira-escura", bloco(0.07, h, 0.05, x + u, 0, z + d / 2 + 0.02), "#1f1a16", 0.1, 0);
  obra.por("madeira-escura", bloco(0.8, 1.6, 0.06, x, 0, z + d / 2 + 0.03), "#241e19", 0.1, 0);
  const a = cobrir(t, { tipo: "duas-aguas", L: d, F: w, A: h, s: 1.0, beiral: 0.3, esp: 0.12, giro: Math.PI / 2, x, z, material: "telha-escura", cor: "#2e2a26", neve: { recuo: 0.15, espessura: 0.14 } });
  obra.por("madeira-escura", bloco(0.7, 0.5, 0.7, x, a.topo - 0.2, z), "#241e19", 0.1, 0);
  fumaca(obra, x, a.topo + 0.3, z, Math.floor(r() * 1e6));
}

/** Varal de peixe e de couro: dois esteios, travessa e peças penduradas. */
function varal(obra: Obra, x: number, z: number, w: number, giro: number, coisa: "peixe" | "couro", r: () => number) {
  const peca = (g: THREE.BufferGeometry) => g.rotateY(giro).translate(x, 0, z);
  for (const s of [-1, 1]) obra.por("madeira", peca(bloco(0.12, 1.9, 0.12, (s * w) / 2, 0, 0)), "#4a3a2c", 0.1, 0.2);
  obra.por("madeira", peca(bloco(w, 0.09, 0.09, 0, 1.8, 0)), "#4a3a2c", 0.1, 0);
  const n = coisa === "peixe" ? Math.round(w / 0.25) : Math.max(1, Math.round(w / 1.1));
  for (let i = 0; i < n; i++) {
    const u = -w / 2 + ((i + 0.5) * w) / n;
    if (coisa === "peixe") obra.por("osso", peca(bloco(0.1, 0.42 + r() * 0.12, 0.04, u, 1.3, 0)), variar("#9a9a8a", r, 0.15), 0.1, 0);
    else obra.por("lona", peca(bloco(0.85, 1.0 + r() * 0.3, 0.04, u, 0.65, 0)), variar("#6a4a32", r, 0.15), 0.12, 0);
  }
}

/** Couro esticado num bastidor encostado na parede e galhada de cervo sobre a porta. */
function sinaisDeCaca(obra: Obra, c: Cabana, r: () => number) {
  const u = (r() < 0.5 ? -1 : 1) * c.Lw * 0.28;
  const g = naFace(bloco(1.3, 1.3, 0.05, 0, 0, R + 0.1), "frente", c.Lw, c.Fw, u, c.y0 + 0.8).translate(c.dx, 0, 0);
  obra.por("lona", g, variar("#7a5a3a", r, 0.15), 0.12, 0);
  for (const s of [-1, 1]) obra.por("madeira", naFace(bloco(0.06, 1.7, 0.06, s * 0.75, -0.2, R + 0.14).rotateZ(s * 0.05), "frente", c.Lw, c.Fw, u, c.y0 + 0.8).translate(c.dx, 0, 0), "#4a3a2c", 0.1, 0);
  // Galhada: duas hastes inclinadas com pontas.
  const yG = c.y0 + (c.frontal ? c.A - c.y0 + 1.2 : 2.6);
  for (const s of [-1, 1]) {
    obra.por("osso", naFace(bloco(0.06, 0.7, 0.06, 0, 0, R + 0.15).rotateZ(-s * 0.6).translate(s * 0.18, 0, 0), "frente", c.Lw, c.Fw, 0, yG).translate(c.dx, 0, 0), "#d8cfbd", 0.08, 0);
    obra.por("osso", naFace(bloco(0.05, 0.35, 0.05, 0, 0, R + 0.15).rotateZ(-s * 0.1).translate(s * 0.42, 0.35, 0), "frente", c.Lw, c.Fw, 0, yG).translate(c.dx, 0, 0), "#d8cfbd", 0.08, 0);
  }
}

/** Casa comum, casa de pesca (palafita, defumador) e cabana de caça. */
function casa(p: PredioLocal, r: () => number, cor: Cor): PecasDoPredio {
  const pesca = /pesca/i.test(p.nome);
  const caca = /ca[cç]a/i.test(p.nome) || p.id === "casa-cacador";
  const sobePalafita = pesca && !p.entravel && r() < 0.7;
  const comDefumador = pesca && p.largura >= 8 && r() < 0.55;
  const L = p.largura;
  const Lc = comDefumador ? Math.round(L * 0.68 * 10) / 10 : L;
  const lado = r() < 0.5 ? -1 : 1;
  const dx = comDefumador ? (lado * (L - Lc)) / 2 : 0;
  const y0 = sobePalafita ? 1.1 + r() * 0.4 : 0.35;
  const c = cabana(p, r, cor, { L: Lc, dx, y0, A: sobePalafita ? p.altura + 0.6 : p.altura });
  if (sobePalafita) {
    palafita(c.obra, Lc, p.fundo, y0, r, dx);
    deque(c.obra, Lc, p.fundo, y0, r, dx);
  } else if (!p.entravel && r() < 0.45) {
    alpendre(c.obra, c.t, Lc, p.fundo, { comprimento: Lc - 0.6, profundidade: 1.8, altura: 2.3, esteios: Math.max(2, Math.round(Lc / 3)), madeira: "#4a3a2c", telha: cor.telhado, neve: 0.18, piso: 0.35, pingentes: 4, u: dx });
  }
  if (comDefumador) {
    const w = L - Lc - 0.3;
    defumador(c.obra, c.t, -lado * (L / 2 - w / 2 - 0.05), -p.fundo * 0.15, w, Math.min(p.fundo * 0.6, 4), Math.max(2.8, p.altura * 0.85), r);
    varal(c.obra, -lado * (L / 2 - w / 2), p.fundo / 2 + 1.0, Math.max(1.4, w), 0, "peixe", r);
  }
  if (caca) {
    sinaisDeCaca(c.obra, c, r);
    varal(c.obra, -c.Lw / 2 + 1.2, p.fundo / 2 + 1.4, 2.2, 0, "couro", r);
  }
  if (!sobePalafita && !comDefumador && r() < 0.6) lenha(c.obra, "frente", Lc, p.fundo - 2 * RECUO + 2 * R, (r() < 0.5 ? -1 : 1) * (Lc / 2 - 1.2), 1.4, 1.0 + r() * 0.3, r, dx);
  return fechar(c);
}

/** Igreja de tábua em pé, telhado íngreme e torre de flecha sobre a fachada. */
function igreja(p: PredioLocal, r: () => number, cor: Cor): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(21);
  const t = new Obra(22);
  const dentro = new Obra(23);
  const tabua = de(r, ["#5e5246", "#665a4c", "#574a3e"]);
  obra.por("pedra-escura", bloco(L + 0.3, 0.6, F + 0.3, 0, 0, 0), cor.pedra, 0.12, 0.2);
  const e = 0.3;
  if (p.entravel) {
    obra.por("madeira", bloco(L, A, e, 0, 0, -F / 2 + e / 2), tabua, 0.1);
    for (const s of [-1, 1]) obra.por("madeira", bloco(e, A, F - 2 * e, s * (L / 2 - e / 2), 0, 0), tabua, 0.1);
    const lado = (L - PORTA_DE_ENTRAR.largura) / 2;
    for (const s of [-1, 1]) obra.por("madeira", bloco(lado, A, e, s * (PORTA_DE_ENTRAR.largura / 2 + lado / 2), 0, F / 2 - e / 2), tabua, 0.1);
    obra.por("madeira", bloco(PORTA_DE_ENTRAR.largura, A - PORTA_DE_ENTRAR.altura, e, 0, PORTA_DE_ENTRAR.altura, F / 2 - e / 2), tabua, 0.1);
  } else obra.por("madeira", bloco(L, A, F, 0, 0, 0), tabua, 0.1);
  // Mata-juntas em todas as faces.
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
    const comp = f === "frente" || f === "fundos" ? L : F;
    for (const u of aoLongo(comp, Math.floor(comp / 0.8), 0.2)) {
      if (f === "frente" && Math.abs(u) < (p.entravel ? 2.4 : 1.2)) continue;
      obra.por("madeira", naFace(bloco(0.07, A - 0.6, 0.05, 0, 0, 0.02), f, L, F, u, 0.6), variar(tabua, r, 0.12), 0.08, 0);
    }
  }
  const c: Telhado = { tipo: "duas-aguas", L: F, F: L, A, s: 1.15, beiral: 0.6, giro: Math.PI / 2, material: "telha-escura", cor: cor.telhado, neve: { recuo: -0.08, espessura: 0.28 }, pingentes: Math.round(F * 0.7), semente: 5 };
  const a = cobrir(t, c);
  oitaoDeTabua(obra, c, tabua, r);
  // Torre sobre a fachada: base fechada, sineira vazada e flecha alta.
  const lado = Math.min(4, Math.max(3, L * 0.28));
  const zT = F / 2 - lado / 2 - 0.1;
  const baseT = A + (a.topo - A) * 0.55;
  const hT = a.topo - baseT + 2.2;
  obra.por("madeira", bloco(lado, hT, lado, 0, baseT, zT), tabua, 0.1);
  for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) obra.por("madeira", bloco(0.3, 2.0, 0.3, (px * (lado - 0.3)) / 2, baseT + hT, zT + (pz * (lado - 0.3)) / 2), tabua, 0.1);
  obra.por("ferro", new THREE.CylinderGeometry(0.3, 0.55, 0.8, 8).translate(0, baseT + hT + 0.9, zT), "#6a5a2a", 0.05, 0);
  obra.por("madeira", bloco(lado + 0.3, 0.25, lado + 0.3, 0, baseT + hT + 2.0, zT), tabua, 0.1);
  const flecha = lado * 2.4;
  const topoT = baseT + hT + 2.25;
  t.por("telha-escura", new THREE.ConeGeometry((lado + 0.4) * 0.71, flecha, 4).rotateY(Math.PI / 4).translate(0, topoT + flecha / 2, zT), cor.telhado, 0.1, 0);
  t.por("neve", new THREE.ConeGeometry((lado + 0.45) * 0.71, flecha * 0.25, 4, 1, true).rotateY(Math.PI / 4).translate(0, topoT + flecha * 0.125, zT), "#eef1f3", 0.04, 0);
  obra.por("ferro", bloco(0.09, 1.3, 0.09, 0, topoT + flecha, zT), "#2c2a28", 0.02, 0);
  obra.por("ferro", bloco(0.6, 0.09, 0.09, 0, topoT + flecha + 0.85, zT), "#2c2a28", 0.02, 0);
  // Porta, rosácea e janelas altas.
  const corP: Cor = { ...cor, tabua: "#3e3226", porta: "#4b3423" };
  for (const s of [-1, 1]) obra.por("madeira", naFace(bloco(0.25, p.entravel ? 3.1 : 3.0, 0.15, s * ((p.entravel ? 4.2 : 2) / 2 + 0.12), 0, 0.05), "frente", L, F, 0, 0), "#3e3226", 0.08, 0);
  if (!p.entravel) obra.por("madeira", naFace(bloco(2, 3.0, 0.07, 0, 0, 0.04), "frente", L, F, 0, 0), corP.porta, 0.08, 0);
  else for (const s of [-1, 1]) obra.por("madeira", naFace(bloco(0.07, 2.9, 2.1, 0, 0, -1.05).translate(s * 2.06, 0, -0.1), "frente", L, F, 0, 0), corP.porta, 0.08, 0);
  obra.por("vidro", naFace(new THREE.CircleGeometry(0.7, 8), "frente", L, F, 0, A + 0.5, 0.04), "#2a3236", 0.04, 0);
  for (const u of aoLongo(F - lado, Math.max(2, Math.floor(F / 5)), 1.6)) {
    for (const f of ["esquerda", "direita"] as Face[]) {
      obra.por("vidro", naFace(bloco(0.9, 2.4, 0.04, 0, 0, 0.02), f, L, F, u - lado / 2, A * 0.3), "#2a3236", 0.04, 0);
      obra.por("madeira", naFace(bloco(1.2, 0.18, 0.15, 0, 2.4, 0.05), f, L, F, u - lado / 2, A * 0.3), "#3e3226", 0.08, 0);
    }
  }
  obra.por("madeira", naFace(bloco(Math.min(L - 2, 7), 0.5, 1.8, 0, 0, 0.9), "frente", L, F, 0, 0), "#4a3a2c", 0.1, 0.3);
  if (p.entravel) {
    dentro.por("madeira", bloco(L - 0.8, 0.08, F - 0.8, 0, 0.02, 0), "#6a5a42", 0.08, 0);
    for (let i = 0; i < Math.floor(F / 2.4) - 2; i++) for (const s of [-1, 1]) dentro.por("madeira", bloco(L * 0.3, 0.5, 0.45, s * L * 0.22, 0, F / 2 - 3 - i * 2.2), "#4a3626", 0.08, 0);
    dentro.por("madeira", bloco(L * 0.4, 1.2, 1.2, 0, 0, -F / 2 + 1.3), "#5e5246", 0.06, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

/** Galpão de tábua: barracão de barcos (canoa dentro), armazém de gelo (blocos na porta) ou paiol. */
function galpao(p: PredioLocal, r: () => number, cor: Cor, qual: "barcos" | "gelo" | "comum"): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(41);
  const t = new Obra(42);
  const dentro = new Obra(43);
  const tabua = qual === "gelo" ? "#5a5248" : de(r, ["#4a3a2c", "#55452f", "#3e3226"]);
  const base = qual === "gelo" ? 1.0 : 0.4;
  obra.por("pedra-escura", bloco(L + 0.2, base, F + 0.2, 0, 0, 0), cor.pedra, 0.12, 0.2);
  const e = qual === "gelo" ? 0.6 : 0.3;
  const vao = p.entravel || qual === "barcos" ? Math.min(L - 1.2, Math.max(PORTA_DE_ENTRAR.largura, qual === "barcos" ? L * 0.6 : 0)) : 0;
  const altVao = Math.max(PORTA_DE_ENTRAR.altura, qual === "barcos" ? A * 0.75 : 0);
  if (vao) {
    obra.por("madeira", bloco(L, A - base, e, 0, base, -F / 2 + e / 2), tabua, 0.1);
    for (const s of [-1, 1]) obra.por("madeira", bloco(e, A - base, F - 2 * e, s * (L / 2 - e / 2), base, 0), tabua, 0.1);
    const lado = (L - vao) / 2;
    for (const s of [-1, 1]) obra.por("madeira", bloco(lado, A - base, e, s * (vao / 2 + lado / 2), base, F / 2 - e / 2), tabua, 0.1);
    obra.por("madeira", bloco(vao, A - altVao, e, 0, altVao, F / 2 - e / 2), tabua, 0.1);
  } else {
    obra.por("madeira", bloco(L - 0.1, A - base, F - 0.1, 0, base, 0), tabua, 0.1);
    obra.por("madeira-escura", naFace(bloco(2.6, 2.6, 0.08, 0, 0, 0.04), "frente", L, F, 0, base), "#2e2620", 0.08, 0);
  }
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
    const comp = f === "frente" || f === "fundos" ? L : F;
    for (const u of aoLongo(comp, Math.floor(comp / 1.0), 0.3)) {
      if (f === "frente" && Math.abs(u) < (vao ? vao / 2 + 0.1 : 1.4)) continue;
      obra.por("madeira", naFace(bloco(0.08, A - base, 0.05, 0, 0, 0.02), f, L, F, u, base), variar(tabua, r, 0.12), 0.1, 0);
    }
  }
  const c: Telhado = { tipo: "duas-aguas", L, F, A, s: 0.85, beiral: 0.6, material: "telha-escura", cor: cor.telhado, neve: { recuo: -0.08, espessura: 0.26 }, pingentes: Math.round(L * 0.6), semente: 4 };
  const a = cobrir(t, c);
  oitaoDeTabua(obra, c, tabua, r);
  if (qual === "barcos") {
    // Canoa de tronco no chão, emborcada, e remos encostados.
    const canoa = new THREE.CylinderGeometry(0.45, 0.45, Math.min(F - 1.6, 6), 8, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI).scale(1, 0.8, 1).translate(0, 0.45 + base * 0, 0);
    obra.por("madeira", canoa, "#5a4030", 0.1, 0.2);
    for (const s of [-1, 1]) obra.por("madeira", bloco(0.08, 2.2, 0.08, s * (vao / 2 + 0.4), 0, F / 2 + 0.3).rotateZ(s * 0.12), "#6a5a44", 0.1, 0);
    obra.por("madeira", bloco(Math.min(vao, 4), 0.14, 2.6, 0, 0, F / 2 + 1.3), "#5a4a38", 0.12, 0.3);
  } else if (qual === "gelo") {
    // Blocos de gelo cortados do lago, empilhados na frente; respiro no cume.
    for (let i = 0; i < 7; i++) {
      const x = -L / 2 + 1.0 + (i % 4) * 0.75 + (i >= 4 ? 0.35 : 0);
      obra.por("neve", bloco(0.7, 0.55, 0.7, x, i >= 4 ? 0.55 : 0, F / 2 + 1.0).rotateY((r() - 0.5) * 0.1), "#bcd6e2", 0.06, 0);
    }
    obra.por("madeira", bloco(1.0, 0.9, 1.0, 0, a.topo - 0.3, 0), tabua, 0.1);
    cobrir(t, { tipo: "duas-aguas", L: 1.0, F: 1.0, A: a.topo + 0.6, s: 0.9, beiral: 0.25, esp: 0.08, material: "telha-escura", cor: cor.telhado, neve: { recuo: -0.05, espessura: 0.12 } });
    obra.por("madeira", bloco(0.6, 0.1, 2.4, L / 2 - 1.2, 0, F / 2 + 1.4), "#4a3a2c", 0.1, 0);
  } else if (r() < 0.6) {
    lenha(obra, "frente", L, F, L / 2 - 1.5, 1.8, 1.2, r);
  }
  if (p.entravel) interiorBasico(dentro, L, F, { piso: "#5a4a38", madeira: "#3e2f22" });
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

/** Moinho de tábua octogonal, capuz de neve e pás. */
function moinho(p: PredioLocal, r: () => number, cor: Cor): PecasDoPredio {
  const raio = Math.min(p.largura, p.fundo) / 2;
  const obra = new Obra(51);
  const t = new Obra(52);
  obra.por("pedra-escura", new THREE.CylinderGeometry(raio, raio * 1.05, 0.6, 8).translate(0, 0.3, 0), cor.pedra, 0.12, 0.2);
  obra.por("madeira", new THREE.CylinderGeometry(raio * 0.72, raio * 0.95, p.altura - 0.6, 8, 1, true).translate(0, p.altura / 2 + 0.3, 0), cor.tabua, 0.12, 0.3);
  obra.por("madeira", naFace(bloco(1.1, 2.1, 0.12, 0, 0, raio * 0.9 - raio), "frente", raio * 2, raio * 2, 0, 0.6), cor.porta, 0.08, 0);
  t.por("telha-escura", new THREE.ConeGeometry(raio * 0.9, raio * 1.3, 8).translate(0, p.altura + raio * 0.65, 0), cor.telhado, 0.1, 0);
  t.por("neve", new THREE.ConeGeometry(raio * 0.92, raio * 1.0, 8).translate(0, p.altura + raio * 0.78, 0), "#eef1f3", 0.04, 0);
  const giro = r() * Math.PI;
  for (let i = 0; i < 4; i++) {
    const pa = bloco(0.3, raio * 2.5, 0.08, 0, 0, 0).translate(0, raio * 0.2, 0).rotateZ(giro + (i * Math.PI) / 2);
    obra.por("madeira", pa.translate(0, p.altura * 0.82, raio + 0.4), "#6a5a44", 0.1, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

/** Defumadouro grande: galpão de tábua preta com respiros fumegando e varais de peixe. */
function fabrica(p: PredioLocal, r: () => number, cor: Cor): PecasDoPredio {
  const base = galpao({ ...p, altura: Math.min(p.altura, 6) }, r, { ...cor, telhado: "#2e2a26" }, "comum");
  const obra = new Obra(61);
  const t = new Obra(62);
  const A = Math.min(p.altura, 6);
  const topo = A + 0.85 * (p.fundo / 2 + 0.6) - 0.85 * 0.6;
  for (const x of [-p.largura * 0.25, p.largura * 0.25]) {
    obra.por("madeira-escura", bloco(1.2, 1.2, 1.2, x, topo - 0.4, 0), "#241e19", 0.1, 0);
    cobrir(t, { tipo: "duas-aguas", L: 1.2, F: 1.2, A: topo + 0.8, s: 0.9, beiral: 0.3, esp: 0.08, x, material: "telha-escura", cor: "#2e2a26", neve: { recuo: -0.05, espessura: 0.12 } });
    fumaca(obra, x, topo + 1.5, 0, Math.floor(r() * 1e6));
  }
  varal(obra, -p.largura / 4, p.fundo / 2 + 1.6, Math.min(4, p.largura * 0.35), 0, "peixe", r);
  varal(obra, p.largura / 4, p.fundo / 2 + 1.6, Math.min(4, p.largura * 0.35), 0, "peixe", r);
  return { ...base, corpo: [...base.corpo, ...obra.pecas()], telhado: [...base.telhado, ...t.pecas()] };
}

/** Torre de vigia de tora: quatro troncos, mão-francesa, guarita e telhado com neve. */
function torre(p: PredioLocal, r: () => number, cor: Cor): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(71);
  const t = new Obra(72);
  const h = A - 2.2;
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    obra.por("madeira-escura", new THREE.CylinderGeometry(0.16, 0.2, h, 6).translate((x * (L - 0.6)) / 2, h / 2, (z * (F - 0.6)) / 2), variar(cor.tora, r), 0.1, 0.3);
  }
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
    const diag = Math.hypot(L - 0.6, h * 0.45);
    obra.por("madeira", naFace(bloco(0.1, diag, 0.1, 0, -diag / 2, 0).rotateZ(Math.atan2(L - 0.6, h * 0.45)).translate(0, h * 0.5, 0), f, L - 0.6, F - 0.6, 0, 0), "#4a3a2c", 0.1, 0);
  }
  obra.por("madeira", bloco(L, 0.25, F, 0, h, 0), "#4a3a2c", 0.1, 0);
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) obra.por("madeira", naFace(bloco(L, 1.0, 0.1, 0, 0, -0.05), f, L, F, 0, h + 0.25), cor.tabua, 0.1, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) obra.por("madeira", bloco(0.16, 2.0, 0.16, (x * L) / 2 - x * 0.1, h + 0.25, (z * F) / 2 - z * 0.1), "#3e3226", 0.1, 0);
  cobrir(t, { tipo: "quatro-aguas", L, F, A: h + 2.25, s: 0.9, beiral: 0.3, material: "telha-escura", cor: cor.telhado, neve: { recuo: -0.05, espessura: 0.18 } });
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

/** Tenda de couro de caçador com neve por cima e fogueira na frente. */
function tenda(p: PredioLocal, r: () => number): PecasDoPredio {
  const obra = new Obra(81);
  cobrir(obra, { tipo: "duas-aguas", L: p.largura, F: p.fundo, A: 0.25, s: (p.altura - 0.25) / (p.fundo / 2 + 0.1), beiral: 0.1, esp: 0.05, material: "lona", cor: de(r, ["#7a5a3a", "#6a4e34", "#8a6a48"]), neve: { recuo: 0.2, espessura: 0.1 } });
  for (const s of [-1, 1]) obra.por("madeira", bloco(0.12, p.altura + 0.3, 0.12, (s * p.largura) / 2, 0, 0), "#4a3626", 0.1, 0);
  obra.por("pedra", bloco(1.0, 0.25, 1.0, 0, 0, p.fundo / 2 + 1.4), "#5a5650", 0.1, 0);
  obra.por("carvao", bloco(0.5, 0.15, 0.5, 0, 0.2, p.fundo / 2 + 1.4), "#2b2826", 0.05, 0);
  varal(obra, p.largura / 2 - 0.6, p.fundo / 2 + 1.0, 1.4, Math.PI / 2, "couro", r);
  return { corpo: obra.pecas(), telhado: [], interior: [] };
}

/** Longe: volume escuro, telhado íngreme todo branco, oitões e chaminé. */
function longe(p: PredioLocal, r: () => number, cor: Cor): PecasDoPredio {
  const obra = new Obra(1);
  const t = new Obra(2);
  const { largura: L, fundo: F, altura: A } = p;
  if (p.tipo === "tenda") {
    cobrir(t, { tipo: "duas-aguas", L, F, A: 0.2, s: A / (F / 2), beiral: 0.1, material: "lona", cor: "#7a5a3a", neve: { recuo: 0.2, espessura: 0.1 }, soCima: true });
    return { corpo: [], telhado: t.pecas(), interior: [] };
  }
  const corpo = p.tipo === "igreja" ? "#5e5246" : cor.tora;
  obra.por("madeira-escura", bloco(L - 0.4, A, F - 0.4, 0, 0, 0), corpo);
  if (p.tipo === "moinho" || p.tipo === "torre") {
    t.por("neve", bloco(L, 1.4, F, 0, A, 0), "#eef1f3", 0.04, 0);
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  const frontal = p.tipo === "igreja" || (p.tipo === "casa" && r() < 0.55) || p.id === "salao";
  const c: Telhado = {
    tipo: "duas-aguas",
    L: frontal ? F - 0.4 : L - 0.4,
    F: frontal ? L - 0.4 : F - 0.4,
    A,
    s: p.tipo === "galpao" || p.tipo === "fabrica" ? 0.85 : 1.0,
    beiral: 0.6,
    giro: frontal ? Math.PI / 2 : 0,
    material: "telha-escura",
    cor: cor.telhado,
    neve: { recuo: -0.08, espessura: 0.24 },
    soCima: true,
  };
  const a = cobrir(t, c);
  oitoes(obra, c, "madeira-escura", corpo);
  if (p.tipo === "igreja") {
    const lado = Math.min(4, Math.max(3, L * 0.28));
    obra.por("madeira", bloco(lado, a.topo - A + 4, lado, 0, A, F / 2 - lado / 2), corpo, 0.1, 0);
    t.por("telha-escura", new THREE.ConeGeometry(lado * 0.75, lado * 2.4, 4).rotateY(Math.PI / 4).translate(0, a.topo + 4 + lado * 1.2, F / 2 - lado / 2), cor.telhado, 0.1, 0);
  } else if (p.tipo !== "galpao") obra.por("pedra", bloco(0.9, a.topo + 0.6 - A, 0.9, (r() - 0.5) * L * 0.5, A, -F * 0.15), cor.pedra, 0.1, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

export function gerarMadeiraFria(p: PredioLocal, nivel: NivelPredio, semente: number): PecasDoPredio {
  const r = sorteio(semente);
  const cor = paleta(r);
  if (p.tipo === "ruina") return ruina(nivel === 1 ? { ...p, entravel: false } : p, r, "#3e352e");
  if (nivel === 1) return longe(p, r, cor);
  const { largura: L, fundo: F } = p;
  switch (p.tipo) {
    case "igreja":
      return igreja(p, r, cor);
    case "publico":
    case "banco": {
      if (p.id === "salao" || /sal[aã]o/i.test(p.nome)) {
        // Salão Comunitário: oitão enorme para a praça, portão duplo, alpendre corrido e galhada.
        const c = cabana(p, r, cor, { frontal: true, chamine: "pedra", s: 0.95, pavimentos: 1, janelasNaFrente: 4 });
        alpendre(c.obra, c.t, L, F, { comprimento: L - 1, profundidade: 2.6, altura: 2.8, esteios: Math.max(4, Math.round(L / 3)), madeira: "#4a3a2c", telha: cor.telhado, neve: 0.2, piso: 0.4, pingentes: 8, guarda: true });
        sinaisDeCaca(c.obra, c, r);
        chamineDePedra(c.obra, -c.Lw * 0.25, -c.Fw / 2 + 0.3, 0.35, c.topo - 1, cor.pedra, 991, 1.0);
        return fechar(c);
      }
      // Casa Grande da anciã (e prédios públicos): dois andares de tora, varanda corrida
      // embaixo, sacada de madeira em cima, duas chaminés de pedra.
      const c = cabana(p, r, cor, { frontal: false, chamine: null, pavimentos: 2, A: Math.max(p.altura, 6), s: 0.85, janelasNaFrente: Math.min(4, Math.max(2, Math.floor(L / 4))) });
      const yS = c.y0 + (c.A - c.y0) / 2;
      alpendre(c.obra, c.t, L, F, { comprimento: L - 1, profundidade: 2.4, altura: yS - 0.5, esteios: Math.max(4, Math.round(L / 3)), madeira: "#4a3a2c", telha: cor.telhado, neve: 0.2, piso: 0.35, pingentes: 8 });
      for (const s of [-1, 1]) chamineDePedra(c.obra, s * (c.Lw / 2 - 0.2), 0, 0.35, c.topo + 0.8, cor.pedra, 900 + s, 1.0);
      if (p.tipo === "banco") c.obra.por("madeira", naFace(bloco(4, 0.6, 0.08, 0, 0, 0.3), "frente", L, F, 0, yS + 1.6), "#2e2620", 0.06, 0);
      if (p.id === "casa-grande") {
        // Sino de chamar a comunidade num poste ao lado da escada.
        c.obra.por("madeira", bloco(0.2, 3.2, 0.2, L / 2 - 0.5, 0, F / 2 + 2.2), "#4a3a2c", 0.1, 0);
        c.obra.por("ferro", new THREE.CylinderGeometry(0.15, 0.25, 0.35, 8).translate(L / 2 - 0.5, 2.9, F / 2 + 2.45), "#6a5a2a", 0.05, 0);
      }
      return fechar(c);
    }
    case "hotel": {
      // Pousada: dois andares de tora com sacada de madeira coberta.
      const c = cabana(p, r, cor, { frontal: false, pavimentos: 2, A: Math.max(p.altura, 6), chamine: "pedra" });
      const yS = c.y0 + (c.A - c.y0) / 2;
      c.obra.por("madeira", naFace(bloco(L - 1, 0.2, 1.5, 0, yS - 0.1, R + 0.75), "frente", c.Lw, c.Fw, 0, 0), "#4a3a2c", 0.1, 0);
      for (const u of aoLongo(L - 1, Math.max(3, Math.floor(L / 3.2)), 0.2)) {
        if (p.entravel && Math.abs(u) < 2.4) continue;
        c.obra.por("madeira-escura", naFace(new THREE.CylinderGeometry(0.13, 0.15, c.A, 6).translate(u, c.A / 2, R + 1.4), "frente", c.Lw, c.Fw, 0, 0), "#3a3028", 0.1, 0.2);
      }
      c.obra.por("madeira", naFace(bloco(L - 1, 0.1, 0.1, 0, yS + 0.95, R + 1.45), "frente", c.Lw, c.Fw, 0, 0), "#4a3a2c", 0.1, 0);
      for (const u of aoLongo(L - 1, Math.floor(L / 0.8), 0.2)) c.obra.por("madeira", naFace(bloco(0.06, 0.95, 0.06, u, yS + 0.1, R + 1.45), "frente", c.Lw, c.Fw, 0, 0), "#3e2f22", 0.1, 0);
      cobrir(c.t, { tipo: "uma-agua", L: L - 0.6, F: 1.6, A: c.A - 0.2, s: 0.4, beiral: 0.3, esp: 0.12, z: F / 2 - RECUO + R + 0.8, material: "telha-escura", cor: cor.telhado, neve: { recuo: -0.05, espessura: 0.2 }, pingentes: 6 });
      c.obra.por("madeira", naFace(bloco(4, 0.6, 0.08, 0, 0, R + 0.06), "frente", c.Lw, c.Fw, 0, yS - 1.0), "#3a2c20", 0.06, 0);
      return fechar(c);
    }
    case "comercio":
    case "saloon": {
      // Armazém de trocas, peixaria, oficina: cabana com alpendre, placa e o ofício na frente.
      const peixaria = /peix/i.test(p.nome) || p.id === "peixaria";
      const oficina = /oficina/i.test(p.nome);
      const trocas = /troca/i.test(p.nome);
      const c = cabana(p, r, cor, { frontal: !peixaria && r() < 0.5 });
      alpendre(c.obra, c.t, L, F, { comprimento: p.tipo === "saloon" ? L - 0.4 : Math.min(L - 1, 8), profundidade: 2.2, altura: 2.5, esteios: 3, madeira: "#4a3a2c", telha: cor.telhado, neve: 0.18, piso: 0.35, pingentes: 5, guarda: p.tipo === "saloon" });
      const yPlaca = c.frontal ? c.A + 0.1 : Math.min(c.A - 0.8, 3.3);
      c.obra.por("madeira", naFace(bloco(Math.min(L * 0.55, 5), 0.7, 0.08, 0, yPlaca, R + 0.08), "frente", c.Lw, c.Fw, 0, 0), "#2e2620", 0.06, 0);
      c.obra.por("madeira", naFace(bloco(Math.min(L * 0.55, 5) - 0.3, 0.45, 0.04, 0, yPlaca + 0.12, R + 0.13), "frente", c.Lw, c.Fw, 0, 0), "#c9b48a", 0.05, 0);
      if (peixaria) {
        varal(c.obra, -L / 4, F / 2 + 2.6, 2.6, 0, "peixe", r);
        for (const x of [L / 4, L / 4 + 0.8]) barril(c.obra, x, F / 2 + 2.7, r);
      } else if (trocas) {
        varal(c.obra, -L / 2 + 1.6, F / 2 + 2.6, 2.4, 0, "couro", r);
        caixote(c.obra, L / 2 - 1.2, F / 2 + 2.7, r);
        barril(c.obra, L / 2 - 2.1, F / 2 + 2.7, r);
      } else if (oficina) {
        c.obra.por("madeira", bloco(2.2, 0.9, 0.8, -L / 4, 0, F / 2 + 2.7), "#5a4030", 0.08, 0.2);
        c.obra.por("madeira", new THREE.TorusGeometry(0.55, 0.06, 4, 10).translate(L / 4, 0.6, F / 2 + 2.6), "#4a3a2c", 0.08, 0);
      } else {
        barril(c.obra, -L / 2 + 1.0, F / 2 + 2.7, r);
        caixote(c.obra, L / 2 - 1.0, F / 2 + 2.7, r);
      }
      return fechar(c);
    }
    case "estacao": {
      const c = cabana(p, r, cor, { frontal: false });
      alpendre(c.obra, c.t, L, F, { comprimento: L, profundidade: 2.8, altura: 2.9, esteios: Math.max(3, Math.round(L / 3.5)), madeira: "#4a3a2c", telha: cor.telhado, neve: 0.2, piso: 0.6, pingentes: 8 });
      c.obra.por("madeira", naFace(bloco(Math.min(L * 0.5, 5) - 0.3, 0.4, 0.05, 0, Math.min(c.A - 0.7, 3.5), R + 0.1), "frente", c.Lw, c.Fw, 0, 0), "#d9d1bd", 0.04, 0);
      return fechar(c);
    }
    case "galpao": {
      const qual = /barco/i.test(p.nome) || p.id === "barracao-barcos" ? "barcos" : /gelo/i.test(p.nome) || p.id === "armazem-gelo" ? "gelo" : "comum";
      return galpao(p, r, cor, qual);
    }
    case "fazenda": {
      // Paiol e curral de tora: cabana baixa de oitão, porta de feno e cocho.
      const c = cabana(p, r, cor, { frontal: true, chamine: null, A: Math.min(p.altura, 4.5), s: 0.9 });
      c.obra.por("madeira", naFace(bloco(1.4, 1.2, 0.08, 0, 0, R + 0.06), "frente", c.Lw, c.Fw, 0, c.A + 0.2), "#2e2620", 0.08, 0);
      c.obra.por("palha", bloco(1.4, 0.7, 0.9, -L / 2 + 1.2, 0, F / 2 + 1.2), "#a08a5a", 0.12, 0.2);
      c.obra.por("neve", bloco(1.3, 0.1, 0.8, -L / 2 + 1.2, 0.7, F / 2 + 1.2), "#eef1f3", 0.04, 0);
      return fechar(c);
    }
    case "moinho":
      return moinho(p, r, cor);
    case "fabrica":
      return fabrica(p, r, cor);
    case "torre":
      return torre(p, r, cor);
    case "tenda":
      return tenda(p, r);
    default:
      return casa(p, r, cor);
  }
}

const estilo: Estilo = { id: "madeira-fria", nome: "Madeira e gelo (Maria da Fé)", gerar: gerarMadeiraFria };

export default estilo;
