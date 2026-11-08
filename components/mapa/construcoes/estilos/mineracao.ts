// Mineração de carvão (Araguari): a cidade das viúvas. Cal encardida de fuligem, barrado
// preto de lama e carvão, escorridos de chuva sob os peitoris, telha escurecida, chaminé
// de tijolo em toda casa. Casas operárias iguais em fileira (duas águas, porta e janela),
// sobrados tristes de venezianas fechadas, crepe preto de luto nas portas, cavaletes de
// poço em madeira com roda, galpões de carvão alcatroados, matriz barroca cinzenta com
// fitas pretas, o escritório da mineradora em tijolo e cantaria (o único prédio rico) e,
// no meio do cinza, a lona listrada do Circo do Sol.

import * as THREE from "three";
import { sorteio } from "../../natureza/ferramentas";
import { aoLongo, bloco, empenas, interiorBasico, janela, malha, naFace, Obra, paredes, placa, porta, sacada, telhado, toldo, varanda, type Face } from "../kit";
import type { Estilo, NivelPredio, PecasDoPredio, PredioLocal } from "../tipos";
import { ruina } from "./colonial";
import {
  PRETO_LUTO,
  anelDeLona,
  bulbo,
  chamineAlta,
  chamineSuja,
  coneListrado,
  escorrido,
  festoes,
  frontao,
  lampiao,
  luto,
  monteDeCarvao,
  roda,
  trilho,
  vagonete,
  viga,
} from "./_mineracao-pecas";

const CAL = ["#a39b8d", "#9a9387", "#aaa192", "#948e84", "#a69a89", "#8f8a82", "#ada393"];
const FULIGEM = ["#3b3733", "#45403a", "#34312e", "#4a4038"];
const VENEZIANA = ["#2e3a3e", "#3a302a", "#384036", "#2a2828", "#4a3a30", "#3a2a2a"];
const PORTA = ["#2e2620", "#3a2c22", "#2a3230", "#33281f"];
const TELHA = ["#4a342c", "#43352f", "#3c322e", "#503a30", "#383230", "#46382f"];
const MOLDURA = ["#c4bba9", "#b9b09f", "#cbc1ad"];
const TABUA = "#4a3c30";
const ALCATRAO = "#2f2822";
const MADEIRA_ESCURA = "#3a2e24";
const CANTARIA = "#a59d8c";
const TIJOLO = "#6e4436";

type Paleta = { cal: string; fuligem: string; veneziana: string; porta: string; telha: string; moldura: string; escorrido: string };

function paleta(r: () => number): Paleta {
  const de = (l: string[]) => l[Math.floor(r() * l.length)];
  const cal = de(CAL);
  const fuligem = de(FULIGEM);
  const escorrido = "#" + new THREE.Color(cal).lerp(new THREE.Color(fuligem), 0.62).getHexString();
  return { cal, fuligem, veneziana: de(VENEZIANA), porta: de(PORTA), telha: de(TELHA), moldura: de(MOLDURA), escorrido };
}

const PORTA_DE_ENTRAR = { largura: 4.2, altura: 3 };
const ANDAR = 3.5;

const nomeDe = (p: PredioLocal) => `${p.id} ${p.nome}`.toLowerCase();

/** Bloco pendurado: o pé no meio da altura (para girar em torno do centro). */
function caixa2(w: number, h: number, d: number) {
  return bloco(w, h, d, 0, -h / 2, 0);
}

// ---------------------------------------------------------------- longe (nível 1)

function longe(p: PredioLocal, cor: Paleta, tipoDoTelhado: "quatro-aguas" | "duas-aguas" | "plano" = "quatro-aguas", material: "reboco" | "madeira" | "tijolo" = "reboco", corpo = cor.cal): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(1);
  obra.por(material, bloco(L, A, F, 0, 0, 0), corpo, 0.06, 0.25);
  obra.por("reboco", bloco(L + 0.04, 0.8, F + 0.04, 0, 0, 0), cor.fuligem, 0.05, 0);
  const t = new Obra(2);
  const alto = Math.min(L, F) * 0.34;
  if (tipoDoTelhado !== "plano") for (const g of telhado(tipoDoTelhado, L, F, A, alto, 0.5, 0.15).slice(0, 1)) t.por("telha-escura", g, cor.telha, 0.1, 0);
  else obra.por(material, bloco(L + 0.2, 1.0, F + 0.2, 0, A, 0), corpo, 0.06, 0);
  if (tipoDoTelhado === "duas-aguas") for (const g of empenas(L, F, A, alto)) obra.por(material, g, corpo);
  if (tipoDoTelhado !== "plano" && material === "reboco") obra.por("tijolo", bloco(0.7, alto + 1, 0.7, L * 0.25, A, -F * 0.15), "#3a2e28", 0.05, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

// ---------------------------------------------------------------- fachada e casa

type OpcoesDeFachada = { portaU?: number; sacadas?: boolean; grade?: boolean; fechadas?: number; luto?: boolean; lampiao?: boolean; andar?: number; janelaW?: number };

function fachada(obra: Obra, p: PredioLocal, cor: Paleta, pavimentos: number, r: () => number, o: OpcoesDeFachada = {}) {
  const { largura: L, fundo: F } = p;
  const andar = o.andar ?? ANDAR;
  const jw = o.janelaW ?? 1.0;
  const wPorta = p.entravel ? PORTA_DE_ENTRAR.largura : 1.2;
  const hPorta = p.entravel ? PORTA_DE_ENTRAR.altura : 2.5;
  const slots = aoLongo(L, Math.max(1, Math.floor((L - 1.4) / 2.3)), 1.2);
  let uPorta = o.portaU ?? 0;
  if (!p.entravel && o.portaU === undefined) uPorta = slots[Math.floor(r() * slots.length)] ?? 0;
  porta(obra, "frente", L, F, uPorta, wPorta, hPorta, cor.porta, p.entravel, cor.moldura);
  if (o.luto) luto(obra, "frente", L, F, uPorta, hPorta + 0.25, wPorta);
  if (o.lampiao) lampiao(obra, "frente", L, F, uPorta + (wPorta / 2 + 0.55) * (r() < 0.5 ? -1 : 1), hPorta - 0.3);
  const fechada = (prob = 0) => (r() < prob ? cor.veneziana : undefined);
  for (const u of slots) {
    if (Math.abs(u - uPorta) < wPorta / 2 + jw / 2 + 0.35) continue;
    janela(obra, "frente", L, F, u, 1.0, jw, 1.5, { veneziana: cor.veneziana, grade: o.grade, moldura: cor.moldura, fechada: fechada((o.fechadas ?? 0) * 0.5) });
    escorrido(obra, "frente", L, F, u, 0.88, jw * 0.7, 0.2 + r() * 0.1, cor.escorrido);
  }
  // Escorridos de fuligem descendo da cimalha entre as janelas.
  for (let i = 0; i <= slots.length; i++) {
    if (r() < 0.4) continue;
    const u = i === 0 ? -L / 2 + 0.6 : i === slots.length ? L / 2 - 0.6 : (slots[i - 1] + slots[i]) / 2;
    escorrido(obra, "frente", L, F, u, p.altura - 0.9, 0.2 + r() * 0.3, 0.6 + r() * (p.altura * 0.35), cor.escorrido);
  }
  for (let a = 1; a < pavimentos; a++) {
    const y = a * andar + 0.4;
    for (const u of slots) {
      if (o.sacadas) sacada(obra, "frente", L, F, u, y - 0.1, 1.5, "#1f1d1c");
      janela(obra, "frente", L, F, u, y, jw, o.sacadas ? 2.0 : 1.5, { veneziana: cor.veneziana, moldura: cor.moldura, fechada: fechada(o.fechadas ?? 0) });
      if (!o.sacadas) escorrido(obra, "frente", L, F, u, y - 0.12, jw * 0.7, 0.6 + r() * 1.2, cor.escorrido);
    }
  }
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
    const comp = f === "fundos" ? L : F;
    for (const u of aoLongo(comp, Math.max(0, Math.floor((comp - 2) / 4.5)), 1.6)) {
      for (let a = 0; a < pavimentos; a++) {
        if (r() < 0.3) continue;
        janela(obra, f, L, F, u, 1.0 + a * andar, 0.9, 1.35, { veneziana: cor.veneziana, moldura: cor.moldura, fechada: fechada(0.3) });
      }
    }
  }
}

/** Corpo de reboco encardido: barrado preto, cunhais e cimalha, faixa de fuligem no alto. */
function corpoDeReboco(obra: Obra, p: PredioLocal, cor: Paleta) {
  const { largura: L, fundo: F, altura: A } = p;
  paredes(obra, L, F, A, "reboco", cor.cal, p.entravel ? PORTA_DE_ENTRAR : undefined);
  const s = 0.03;
  obra.por("reboco", bloco(L + s * 2, 0.8, F + s * 2, 0, 0, 0), cor.fuligem, 0.08, 0.25);
  obra.por("reboco", bloco(L + s, 0.7, F + s, 0, A - 0.95, 0), cor.escorrido, 0.12, 0);
  obra.por("reboco", bloco(L + 0.2, 0.25, F + 0.2, 0, A - 0.25, 0), cor.moldura, 0.05, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) obra.por("reboco", bloco(0.32, A, 0.32, x * (L / 2 - 0.13), 0, z * (F / 2 - 0.13)), cor.moldura, 0.06, 0.2);
}

function interior(p: PredioLocal, fogao = false) {
  if (!p.entravel) return [];
  const obra = new Obra(3);
  interiorBasico(obra, p.largura, p.fundo, { piso: "#6e5a44", madeira: "#3e2c20" });
  if (fogao) {
    obra.por("tijolo", bloco(1.6, 0.9, 0.9, -p.largura / 2 + 1.4, 0, -p.fundo / 2 + 1.0), "#5a4034", 0.08, 0);
    obra.por("ferro", bloco(1.4, 0.06, 0.7, -p.largura / 2 + 1.4, 0.9, -p.fundo / 2 + 1.0), "#1e1c1a", 0.04, 0);
  }
  return obra.pecas();
}

