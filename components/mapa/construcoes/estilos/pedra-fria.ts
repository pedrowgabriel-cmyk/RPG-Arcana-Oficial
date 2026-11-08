// Pedra e frio (povoado da Serra da Saudade, ~40 almas): casinhas baixas de pedra bruta
// empilhada, cunhais de pedra grande alternada, vergas de laje sobre portas e janelas
// pequenas, telhado de laje de pedra ou de telha escura com neve na metade de cima,
// chaminé de pedra no oitão sempre fumegando, muro de pedra seca no terreiro, puxado de
// lenha ao lado. Capela caiada de espadana (sineira de parede), parada do trem de pedra.

import * as THREE from "three";
import { sorteio } from "../../natureza/ferramentas";
import { aoLongo, bloco, interiorBasico, naFace, Obra, type Face } from "../kit";
import type { Estilo, NivelPredio, PecasDoPredio, PredioLocal } from "../tipos";
import { ruina } from "./colonial";
import { alpendre, barril, caixote, chamineDePedra, cobrir, de, lenha, oitoes, PORTA_DE_ENTRAR, variar, type Telhado } from "./_pedra-fria-frio";

const PEDRA = ["#7b756b", "#847b6d", "#6f6b63", "#8a8173", "#77705f", "#6a655d"];
const CUNHAL = ["#9a9385", "#a39b8b", "#8e887c"];
const LAJE = ["#4f4c48", "#5a5650", "#48474a", "#55514a"];
const TELHA_ESCURA = ["#5e3a2e", "#55372c", "#6a4232", "#4d3328"];
const MADEIRA = ["#4a3626", "#3e2f22", "#56402a", "#4b3a2c"];
const FOLHA = ["#4b3423", "#3a2c20", "#56402a", "#4a5560", "#5a3026"];

type Cor = { pedra: string; cunhal: string; telhado: string; lajes: boolean; madeira: string; folha: string };

function paleta(r: () => number): Cor {
  const lajes = r() < 0.45;
  return { pedra: de(r, PEDRA), cunhal: de(r, CUNHAL), lajes, telhado: lajes ? de(r, LAJE) : de(r, TELHA_ESCURA), madeira: de(r, MADEIRA), folha: de(r, FOLHA) };
}

/** Coloca uma peça desenhada de frente numa face do corpo deslocado `dx` em x. */
const nf = (g: THREE.BufferGeometry, f: Face, L: number, F: number, u: number, y: number, dx: number, afasta = 0) => naFace(g, f, L, F, u, y, afasta).translate(dx, 0, 0);

/** Paredes de pedra com espessura; com vão, abre a porta larga no meio da fachada. */
function paredesDePedra(obra: Obra, dx: number, L: number, F: number, A: number, cor: string, material: "pedra" | "cantaria" = "pedra", vao?: { largura: number; altura: number }) {
  if (!vao) {
    obra.por(material, bloco(L, A, F, dx, 0, 0), cor, 0.1);
    return;
  }
  const e = 0.55;
  obra.por(material, bloco(L, A, e, dx, 0, -F / 2 + e / 2), cor, 0.1);
  for (const s of [-1, 1]) obra.por(material, bloco(e, A, F - e * 2, dx + s * (L / 2 - e / 2), 0, 0), cor, 0.1);
  const lado = (L - vao.largura) / 2;
  for (const s of [-1, 1]) obra.por(material, bloco(lado, A, e, dx + s * (vao.largura / 2 + lado / 2), 0, F / 2 - e / 2), cor, 0.1);
  obra.por(material, bloco(vao.largura, A - vao.altura, e, dx, vao.altura, F / 2 - e / 2), cor, 0.1);
}

/** Cunhais: pedras grandes nos cantos, uma comprida e uma curta, alternando de face. */
function cunhais(obra: Obra, dx: number, L: number, F: number, A: number, cor: string, r: () => number) {
  const fiada = 0.48 + r() * 0.08;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    for (let i = 0, y = 0.3; y < A - 0.3; i++, y += fiada) {
      const [a, b] = (i + (sx > 0 ? 1 : 0)) % 2 ? [0.95, 0.5] : [0.5, 0.95];
      const h = Math.min(fiada - 0.04, A - y);
      obra.por("cantaria", bloco(a, h, b, dx + sx * (L / 2 - a / 2 + 0.04), y, sz * (F / 2 - b / 2 + 0.04)), variar(cor, r, 0.1), 0.05, 0);
    }
  }
}

/** Pedras salientes espalhadas: quebram o plano liso da parede. */
function pedrasSoltas(obra: Obra, dx: number, L: number, F: number, A: number, cor: string, r: () => number, n: number) {
  const faces: Face[] = ["frente", "esquerda", "direita", "fundos"];
  for (let i = 0; i < n; i++) {
    const f = faces[i % 4];
    const comp = f === "frente" || f === "fundos" ? L : F;
    const w = 0.45 + r() * 0.5;
    const h = 0.28 + r() * 0.18;
    obra.por("pedra", nf(bloco(w, h, 0.07, 0, 0, 0.02), f, L, F, (r() - 0.5) * (comp - 1.6), 0.5 + r() * (A - 1.2), dx), variar(cor, r, 0.16), 0.08, 0);
  }
}

