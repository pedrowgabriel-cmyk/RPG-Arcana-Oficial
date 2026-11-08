// Colonial mineiro de 1880 (Tupaciguara): cal branca ou tinta clara, barrado e cunhais
// coloridos, janelas com venezianas, telha colonial de quatro águas, igreja branca de
// torre única. É a referência de qualidade dos outros estilos e a base de quem quiser
// herdar (importe `colonial` e troque só o que muda).

import * as THREE from "three";
import { sorteio } from "../../natureza/ferramentas";
import {
  aoLongo,
  barradoECunhais,
  bloco,
  chamine,
  cimalha,
  empenas,
  interiorBasico,
  janela,
  malha,
  naFace,
  Obra,
  paredes,
  placa,
  porta,
  sacada,
  telhado,
  toldo,
  torre,
  varanda,
  type Face,
} from "../kit";
import type { Estilo, NivelPredio, PecasDoPredio, PredioLocal } from "../tipos";

const CAL = ["#ece5d4", "#efe6cf", "#e6d9bd", "#e9d3b8", "#dcd6c8"];
const BARRADO = ["#3e5f86", "#4a6b46", "#8a5a2c", "#7a3328", "#5b5f6a"];
const VENEZIANA = ["#2f5677", "#3f6a3e", "#6b2a22", "#3a4a5a", "#7a5a2a"];
const PORTA = ["#4e3826", "#3d4f3a", "#5a2a22", "#2f4256"];
const TELHA = ["#a4553a", "#9a4c34", "#ad6243", "#8c4a36"];

export type Paleta = { cal: string; barrado: string; veneziana: string; porta: string; telha: string };

export function paletaColonial(r: () => number): Paleta {
  const de = (l: string[]) => l[Math.floor(r() * l.length)];
  return { cal: de(CAL), barrado: de(BARRADO), veneziana: de(VENEZIANA), porta: de(PORTA), telha: de(TELHA) };
}

const ALTURA_DO_PAVIMENTO = 3.6;
const PORTA_DE_ENTRAR = { largura: 4.2, altura: 3 };