function casa(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const pavimentos = A >= 6.4 ? 2 : 1;
  // Puxado nos fundos (cozinha) em parte das casas: a silhueta muda de uma para a outra.
  const puxado = !p.entravel && F >= 8 && r() < 0.4;
  const Fc = puxado ? F * 0.72 : F;
  const desloca = (F - Fc) / 2;
  const corpo = new Obra(Math.floor(r() * 1e6));
  const pc = { ...p, fundo: Fc };
  corpoDeReboco(corpo, pc, cor);
  if (pavimentos === 2) corpo.por("reboco", bloco(L + 0.12, 0.2, Fc + 0.12, 0, ANDAR, 0), cor.moldura, 0.04, 0);
  fachada(corpo, pc, cor, pavimentos, r, {
    sacadas: pavimentos === 2 && r() < 0.5,
    fechadas: pavimentos === 2 ? 0.55 : 0.2,
    luto: r() < 0.32,
    lampiao: r() < 0.22,
  });
  const duas = r() < 0.45;
  const alto = Math.min(L, Fc) * (duas ? 0.36 : 0.3) + r() * 0.3;
  if (duas) for (const g of empenas(L, Fc, A, alto)) corpo.por("reboco", g, cor.cal);
  if (r() < 0.8) chamineSuja(corpo, (r() - 0.5) * L * 0.5, -Fc * 0.18, A, alto + 0.7);
  const t = new Obra(7);
  for (const g of telhado(duas ? "duas-aguas" : "quatro-aguas", L, Fc, A, alto, 0.65)) t.por("telha-escura", g.translate(0, 0, desloca), cor.telha, 0.14, 0);
  const pecasCorpo = corpo.pecas().map((pe) => ({ ...pe, geometria: pe.geometria.translate(0, 0, desloca) }));
  const obra = new Obra(Math.floor(r() * 1e6));
  if (puxado) {
    const Lp = L * (0.45 + r() * 0.25);
    const xp = ((L - Lp) / 2) * (r() < 0.5 ? -1 : 1);
    const Fp = F - Fc;
    obra.por("reboco", bloco(Lp, A * 0.7, Fp, xp, 0, -F / 2 + Fp / 2), cor.cal, 0.08, 0.25);
    obra.por("reboco", bloco(Lp + 0.04, 0.8, Fp + 0.04, xp, 0, -F / 2 + Fp / 2), cor.fuligem, 0.08, 0);
    for (const g of telhado("uma-agua", Lp, Fp, A * 0.7, 0.5, 0.35, 0.12)) t.por("telha-escura", g.rotateY(Math.PI).translate(xp, 0, -F / 2 + Fp / 2), cor.telha, 0.14, 0);
  }
  return { corpo: [...pecasCorpo, ...obra.pecas()], telhado: t.pecas(), interior: interior(p, true) };
}

/** Casa de operário da companhia: duas águas com cumeeira na rua, porta e janela, chaminé. */
function casaOperaria(p: PredioLocal, r: () => number, cor: Paleta, nivel: NivelPredio): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  // A companhia pintou tudo igual: a cal varia pouco, a porta é quase sempre verde-escura.
  const c: Paleta = { ...cor, cal: r() < 0.7 ? "#aca596" : cor.cal, porta: r() < 0.75 ? "#2c3a30" : cor.porta };
  const alto = F * 0.32;
  if (nivel === 1) return longe(p, c, "duas-aguas");
  const obra = new Obra(Math.floor(r() * 1e6));
  corpoDeReboco(obra, p, c);
  const lado = r() < 0.5 ? -1 : 1;
  const wPorta = p.entravel ? 4.2 : 1.0;
  const hPorta = p.entravel ? 3 : 2.3;
  const uPorta = p.entravel ? 0 : lado * (L * 0.22);
  porta(obra, "frente", L, F, uPorta, wPorta, hPorta, c.porta, p.entravel, c.moldura);
  const uJanela = p.entravel ? -lado * (L / 2 - 1.1) : -lado * (L * 0.2);
  janela(obra, "frente", L, F, uJanela, 1.0, 0.9, 1.3, { veneziana: c.veneziana, moldura: c.moldura, fechada: r() < 0.25 ? c.veneziana : undefined });
  escorrido(obra, "frente", L, F, uJanela, 0.88, 0.6, 0.15, c.escorrido);
  if (r() < 0.45) luto(obra, "frente", L, F, uPorta, hPorta + 0.25, wPorta);
  // Número da casa da companhia, plaquinha branca suja.
  obra.por("madeira", naFace(bloco(0.32, 0.22, 0.04, 0, 0, 0.05), "frente", L, F, uPorta + lado * (wPorta / 2 + 0.35), 2.0), "#d8d0bc", 0.05, 0);
  if (r() < 0.6) janela(obra, "fundos", L, F, (r() - 0.5) * L * 0.4, 1.1, 0.8, 1.1, { moldura: c.moldura });
  // Caixote de carvão na frente.
  if (r() < 0.35) {
    const u = lado * (L / 2 - 0.7);
    obra.por("madeira", naFace(bloco(0.9, 0.6, 0.6, 0, 0, 0.35), "frente", L, F, u, 0), TABUA, 0.12, 0);
    obra.por("carvao", naFace(bloco(0.8, 0.12, 0.5, 0, 0.6, 0.35), "frente", L, F, u, 0), "#1a1918", 0.1, 0);
  }
  const t = new Obra(8);
  for (const g of telhado("duas-aguas", L, F, A, alto, 0.45)) t.por("telha-escura", g, c.telha, 0.16, 0);
  for (const g of empenas(L, F, A, alto)) obra.por("reboco", g, c.cal);
  chamineSuja(obra, lado * (L / 2 - 0.6), -F * 0.12, A, alto * 0.7 + 0.8, 0.5);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, true) };
}

/** Barraco de tábua do acampamento da mina: uma água, porta, frestas. */
function barraco(p: PredioLocal, r: () => number, cor: Paleta, nivel: NivelPredio): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const madeira = r() < 0.5 ? "#4a3c30" : "#55453a";
  if (nivel === 1) return longe(p, cor, "duas-aguas", "madeira", madeira);
  const obra = new Obra(Math.floor(r() * 1e6));
  paredes(obra, L, F, A, "madeira", madeira, p.entravel ? PORTA_DE_ENTRAR : undefined);
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
    const comp = f === "frente" || f === "fundos" ? L : F;
    for (const u of aoLongo(comp, Math.floor(comp / 0.8), 0.3)) {
      if (p.entravel && f === "frente" && Math.abs(u) < 2.2) continue;
      obra.por("madeira", naFace(bloco(0.08, A, 0.04, 0, 0, 0.02), f, L, F, u, 0), "#2e2620", 0.12, 0);
    }
  }
  obra.por("reboco", bloco(L + 0.06, 0.6, F + 0.06, 0, 0, 0), "#2a2622", 0.1, 0);
  porta(obra, "frente", L, F, p.entravel ? 0 : L * 0.2, p.entravel ? 4.2 : 0.9, p.entravel ? 3 : 2.1, "#2a221c", p.entravel, "#3a2e24");
  if (!p.entravel) janela(obra, "frente", L, F, -L * 0.25, 1.1, 0.7, 0.8, { moldura: "#3a2e24", materialDaMoldura: "madeira", fechada: r() < 0.5 ? "#3a2e24" : undefined });
  const t = new Obra(9);
  for (const g of telhado("uma-agua", L, F, A, 0.9, 0.4, 0.1)) t.por("telha-escura", g, "#3e3632", 0.18, 0);
  chamineSuja(obra, L * 0.3, -F * 0.2, A, 1.6, 0.4);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, true) };
}

function comercio(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const base = casa(p, r, cor);
  const obra = new Obra(11);
  const n = nomeDe(p);
  toldo(obra, "frente", p.largura, p.fundo, 0, 3.1, Math.min(p.largura - 1, 6.5), 1.6, r() < 0.5 ? "#4f4840" : "#4a2e26");
  placa(obra, "frente", p.largura, p.fundo, 0, Math.min(p.altura - 0.9, 3.9), Math.min(p.largura * 0.6, 5), 0.7, "#2a221c");
  if (n.includes("ferraria")) {
    chamineSuja(obra, p.largura * 0.3, -p.fundo * 0.25, 0, p.altura + 2.5, 1.0);
    obra.por("ferro", naFace(bloco(0.5, 0.5, 0.5, 0, 0, 0.6), "frente", p.largura, p.fundo, p.largura * 0.36, 0), "#2a2826", 0.05, 0);
  }
  if (n.includes("refeit")) lampiao(obra, "frente", p.largura, p.fundo, p.largura * 0.36, 2.6);
  return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
}

function saloon(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(13);
  corpoDeReboco(obra, p, cor);
  const pav = A >= 6.4 ? 2 : 1;
  fachada(obra, p, cor, pav, r, { fechadas: 0.1 });
  varanda(obra, "frente", L, F, L * 0.95, 2.4, 2.9, Math.max(3, Math.floor(L / 3)), { madeira: MADEIRA_ESCURA, telha: cor.telha });
  placa(obra, "frente", L, F, 0, Math.min(A - 0.8, 3.7), Math.min(L * 0.55, 6), 0.8, "#24201c");
  for (const s of [-1, 1]) lampiao(obra, "frente", L, F, s * (L * 0.4), 2.3);
  const t = new Obra(14);
  const alto = Math.min(L, F) * 0.28;
  for (const g of telhado("quatro-aguas", L, F, A, alto, 0.6)) t.por("telha-escura", g, cor.telha, 0.14, 0);
  chamineSuja(obra, -L * 0.25, -F * 0.2, A, alto + 0.8);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p) };
}

function hotel(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const pav = Math.max(2, Math.round(A / ANDAR));
  const andar = A / pav;
  const obra = new Obra(17);
  corpoDeReboco(obra, p, cor);
  for (let a = 1; a < pav; a++) obra.por("reboco", bloco(L + 0.12, 0.2, F + 0.12, 0, a * andar, 0), cor.moldura, 0.04, 0);
  fachada(obra, p, cor, pav, r, { sacadas: true, fechadas: 0.4, lampiao: true, andar });
  placa(obra, "frente", L, F, 0, andar - 0.75, Math.min(L * 0.5, 5.5), 0.6, "#26201a");
  const t = new Obra(18);
  const alto = Math.min(L, F) * 0.26;
  for (const g of telhado("quatro-aguas", L, F, A, alto, 0.6)) t.por("telha-escura", g, cor.telha, 0.14, 0);
  for (const s of [-1, 1]) chamineSuja(obra, s * L * 0.3, -F * 0.15, A, alto + 0.6);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p) };
}