/** Janela pequena e funda: verga de laje, peitoril, caixilho em cruz e uma folha aberta. */
function janela(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, h: number, cor: Cor, r: () => number, dx = 0) {
  obra.por("vidro", nf(bloco(w, h, 0.04, 0, 0, 0), f, L, F, u, y, dx, 0.01), "#232a2e", 0.04, 0);
  obra.por("madeira-escura", nf(bloco(0.08, h, 0.06, 0, 0, 0.03), f, L, F, u, y, dx), cor.madeira, 0.06, 0);
  obra.por("madeira-escura", nf(bloco(w, 0.08, 0.06, 0, h * 0.55, 0.03), f, L, F, u, y, dx), cor.madeira, 0.06, 0);
  obra.por("cantaria", nf(bloco(w + 0.55 + r() * 0.2, 0.3, 0.16, 0, h, 0), f, L, F, u, y, dx), variar(cor.cunhal, r), 0.05, 0);
  obra.por("cantaria", nf(bloco(w + 0.3, 0.13, 0.24, 0, -0.13, 0.04), f, L, F, u, y, dx), variar(cor.cunhal, r), 0.05, 0);
  if (r() < 0.75) {
    const lado = r() < 0.5 ? -1 : 1;
    obra.por("madeira", nf(bloco(w * 0.95, h * 0.98, 0.05, lado * (w + 0.05), 0, 0.05), f, L, F, u, y, dx), cor.folha, 0.08, 0);
  }
}

/** Porta baixa de tábua com ombreiras de pedra e verga; aberta e larga no entrável. */
function portaDePedra(obra: Obra, L: number, F: number, u: number, w: number, h: number, cor: Cor, r: () => number, aberta: boolean, dx = 0) {
  for (const s of [-1, 1]) obra.por("cantaria", nf(bloco(0.32, h, 0.14, s * (w / 2 + 0.16), 0, 0.02), "frente", L, F, u, 0, dx), variar(cor.cunhal, r), 0.05, 0);
  obra.por("cantaria", nf(bloco(w + 1.0, 0.38, 0.18, 0, h, 0.02), "frente", L, F, u, 0, dx), variar(cor.cunhal, r), 0.05, 0);
  obra.por("cantaria", nf(bloco(w + 0.6, 0.16, 0.6, 0, 0, 0.3), "frente", L, F, u, 0, dx), "#7a756c", 0.06, 0);
  if (aberta) {
    for (const s of [-1, 1]) {
      const folha = bloco(0.07, h * 0.97, w / 2, 0, 0, -w / 4).translate(s * (w / 2 - 0.04), 0, -0.1);
      obra.por("madeira", nf(folha, "frente", L, F, u, 0, dx), cor.folha, 0.08, 0);
    }
  } else {
    obra.por("madeira", nf(bloco(w, h, 0.06, 0, 0, 0.03), "frente", L, F, u, 0, dx), cor.folha, 0.08, 0);
    for (const y of [0.35, h - 0.45]) obra.por("ferro", nf(bloco(w * 0.8, 0.06, 0.03, 0, y, 0.07), "frente", L, F, u, 0, dx), "#2c2a28", 0.02, 0);
  }
}

/** Muro de pedra seca do terreiro, à frente, com abertura na porta e neve no topo. */
function muroDePedraSeca(obra: Obra, L: number, F: number, profundidade: number, abertura: number, uAbertura: number, cor: string, r: () => number) {
  const z = F / 2 + profundidade;
  const trecho = (x0: number, x1: number, z0: number, z1: number) => {
    const comp = Math.hypot(x1 - x0, z1 - z0);
    if (comp < 0.4) return;
    const n = Math.max(1, Math.round(comp / 1.6));
    const giro = Math.atan2(-(z1 - z0), x1 - x0);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const h = 0.75 + r() * 0.3;
      const [x, zz] = [x0 + (x1 - x0) * t, z0 + (z1 - z0) * t];
      obra.por("pedra", bloco(comp / n + 0.05, h, 0.55, 0, 0, 0).rotateY(giro).translate(x, 0, zz), variar(cor, r, 0.14), 0.15, 0.3);
      obra.por("neve", bloco(comp / n - 0.1, 0.07, 0.45, 0, h, 0).rotateY(giro).translate(x, 0, zz), "#eef1f3", 0.04, 0);
    }
  };
  trecho(-L / 2 + 0.3, uAbertura - abertura / 2, z, z);
  trecho(uAbertura + abertura / 2, L / 2 - 0.3, z, z);
  trecho(-L / 2 + 0.3, -L / 2 + 0.3, F / 2 + 0.2, z - 0.3);
  trecho(L / 2 - 0.3, L / 2 - 0.3, F / 2 + 0.2, z - 0.3);
}

type Corpo = { obra: Obra; t: Obra; dentro: Obra; topo: number; A: number };

/**
 * Casa de pedra: corpo (às vezes com puxado de lenha ao lado), oitões de pedra,
 * telhado de laje ou telha escura com neve na metade de cima, chaminé no oitão.
 */