/** Longe: volume, telhado e o barrado. Poucas faces, mesma silhueta. */
function longe(p: PredioLocal, cor: Paleta, tipoDoTelhado: "quatro-aguas" | "duas-aguas" | "plano" = "quatro-aguas"): PecasDoPredio {
  const obra = new Obra(1);
  obra.por("reboco", bloco(p.largura, p.altura, p.fundo, 0, 0, 0), cor.cal);
  obra.por("reboco", bloco(p.largura + 0.04, 0.7, p.fundo + 0.04, 0, 0, 0), cor.barrado, 0.05, 0);
  const t = new Obra(2);
  if (tipoDoTelhado !== "plano") for (const g of telhado(tipoDoTelhado, p.largura, p.fundo, p.altura, Math.min(p.largura, p.fundo) * 0.32, 0.5, 0.15).slice(0, 1)) t.por("telha", g, cor.telha, 0.1, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

/** Fachada: janelas espalhadas e a porta no meio (ou de lado). */
function fachada(obra: Obra, p: PredioLocal, cor: Paleta, pavimentos: number, r: () => number, opcoes: { sacadas?: boolean; grade?: boolean; portaLarga?: boolean } = {}) {
  const { largura: L, fundo: F } = p;
  const larguraDaPorta = p.entravel ? PORTA_DE_ENTRAR.largura : opcoes.portaLarga ? 2.2 : 1.2;
  const alturaDaPorta = p.entravel ? PORTA_DE_ENTRAR.altura : 2.5;
  const vaos = Math.max(1, Math.floor((L - 1.6) / 2.4));
  const posicoes = aoLongo(L, vaos, 1.3);
  const meio = Math.floor(vaos / 2);
  posicoes.forEach((u, i) => {
    if (i === meio) porta(obra, "frente", L, F, p.entravel ? 0 : u, larguraDaPorta, alturaDaPorta, cor.porta, p.entravel);
    else janela(obra, "frente", L, F, u, 1.0, 1.0, 1.55, { veneziana: cor.veneziana, grade: opcoes.grade });
  });
  for (let andar = 1; andar < pavimentos; andar++) {
    const y = andar * ALTURA_DO_PAVIMENTO + 0.4;
    posicoes.forEach((u) => {
      if (opcoes.sacadas) sacada(obra, "frente", L, F, u, y - 0.1, 1.5);
      janela(obra, "frente", L, F, u, y, 1.0, opcoes.sacadas ? 2.1 : 1.55, { veneziana: cor.veneziana });
    });
  }
  // Laterais e fundos: menos janelas, a vida da casa é para a rua.
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
    const comp = f === "fundos" ? L : F;
    const n = Math.max(0, Math.floor((comp - 2) / 4.5));
    for (const u of aoLongo(comp, n, 1.6)) {
      for (let andar = 0; andar < pavimentos; andar++) {
        if (r() < 0.25) continue;
        janela(obra, f, L, F, u, 1.0 + andar * ALTURA_DO_PAVIMENTO, 0.9, 1.4, { veneziana: cor.veneziana });
      }
    }
  }
}

function casa(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const pavimentos = A >= 6.4 ? 2 : 1;
  const obra = new Obra(Math.floor(r() * 1e6));
  paredes(obra, L, F, A, "reboco", cor.cal, p.entravel ? PORTA_DE_ENTRAR : undefined);
  barradoECunhais(obra, L, F, A, cor.barrado);
  cimalha(obra, L, F, A, "#efe9dc");
  if (pavimentos === 2) obra.por("reboco", bloco(L + 0.12, 0.2, F + 0.12, 0, ALTURA_DO_PAVIMENTO, 0), "#efe9dc", 0.04, 0);
  fachada(obra, p, cor, pavimentos, r, { sacadas: pavimentos === 2 && r() < 0.7 });
  const t = new Obra(7);
  const alturaDoTelhado = Math.min(L, F) * (0.26 + r() * 0.08);
  for (const g of telhado("quatro-aguas", L, F, A, alturaDoTelhado, 0.7)) t.por("telha", g, cor.telha, 0.12, 0);
  if (r() < 0.55) chamine(obra, (r() - 0.5) * L * 0.5, -F * 0.2, A, alturaDoTelhado + 0.6);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p) };
}

function interior(p: PredioLocal) {
  if (!p.entravel) return [];
  const obra = new Obra(3);
  interiorBasico(obra, p.largura, p.fundo, { piso: "#9a7a52", madeira: "#5a3a22" });
  return obra.pecas();
}

function comercio(p: PredioLocal, r: () => number, cor: Paleta, letreiro: string): PecasDoPredio {
  const base = casa(p, r, cor);
  const obra = new Obra(11);
  toldo(obra, "frente", p.largura, p.fundo, 0, 2.9, Math.min(p.largura - 1, 6), 1.6, r() < 0.5 ? "#c9b48a" : "#8a3a2a");
  placa(obra, "frente", p.largura, p.fundo, 0, Math.min(p.altura - 0.9, 3.8), Math.min(p.largura * 0.6, 5), 0.7, letreiro);
  return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
}