// ---------------------------------------------------------------- público e companhia

/** Escritório da mineradora, banco: tijolo, cantaria, platibanda, grade, lampiões. O único prédio rico. */
function companhia(p: PredioLocal, r: () => number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const pav = A >= 5.8 ? 2 : 1;
  const andar = A / pav;
  const obra = new Obra(51);
  paredes(obra, L, F, A, "tijolo", TIJOLO, p.entravel ? PORTA_DE_ENTRAR : undefined);
  obra.por("cantaria", bloco(L + 0.12, 0.9, F + 0.12, 0, 0, 0), "#7c766a", 0.06, 0.2);
  obra.por("cantaria", bloco(L + 0.3, 0.35, F + 0.3, 0, A - 0.35, 0), CANTARIA, 0.05, 0);
  if (pav === 2) obra.por("cantaria", bloco(L + 0.16, 0.22, F + 0.16, 0, andar, 0), CANTARIA, 0.05, 0);
  for (const x of [-1, 1]) for (const z of [-1, 1]) obra.por("cantaria", bloco(0.55, A, 0.55, x * (L / 2 - 0.25), 0, z * (F / 2 - 0.25)), CANTARIA, 0.05, 0.15);
  const moldura = "#c2b8a2";
  const wPorta = p.entravel ? 4.2 : 1.8;
  const hPorta = p.entravel ? 3 : 2.8;
  const slots = aoLongo(L, Math.max(2, Math.floor((L - 1.4) / 2.4)), 1.4);
  porta(obra, "frente", L, F, 0, wPorta, hPorta, "#2a1e18", p.entravel, CANTARIA);
  for (const u of slots) {
    if (Math.abs(u) > wPorta / 2 + 0.9) janela(obra, "frente", L, F, u, 1.1, 1.0, Math.min(1.7, andar - 1.5), { moldura, materialDaMoldura: "cantaria", grade: true });
    if (pav === 2) {
      if (Math.abs(u) < 3) sacada(obra, "frente", L, F, u, andar + 0.3, 1.6, "#1c1b1a");
      janela(obra, "frente", L, F, u, andar + 0.4, 1.0, Math.min(2.0, andar - 0.9), { moldura, materialDaMoldura: "cantaria", veneziana: "#2a3230" });
    }
  }
  for (const f of ["esquerda", "direita"] as Face[]) for (const u of aoLongo(F, Math.max(1, Math.floor((F - 2) / 3.5)), 1.6)) janela(obra, f, L, F, u, 1.1, 0.9, Math.min(1.5, andar - 1.4), { moldura, materialDaMoldura: "cantaria", grade: true });
  // Degraus de cantaria, lampiões e placa da companhia.
  for (let i = 0; i < 2; i++) obra.por("cantaria", naFace(bloco(wPorta + 1.2 - i * 0.4, 0.18, 0.6 - i * 0.25, 0, i * 0.18, 0.3 - i * 0.12), "frente", L, F, 0, 0), "#8a8476", 0.05, 0);
  for (const s of [-1, 1]) lampiao(obra, "frente", L, F, s * (wPorta / 2 + 0.6), hPorta - 0.6);
  // Platibanda com frontão e pinhas: esconde o telhado e dá a cara de dinheiro.
  const hp = 1.0;
  for (const s of [-1, 1]) obra.por("tijolo", bloco(L + 0.2, hp, 0.3, 0, A, s * (F / 2 - 0.05)), TIJOLO, 0.08, 0);
  for (const s of [-1, 1]) obra.por("tijolo", bloco(0.3, hp, F, s * (L / 2 + 0.05), A, 0), TIJOLO, 0.08, 0);
  obra.por("cantaria", bloco(L + 0.4, 0.15, 0.45, 0, A + hp, F / 2 - 0.05), CANTARIA, 0.05, 0);
  const v = (x: number, y: number) => new THREE.Vector3(x, y, F / 2 + 0.1);
  obra.por("cantaria", malha([v(-L * 0.22, A + hp + 0.15), v(L * 0.22, A + hp + 0.15), v(0, A + hp + 1.5)], [0, 1, 2]), CANTARIA, 0.05, 0);
  for (const s of [-1, 1]) obra.por("cantaria", new THREE.CylinderGeometry(0.12, 0.22, 0.7, 6).translate(s * (L / 2 + 0.05), A + hp + 0.5, F / 2 - 0.05), CANTARIA, 0.05, 0);
  placa(obra, "frente", L, F, 0, A + 0.15, L * 0.45, 0.6, "#1e2420");
  if (r() < 0.5 || nomeDe(p).includes("mineradora")) luto(obra, "frente", L, F, 0, hPorta + 0.25, wPorta);
  const t = new Obra(52);
  for (const g of telhado("quatro-aguas", L, F, A, 1.4, 0.05)) t.por("telha-escura", g, "#4a3e38", 0.1, 0);
  for (const s of [-1, 1]) chamineSuja(obra, s * L * 0.32, -F * 0.2, A, 2.4, 0.7);
  const dentro = new Obra(53);
  if (p.entravel) {
    dentro.por("madeira", bloco(L - 0.8, 0.08, F - 0.8, 0, 0.02, 0), "#5a3e2a", 0.06, 0);
    dentro.por("madeira", bloco(L * 0.7, 1.1, 0.6, 0, 0, -F * 0.05), "#3a2418", 0.06, 0);
    dentro.por("ferro", bloco(1.1, 1.5, 0.9, L / 2 - 1.2, 0, -F / 2 + 0.9), "#2c2a28", 0.04, 0);
    for (const s of [-1, 1]) dentro.por("madeira", bloco(1.8, 0.78, 0.9, s * L * 0.25, 0, -F * 0.3), "#4a2e1e", 0.06, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

function publico(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const pav = A >= 6.4 ? 2 : 1;
  const obra = new Obra(19);
  corpoDeReboco(obra, p, cor);
  if (pav === 2) obra.por("reboco", bloco(L + 0.12, 0.2, F + 0.12, 0, ANDAR, 0), cor.moldura, 0.04, 0);
  const n = nomeDe(p);
  fachada(obra, p, cor, pav, r, { grade: n.includes("delegacia") || n.includes("escrit"), luto: r() < 0.4, lampiao: true, fechadas: 0.2 });
  const yPlaca = Math.min(A - 0.9, 3.6);
  const wPlaca = Math.min(L * 0.5, 5);
  placa(obra, "frente", L, F, 0, yPlaca, wPlaca, 0.6, "#25211d");
  if (n.includes("enfermaria")) {
    // Cruz vermelha desbotada na placa.
    obra.por("madeira", naFace(bloco(0.5, 0.12, 0.03, 0, 0.24, 0.12), "frente", L, F, -wPlaca * 0.35, yPlaca), "#7a2a24", 0.04, 0);
    obra.por("madeira", naFace(bloco(0.12, 0.5, 0.03, 0, 0.05, 0.12), "frente", L, F, -wPlaca * 0.35, yPlaca), "#7a2a24", 0.04, 0);
  }
  const t = new Obra(20);
  const alto = Math.min(L, F) * 0.28;
  for (const g of telhado("quatro-aguas", L, F, A, alto, 0.6)) t.por("telha-escura", g, cor.telha, 0.14, 0);
  if (n.includes("escola")) {
    // Sineta da escola num campanariozinho na cumeeira.
    for (const s of [-1, 1]) obra.por("madeira", bloco(0.12, 1.6, 0.12, s * 0.35, A + alto - 0.4, 0), MADEIRA_ESCURA, 0.06, 0);
    obra.por("ferro", new THREE.CylinderGeometry(0.1, 0.22, 0.3, 6).translate(0, A + alto + 0.7, 0), "#5a4a2a", 0.05, 0);
    for (const g of telhado("duas-aguas", 1.0, 0.8, A + alto + 1.2, 0.5, 0.1, 0.08)) t.por("telha-escura", g, cor.telha, 0.1, 0);
  }
  chamineSuja(obra, L * 0.28, -F * 0.2, A, alto + 0.7);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p) };
}

// ---------------------------------------------------------------- igreja

function igreja(p: PredioLocal, r: () => number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const capela = L < 12;
  const cal = "#b8b0a2";
  const pedra = "#6e685f";
  const obra = new Obra(21);
  paredes(obra, L, F, A, "reboco", cal, p.entravel ? PORTA_DE_ENTRAR : undefined);
  obra.por("cantaria", bloco(L + 0.1, 1.0, F + 0.1, 0, 0, 0), "#4a4640", 0.08, 0.25);
  obra.por("reboco", bloco(L + 0.05, 1.2, F + 0.05, 0, A - 1.4, 0), "#8e877b", 0.12, 0);
  obra.por("cantaria", bloco(L + 0.4, 0.4, F + 0.4, 0, A - 0.3, 0), pedra, 0.05, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) obra.por("cantaria", bloco(0.6, A, 0.6, x * (L / 2 - 0.25), 0, z * (F / 2 - 0.25)), pedra, 0.06, 0.2);
  // Telhado com cumeeira no comprimento.
  const alto = L * 0.36;
  const t = new Obra(22);
  for (const g of telhado("duas-aguas", F, L, A, alto, 0.5)) t.por("telha-escura", g.rotateY(Math.PI / 2), "#4a3a34", 0.14, 0);
  for (const g of empenas(F, L, A, alto)) obra.por("reboco", g.rotateY(Math.PI / 2), cal);
  // Frontão barroco de volutas, com óculo e cruz.
  const altoFrontao = alto + (capela ? 0.6 : 1.4);
  obra.por("reboco", frontao(L + 0.3, altoFrontao, 0.55).translate(0, A, F / 2 - 0.3), cal, 0.1, 0);
  const topo = A + altoFrontao + 0.9;
  obra.por("cantaria", new THREE.CylinderGeometry(0.7, 0.7, 0.12, 10).rotateX(Math.PI / 2).translate(0, A + altoFrontao * 0.45, F / 2 + 0.3), pedra, 0.05, 0);
  obra.por("vidro", new THREE.CylinderGeometry(0.55, 0.55, 0.05, 10).rotateX(Math.PI / 2).translate(0, A + altoFrontao * 0.45, F / 2 + 0.36), "#3a3c3a", 0.04, 0);
  // Pilastras de cantaria na fachada.
  for (const u of [-L / 2 + 0.4, -L * 0.22, L * 0.22, L / 2 - 0.4]) obra.por("cantaria", naFace(bloco(0.55, A, 0.15, 0, 0, 0.07), "frente", L, F, u, 0), pedra, 0.06, 0.15);
  const wPorta = p.entravel ? PORTA_DE_ENTRAR.largura : 2.2;
  const hPorta = p.entravel ? PORTA_DE_ENTRAR.altura : 3.4;
  porta(obra, "frente", L, F, 0, wPorta, hPorta, "#2a1c16", p.entravel, pedra);
  if (!capela) for (const s of [-1, 1]) janela(obra, "frente", L, F, s * L * 0.36, A * 0.55, 0.9, 1.9, { moldura: pedra, materialDaMoldura: "cantaria" });
  for (const u of aoLongo(F, Math.max(2, Math.floor(F / 5)), 2.2)) for (const f of ["esquerda", "direita"] as Face[]) janela(obra, f, L, F, u, A * 0.42, 1.1, 2.4, { moldura: pedra, materialDaMoldura: "cantaria" });
  // Luto: crepe em festões na cimalha e laço preto na porta.
  festoes(obra, L, F, A - 0.35, L - 0.6, capela ? 3 : 5);
  luto(obra, "frente", L, F, 0, hPorta + 0.2, wPorta);
  const cruz = (y: number, z: number) => {
    obra.por("ferro", bloco(0.1, 1.5, 0.1, 0, y, z), "#1c1b1a", 0.02, 0);
    obra.por("ferro", bloco(0.75, 0.1, 0.1, 0, y + 0.95, z), "#1c1b1a", 0.02, 0);
  };
  const dentro = new Obra(23);
  if (capela) {
    // Espadana: parede de sino sobre o frontão.
    const z = F / 2 - 0.05;
    const y0 = A + altoFrontao + 0.5;
    for (const s of [-1, 1]) obra.por("reboco", bloco(0.4, 1.8, 0.5, s * 0.8, y0 - 0.6, z), cal, 0.08, 0);
    obra.por("reboco", bloco(2.0, 0.4, 0.55, 0, y0 + 1.2, z), cal, 0.08, 0);
    obra.por("ferro", new THREE.CylinderGeometry(0.18, 0.38, 0.55, 8).translate(0, y0 + 0.4, z), "#5a4a2a", 0.05, 0);
    cruz(y0 + 1.6, z);
  } else {
    // Torre única central atrás do frontão, com sineira e bulbo de chumbo (como na arte da matriz).
    const lado = Math.max(3, L * 0.28);
    const zt = F / 2 - lado / 2 - 0.5;
    const base = A - 1;
    const hFuste = altoFrontao + 3.2;
    obra.por("reboco", bloco(lado, hFuste, lado, 0, base, zt), cal, 0.1, 0);
    obra.por("reboco", bloco(lado + 0.02, 1.4, lado + 0.02, 0, base + hFuste - 1.6, zt), "#8e877b", 0.12, 0);
    obra.por("cantaria", bloco(lado + 0.3, 0.3, lado + 0.3, 0, base + hFuste, zt), pedra, 0.05, 0);
    const hSino = lado * 0.85;
    const s = 0.45;
    for (const [px, pz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) obra.por("reboco", bloco(s, hSino, s, px * (lado / 2 - s / 2), base + hFuste + 0.3, zt + pz * (lado / 2 - s / 2)), cal, 0.08, 0);
    obra.por("ferro", new THREE.CylinderGeometry(0.25, lado * 0.2, lado * 0.32, 8).translate(0, base + hFuste + 0.3 + hSino * 0.5, zt), "#5a4a2a", 0.05, 0);
    const yb = base + hFuste + 0.3 + hSino;
    obra.por("cantaria", bloco(lado + 0.35, 0.35, lado + 0.35, 0, yb, zt), pedra, 0.05, 0);
    obra.por("telha-escura", bulbo(lado).translate(0, yb + 0.35, zt), "#3c3a38", 0.08, 0);
    cruz(yb + 0.35 + lado * 1.1, zt);
    // Faixa de crepe pendurada na sineira, de frente para a praça.
    obra.por("lona", bloco(0.3, hSino * 0.8, 0.04, 0, base + hFuste + 0.3, zt + lado / 2 + 0.02), PRETO_LUTO, 0.05, 0);
    // Coro alto sob a torre (o fuste nasce dele).
    if (p.entravel) {
      dentro.por("madeira", bloco(L - 0.8, 0.3, lado + 0.6, 0, A - 1.3, zt), "#4a3222", 0.06, 0);
      for (const sx of [-1, 1]) dentro.por("madeira", bloco(0.35, A - 1.3, 0.35, sx * (PORTA_DE_ENTRAR.largura / 2 + 0.8), 0, zt - lado / 2), "#4a3222", 0.06, 0);
    }
  }
  if (!capela) cruz(topo, F / 2 - 0.05);
  if (p.entravel) {
    dentro.por("madeira", bloco(L - 1, 0.08, F - 1, 0, 0.02, 0), "#5e4a38", 0.08, 0);
    const bancos = Math.max(2, Math.floor(F / 2.4) - 3);
    for (let i = 0; i < bancos; i++) for (const sx of [-1, 1]) dentro.por("madeira", bloco(L * 0.3, 0.5, 0.45, sx * L * 0.23, 0, F / 2 - 4 - i * 2.1), "#3a2618", 0.08, 0);
    dentro.por("reboco", bloco(L * 0.4, 1.4, 1.2, 0, 0, -F / 2 + 1.2), "#b8ae9c", 0.04, 0);
    dentro.por("lona", bloco(L * 0.42, 0.3, 1.25, 0, 1.2, -F / 2 + 1.2), PRETO_LUTO, 0.04, 0);
    // Eça com o caixão no meio da nave, quatro tocheiros.
    const zc = -F / 2 + 4.5;
    dentro.por("lona", bloco(1.2, 0.8, 2.4, 0, 0, zc), PRETO_LUTO, 0.04, 0);
    dentro.por("madeira-escura", bloco(0.7, 0.45, 2.0, 0, 0.8, zc), "#2a1a12", 0.06, 0);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        dentro.por("ferro", bloco(0.08, 1.4, 0.08, sx * 0.9, 0, zc + sz * 1.3), "#2a2826", 0.03, 0);
        dentro.por("vidro", bloco(0.1, 0.18, 0.1, sx * 0.9, 1.4, zc + sz * 1.3), "#f0c060", 0.03, 0);
      }
  }
  void r;
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

/** Matriz de longe: nave com cumeeira no comprimento, frontão, torre central e bulbo. */
function igrejaLonge(p: PredioLocal): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const cal = "#b8b0a2";
  const obra = new Obra(24);
  obra.por("reboco", bloco(L, A, F, 0, 0, 0), cal, 0.06, 0.25);
  obra.por("cantaria", bloco(L + 0.04, 1.0, F + 0.04, 0, 0, 0), "#4a4640", 0.05, 0);
  const alto = L * 0.36;
  const t = new Obra(25);
  for (const g of telhado("duas-aguas", F, L, A, alto, 0.5, 0.15).slice(0, 1)) t.por("telha-escura", g.rotateY(Math.PI / 2), "#4a3a34", 0.1, 0);
  const v = (x: number, y: number) => new THREE.Vector3(x, y, F / 2 + 0.05);
  const altoFrontao = alto + (L < 12 ? 0.6 : 1.4);
  obra.por("reboco", malha([v(-L / 2, A), v(L / 2, A), v(L * 0.25, A + altoFrontao * 0.75), v(0, A + altoFrontao + 0.9), v(-L * 0.25, A + altoFrontao * 0.75)], [0, 1, 2, 0, 2, 4, 4, 2, 3]), cal, 0.06, 0);
  if (L >= 12) {
    const lado = Math.max(3, L * 0.28);
    const zt = F / 2 - lado / 2 - 0.5;
    const h = altoFrontao + 3.5 + lado * 0.85;
    obra.por("reboco", bloco(lado, h, lado, 0, A - 1, zt), cal, 0.06, 0);
    obra.por("telha-escura", bulbo(lado, 6).translate(0, A - 1 + h, zt), "#3c3a38", 0.06, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

// ---------------------------------------------------------------- madeira: galpões, estação

/** Tabuado alcatroado com mata-juntas e embasamento de pedra. */
function tabuado(obra: Obra, L: number, F: number, A: number, cor: string, juntas: string, entravel: boolean) {
  paredes(obra, L, F, A, "madeira", cor, entravel ? PORTA_DE_ENTRAR : undefined);
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
    const comp = f === "frente" || f === "fundos" ? L : F;
    for (const u of aoLongo(comp, Math.floor(comp / 1.1), 0.3)) {
      if (entravel && f === "frente" && Math.abs(u) < 2.2) continue;
      obra.por("madeira", naFace(bloco(0.09, A, 0.05, 0, 0, 0.02), f, L, F, u, 0), juntas, 0.1, 0);
    }
  }
  obra.por("cantaria", bloco(L + 0.1, 0.5, F + 0.1, 0, 0, 0), "#3e3a36", 0.1, 0.3);
}

/** Lanternim: cumeeira elevada com venezianas, para a fumaça e o pó saírem. */
function lanternim(t: Obra, obra: Obra, L: number, y: number, cor: string, telha: string) {
  const w = L * 0.7;
  obra.por("madeira-escura", bloco(w, 0.7, 1.4, 0, y - 0.2, 0), "#1e1a17", 0.06, 0);
  for (const u of aoLongo(w, Math.floor(w / 0.8), 0.1)) for (const s of [-1, 1]) obra.por("madeira", bloco(0.07, 0.6, 0.07, u, y - 0.15, s * 0.68), cor, 0.08, 0);
  for (const g of telhado("duas-aguas", w, 1.4, y + 0.5, 0.6, 0.35, 0.1)) t.por("telha-escura", g, telha, 0.12, 0);
}

function galpao(p: PredioLocal, r: () => number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const n = nomeDe(p);
  const rural = n.includes("celeiro") || n.includes("cocheira");
  const cargas = n.includes("carga");
  const carvao = !rural && !cargas;
  const madeira = rural ? (r() < 0.5 ? "#5e4a36" : "#56432f") : carvao ? ALCATRAO : TABUA;
  const juntas = rural ? "#3e3024" : "#1c1814";
  const obra = new Obra(41);
  tabuado(obra, L, F, A, madeira, juntas, p.entravel);
  const t = new Obra(42);
  const alto = F * (rural ? 0.38 : 0.28);
  for (const g of telhado("duas-aguas", L, F, A, alto, 0.6)) t.por("telha-escura", g, rural ? "#4e3a30" : "#3a3330", 0.14, 0);
  for (const g of empenas(L, F, A, alto)) obra.por("madeira", g, madeira);
  if (!rural) lanternim(t, obra, L, A + alto, madeira, "#3a3330");
  if (!p.entravel) {
    // Portão de tábua com trave em X e o trilho de correr.
    const wp = Math.min(4.5, L * 0.35);
    const hp = A * 0.8;
    const u = rural ? 0 : (r() - 0.5) * (L - wp - 2);
    obra.por("madeira-escura", naFace(bloco(wp, hp, 0.08, 0, 0, 0.04), "frente", L, F, u, 0), "#2a221c", 0.08, 0);
    for (const s of [-1, 1]) obra.por("madeira", naFace(caixa2(Math.hypot(wp, hp) * 0.92, 0.18, 0.06).rotateZ(s * Math.atan2(hp, wp)).translate(0, hp / 2, 0.1), "frente", L, F, u, 0), "#4a3a2c", 0.08, 0);
    obra.por("ferro", naFace(bloco(wp * 2 + 0.4, 0.12, 0.1, 0, hp + 0.05, 0.12), "frente", L, F, u, 0), "#2a2826", 0.04, 0);
  }
  if (carvao) {
    // Pó preto encostado nas paredes, montes de carvão escorrendo pela frente e trilho.
    obra.por("carvao", bloco(L + 0.12, 1.0, F + 0.12, 0, 0, 0), "#1a1918", 0.12, 0);
    monteDeCarvao(obra, (r() < 0.5 ? -1 : 1) * L * 0.3, F / 2 + 1.3, 1.6 + r() * 0.6, 1.3 + r() * 0.5, r() * 3);
    if (r() < 0.6) monteDeCarvao(obra, (r() - 0.5) * L * 0.6, F / 2 + 1.0, 1.1, 0.9, r() * 3);
    trilho(obra, L * 0.3 * (r() < 0.5 ? -1 : 1), F / 2 - 0.3, F / 2 + 3);
  }
  if (cargas) {
    // Plataforma de embarque ao longo da frente, caixotes e placa.
    obra.por("madeira", naFace(bloco(L * 0.9, 1.1, 2.2, 0, 0, 1.1), "frente", L, F, 0, 0), "#3e3226", 0.1, 0.3);
    for (let i = 0; i < 3; i++) obra.por("madeira", naFace(bloco(0.9, 0.8, 0.9, 0, 1.1, 1.0), "frente", L, F, L * 0.3 - i * 1.1, 0), "#6a5236", 0.12, 0);
    placa(obra, "frente", L, F, 0, A - 1.2, L * 0.4, 0.7, "#2a221c");
  }
  if (rural) obra.por("madeira-escura", naFace(bloco(1.4, 1.2, 0.08, 0, 0, 0.04), "frente", L, F, 0, A + alto * 0.1), "#2a221c", 0.08, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p) };
}

function estacao(p: PredioLocal, r: () => number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const pintura = r() < 0.5 ? "#4e2c24" : "#3e3428";
  const obra = new Obra(61);
  tabuado(obra, L, F, A, pintura, "#8c8270", p.entravel);
  const wPorta = p.entravel ? 4.2 : 1.8;
  for (const u of aoLongo(L, Math.max(2, Math.floor(L / 3)), 1.6)) if (Math.abs(u) > wPorta / 2 + 1.0) janela(obra, "frente", L, F, u, 1.0, 1.0, 1.7, { moldura: "#c0b6a2", materialDaMoldura: "madeira", veneziana: "#2a2420" });
  porta(obra, "frente", L, F, 0, wPorta, p.entravel ? 3 : 2.6, "#2a221c", p.entravel, "#c0b6a2");
  // Plataforma coberta para o trem (na frente), o nome da estação e o relógio.
  varanda(obra, "frente", L, F, L, 3.0, 3.3, Math.max(3, Math.floor(L / 4)), { madeira: MADEIRA_ESCURA, telha: "#3a3330" });
  const wPlaca = Math.min(8, L * 0.4);
  placa(obra, "frente", L, F, 0, A - 1.0, wPlaca, 0.7, "#d2c8b2");
  obra.por("madeira", naFace(bloco(wPlaca * 0.85, 0.3, 0.03, 0, 0.2, 0.14), "frente", L, F, 0, A - 1.0), "#1c1a18", 0.04, 0);
  obra.por("ferro", naFace(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 10).rotateX(Math.PI / 2), "frente", L, F, -L * 0.32, A - 0.6, 0.12), "#e8e0cc", 0.04, 0);
  const t = new Obra(62);
  const alto = F * 0.32;
  for (const g of telhado("duas-aguas", L, F, A, alto, 0.9)) t.por("telha-escura", g, "#3a3330", 0.12, 0);
  for (const g of empenas(L, F, A, alto)) obra.por("madeira", g, pintura);
  chamineSuja(obra, L * 0.3, -F * 0.1, A, alto + 0.6);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p) };
}