function casaDePedra(p: PredioLocal, r: () => number, cor: Cor, o: { pavimentos?: number; frontal?: boolean; puxado?: boolean; muro?: boolean; material?: "pedra" | "cantaria"; s?: number; chamine?: boolean } = {}): Corpo {
  const { largura: L, fundo: F } = p;
  const A = p.altura;
  const obra = new Obra(Math.floor(r() * 1e6));
  const t = new Obra(Math.floor(r() * 1e6));
  const dentro = new Obra(5);
  const pavimentos = o.pavimentos ?? (A >= 6.4 ? 2 : 1);
  const puxado = o.puxado ?? (!p.entravel && L >= 8 && r() < 0.4);
  const lado = r() < 0.5 ? -1 : 1;
  const Lc = puxado ? Math.round(L * (0.66 + r() * 0.08) * 10) / 10 : L;
  const dx = puxado ? (lado * (L - Lc)) / 2 : 0;
  const frontal = o.frontal ?? (!puxado && F >= 7 && r() < 0.35);
  const material = o.material ?? "pedra";

  // Embasamento de pedra mais escura, um pouco mais largo.
  obra.por("pedra-escura", bloco(Lc + 0.2, 0.45, F + 0.2, dx, 0, 0), "#55524d", 0.1, 0.2);
  paredesDePedra(obra, dx, Lc, F, A, cor.pedra, material, p.entravel ? PORTA_DE_ENTRAR : undefined);
  cunhais(obra, dx, Lc, F, A, cor.cunhal, r);
  pedrasSoltas(obra, dx, Lc, F, A, cor.pedra, r, material === "pedra" ? 8 : 3);
  if (pavimentos > 1) obra.por("cantaria", bloco(Lc + 0.1, 0.22, F + 0.1, dx, A / 2, 0), cor.cunhal, 0.05, 0);

  // Telhado.
  const s = o.s ?? (cor.lajes ? 0.42 + r() * 0.08 : 0.5 + r() * 0.12);
  const c: Telhado = {
    tipo: "duas-aguas",
    L: frontal ? F : Lc,
    F: frontal ? Lc : F,
    A,
    s,
    beiral: cor.lajes ? 0.45 : 0.6,
    esp: cor.lajes ? 0.26 : 0.18,
    giro: frontal ? Math.PI / 2 : 0,
    x: dx,
    material: cor.lajes ? "pedra-escura" : "telha-escura",
    cor: cor.telhado,
    lajes: cor.lajes ? 3 : 0,
    // Neve só na metade de cima: a telha escura aparece na barra do beiral.
    neve: { recuo: ((frontal ? Lc : F) / 2 + (cor.lajes ? 0.45 : 0.6)) * (0.3 + r() * 0.3), espessura: 0.11 },
    semente: Math.floor(r() * 1e6),
  };
  const a = cobrir(t, c);
  oitoes(obra, c, material, cor.pedra);
  if (!cor.lajes) t.por("telha-escura", bloco(frontal ? 0.3 : Lc + 1.2, 0.18, frontal ? F + 1.2 : 0.3, dx, a.topo - 0.05, 0), cor.telhado, 0.1, 0);

  // Puxado de um lado: telhado de uma água caindo para fora; lenheiro aberto ou quartinho fechado.
  if (puxado) {
    const pw = L - Lc;
    const px = -lado * (L / 2 - pw / 2);
    const Ap = A * 0.62;
    const pd = F * 0.86;
    const pz = -F / 2 + pd / 2;
    if (r() < 0.5) {
      obra.por("pedra", bloco(pw, Ap + 0.6, pd, px, 0, pz), variar(cor.pedra, r), 0.12, 0.2);
      janela(obra, "frente", pw, pd, 0, 1.0, 0.6, 0.7, cor, r, 0);
    } else {
      obra.por("pedra", bloco(pw, Ap + 0.6, 0.45, px, 0, -F / 2 + 0.22), variar(cor.pedra, r), 0.12, 0.2);
      obra.por("madeira", bloco(0.2, Ap, 0.2, px - lado * (pw / 2 - 0.2), 0, pz + pd / 2 - 0.2), cor.madeira, 0.1, 0);
      obra.por("madeira", bloco(pw - 0.6, 1.3, pd - 1.2, px, 0, pz - 0.2), "#5e4630", 0.12, 0.2);
      for (let i = 0; i < 6; i++) {
        const g = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 5).rotateX(Math.PI / 2).translate(px + (r() - 0.5) * (pw - 0.9), 0.2 + r() * 0.9, pz - 0.2 + (pd - 1.2) / 2 + 0.03);
        obra.por("madeira", g, variar("#a07d55", r, 0.12), 0.05, 0);
      }
    }
    // O pé de uma água fica no lado de fora; a parte alta encosta na parede da casa.
    const pc: Telhado = { tipo: "uma-agua", L: pd, F: pw, A: Ap + 0.6, s: 0.3, beiral: 0.35, esp: 0.14, giro: -lado * (Math.PI / 2), x: px, z: pz, material: "telha-escura", cor: cor.lajes ? "#4f3a30" : cor.telhado, neve: { recuo: 0.1, espessura: 0.09 } };
    cobrir(t, pc);
  }

  // Fachada: porta e janelas. O entrável abre o vão largo no meio.
  const larguraPorta = p.entravel ? PORTA_DE_ENTRAR.largura : 1.05;
  const alturaPorta = p.entravel ? PORTA_DE_ENTRAR.altura : 2.05;
  const vaos = Math.max(2, Math.floor((Lc - 1.2) / 2.5));
  const us = aoLongo(Lc, vaos, 1.4);
  const iPorta = p.entravel ? -1 : Math.min(vaos - 1, Math.floor(r() * vaos));
  const uPorta = p.entravel ? 0 : us[iPorta];
  portaDePedra(obra, Lc, F, uPorta, larguraPorta, alturaPorta, cor, r, p.entravel, dx);
  us.forEach((u, i) => {
    if (i === iPorta) return;
    if (p.entravel && Math.abs(u) < larguraPorta / 2 + 0.9) return;
    janela(obra, "frente", Lc, F, u, 1.1, 0.8, 1.0, cor, r, dx);
  });
  for (let andar = 1; andar < pavimentos; andar++) {
    for (const u of us) janela(obra, "frente", Lc, F, u, andar * (A / pavimentos) + 0.8, 0.8, 1.05, cor, r, dx);
  }
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
    if (puxado && ((f === "esquerda" && lado > 0) || (f === "direita" && lado < 0))) continue;
    const comp = f === "fundos" ? Lc : F;
    for (const u of aoLongo(comp, Math.max(1, Math.floor(comp / 6)), 1.8)) {
      for (let andar = 0; andar < pavimentos; andar++) if (r() < 0.6) janela(obra, f, Lc, F, u + (r() - 0.5), 1.2 + andar * (A / pavimentos), 0.65, 0.8, cor, r, dx);
    }
  }
  if (frontal) janela(obra, "frente", Lc, F, 0, A + 0.25, 0.55, 0.55, cor, r, dx);

  // Chaminé no oitão.
  if (o.chamine !== false) {
    const ladoCh = r() < 0.5 ? -1 : 1;
    const [cx, cz] = frontal ? [dx + (r() - 0.5) * Lc * 0.3, -F / 2 + 0.5] : [dx + ladoCh * (Lc / 2 - 0.5), (r() - 0.5) * F * 0.3];
    chamineDePedra(obra, cx, cz, A - 0.4, a.topo + 0.7 + r() * 0.4, variar(cor.pedra, r), Math.floor(r() * 1e6));
  }

  // Terreiro: muro de pedra seca e lenha encostada.
  if (o.muro ?? (!p.entravel && r() < 0.45)) muroDePedraSeca(obra, L, F, 2.2 + r() * 0.5, 1.8, uPorta + dx, cor.pedra, r);
  if (!puxado && r() < 0.5) {
    const livre = us.filter((_, i) => i !== iPorta && (!p.entravel || Math.abs(us[i]) > 3));
    if (livre.length) lenha(obra, "frente", Lc, F, livre[0] + (r() - 0.5) * 0.4, 1.4, 0.9 + r() * 0.3, r, dx);
  }

  if (p.entravel) {
    interiorBasico(dentro, Lc, F, { piso: "#7a6a52", madeira: "#4a3626" });
    // Lareira de pedra na parede do lado.
    dentro.por("pedra", bloco(0.8, 2.2, 2.2, dx - Lc / 2 + 0.95, 0, 0), variar(cor.pedra, r), 0.1, 0);
    dentro.por("carvao", bloco(0.3, 0.7, 1.1, dx - Lc / 2 + 1.45, 0.1, 0), "#2b2826", 0.05, 0);
  }
  return { obra, t, dentro, topo: a.topo, A };
}