function igreja(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(21);
  paredes(obra, L, F, A, "reboco", "#f1ece0", p.entravel ? PORTA_DE_ENTRAR : undefined);
  barradoECunhais(obra, L, F, A, cor.barrado, 0.9, 0.5);
  cimalha(obra, L, F, A, "#efe9dc");
  // Telhado com cumeeira no comprimento (de frente para os fundos) e frontão na fachada.
  const alto = L * 0.38;
  const t = new Obra(22);
  for (const g of telhado("duas-aguas", F, L, A, alto, 0.5)) t.por("telha", g.rotateY(Math.PI / 2), cor.telha, 0.1, 0);
  for (const g of empenas(F, L, A, alto)) obra.por("reboco", g.rotateY(Math.PI / 2), "#f1ece0");
  // Frontão: triângulo de fachada mais alto que o telhado, com cornija e cruz.
  const v = (x: number, y: number) => new THREE.Vector3(x, y, F / 2 + 0.25);
  obra.por("reboco", malha([v(-L / 2, A), v(L / 2, A), v(0, A + alto + 1.2)], [0, 1, 2]), "#f1ece0");
  obra.por("reboco", bloco(L + 0.3, 0.35, 0.6, 0, A - 0.1, F / 2), "#efe9dc", 0.04, 0);
  obra.por("ferro", bloco(0.1, 1.4, 0.1, 0, A + alto + 1.2, F / 2 + 0.25), "#2c2a28", 0.02, 0);
  obra.por("ferro", bloco(0.7, 0.1, 0.1, 0, A + alto + 2.05, F / 2 + 0.25), "#2c2a28", 0.02, 0);
  porta(obra, "frente", L, F, 0, p.entravel ? PORTA_DE_ENTRAR.largura : 2.4, p.entravel ? PORTA_DE_ENTRAR.altura : 3.4, cor.porta, p.entravel);
  janela(obra, "frente", L, F, 0, A * 0.62, 1.2, 1.2, { moldura: "#efe9dc" });
  for (const u of aoLongo(F, Math.max(2, Math.floor(F / 5)), 2)) {
    for (const f of ["esquerda", "direita"] as Face[]) janela(obra, f, L, F, u, A * 0.45, 1.1, 2.2, { moldura: "#efe9dc" });
  }
  // Torre única ao lado da fachada, ou duas se a igreja for larga.
  const lado = Math.max(3, L * 0.26);
  const alturaDaTorre = A + alto + 2;
  if (L >= 13 && r() < 0.6) for (const s of [-1, 1]) torre(obra, s * (L / 2 - lado / 2), F / 2 - lado / 2, lado, alturaDaTorre, "#f1ece0", cor.telha);
  else torre(obra, L / 2 - lado / 2, F / 2 - lado / 2, lado, alturaDaTorre, "#f1ece0", cor.telha);
  const dentro = new Obra(23);
  if (p.entravel) {
    dentro.por("madeira", bloco(L - 1, 0.08, F - 1, 0, 0.02, 0), "#8a6a48", 0.08, 0);
    for (let i = 0; i < Math.floor(F / 2.4) - 2; i++) {
      for (const s of [-1, 1]) dentro.por("madeira", bloco(L * 0.32, 0.5, 0.45, s * L * 0.22, 0, F / 2 - 3 - i * 2.2), "#5a3a22", 0.08, 0);
    }
    dentro.por("reboco", bloco(L * 0.4, 1.4, 1.2, 0, 0, -F / 2 + 1.2), "#efe6cf", 0.04, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

function fazenda(p: PredioLocal, r: () => number, cor: Paleta): PecasDoPredio {
  const base = casa({ ...p, altura: Math.min(p.altura, 5.2) }, r, cor);
  const obra = new Obra(31);
  // Casa-grande assentada num embasamento de pedra, com alpendre ao longo da frente.
  obra.por("cantaria", bloco(p.largura + 0.6, 0.6, p.fundo + 0.6, 0, -0.3, 0), "#8f8676", 0.08, 0.3);
  varanda(obra, "frente", p.largura, p.fundo, p.largura * 0.92, 2.6, 2.7, Math.max(3, Math.floor(p.largura / 3)), { madeira: "#6a4a30", telha: cor.telha });
  return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
}

function galpao(p: PredioLocal, r: () => number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(41);
  const madeira = r() < 0.5 ? "#7a5a3a" : "#6a5038";
  paredes(obra, L, F, A, "madeira", madeira, p.entravel ? PORTA_DE_ENTRAR : undefined);
  // Mata-juntas: ripas verticais que dão o desenho do tabuado.
  for (const f of ["frente", "fundos"] as Face[]) {
    for (const u of aoLongo(L, Math.floor(L / 0.9), 0.3)) obra.por("madeira", naFace(bloco(0.08, A, 0.05, 0, 0, 0.02), f, L, F, u, 0), "#5a4028", 0.1, 0);
  }
  if (!p.entravel) obra.por("madeira-escura", naFace(bloco(Math.min(4, L * 0.4), A * 0.75, 0.06, 0, 0, 0.03), "frente", L, F, 0, 0), "#3a2a1c", 0.08, 0);
  const t = new Obra(42);
  const alto = F * 0.3;
  for (const g of telhado("duas-aguas", L, F, A, alto, 0.5)) t.por("telha-escura", g, "#6a4a3a", 0.12, 0);
  for (const g of empenas(L, F, A, alto)) obra.por("madeira", g, madeira);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p) };
}

function moinho(p: PredioLocal, r: () => number): PecasDoPredio {
  const raio = Math.min(p.largura, p.fundo) / 2;
  const obra = new Obra(51);
  const corpo = new THREE.CylinderGeometry(raio * 0.75, raio, p.altura, 12, 1, true).translate(0, p.altura / 2, 0);
  obra.por("cantaria", corpo, "#d6cfbf", 0.08, 0.3);
  obra.por("madeira", naFace(bloco(1.2, 2.2, 0.1, 0, 0, raio * 0.05), "frente", raio * 2, raio * 2, 0, 0), "#4e3826", 0.08, 0);
  const t = new Obra(52);
  t.por("palha", new THREE.ConeGeometry(raio * 0.95, raio * 1.1, 12).translate(0, p.altura + raio * 0.55, 0), "#8a6a48", 0.1, 0);
  // Pás em cruz, de frente, um pouco inclinadas.
  const giro = r() * Math.PI;
  for (let i = 0; i < 4; i++) {
    const pa = bloco(0.3, raio * 2.6, 0.08, 0, 0, 0).translate(0, raio * 0.2, 0).rotateZ(giro + (i * Math.PI) / 2);
    obra.por("madeira", pa.translate(0, p.altura * 0.85, raio + 0.4), "#c9b48a", 0.1, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

function fabrica(p: PredioLocal, r: () => number): PecasDoPredio {
  const base = galpao(p, r);
  const obra = new Obra(61);
  chamine(obra, p.largura * 0.35, -p.fundo * 0.3, 0, p.altura * 2.2, "#7a4a38");
  return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
}

function vigia(p: PredioLocal): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(71);
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    obra.por("madeira", bloco(0.3, A, 0.3, (x * L) / 2.6, 0, (z * F) / 2.6), "#5a4028", 0.1, 0);
  }
  obra.por("madeira", bloco(L * 0.9, 0.25, F * 0.9, 0, A - 2, 0), "#6a4a30", 0.1, 0);
  obra.por("madeira", bloco(L * 0.9, 1.0, 0.1, 0, A - 1.75, (F * 0.9) / 2), "#6a4a30", 0.1, 0);
  const t = new Obra(72);
  for (const g of telhado("quatro-aguas", L * 0.95, F * 0.95, A + 0.6, 1.4, 0.3)) t.por("telha-escura", g, "#5b3a30", 0.1, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

function tenda(p: PredioLocal, r: () => number): PecasDoPredio {
  const obra = new Obra(81);
  const lona = r() < 0.5 ? "#d9ccae" : "#c9b48a";
  for (const g of telhado("duas-aguas", p.largura, p.fundo, 0.2, p.altura, 0.1, 0.05)) obra.por("lona", g, lona, 0.12, 0);
  obra.por("madeira", bloco(0.12, p.altura + 0.4, 0.12, 0, 0, p.fundo / 2), "#5a4028", 0.1, 0);
  return { corpo: obra.pecas(), telhado: [], interior: interior(p) };
}

/** Ruína: paredes cortadas em alturas diferentes, sem telhado, vãos vazios. */
export function ruina(p: PredioLocal, r: () => number, corDaPedra = "#7a7266"): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(91);
  const e = 0.5;
  const trecho = (w: number, d: number, x: number, z: number) => {
    const partes = Math.max(1, Math.round(Math.max(w, d) / 2.5));
    for (let i = 0; i < partes; i++) {
      const h = A * (0.25 + r() * 0.75);
      if (r() < 0.15) continue;
      const t = i / partes - 0.5 + 0.5 / partes;
      const [bx, bz] = w > d ? [x + t * w, z] : [x, z + t * d];
      obra.por("cantaria", bloco(w > d ? w / partes : e, h, w > d ? e : d / partes, bx, 0, bz), corDaPedra, 0.15, 0.3);
    }
  };
  trecho(L, e, 0, F / 2 - e / 2);
  trecho(L, e, 0, -F / 2 + e / 2);
  trecho(e, F, -L / 2 + e / 2, 0);
  trecho(e, F, L / 2 - e / 2, 0);
  // Entulho no chão.
  for (let i = 0; i < 6; i++) obra.por("cantaria", bloco(0.6 + r(), 0.3 + r() * 0.5, 0.5 + r(), (r() - 0.5) * L * 0.7, 0, (r() - 0.5) * F * 0.7), corDaPedra, 0.15, 0);
  return { corpo: obra.pecas(), telhado: [], interior: interior(p) };
}

export function gerarColonial(p: PredioLocal, nivel: NivelPredio, semente: number): PecasDoPredio {
  const r = sorteio(semente);
  const cor = paletaColonial(r);
  if (p.tipo === "ruina") return ruina(p, r);
  if (nivel === 1) {
    if (p.tipo === "igreja" || p.tipo === "galpao" || p.tipo === "fabrica" || p.tipo === "estacao") return longe(p, cor, "duas-aguas");
    if (p.tipo === "tenda") return longe(p, cor, "plano");
    return longe(p, cor);
  }
  switch (p.tipo) {
    case "igreja":
      return igreja(p, r, cor);
    case "comercio":
      return comercio(p, r, cor, "#5a3a22");
    case "saloon": {
      const base = comercio(p, r, cor, "#3a2a1c");
      const obra = new Obra(13);
      varanda(obra, "frente", p.largura, p.fundo, p.largura * 0.95, 2.2, 2.8, Math.max(3, Math.floor(p.largura / 3)), { madeira: "#5a4028", telha: cor.telha });
      return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
    }
    case "hotel":
    case "publico":
    case "banco": {
      const obra = new Obra(17);
      const { largura: L, fundo: F, altura: A } = p;
      const pavimentos = Math.max(2, Math.round(A / ALTURA_DO_PAVIMENTO));
      paredes(obra, L, F, A, "reboco", cor.cal, p.entravel ? PORTA_DE_ENTRAR : undefined);
      barradoECunhais(obra, L, F, A, p.tipo === "hotel" ? cor.barrado : "#a39a88", 0.9, 0.5);
      cimalha(obra, L, F, A, "#efe9dc");
      for (let andar = 1; andar < pavimentos; andar++) obra.por("reboco", bloco(L + 0.12, 0.2, F + 0.12, 0, andar * ALTURA_DO_PAVIMENTO, 0), "#efe9dc", 0.04, 0);
      fachada(obra, p, cor, pavimentos, r, { sacadas: p.tipo === "hotel", grade: p.tipo !== "hotel" });
      const t = new Obra(18);
      for (const g of telhado("quatro-aguas", L, F, A, Math.min(L, F) * 0.25, 0.6)) t.por("telha", g, cor.telha, 0.12, 0);
      return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p) };
    }
    case "estacao": {
      const base = galpao(p, r);
      const obra = new Obra(19);
      varanda(obra, "frente", p.largura, p.fundo, p.largura, 3.2, 3.2, Math.max(3, Math.floor(p.largura / 4)), { madeira: "#5a4028", telha: "#6a4a3a" });
      return { ...base, corpo: [...base.corpo, ...obra.pecas()] };
    }
    case "fazenda":
      return fazenda(p, r, cor);
    case "galpao":
      return galpao(p, r);
    case "moinho":
      return moinho(p, r);
    case "fabrica":
      return fabrica(p, r);
    case "torre":
      return vigia(p);
    case "tenda":
      return tenda(p, r);
    default:
      return casa(p, r, cor);
  }
}

const estilo: Estilo = { id: "colonial", nome: "Colonial mineiro (Tupaciguara)", gerar: gerarColonial };

export default estilo;