function fazenda(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  // O sítio é menos encardido: cal mais clara, mas a telha escurece igual.
  const c: Paleta = { ...cor, cal: r() < 0.5 ? "#c6bcaa" : "#bdb3a0", fuligem: "#4a3e32" };
  const base = casa({ ...p, altura: Math.min(p.altura, 5) }, r, c);
  const obra = new Obra(31);
  obra.por("cantaria", bloco(p.largura + 0.6, 0.6, p.fundo + 0.6, 0, -0.3, 0), "#6a6458", 0.1, 0.3);
  varanda(obra, "frente", p.largura, p.fundo, p.largura * 0.92, 2.6, 2.7, Math.max(3, Math.floor(p.largura / 3)), { madeira: MADEIRA_ESCURA, telha: c.telha });
  return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
}

// ---------------------------------------------------------------- mina

/** Cavalete de poço: quatro pernas inclinadas em madeira, contraventos, plataforma e as rodas. */
function cavalete(p: PredioLocal, r: () => number, nivel: NivelPredio): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(71);
  const metade = Math.min(L, F) / 2 - 0.3;
  const topo = A * 0.78;
  const cima = Math.max(0.9, metade * 0.35);
  const madeira = "#3a2e24";
  const perna = (sx: number, sz: number, y: number) => {
    const k = y / topo;
    return new THREE.Vector3(sx * (metade + (cima - metade) * k), y, sz * (metade + (cima - metade) * k));
  };
  const cantos: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const R = Math.min(1.6, (A - topo) * 0.42);
  const yRoda = A - R - 0.15;
  if (nivel === 1) {
    for (const [sx, sz] of cantos) obra.por("madeira-escura", viga(perna(sx, sz, 0), perna(sx, sz, topo), 0.5), madeira, 0.08, 0);
    obra.por("madeira-escura", bloco(cima * 2 + 0.8, 0.4, cima * 2 + 0.8, 0, topo, 0), madeira, 0.08, 0);
    obra.por("madeira-escura", viga(perna(-1, 1, topo * 0.5), perna(1, 1, topo * 0.5), 0.3), madeira, 0.08, 0);
    for (const sx of [-1, 1]) obra.por("madeira-escura", viga(new THREE.Vector3(sx * cima, topo, -cima), new THREE.Vector3(sx * metade * 0.8, 0, -metade), 0.4), madeira, 0.08, 0);
    obra.por("ferro", new THREE.CylinderGeometry(R, R, 0.3, 8).rotateZ(Math.PI / 2).translate(0, yRoda, 0), "#2a2826", 0.04, 0);
    obra.por("madeira-escura", bloco(0.3, A - topo, 0.3, 0, topo, 0), madeira, 0.08, 0);
    return { corpo: obra.pecas(), telhado: [], interior: [] };
  }
  for (const [sx, sz] of cantos) obra.por("madeira-escura", viga(perna(sx, sz, -0.1), perna(sx, sz, topo), 0.42), madeira, 0.08, 0.2);
  // Travessas em cada lance e cruzes de Santo André na frente e nas laterais.
  const lances = Math.max(2, Math.round(topo / 4));
  for (let i = 1; i <= lances; i++) {
    const y = (i * topo) / lances;
    const y0 = ((i - 1) * topo) / lances;
    for (let k = 0; k < 4; k++) {
      const [ax, az] = cantos[k];
      const [bx, bz] = cantos[(k + 1) % 4];
      obra.por("madeira-escura", viga(perna(ax, az, y), perna(bx, bz, y), 0.22), madeira, 0.1, 0);
      if (k === 0) continue; // fundos sem cruz: é por onde o cabo sai
      obra.por("madeira-escura", viga(perna(ax, az, y0), perna(bx, bz, y), 0.16), madeira, 0.1, 0);
      obra.por("madeira-escura", viga(perna(bx, bz, y0), perna(ax, az, y), 0.16), madeira, 0.1, 0);
    }
  }
  // Plataforma, guarda-corpo e os mancais das rodas.
  obra.por("madeira", bloco(cima * 2 + 1.0, 0.25, cima * 2 + 1.0, 0, topo, 0), "#4a3c30", 0.1, 0);
  for (const [sx, sz] of cantos) obra.por("madeira", bloco(0.1, 1.0, 0.1, sx * (cima + 0.45), topo + 0.25, sz * (cima + 0.45)), "#4a3c30", 0.1, 0);
  for (const s of [-1, 1]) {
    obra.por("madeira", bloco(cima * 2 + 1.0, 0.08, 0.08, 0, topo + 1.2, s * (cima + 0.45)), "#4a3c30", 0.1, 0);
    obra.por("madeira", bloco(0.08, 0.08, cima * 2 + 1.0, s * (cima + 0.45), topo + 1.2, 0), "#4a3c30", 0.1, 0);
  }
  for (const s of [-1, 1]) {
    obra.por("madeira-escura", viga(new THREE.Vector3(s * 1.15, topo + 0.25, -R * 0.8), new THREE.Vector3(s * 1.15, yRoda, 0), 0.25), madeira, 0.08, 0);
    obra.por("madeira-escura", viga(new THREE.Vector3(s * 1.15, topo + 0.25, R * 0.8), new THREE.Vector3(s * 1.15, yRoda, 0), 0.25), madeira, 0.08, 0);
  }
  for (const s of [-1, 1]) roda(obra, s * 0.55, yRoda, 0, R, "#2a2826", 6, 14);
  obra.por("ferro", new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6).rotateZ(Math.PI / 2).translate(0, yRoda, 0), "#2a2826", 0.04, 0);
  // Pernas de força para os fundos (do lado da casa de máquinas) e os cabos.
  for (const s of [-1, 1]) obra.por("madeira-escura", viga(new THREE.Vector3(s * cima, topo, -cima), new THREE.Vector3(s * metade * 0.85, 0, -metade - 0.1), 0.34), madeira, 0.08, 0.2);
  for (const s of [-1, 1]) {
    obra.por("ferro", viga(new THREE.Vector3(s * 0.55, yRoda + R, 0), new THREE.Vector3(s * 0.4, 1.0, -metade), 0.05), "#1a1918", 0.02, 0);
    obra.por("ferro", viga(new THREE.Vector3(s * 0.55, yRoda, R), new THREE.Vector3(s * 0.55, 3.6, R), 0.05), "#1a1918", 0.02, 0);
  }
  // Boca do poço: colar de pedra, a gaiola e o trilho saindo com um vagonete.
  obra.por("cantaria", bloco(cima * 2 + 1.6, 0.5, cima * 2 + 1.6, 0, 0, 0), "#4e4a44", 0.1, 0.3);
  obra.por("carvao", bloco(cima * 2 + 0.4, 0.04, cima * 2 + 0.4, 0, 0.5, 0), "#0c0b0a", 0.02, 0);
  obra.por("ferro", bloco(1.3, 2.0, 1.3, 0, 1.6, Math.min(R, cima)), "#2c2a28", 0.05, 0);
  obra.por("madeira", bloco(1.2, 0.1, 1.2, 0, 1.6, Math.min(R, cima)), "#4a3c30", 0.1, 0);
  trilho(obra, 0, cima + 0.8, F / 2 + 2.2);
  if (r() < 0.7) vagonete(obra, 0, metade + 1.0);
  monteDeCarvao(obra, (r() < 0.5 ? -1 : 1) * (metade - 0.5), metade + 0.4, 1.0 + r() * 0.5, 0.8, r() * 3);
  return { corpo: obra.pecas(), telhado: [], interior: [] };
}