const fechar = (c: Corpo): PecasDoPredio => ({ corpo: c.obra.pecas(), telhado: c.t.pecas(), interior: c.dentro.pecas() });

/** Capela caiada de espadana: sineira de parede sobre a fachada, cunhais de pedra à mostra. */
function capela(p: PredioLocal, r: () => number, cor: Cor): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(21);
  const t = new Obra(22);
  const dentro = new Obra(23);
  const cal = de(r, ["#d9d5c9", "#d2cdc0", "#dcd6c6"]);
  obra.por("pedra-escura", bloco(L + 0.3, 0.6, F + 0.3, 0, 0, 0), "#55524d", 0.1, 0.2);
  paredesDePedra(obra, 0, L, F, A, cal, "cantaria", p.entravel ? PORTA_DE_ENTRAR : undefined);
  cunhais(obra, 0, L, F, A, "#8e887c", r);
  // Contrafortes de pedra bruta nas laterais.
  for (const u of aoLongo(F, Math.max(2, Math.floor(F / 6)), 1.5)) {
    for (const s of [-1, 1]) obra.por("pedra", bloco(0.6, A * 0.75, 0.9, s * (L / 2 - 0.05), 0, u), variar(cor.pedra, r), 0.12, 0.2);
  }
  const c: Telhado = { tipo: "duas-aguas", L: F, F: L, A, s: 0.55, beiral: 0.5, giro: Math.PI / 2, material: "telha-escura", cor: de(r, TELHA_ESCURA), neve: { recuo: (L / 2 + 0.5) * 0.4, espessura: 0.12 } };
  const a = cobrir(t, c);
  oitoes(obra, c, "cantaria", cal);
  // Espadana: a fachada sobe acima do telhado e vaza o vão do sino.
  const ef = F / 2 - 0.3;
  const altoEsp = a.topo + 2.6;
  const w = Math.min(L * 0.45, 4.5);
  obra.por("cantaria", bloco(w, 1.2, 0.6, 0, a.topo - 1, ef), cal, 0.06, 0);
  for (const s of [-1, 1]) obra.por("cantaria", bloco(w * 0.3, altoEsp - a.topo - 0.2, 0.6, s * w * 0.35, a.topo + 0.2, ef), cal, 0.06, 0);
  obra.por("cantaria", bloco(w + 0.3, 0.35, 0.75, 0, altoEsp, ef), "#a39b8b", 0.05, 0);
  obra.por("neve", bloco(w + 0.2, 0.1, 0.65, 0, altoEsp + 0.35, ef), "#eef1f3", 0.04, 0);
  obra.por("ferro", new THREE.CylinderGeometry(0.25, 0.5, 0.8, 8).translate(0, a.topo + 1.0, ef), "#6a5a2a", 0.05, 0);
  obra.por("ferro", bloco(0.09, 1.3, 0.09, 0, altoEsp + 0.35, ef), "#2c2a28", 0.02, 0);
  obra.por("ferro", bloco(0.65, 0.09, 0.09, 0, altoEsp + 1.2, ef), "#2c2a28", 0.02, 0);
  // Fachada: porta de verga grossa, óculo e adro de laje.
  portaDePedra(obra, L, F, 0, p.entravel ? PORTA_DE_ENTRAR.largura : 1.8, p.entravel ? PORTA_DE_ENTRAR.altura : 2.8, { ...cor, folha: "#4b3423" }, r, p.entravel);
  janela(obra, "frente", L, F, 0, A + 0.3, 0.7, 0.7, cor, r);
  obra.por("cantaria", naFace(bloco(Math.min(L - 1, 6), 0.18, 1.6, 0, 0, 0.8), "frente", L, F, 0, 0), "#7a756c", 0.06, 0);
  for (const u of aoLongo(F, Math.max(2, Math.floor(F / 6)) - 1, 3)) for (const f of ["esquerda", "direita"] as Face[]) janela(obra, f, L, F, u, A * 0.45, 0.6, 1.4, cor, r);
  // Cruzeiro de madeira no adro.
  const cx = L / 2 - 0.6;
  obra.por("pedra", bloco(0.9, 0.5, 0.9, cx, 0, F / 2 + 2.2), cor.pedra, 0.1, 0);
  obra.por("madeira", bloco(0.2, 3.2, 0.2, cx, 0.5, F / 2 + 2.2), "#3e2f22", 0.08, 0);
  obra.por("madeira", bloco(1.4, 0.18, 0.2, cx, 2.8, F / 2 + 2.2), "#3e2f22", 0.08, 0);
  if (p.entravel) {
    dentro.por("madeira", bloco(L - 1.1, 0.08, F - 1.1, 0, 0.02, 0), "#6a5a42", 0.08, 0);
    for (let i = 0; i < Math.floor(F / 2.4) - 2; i++) for (const s of [-1, 1]) dentro.por("madeira", bloco(L * 0.3, 0.5, 0.45, s * L * 0.22, 0, F / 2 - 3 - i * 2.2), "#4a3626", 0.08, 0);
    dentro.por("cantaria", bloco(L * 0.4, 1.2, 1.2, 0, 0, -F / 2 + 1.3), "#d2cdc0", 0.04, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

/** Parada do trem: casinha de pedra, plataforma de tábua coberta, placa e lampiões. */
function parada(p: PredioLocal, r: () => number, cor: Cor): PecasDoPredio {
  const c = casaDePedra({ ...p, altura: Math.min(p.altura, 4.5) }, r, cor, { puxado: false, frontal: false, muro: false });
  const { largura: L, fundo: F } = p;
  alpendre(c.obra, c.t, L, F, { comprimento: L, profundidade: 2.8, altura: 2.9, esteios: Math.max(3, Math.round(L / 3.5)), madeira: "#4a3626", telha: "#4f3a30", piso: 0.6 });
  c.obra.por("madeira", naFace(bloco(Math.min(L * 0.5, 5), 0.6, 0.08, 0, 3.55, 0.1), "frente", L, F, 0, 0), "#2e2620", 0.06, 0);
  c.obra.por("madeira", naFace(bloco(Math.min(L * 0.5, 5) - 0.3, 0.38, 0.04, 0, 3.66, 0.15), "frente", L, F, 0, 0), "#d9d1bd", 0.04, 0);
  for (const s of [-1, 1]) {
    c.obra.por("ferro", naFace(bloco(0.1, 2.4, 0.1, s * (L / 2 - 0.4), 0.6, 2.5), "frente", L, F, 0, 0), "#2c2a28", 0.02, 0);
    c.obra.por("vidro", naFace(bloco(0.3, 0.4, 0.3, s * (L / 2 - 0.4), 3.0, 2.5), "frente", L, F, 0, 0), "#c8a050", 0.05, 0);
  }
  c.obra.por("madeira", naFace(bloco(2.2, 0.45, 0.5, -L / 4, 0.6, 0.5), "frente", L, F, 0, 0), "#5a4030", 0.08, 0);
  barril(c.obra, L / 2 - 1.2, F / 2 + 1.2, r, 0.6);
  return fechar(c);
}

/** Galpão: base de pedra até o peito, tábua escura em cima, portão largo. Ferraria com forja. */
function galpao(p: PredioLocal, r: () => number, cor: Cor, ferraria: boolean): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(41);
  const t = new Obra(42);
  const dentro = new Obra(43);
  const madeira = de(r, ["#4a3a2c", "#3e3226", "#55412e"]);
  const base = 1.4;
  paredesDePedra(obra, 0, L, F, base, cor.pedra, "pedra", p.entravel ? { largura: PORTA_DE_ENTRAR.largura, altura: base } : undefined);
  const e = 0.3;
  if (p.entravel) {
    obra.por("madeira", bloco(L, A - base, e, 0, base, -F / 2 + e / 2), madeira, 0.1);
    for (const s of [-1, 1]) obra.por("madeira", bloco(e, A - base, F - e * 2, s * (L / 2 - e / 2), base, 0), madeira, 0.1);
    const lado = (L - PORTA_DE_ENTRAR.largura) / 2;
    for (const s of [-1, 1]) obra.por("madeira", bloco(lado, A - base, e, s * (PORTA_DE_ENTRAR.largura / 2 + lado / 2), base, F / 2 - e / 2), madeira, 0.1);
    obra.por("madeira", bloco(PORTA_DE_ENTRAR.largura, A - PORTA_DE_ENTRAR.altura, e, 0, PORTA_DE_ENTRAR.altura, F / 2 - e / 2), madeira, 0.1);
  } else {
    obra.por("madeira", bloco(L - 0.1, A - base, F - 0.1, 0, base, 0), madeira, 0.1);
    obra.por("madeira-escura", naFace(bloco(Math.min(3.6, L * 0.4), A * 0.72, 0.08, 0, 0, 0.04), "frente", L, F, 0, 0), "#33281e", 0.08, 0);
  }
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
    const comp = f === "frente" || f === "fundos" ? L : F;
    for (const u of aoLongo(comp, Math.floor(comp / 1.1), 0.3)) {
      if (f === "frente" && Math.abs(u) < (p.entravel ? 2.3 : 1.9)) continue;
      obra.por("madeira", naFace(bloco(0.09, A - base, 0.05, 0, 0, 0.02), f, L, F, u, base), "#2f261c", 0.1, 0);
    }
  }
  cunhais(obra, 0, L, F, base, cor.cunhal, r);
  const c: Telhado = { tipo: "duas-aguas", L, F, A, s: 0.5, beiral: 0.6, material: "telha-escura", cor: de(r, TELHA_ESCURA), neve: { recuo: (F / 2 + 0.6) * (0.3 + r() * 0.3), espessura: 0.11 }, semente: 42 };
  const a = cobrir(t, c);
  oitoes(obra, c, "madeira", madeira);
  if (ferraria) {
    chamineDePedra(obra, L / 2 - 0.9, -F / 2 + 1.0, 0, a.topo + 1.2, cor.pedra, 7, 1.3);
    obra.por("pedra", bloco(1.8, 1.0, 1.6, L / 2 - 1.4, 0, -F / 2 + 1.6), cor.pedra, 0.12, 0);
    obra.por("carvao", bloco(0.9, 0.12, 0.8, L / 2 - 1.4, 1.0, -F / 2 + 1.6), "#5a2a1a", 0.1, 0);
    obra.por("madeira", bloco(0.5, 0.75, 0.5, -1.6, 0, F / 2 + 1.2), "#4a3626", 0.08, 0);
    obra.por("ferro", bloco(0.7, 0.3, 0.3, -1.6, 0.75, F / 2 + 1.2), "#2c2a28", 0.02, 0);
    barril(obra, 2.4, F / 2 + 1.0, r);
  } else if (r() < 0.6) {
    lenha(obra, "frente", L, F, L / 2 - 1.4, 1.8, 1.1, r);
  }
  if (p.entravel) interiorBasico(dentro, L, F, { piso: "#5a4a38", madeira: "#3e2f22" });
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

/** Estábulo e celeiro: comprido e baixo, portinhola de feno no oitão e curral de pedra seca. */
function estabulo(p: PredioLocal, r: () => number, cor: Cor): PecasDoPredio {
  const c = casaDePedra({ ...p, altura: Math.min(p.altura, 4) }, r, { ...cor, lajes: false, telhado: de(r, TELHA_ESCURA) }, { puxado: false, frontal: false, muro: true, s: 0.45, chamine: false });
  const { largura: L, fundo: F } = p;
  for (const f of ["esquerda", "direita"] as Face[]) {
    c.obra.por("madeira", naFace(bloco(1.4, 1.1, 0.08, 0, 0, 0.06), f, L, F, 0, c.A + 0.2), "#3a2c20", 0.08, 0);
  }
  c.obra.por("madeira", naFace(bloco(2.4, 0.6, 0.6, 0, 0, 1.0), "frente", L, F, L / 2 - 2, 0), "#4a3626", 0.08, 0.2);
  c.obra.por("palha", bloco(1.2, 0.6, 0.8, -L / 2 + 1.4, 0, F / 2 + 1.0), "#a08a5a", 0.12, 0.2);
  return fechar(c);
}

/** Moinho de pedra: torre redonda, cone de laje com neve e pás de madeira. */
function moinho(p: PredioLocal, r: () => number, cor: Cor): PecasDoPredio {
  const raio = Math.min(p.largura, p.fundo) / 2;
  const obra = new Obra(51);
  const t = new Obra(52);
  obra.por("pedra", new THREE.CylinderGeometry(raio * 0.8, raio, p.altura, 12, 1, true).translate(0, p.altura / 2, 0), cor.pedra, 0.12, 0.3);
  portaDePedra(obra, raio * 2, raio * 2, 0, 1.1, 2.1, cor, r, false, 0);
  t.por("pedra-escura", new THREE.ConeGeometry(raio * 0.98, raio * 1.1, 12).translate(0, p.altura + raio * 0.55, 0), "#4f4c48", 0.1, 0);
  t.por("neve", new THREE.ConeGeometry(raio * 0.62, raio * 0.7, 12).translate(0, p.altura + raio * 0.77, 0), "#eef1f3", 0.04, 0);
  const giro = r() * Math.PI;
  for (let i = 0; i < 4; i++) {
    const pa = bloco(0.28, raio * 2.5, 0.08, 0, 0, 0).translate(0, raio * 0.2, 0).rotateZ(giro + (i * Math.PI) / 2);
    obra.por("madeira", pa.translate(0, p.altura * 0.82, raio + 0.4), "#6a5a44", 0.1, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

/** Forno de cal / queijaria: casa de pedra de oitão na frente e chaminé alta de pedra. */
function fabrica(p: PredioLocal, r: () => number, cor: Cor): PecasDoPredio {
  const c = casaDePedra({ ...p, altura: Math.min(p.altura, 6) }, r, cor, { puxado: false, frontal: true, muro: false, pavimentos: 1, chamine: false });
  chamineDePedra(c.obra, p.largura * 0.3, -p.fundo * 0.32, 0, c.topo + 5, variar(cor.pedra, r), 61, 1.6);
  return fechar(c);
}

/** Torre de vigia de pedra: fuste afunilado, guarita de madeira e telhadinho com neve. */
function torre(p: PredioLocal, r: () => number, cor: Cor): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(71);
  const t = new Obra(72);
  const fuste = new THREE.CylinderGeometry(L * 0.38, L * 0.5, A - 2, 4, 1).rotateY(Math.PI / 4).translate(0, (A - 2) / 2, 0);
  obra.por("pedra", fuste, cor.pedra, 0.12, 0.3);
  portaDePedra(obra, L * 0.75, F * 0.75, 0, 0.9, 1.9, cor, r, false);
  obra.por("madeira", bloco(L * 0.95, 0.25, F * 0.95, 0, A - 2, 0), "#4a3626", 0.1, 0);
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) obra.por("madeira", naFace(bloco(L * 0.95, 1.0, 0.1, 0, 0, -0.05), f, L * 0.95, F * 0.95, 0, A - 1.75), "#4a3626", 0.1, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) obra.por("madeira", bloco(0.18, 2.1, 0.18, (x * L * 0.95) / 2 - x * 0.1, A - 1.8, (z * F * 0.95) / 2 - z * 0.1), "#3e2f22", 0.1, 0);
  cobrir(t, { tipo: "quatro-aguas", L: L * 0.95, F: F * 0.95, A: A + 0.3, s: 0.7, beiral: 0.3, material: "pedra-escura", cor: "#4f4c48", neve: { recuo: 0.25, espessura: 0.1 } });
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

/** Tenda: lona de tropeiro num pau de cumeeira, neve na lona, fogueira de pedra na frente. */
function tenda(p: PredioLocal, r: () => number): PecasDoPredio {
  const obra = new Obra(81);
  const lona = de(r, ["#b9ad92", "#a89c80", "#8f8670"]);
  cobrir(obra, { tipo: "duas-aguas", L: p.largura, F: p.fundo, A: 0.25, s: (p.altura - 0.25) / (p.fundo / 2 + 0.1), beiral: 0.1, esp: 0.05, material: "lona", cor: lona, neve: { recuo: 0.6, espessura: 0.06 } });
  for (const s of [-1, 1]) obra.por("madeira", bloco(0.12, p.altura + 0.3, 0.12, (s * p.largura) / 2, 0, 0), "#4a3626", 0.1, 0);
  obra.por("pedra", bloco(1.0, 0.25, 1.0, 0, 0, p.fundo / 2 + 1.4), "#5a5650", 0.1, 0);
  obra.por("carvao", bloco(0.5, 0.15, 0.5, 0, 0.2, p.fundo / 2 + 1.4), "#2b2826", 0.05, 0);
  return { corpo: obra.pecas(), telhado: [], interior: [] };
}

/** Longe: volume de pedra, telhado com a faixa de neve em cima, oitões e chaminé. */
function longe(p: PredioLocal, r: () => number, cor: Cor): PecasDoPredio {
  const obra = new Obra(1);
  const t = new Obra(2);
  const { largura: L, fundo: F, altura: A } = p;
  const igreja = p.tipo === "igreja";
  if (p.tipo === "tenda") {
    cobrir(t, { tipo: "duas-aguas", L, F, A: 0.2, s: A / (F / 2), beiral: 0.1, material: "lona", cor: "#a89c80", soCima: true });
    return { corpo: [], telhado: t.pecas(), interior: [] };
  }
  obra.por("pedra", bloco(L, A, F, 0, 0, 0), igreja ? "#d6d1c4" : cor.pedra);
  if (p.tipo === "moinho" || p.tipo === "torre") {
    t.por("pedra-escura", bloco(L * 0.9, 1.2, F * 0.9, 0, A, 0), "#4f4c48", 0.1, 0);
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  const frontal = igreja || p.tipo === "fabrica";
  const c: Telhado = {
    tipo: "duas-aguas",
    L: frontal ? F : L,
    F: frontal ? L : F,
    A,
    s: igreja ? 0.55 : cor.lajes ? 0.45 : 0.55,
    beiral: 0.5,
    giro: frontal ? Math.PI / 2 : 0,
    material: cor.lajes ? "pedra-escura" : "telha-escura",
    cor: cor.telhado,
    neve: { recuo: ((frontal ? L : F) / 2 + 0.5) * 0.45, espessura: 0.1 },
    soCima: true,
  };
  const a = cobrir(t, c);
  oitoes(obra, c, "pedra", igreja ? "#d6d1c4" : cor.pedra);
  if (igreja) obra.por("cantaria", bloco(L * 0.4, 3.6, 0.6, 0, a.topo - 1, F / 2 - 0.3), "#d6d1c4", 0.05, 0);
  else if (p.tipo !== "fazenda") obra.por("pedra", bloco(0.9, a.topo + 0.8 - A, 0.9, (r() < 0.5 ? -1 : 1) * (L / 2 - 0.5), A, 0), cor.pedra, 0.1, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

export function gerarPedraFria(p: PredioLocal, nivel: NivelPredio, semente: number): PecasDoPredio {
  const r = sorteio(semente);
  const cor = paleta(r);
  if (p.tipo === "ruina") return ruina(nivel === 1 ? { ...p, entravel: false } : p, r, cor.pedra);
  if (nivel === 1) return longe(p, r, cor);
  switch (p.tipo) {
    case "igreja":
      return capela(p, r, cor);
    case "estacao":
      return parada(p, r, cor);
    case "comercio":
    case "saloon": {
      // Venda: casa de pedra com alpendre de madeira, placa, barris e caixotes.
      const c = casaDePedra(p, r, cor, { puxado: false, frontal: false, muro: false });
      const { largura: L, fundo: F } = p;
      const saloon = p.tipo === "saloon";
      alpendre(c.obra, c.t, L, F, { comprimento: saloon ? L : Math.min(L - 1, 7.5), profundidade: 2.2, altura: 2.5, esteios: saloon ? Math.max(3, Math.floor(L / 3)) : 3, madeira: "#4a3626", telha: cor.lajes ? "#4f3a30" : cor.telhado, guarda: saloon });
      const yPlaca = Math.min(p.altura - 0.9, 3.4);
      c.obra.por("madeira", naFace(bloco(Math.min(L * 0.6, 5), 0.7, 0.08, 0, yPlaca, 0.06), "frente", L, F, 0, 0), "#3a2c20", 0.06, 0);
      c.obra.por("madeira", naFace(bloco(Math.min(L * 0.6, 5) - 0.3, 0.45, 0.04, 0, yPlaca + 0.12, 0.11), "frente", L, F, 0, 0), "#c9b48a", 0.05, 0);
      barril(c.obra, -L / 2 + 0.8, F / 2 + 1.0, r, 0.25);
      caixote(c.obra, L / 2 - 0.9, F / 2 + 1.0, r, 0.25);
      if (saloon) for (const s of [-1, 1]) c.obra.por("madeira", bloco(2.6, 0.12, 0.12, s * (L / 2 - 1.6), 1.0, F / 2 + 3.0), "#4a3626", 0.08, 0);
      return fechar(c);
    }
    case "hotel": {
      // Pousada: dois andares de pedra com galeria de madeira no de cima.
      const c = casaDePedra(p, r, cor, { puxado: false, frontal: false, muro: false, pavimentos: Math.max(2, Math.round(p.altura / 3)) });
      const { largura: L, fundo: F, altura: A } = p;
      const y = A / 2;
      c.obra.por("madeira", naFace(bloco(L - 0.6, 0.2, 1.5, 0, y - 0.1, 0.75), "frente", L, F, 0, 0), "#4a3626", 0.1, 0);
      for (const u of aoLongo(L - 0.6, Math.max(3, Math.floor(L / 3.2)), 0.2)) {
        if (p.entravel && Math.abs(u) < 2.4) continue;
        c.obra.por("madeira", naFace(bloco(0.2, A - 0.5, 0.2, u, 0, 1.4), "frente", L, F, 0, 0), "#4a3626", 0.1, 0);
      }
      c.obra.por("madeira", naFace(bloco(L - 0.6, 0.1, 0.1, 0, y + 0.95, 1.45), "frente", L, F, 0, 0), "#4a3626", 0.1, 0);
      for (const u of aoLongo(L - 0.6, Math.floor(L / 0.5), 0.2)) c.obra.por("madeira", naFace(bloco(0.06, 0.95, 0.06, u, y + 0.1, 1.45), "frente", L, F, 0, 0), "#3e2f22", 0.1, 0);
      cobrir(c.t, { tipo: "uma-agua", L: L - 0.4, F: 1.6, A: A - 0.5, s: 0.3, beiral: 0.25, esp: 0.12, z: F / 2 + 0.8, material: "telha-escura", cor: cor.lajes ? "#4f3a30" : cor.telhado, neve: { recuo: 0.1, espessura: 0.09 } });
      c.obra.por("madeira", naFace(bloco(4, 0.6, 0.08, 0, 0, 0.06), "frente", L, F, 0, y - 0.9), "#3a2c20", 0.06, 0);
      return fechar(c);
    }
    case "publico":
    case "banco": {
      // Casa de câmara / banco: cantaria aparelhada, grade nas janelas do banco, sino no cume.
      const c = casaDePedra(p, r, { ...cor, pedra: "#8f897d", lajes: false, telhado: de(r, TELHA_ESCURA) }, { puxado: false, frontal: false, muro: false, material: "cantaria" });
      const { largura: L, fundo: F } = p;
      if (p.tipo === "banco") {
        for (const u of aoLongo(L, Math.max(2, Math.floor((L - 1.2) / 2.5)), 1.4)) {
          if (p.entravel && Math.abs(u) < 3) continue;
          for (let i = 1; i < 5; i++) c.obra.por("ferro", naFace(bloco(0.03, 1.0, 0.03, -0.4 + i * 0.16, 0, 0.12), "frente", L, F, u, 1.1), "#2c2a28", 0.02, 0);
        }
      }
      c.obra.por("madeira", naFace(bloco(Math.min(L * 0.55, 6), 0.7, 0.08, 0, Math.min(p.altura - 1, 3.6), 0.12), "frente", L, F, 0, 0), "#2e2620", 0.06, 0);
      if (p.tipo === "publico") {
        c.obra.por("madeira", bloco(1.0, 1.4, 1.0, 0, c.topo - 0.3, 0), "#3e2f22", 0.08, 0);
        c.obra.por("ferro", new THREE.CylinderGeometry(0.2, 0.35, 0.5, 8).translate(0, c.topo + 0.5, 0), "#6a5a2a", 0.05, 0);
        cobrir(c.t, { tipo: "quatro-aguas", L: 1.0, F: 1.0, A: c.topo + 1.1, s: 0.9, beiral: 0.25, esp: 0.08, material: "telha-escura", cor: "#4d3328", neve: { recuo: 0.1, espessura: 0.06 } });
      }
      return fechar(c);
    }
    case "galpao":
      return galpao(p, r, cor, p.id === "ferraria" || /ferr/i.test(p.nome));
    case "fazenda":
      return estabulo(p, r, cor);
    case "moinho":
      return moinho(p, r, cor);
    case "fabrica":
      return fabrica(p, r, cor);
    case "torre":
      return torre(p, r, cor);
    case "tenda":
      return tenda(p, r);
    default: {
      // A Casa de Pedra canônica: a mais velha, de laje grossa e pedra escura.
      if (p.id === "casa-de-pedra") return fechar(casaDePedra(p, r, { ...cor, lajes: true, telhado: "#4a4844", pedra: "#6a655d" }, { muro: false, frontal: false }));
      return fechar(casaDePedra(p, r, cor));
    }
  }
}

const estilo: Estilo = { id: "pedra-fria", nome: "Pedra e frio (povoado da Serra da Saudade)", gerar: gerarPedraFria };

export default estilo;