/** Caixa d'água de madeira sobre cavalete, com cintas de ferro e chapéu cônico. */
function caixaDagua(p: PredioLocal): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(73);
  const m = Math.min(L, F) / 2 - 0.4;
  const hT = A * 0.6;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) obra.por("madeira-escura", viga(new THREE.Vector3(sx * m, 0, sz * m), new THREE.Vector3(sx * m * 0.7, hT, sz * m * 0.7), 0.3), "#3a2e24", 0.08, 0.2);
  for (const y of [hT * 0.35, hT * 0.7]) {
    const k = 1 - 0.3 * (y / hT);
    for (const s of [-1, 1]) {
      obra.por("madeira-escura", bloco(m * 2 * k, 0.16, 0.16, 0, y, s * m * k), "#3a2e24", 0.08, 0);
      obra.por("madeira-escura", bloco(0.16, 0.16, m * 2 * k, s * m * k, y, 0), "#3a2e24", 0.08, 0);
    }
  }
  const rt = m * 0.95;
  const hc = A - hT - 1.2;
  obra.por("madeira", bloco(m * 1.6, 0.25, m * 1.6, 0, hT, 0), "#4a3c30", 0.08, 0);
  obra.por("madeira", new THREE.CylinderGeometry(rt, rt, hc, 12, 1, true).translate(0, hT + 0.25 + hc / 2, 0), "#4e3e30", 0.1, 0);
  for (const k of [0.2, 0.5, 0.8]) obra.por("ferro", new THREE.CylinderGeometry(rt + 0.03, rt + 0.03, 0.08, 12, 1, true).translate(0, hT + 0.25 + hc * k, 0), "#262422", 0.03, 0);
  obra.por("telha-escura", new THREE.ConeGeometry(rt + 0.3, 1.0, 12).translate(0, hT + 0.25 + hc + 0.5, 0), "#3a3330", 0.08, 0);
  obra.por("ferro", viga(new THREE.Vector3(rt, hT + 1, 0), new THREE.Vector3(rt + 0.6, 2.5, 0), 0.18), "#2a2826", 0.04, 0);
  return { corpo: obra.pecas(), telhado: [], interior: [] };
}

/** Boca da mina (Mina de Carvão, canônica) e a Mina Velha: o prédio de entrada do túnel. */
function bocaDaMina(p: PredioLocal, r: () => number, velha: boolean): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const madeira = velha ? "#2a2420" : ALCATRAO;
  const obra = new Obra(81);
  tabuado(obra, L, F, A, madeira, "#18140f", p.entravel);
  // Portal de cantaria emoldurando a entrada, com a placa da companhia.
  const wv = p.entravel ? PORTA_DE_ENTRAR.largura : 3.4;
  const hv = p.entravel ? PORTA_DE_ENTRAR.altura : 3;
  const pedra = velha ? "#4a4640" : "#5e5850";
  for (const s of [-1, 1]) obra.por("cantaria", naFace(bloco(1.1, hv + 1.2, 0.6, s * (wv / 2 + 0.55), 0, 0.3), "frente", L, F, 0, 0), pedra, 0.12, 0.2);
  obra.por("cantaria", naFace(bloco(wv + 2.4, 1.2, 0.7, 0, hv, 0.3), "frente", L, F, 0, 0), pedra, 0.1, 0);
  placa(obra, "frente", L, F, 0, hv + 0.25, wv + 0.8, 0.7, velha ? "#3a2e24" : "#1e1c1a");
  obra.por("madeira", naFace(bloco(wv * 0.7, 0.25, 0.03, 0, 0.22, 0.75), "frente", L, F, 0, hv + 0.25), velha ? "#5a4a3a" : "#c8bfa8", 0.05, 0);
  if (!p.entravel) obra.por("carvao", naFace(bloco(wv, hv, 0.05, 0, 0, 0.02), "frente", L, F, 0, 0), "#0b0a09", 0.02, 0);
  if (!velha || r() < 0.5) luto(obra, "frente", L, F, 0, hv + 1.3, wv + 2.2);
  // Janelinhas altas de sala de lampiões e vestiário.
  for (const u of aoLongo(L, Math.max(2, Math.floor(L / 3.2)), 1.5)) {
    if (Math.abs(u) < wv / 2 + 2) continue;
    janela(obra, "frente", L, F, u, A * 0.45, 0.9, 1.1, { moldura: "#5a4a3a", materialDaMoldura: "madeira", fechada: velha && r() < 0.6 ? "#3a2e24" : undefined });
  }
  for (const f of ["esquerda", "direita"] as Face[]) for (const u of aoLongo(F, Math.max(1, Math.floor(F / 4)), 1.5)) janela(obra, f, L, F, u, A * 0.45, 0.9, 1.1, { moldura: "#5a4a3a", materialDaMoldura: "madeira", fechada: velha ? "#3a2e24" : undefined });
  const t = new Obra(82);
  const alto = F * 0.3;
  for (const g of telhado("duas-aguas", L, F, A, alto, 0.6)) t.por("telha-escura", g, velha ? "#2e2a28" : "#3a3330", 0.16, 0);
  for (const g of empenas(L, F, A, alto)) obra.por("madeira", g, madeira);
  lanternim(t, obra, L, A + alto, madeira, "#3a3330");
  if (!velha) {
    // Sino de turno (toca a cada desgraça) num campanário de madeira sobre a cumeeira.
    const x = -L * 0.3;
    const y = A + alto - 0.3;
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) obra.por("madeira-escura", bloco(0.18, 2.2, 0.18, x + sx * 0.75, y, sz * 0.75), MADEIRA_ESCURA, 0.08, 0);
    obra.por("ferro", new THREE.CylinderGeometry(0.18, 0.4, 0.55, 8).translate(x, y + 1.3, 0), "#5a4a2a", 0.05, 0);
    for (const g of telhado("quatro-aguas", 1.7, 1.7, y + 2.2, 0.9, 0.2, 0.08)) obra.por("telha-escura", g.translate(x, 0, 0), "#3a3330", 0.1, 0);
    chamineSuja(obra, L * 0.32, -F * 0.25, A, alto + 2.5, 0.9);
  }
  // Trilho saindo pela boca, vagonete e monte de carvão.
  trilho(obra, 0, p.entravel ? -F / 2 + 1 : F / 2 - 0.2, F / 2 + 3, velha ? "#4a3428" : "#3a3430");
  vagonete(obra, 0, F / 2 + 1.6);
  monteDeCarvao(obra, L * 0.32, F / 2 + 1.5, 2.0, 1.4, r() * 3);
  obra.por("carvao", bloco(L + 0.12, 0.9, F + 0.12, 0, 0, 0), "#1a1918", 0.12, 0);
  const dentro = new Obra(83);
  if (p.entravel) {
    dentro.por("cantaria", bloco(L - 0.8, 0.06, F - 0.8, 0, 0.02, 0), "#2e2b28", 0.08, 0);
    // A boca do túnel na parede dos fundos, escorada.
    dentro.por("carvao", bloco(3.6, 3.0, 0.1, 0, 0, -F / 2 + 0.47), "#070606", 0.02, 0);
    for (const s of [-1, 1]) dentro.por("madeira-escura", bloco(0.35, 3.2, 0.35, s * 1.95, 0, -F / 2 + 0.6), "#3a2e24", 0.08, 0);
    dentro.por("madeira-escura", bloco(4.4, 0.4, 0.4, 0, 3.0, -F / 2 + 0.6), "#3a2e24", 0.08, 0);
    vagonete(dentro, 0, -F * 0.15);
    vagonete(dentro, 1.6, -F * 0.3, 0.2);
    // Prateleira de lampiões e banco dos mineiros.
    dentro.por("madeira", bloco(0.4, 1.8, 3.0, -L / 2 + 0.7, 0, 0), "#4a3c30", 0.08, 0);
    for (let i = 0; i < 6; i++) dentro.por("vidro", bloco(0.15, 0.22, 0.15, -L / 2 + 0.95, 1.1 + (i % 2) * 0.5, -1 + Math.floor(i / 2) * 1.0), "#e2a24a", 0.05, 0);
    dentro.por("madeira", bloco(4, 0.45, 0.5, L / 2 - 3, 0, 0), "#4a3c30", 0.08, 0);
    monteDeCarvao(dentro, -L * 0.3, -F * 0.3, 1.6, 1.2);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

/** Casa de máquinas: tijolo, janelões altos, chaminé redonda alta; dentro, caldeira e volante. */
function casaDeMaquinas(p: PredioLocal, r: () => number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(91);
  paredes(obra, L, F, A, "tijolo", "#5e3c30", p.entravel ? PORTA_DE_ENTRAR : undefined);
  obra.por("cantaria", bloco(L + 0.1, 0.8, F + 0.1, 0, 0, 0), "#3e3a36", 0.08, 0.3);
  obra.por("tijolo", bloco(L + 0.2, 0.3, F + 0.2, 0, A - 0.3, 0), "#4a3028", 0.06, 0);
  obra.por("tijolo", bloco(L + 0.05, 1.6, F + 0.05, 0, A - 1.9, 0), "#3e2a24", 0.12, 0);
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
    const comp = f === "frente" || f === "fundos" ? L : F;
    for (const u of aoLongo(comp, Math.max(1, Math.floor(comp / 3.2)), 1.6)) {
      if (f === "frente" && Math.abs(u) < (p.entravel ? 3.2 : 2.2)) continue;
      janela(obra, f, L, F, u, 1.4, 1.2, A * 0.5, { moldura: "#8a8274", materialDaMoldura: "cantaria" });
    }
  }
  porta(obra, "frente", L, F, 0, p.entravel ? 4.2 : 2.4, p.entravel ? 3 : 3.2, "#2a221c", p.entravel, "#8a8274");
  const t = new Obra(92);
  const alto = F * 0.25;
  for (const g of telhado("duas-aguas", L, F, A, alto, 0.4)) t.por("telha-escura", g, "#3a3330", 0.14, 0);
  for (const g of empenas(L, F, A, alto)) obra.por("tijolo", g, "#5e3c30");
  lanternim(t, obra, L, A + alto, "#2f2822", "#3a3330");
  const ladoCham = r() < 0.5 ? -1 : 1;
  chamineAlta(obra, ladoCham * (L / 2 - 1.4), -F / 2 + 1.4, A * 2.6, 0.85);
  const dentro = new Obra(93);
  if (p.entravel) {
    dentro.por("cantaria", bloco(L - 0.8, 0.06, F - 0.8, 0, 0.02, 0), "#3e3a36", 0.08, 0);
    dentro.por("tijolo", bloco(L * 0.4, 1.0, 2.4, -L * 0.18, 0, -F * 0.22), "#4a3028", 0.08, 0);
    dentro.por("ferro", new THREE.CylinderGeometry(1.0, 1.0, L * 0.38, 10).rotateZ(Math.PI / 2).translate(-L * 0.18, 2.0, -F * 0.22), "#2a2826", 0.05, 0);
    roda(dentro, L * 0.22, 2.6, -F * 0.1, 2.2, "#262422", 6, 16);
    dentro.por("cantaria", bloco(1.4, 0.4, 3.0, L * 0.22, 0, -F * 0.1), "#4e4a44", 0.06, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

/** Lavador de carvão: três corpos em degrau de tabuado preto e a esteira inclinada. */
function lavador(p: PredioLocal, r: () => number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(95);
  const t = new Obra(96);
  const partes = [
    { f: F * 0.4, a: A, z: -F / 2 + F * 0.2 },
    { f: F * 0.32, a: A * 0.75, z: -F / 2 + F * 0.56 },
    { f: F * 0.28, a: A * 0.5, z: F / 2 - F * 0.14 },
  ];
  for (const [i, pt] of partes.entries()) {
    const Li = L * (1 - i * 0.08);
    obra.por("madeira", bloco(Li, pt.a, pt.f, 0, 0, pt.z), ALCATRAO, 0.1, 0.25);
    for (const u of aoLongo(Li, Math.floor(Li / 1.1), 0.3)) obra.por("madeira", bloco(0.09, pt.a, 0.05, u, 0, pt.z + pt.f / 2 + 0.02), "#18140f", 0.1, 0);
    for (const u of aoLongo(Li, Math.max(2, Math.floor(Li / 2.6)), 1.4)) obra.por("vidro", bloco(0.8, 0.6, 0.06, u, pt.a - 1.4, pt.z + pt.f / 2 + 0.05), "#3a3a34", 0.05, 0);
    for (const g of telhado("uma-agua", Li, pt.f, pt.a, 0.9, 0.4, 0.12)) t.por("telha-escura", g.translate(0, 0, pt.z), "#34302e", 0.14, 0);
  }
  // Esteira inclinada (galeria de tábua) subindo do chão ao corpo alto, pelo lado.
  const x = -L / 2 + 1.0;
  obra.por("madeira", viga(new THREE.Vector3(x, 0.8, F / 2 + 2.5), new THREE.Vector3(x, A * 0.85, -F / 2 + F * 0.3), 1.6), "#3a2e24", 0.1, 0);
  for (const k of [0.3, 0.6]) {
    const z = F / 2 + 2.5 - k * (F * 0.7 + 2.5);
    obra.por("madeira-escura", bloco(0.3, 0.8 + k * (A * 0.85 - 0.8), 0.3, x, 0, z), "#2e2620", 0.08, 0);
  }
  obra.por("carvao", bloco(L + 0.12, 1.2, F + 0.12, 0, 0, 0), "#1a1918", 0.12, 0);
  monteDeCarvao(obra, L * 0.25, F / 2 + 1.5, 2.2, 1.8, r() * 3);
  trilho(obra, L * 0.25, F / 2 - 0.5, F / 2 + 3);
  chamineSuja(obra, L * 0.3, partes[0].z, A, 3.0, 0.8);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

function fabrica(p: PredioLocal, r: () => number, nivel: NivelPredio, cor: Paleta): PecasDoPredio {
  const n = nomeDe(p);
  const velha = n.includes("velha");
  const boca = n.includes("boca") || n.includes("mina de carv") || velha;
  const lav = n.includes("lavador");
  if (nivel === 1) {
    const deTijolo = !boca && !lav;
    const base = longe(p, cor, "duas-aguas", deTijolo ? "tijolo" : "madeira", deTijolo ? "#5e3c30" : ALCATRAO);
    const o = new Obra(98);
    if (deTijolo) o.por("tijolo", new THREE.CylinderGeometry(0.6, 0.85, p.altura * 2.6, 6, 1, true).translate(p.largura / 2 - 1.4, p.altura * 1.3, -p.fundo / 2 + 1.4), "#4e3a32", 0.05, 0);
    return { ...base, corpo: [...base.corpo, ...o.pecas()] };
  }
  if (boca) return bocaDaMina(p, r, velha);
  if (lav) return lavador(p, r);
  return casaDeMaquinas(p, r);
}

// ---------------------------------------------------------------- moinho

/** Moinho d'água: casa de pedra escura alta com a roda de madeira na lateral. */
function moinho(p: PredioLocal, r: () => number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(101);
  const Lc = L * 0.72;
  const xc = -L * 0.14;
  const corpo = new Obra(103);
  corpo.por("cantaria", bloco(Lc, A, F, 0, 0, 0), "#5e5850", 0.14, 0.3);
  corpo.por("cantaria", bloco(Lc + 0.1, 0.9, F + 0.1, 0, 0, 0), "#3a3632", 0.1, 0);
  for (const y of [1.2, A * 0.45, A * 0.72]) {
    if (y < 2.6 && y > 1.3) continue;
    janela(corpo, "frente", Lc, F, y < 2 ? Lc * 0.25 : 0, y, 0.7, 1.0, { moldura: "#4a4640", materialDaMoldura: "cantaria", fechada: y > 2 && r() < 0.5 ? "#3a2e24" : undefined });
  }
  porta(corpo, "frente", Lc, F, -Lc * 0.15, 1.3, 2.3, "#2a221c", false, "#4a4640");
  const t = new Obra(102);
  const alto = Math.min(Lc, F) * 0.35;
  for (const g of telhado("duas-aguas", Lc, F, A, alto, 0.4)) t.por("telha-escura", g.translate(xc, 0, 0), "#3a3330", 0.14, 0);
  for (const g of empenas(Lc, F, A, alto)) corpo.por("cantaria", g, "#5e5850");
  const R = Math.min(A * 0.32, F * 0.4);
  const x = xc + Lc / 2 + 0.55;
  for (const s of [-0.35, 0.35]) roda(obra, x + s, R + 0.2, 0, R, "#3a2e24", 8, 16);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI * 2) / 12;
    obra.por("madeira", bloco(0.8, 0.08, 0.5, x, R + 0.2 + Math.sin(a) * R, Math.cos(a) * R), "#4a3c30", 0.1, 0);
  }
  // Calha d'água chegando por cima da roda.
  obra.por("madeira", bloco(0.9, 0.5, F * 0.9, x, R * 2 + 0.3, 0), "#3a2e24", 0.1, 0);
  const pc = corpo.pecas().map((pe) => ({ ...pe, geometria: pe.geometria.translate(xc, 0, 0) }));
  return { corpo: [...pc, ...obra.pecas()], telhado: t.pecas(), interior: [] };
}

// ---------------------------------------------------------------- circo

const CIRCO: [string, string][] = [
  ["#b8302a", "#e8c25a"],
  ["#c0392b", "#efe2c4"],
  ["#2e5a8a", "#e8c25a"],
  ["#7a2a6a", "#e8c25a"],
];

/** Circo do Sol (canônico): lona listrada vermelha e amarela, dois mastros, picadeiro e arquibancada. */
function circoDoSol(p: PredioLocal, nivel: NivelPredio): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const raio = Math.min(L, F) / 2 - 0.5;
  const parede = Math.min(4.6, A * 0.33);
  const cores: [string, string] = ["#b8302a", "#e8c25a"];
  const obra = new Obra(111);
  const t = new Obra(112);
  if (nivel === 1) {
    anelDeLona(raio, 0, parede, 16, 0.3, cores, obra, false);
    coneListrado(raio + 0.6, parede, 2.5, A - 1, 16, cores, t, false);
    t.por("lona", new THREE.ConeGeometry(2.5, 1.2, 8).translate(0, A - 0.4, 0), "#b8302a", 0.05, 0);
    obra.por("madeira", bloco(0.3, 3, 0.3, 0, A - 1, 0), "#4a3c30", 0.05, 0);
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  const n = 28;
  const passo = (Math.PI * 2) / n;
  anelDeLona(raio, 0, parede, n, passo * 0.99, cores, obra); // vão de dois painéis (≈ 7 m) na frente
  // Estacas e espias em volta.
  for (let i = 0; i < n; i++) {
    const a = -Math.PI + (i + 0.5) * passo;
    if (Math.abs(a) < passo) continue;
    const [sx, sz] = [Math.sin(a), Math.cos(a)];
    obra.por("madeira", bloco(0.14, parede + 0.4, 0.14, sx * (raio + 0.15), 0, sz * (raio + 0.15)), "#5a4632", 0.08, 0);
    if (i % 2 === 0) obra.por("lona", viga(new THREE.Vector3(sx * (raio + 0.15), parede + 0.3, sz * (raio + 0.15)), new THREE.Vector3(sx * (raio + 0.45), 0, sz * (raio + 0.45)), 0.03), "#c8b896", 0.05, 0);
  }
  // Cobertura: cone abatido até os mastros e o chapéu listrado.
  coneListrado(raio + 0.8, parede - 0.1, 3.2, A - 2.0, n, cores, t);
  coneListrado(3.2, A - 2.0, 0.3, A - 0.5, 14, ["#e8c25a", "#b8302a"], t);
  // Dois mastros furando a lona, com bandeirolas.
  for (const s of [-1, 1]) {
    obra.por("madeira", bloco(0.35, A + 1.6, 0.35, s * 1.6, 0, 0), "#5a4632", 0.06, 0);
    obra.por("lona", malha([new THREE.Vector3(s * 1.6, A + 1.6, 0), new THREE.Vector3(s * 1.6, A + 0.9, 0), new THREE.Vector3(s * 3.2, A + 1.3, 0.1)], [0, 1, 2, 0, 2, 1]), s < 0 ? "#e8c25a" : "#b8302a", 0.05, 0);
  }
  // Pórtico de entrada com o sol de madeira pintado, lampiões e toldo.
  const Fp = (raio + 0.4) * 2;
  for (const s of [-1, 1]) obra.por("madeira", naFace(bloco(0.3, parede + 1.6, 0.3, s * 3.2, 0, 0), "frente", L, Fp, 0, 0), "#7a2a24", 0.06, 0);
  obra.por("madeira", naFace(bloco(7.2, 0.9, 0.2, 0, parede + 0.6, 0), "frente", L, Fp, 0, 0), "#2e5a8a", 0.06, 0);
  const zs = raio + 0.55;
  obra.por("madeira", new THREE.CylinderGeometry(1.0, 1.0, 0.15, 14).rotateX(Math.PI / 2).translate(0, parede + 1.9, zs), "#f0b830", 0.04, 0);
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI * 2) / 10;
    obra.por("madeira", caixa2(0.18, 0.7, 0.1).translate(0, 1.55, 0).rotateZ(a).translate(0, parede + 1.9, zs), "#e89a28", 0.04, 0);
  }
  for (const s of [-1, 1]) lampiao(obra, "frente", L, Fp, s * 3.2, parede - 0.4);
  toldo(obra, "frente", L, Fp - 3.2, 0, parede - 0.3, 6.4, 1.5, "#efe2c4");
  // Picadeiro, arquibancada de tábua em três degraus.
  const dentro = new Obra(113);
  dentro.por("terra", new THREE.CylinderGeometry(raio * 0.42, raio * 0.42, 0.12, 20).translate(0, 0.06, 0), "#c9a46a", 0.1, 0);
  dentro.por("madeira", new THREE.CylinderGeometry(raio * 0.45, raio * 0.45, 0.45, 20, 1, true).translate(0, 0.22, 0), "#b8302a", 0.05, 0);
  for (let d = 0; d < 3; d++) {
    const rr = raio * 0.62 + d * 1.2;
    const m = 18;
    for (let i = 0; i < m; i++) {
      const a = -Math.PI + (i + 0.5) * ((Math.PI * 2) / m);
      if (Math.abs(a) < 0.45) continue;
      const w = (Math.PI * 2 * rr) / m - 0.15;
      dentro.por("madeira", bloco(w, 0.45 + d * 0.5, 1.1, 0, 0, 0).rotateY(a).translate(Math.sin(a) * rr, 0, Math.cos(a) * rr), d % 2 ? "#5a4632" : "#6a5236", 0.08, 0);
    }
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

/** Barraca do circo (e tenda genérica): duas águas em faixas coloridas, mastros e bandeirola. */
function barraca(p: PredioLocal, r: () => number, nivel: NivelPredio): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const par = CIRCO[Math.floor(r() * CIRCO.length)];
  const obra = new Obra(121);
  const faixas = nivel === 1 ? 2 : Math.max(3, Math.round(L / 1.2));
  for (let i = 0; i < faixas; i++) {
    const w = L / faixas;
    for (const g of telhado("duas-aguas", w, F, 0.9, A - 0.9, 0, 0.04).slice(0, nivel === 1 ? 1 : 2)) obra.por("lona", g.translate(-L / 2 + w * (i + 0.5), 0, 0), par[i % 2], 0.08, 0);
  }
  if (nivel === 1) return { corpo: obra.pecas(), telhado: [], interior: [] };
  // Saia de lona até o chão e empena de pano.
  for (const s of [-1, 1]) obra.por("lona", bloco(L, 0.9, 0.04, 0, 0, s * (F / 2 - 0.02)), par[0], 0.08, 0.2);
  for (const g of empenas(L, F, 0.9, A - 0.9)) obra.por("lona", g, par[1]);
  for (const s of [-1, 1]) obra.por("madeira", bloco(0.12, A + 0.6, 0.12, s * (L / 2 + 0.1), 0, 0), "#5a4632", 0.08, 0);
  obra.por("lona", malha([new THREE.Vector3(L / 2 + 0.1, A + 0.6, 0), new THREE.Vector3(L / 2 + 0.1, A + 0.1, 0), new THREE.Vector3(L / 2 + 1.1, A + 0.35, 0)], [0, 1, 2, 0, 2, 1]), par[0], 0.05, 0);
  // Pano da porta (vão escuro) na frente.
  obra.por("carvao", naFace(bloco(1.4, 1.9, 0.03, 0, 0, 0.03), "frente", L, F, 0, 0), "#141210", 0.03, 0);
  return { corpo: obra.pecas(), telhado: [], interior: interior(p) };
}

// ---------------------------------------------------------------- ruína

function ruinaMineira(p: PredioLocal, r: () => number): PecasDoPredio {
  const base = ruina(p, r, "#5a554e");
  const obra = new Obra(131);
  // Caibros queimados caídos e cinza de carvão.
  for (let i = 0; i < 4; i++) {
    const a = new THREE.Vector3((r() - 0.5) * p.largura * 0.7, 0.1, (r() - 0.5) * p.fundo * 0.7);
    const b = a.clone().add(new THREE.Vector3((r() - 0.5) * 4, 0.8 + r() * 1.5, (r() - 0.5) * 4));
    obra.por("madeira-escura", viga(a, b, 0.2), "#1e1a17", 0.12, 0);
  }
  obra.por("carvao", bloco(p.largura * 0.8, 0.08, p.fundo * 0.8, 0, 0, 0), "#24221f", 0.15, 0);
  return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
}

// ---------------------------------------------------------------- despacho

export function gerarMineracao(p: PredioLocal, nivel: NivelPredio, semente: number): PecasDoPredio {
  const r = sorteio(semente);
  const cor = paleta(r);
  const n = nomeDe(p);
  const rica = p.tipo === "banco" || n.includes("mineradora") || n.includes("câmara") || n.includes("prefeitura");
  if (p.tipo === "ruina") return nivel === 1 ? ruina(p, r, "#5a554e") : ruinaMineira(p, r);
  if (p.tipo === "casa" && (n.includes("operári") || n.includes("operari"))) return casaOperaria(p, r, cor, nivel);
  if (p.tipo === "casa" && n.includes("barraco")) return barraco(p, r, cor, nivel);
  if (p.tipo === "torre") return n.includes("caixa") ? caixaDagua(p) : cavalete(p, r, nivel);
  if (p.tipo === "tenda") return n.includes("circo do sol") || p.largura >= 20 ? circoDoSol(p, nivel) : barraca(p, r, nivel);
  if (p.tipo === "fabrica") return fabrica(p, r, nivel, cor);
  if (nivel === 1) {
    if (rica) return longe(p, cor, "plano", "tijolo", TIJOLO);
    if (p.tipo === "galpao") return longe(p, cor, "duas-aguas", "madeira", n.includes("celeiro") || n.includes("cocheira") ? "#5e4a36" : ALCATRAO);
    if (p.tipo === "estacao") return longe(p, cor, "duas-aguas", "madeira", "#4e2c24");
    if (p.tipo === "igreja") return igrejaLonge(p);
    if (p.tipo === "moinho") return longe(p, cor, "duas-aguas", "reboco", "#5e5850");
    if (p.tipo === "casa" && r() < 0.45) return longe(p, cor, "duas-aguas");
    return longe(p, cor);
  }
  if (rica && (p.tipo === "publico" || p.tipo === "banco")) return companhia(p, r);
  switch (p.tipo) {
    case "igreja":
      return igreja(p, r);
    case "comercio":
      return comercio(p, r, cor);
    case "saloon":
      return saloon(p, r, cor);
    case "hotel":
      return hotel(p, r, cor);
    case "publico":
    case "banco":
      return publico(p, r, cor);
    case "estacao":
      return estacao(p, r);
    case "fazenda":
      return fazenda(p, r, cor);
    case "galpao":
      return galpao(p, r);
    case "moinho":
      return moinho(p, r);
    default:
      return casa(p, r, cor);
  }
}

const estilo: Estilo = { id: "mineracao", nome: "Mineração de carvão (Araguari)", gerar: gerarMineracao };

export default estilo;
