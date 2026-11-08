// Construções dos ermos: o que o homem ergueu longe das cidades, em cinco regiões.
//  - Floresta do Cipó (mata): cabanas de tábua sobre pilotis, palha alta, alpendre fundo, cipó subindo.
//  - Sertão de Fungos (charco): palafitas tortas de tábua podre, remendo de lona, orelhas-de-pau;
//    o acampamento da Gangue do Cogumelo com paliçada, tendas e os totens de cogumelo.
//  - Serra da Saudade (serra): ranchos de tora cruzada sobre pedra, telhado íngreme com neve,
//    chaminé de pedra, a parada da ferrovia com plataforma e caixa d'água.
//  - Deserto de Mucuri (deserto): adobe de teto chato com vigas para fora, ramada, lona de
//    expedição, o templo antigo de pedra (sem inscrição), minas de boca escorada.
//  - Trincheira do Carvão (trincheira): barracões de tábua escura atrás de sacos de terra,
//    casamatas de tora cobertas de terra, ruínas queimadas e o convento de pedra austera.

import * as THREE from "three";
import { bolha, deformar, nevar, sorteio } from "../../natureza/ferramentas";
import type { NomeMaterial, Peca } from "../../natureza/tipos";
import { aoLongo, bloco, janela, malha, naFace, Obra, paredes, placa, telhado, toldo, type Face } from "../kit";
import type { Estilo, NivelPredio, PecasDoPredio, PredioLocal } from "../tipos";
import {
  bandeira,
  barril,
  caixote,
  cerca,
  cipo,
  cobertura,
  escadaDeMao,
  esteio,
  fogueira,
  lenha,
  oitoes,
  orelhas,
  paredeDeToras,
  portaDeTabua,
  sacos,
  tabuado,
  tora,
  V,
} from "./_ermos-pecas";

type Regiao = "mata" | "charco" | "serra" | "deserto" | "trincheira";

const REGIOES: Record<string, Regiao> = {
  "floresta-do-cipo": "mata",
  "sertao-de-fungos": "charco",
  "serra-da-saudade-cordilheira": "serra",
  "deserto-de-mucuri": "deserto",
  "trincheira-do-carvao": "trincheira",
};

const PORTA_DE_ENTRAR = { largura: 4.2, altura: 3 };
const ANDAR = 3.2;
const QUINAS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;

/** Põe tudo na obra-alvo, deslocado (casa sobre palafita, corpo recuado da varanda). */
class Deslocada extends Obra {
  constructor(
    private alvo: Obra,
    private dx: number,
    private dy: number,
    private dz: number,
  ) {
    super(0);
  }
  override por(material: NomeMaterial, g: THREE.BufferGeometry, cor: THREE.ColorRepresentation, variacao = 0.06, sombraNoPe = 0.18) {
    this.alvo.por(material, g.translate(this.dx, this.dy, this.dz), cor, variacao, sombraNoPe);
    return this;
  }
}

type Cores = {
  parede: string;
  ripa: string;
  escura: string;
  barro: string;
  telhado: string;
  telhadoMat: NomeMaterial;
  pedra: string;
  pedraMat: NomeMaterial;
  lona: string;
  porta: string;
  piso: string;
  neve: number;
};

function paleta(R: Regiao, r: () => number): Cores {
  const de = (l: string[]) => l[Math.floor(r() * l.length)];
  switch (R) {
    case "mata":
      return { parede: de(["#6e5236", "#7a5c3c", "#5f4a34", "#6a573c"]), ripa: "#4a3826", escura: "#3e2e20", barro: "#8a7656", telhado: de(["#8c7a4e", "#7d6c44", "#93814f", "#76663f"]), telhadoMat: "palha", pedra: "#7c776a", pedraMat: "pedra", lona: de(["#a8987a", "#8f8a64"]), porta: de(["#4a3826", "#3e3424", "#55402a"]), piso: "#7a5e40", neve: 0 };
    case "charco":
      return { parede: de(["#5d5848", "#56503f", "#665c48", "#5a5444"]), ripa: "#3e3a30", escura: "#34302a", barro: "#6a6450", telhado: de(["#463e34", "#4f4538", "#3e3830"]), telhadoMat: "madeira-escura", pedra: "#5e5c52", pedraMat: "pedra", lona: de(["#8a7f62", "#7a7058", "#857a5a"]), porta: "#3a342a", piso: "#5a5040", neve: 0 };
    case "serra":
      return { parede: de(["#6a4c34", "#5e432e", "#74553a"]), ripa: "#4a3626", escura: "#3a2c20", barro: de(["#a59a86", "#9a8e78"]), telhado: de(["#4a3a30", "#3e3630", "#55453a"]), telhadoMat: "telha-escura", pedra: de(["#77767a", "#6c6a68"]), pedraMat: "pedra", lona: "#7a6a52", porta: de(["#4e3826", "#3d3a34", "#5a3020"]), piso: "#7a5e42", neve: 0.9 };
    case "deserto":
      return { parede: de(["#b98a5e", "#c09468", "#a87b52", "#c4a07a"]), ripa: "#7a6048", escura: "#5a4430", barro: "#a07a56", telhado: "#8a6e50", telhadoMat: "madeira", pedra: de(["#9a5a3e", "#8a5038"]), pedraMat: "pedra-vermelha", lona: de(["#d8cbb0", "#cbbd9c", "#e0d4b8"]), porta: de(["#6a4a30", "#4a5a5a", "#7a5030"]), piso: "#9a7650", neve: 0 };
    case "trincheira":
      return { parede: de(["#3e3428", "#463a2c", "#4a3e30"]), ripa: "#2a221a", escura: "#2a221a", barro: "#5a4c3c", telhado: "#3a3028", telhadoMat: "madeira-escura", pedra: "#6f6b64", pedraMat: "cantaria", lona: de(["#6e6250", "#7a6c55", "#655a48"]), porta: "#2e2620", piso: "#4a3e30", neve: 0 };
  }
}

function somar(...partes: PecasDoPredio[]): PecasDoPredio {
  return {
    corpo: partes.flatMap((p) => p.corpo),
    telhado: partes.flatMap((p) => p.telhado),
    interior: partes.flatMap((p) => p.interior),
  };
}

/** Desloca ou gira peças já prontas (casa da fazenda recuada, torre caída). */
function mexer(pp: Peca[], f: (g: THREE.BufferGeometry) => void) {
  for (const p of pp) {
    f(p.geometria);
    p.geometria.computeVertexNormals();
  }
  return pp;
}

// ---------------------------------------------------------------------------------------------
// Interior

type TipoDeInterior = "casa" | "loja" | "galpao" | "tenda" | "bunker" | "torre";

function interior(p: PredioLocal, c: Cores, r: () => number, tipo: TipoDeInterior, y0 = 0, L = p.largura, F = p.fundo, z0 = 0): Peca[] {
  if (!p.entravel) return [];
  const base = new Obra(5);
  const o = new Deslocada(base, 0, y0, z0);
  if (tipo !== "tenda" && tipo !== "torre") o.por("madeira", bloco(L - 0.9, 0.06, F - 0.9, 0, 0.02, 0), c.piso, 0.08, 0);
  const fundo = -F / 2 + 0.9;
  if (tipo === "casa") {
    // Catre com cobertor, mesa e banco, fogão de barro e uma arca.
    o.por("madeira", bloco(1.0, 0.45, 2.0, -L / 2 + 1.0, 0, fundo + 0.6), c.escura, 0.08, 0);
    o.por("lona", bloco(0.95, 0.12, 1.6, -L / 2 + 1.0, 0.45, fundo + 0.8), c.lona, 0.12, 0);
    o.por("madeira", bloco(1.4, 0.78, 0.9, L * 0.12, 0, 0), c.parede, 0.08, 0);
    o.por("madeira", bloco(1.2, 0.45, 0.35, L * 0.12, 0, 0.75), c.escura, 0.08, 0);
    o.por("reboco", bloco(1.2, 0.9, 0.8, L / 2 - 1.1, 0, fundo), c.barro, 0.1, 0);
    caixote(o, -L / 2 + 0.9, 0, 0.8, 0.8, 0.1);
  } else if (tipo === "loja") {
    o.por("madeira", bloco(L * 0.55, 1.05, 0.7, 0, 0, fundo + 0.6), c.escura, 0.08, 0);
    o.por("madeira", bloco(L * 0.7, 2.2, 0.4, 0, 0, -F / 2 + 0.45), c.parede, 0.08, 0);
    barril(o, -L / 2 + 1.0, 0.5);
    barril(o, -L / 2 + 1.0, -0.4);
    caixote(o, L / 2 - 1.0, 0, 0.6, 0.8, 0.3);
  } else if (tipo === "galpao" || tipo === "bunker") {
    for (let i = 0; i < 4; i++) caixote(o, -L / 2 + 1.2 + r() * 0.6, i % 2 ? 0.6 : 0, fundo + 0.3 + Math.floor(i / 2) * 1.0, 0.9, r() * 0.3, "#6a5236");
    barril(o, L / 2 - 1.0, fundo + 0.2);
    o.por("madeira", bloco(1.8, 0.8, 1.0, L * 0.15, 0, -F * 0.05), c.escura, 0.08, 0);
    if (tipo === "bunker") {
      // Beliches de tábua no fundo.
      for (const y of [0.4, 1.4]) o.por("madeira", bloco(2.0, 0.12, 0.9, L / 2 - 1.3, y, -F * 0.15), c.escura, 0.08, 0);
      for (const dz of [-0.4, 0.4]) o.por("madeira", bloco(0.1, 1.8, 0.1, L / 2 - 2.25, 0, -F * 0.15 + dz), c.escura, 0.08, 0);
    }
  } else if (tipo === "tenda") {
    o.por("lona", bloco(0.9, 0.15, 2.0, -L * 0.25, 0, -F * 0.1), c.lona, 0.15, 0);
    o.por("lona", bloco(0.9, 0.15, 2.0, L * 0.25, 0, -F * 0.1), "#6a5a44", 0.15, 0);
    caixote(o, 0, 0, -F / 2 + 0.8, 0.7, 0.2);
  } else {
    caixote(o, -0.8, 0, -0.6, 0.8, 0.4);
    barril(o, 0.9, 0.5);
  }
  return base.pecas();
}

// ---------------------------------------------------------------------------------------------
// Janelas por região

function janelaRustica(obra: Obra, R: Regiao, c: Cores, f: Face, L: number, F: number, u: number, y: number, r: () => number, grade = false) {
  if (R === "deserto") {
    janela(obra, f, L, F, u, y, 0.7, 0.9, { moldura: "#6a5038", materialDaMoldura: "madeira", fechada: r() < 0.35 ? c.porta : undefined, grade });
    return;
  }
  if (R === "trincheira") {
    janela(obra, f, L, F, u, y, 0.8, 0.6, { moldura: "#2a221a", materialDaMoldura: "madeira-escura", fechada: r() < 0.4 ? "#3a3028" : undefined, grade });
    return;
  }
  const fechada = R === "charco" ? r() < 0.4 : r() < 0.15;
  janela(obra, f, L, F, u, y, 0.8, 1.0, { moldura: c.ripa, materialDaMoldura: "madeira", veneziana: c.porta, fechada: fechada ? c.parede : undefined, grade });
}

/** Janelas da casa: frente ao lado da porta, laterais e fundos espaçadas. */
function janelasDaCasa(obra: Obra, R: Regiao, c: Cores, L: number, F: number, pavimentos: number, r: () => number, y0: number, vaoNaFrente: number, grade = false) {
  for (let andar = 0; andar < pavimentos; andar++) {
    const y = y0 + 1.0 + andar * ANDAR;
    const nf = Math.max(0, Math.floor((L - vaoNaFrente - 1) / 3));
    for (const s of [-1, 1]) {
      for (let k = 0; k < Math.ceil(nf / 2); k++) {
        const u = s * (vaoNaFrente / 2 + 1.2 + k * 2.6);
        if (Math.abs(u) < L / 2 - 0.8) janelaRustica(obra, R, c, "frente", L, F, u, y, r, grade);
      }
    }
    if (andar > 0) janelaRustica(obra, R, c, "frente", L, F, 0, y, r, grade);
    for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
      const comp = f === "fundos" ? L : F;
      for (const u of aoLongo(comp, Math.max(1, Math.floor((comp - 2) / 5.5)), 1.5)) if (r() < 0.7) janelaRustica(obra, R, c, f, L, F, u, y, r, grade);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Casas por região

type OpcoesCasa = { grade?: boolean; loja?: boolean };

/** Floresta do Cipó: tábua sobre pilotis, palha alta e alpendre fundo sob a mesma água. */
function casaMata(p: PredioLocal, r: () => number, c: Cores, sem: number, o: OpcoesCasa = {}): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const dy = p.entravel ? 0.15 : 0.5;
  const pavimentos = A >= 6.4 ? 2 : 1;
  const alpendre = p.entravel || r() < 0.7 ? Math.min(2.4, F * 0.28) : 0;
  const Fb = F - alpendre;
  const z0 = -alpendre / 2;
  const vao = p.entravel ? PORTA_DE_ENTRAR : undefined;
  // Pilotis de pau roliço e o assoalho, que corre também sob o alpendre.
  for (const x of aoLongo(L, Math.max(2, Math.round(L / 3)), 0.3)) for (const z of [-F / 2 + 0.3, F / 2 - 0.3]) esteio(obra, x, z, 0, dy, 0.16, "#4a3a28");
  obra.por("madeira", bloco(L, 0.14, F, 0, dy - 0.14, 0), c.ripa, 0.1, 0.2);
  const corpo = new Deslocada(obra, 0, dy, z0);
  const Aw = A - dy;
  tabuado(corpo, L, Fb, Aw, { tabua: c.parede, ripa: c.ripa }, r, vao, { espaco: 1.0 });
  // Barra de limo no pé da parede.
  corpo.por("musgo", bloco(L + 0.06, 0.45, Fb + 0.06, 0, 0, 0), "#4d5a32", 0.15, 0);
  if (pavimentos === 2) corpo.por("madeira", bloco(L + 0.1, 0.18, Fb + 0.1, 0, ANDAR, 0), c.ripa, 0.08, 0);
  janelasDaCasa(corpo, "mata", c, L, Fb, pavimentos, r, 0, vao ? vao.largura : 1.6, o.grade);
  if (!vao) portaDeTabua(corpo, "frente", L, Fb, 0, 1.1, 2.2, c.porta);
  // Esteios do alpendre: troncos inteiros.
  if (alpendre) for (const x of aoLongo(L, L > 9 ? 3 : 2, 0.35)) if (!vao || Math.abs(x) > 2.4) esteio(obra, x, F / 2 - 0.3, dy, A + 0.1, 0.15, "#5a4630");
  // Palha alta: a silhueta da mata. A empena olha a frente quase sempre.
  const empenaNaFrente = r() < 0.7;
  const alto = Math.min(L, F) * (0.48 + r() * 0.12);
  cobertura(t, "palha", c.telhado, "duas-aguas", L, F, A, alto, { beiral: 0.8, espessura: 0.35, empenaNaFrente });
  oitoes(obra, "madeira", c.ripa, L, F, A, alto, empenaNaFrente);
  // Cipó subindo pelas quinas e pelos esteios.
  const ncipo = 1 + Math.floor(r() * 3);
  for (let i = 0; i < ncipo; i++) {
    const sx = i % 2 ? 1 : -1;
    const sz = i < 2 ? 1 : -1;
    cipo(obra, V(sx * (L / 2 + 0.05), 0, sz * (F / 2 - 0.2)), V(sx * (L / 2 - 0.4), A + 0.2, sz * (F / 2 - 1.5)), r, sem + i * 7);
  }
  if (r() < 0.6) lenha(obra, -L / 2 + 1.2, F / 2 - 0.7, 1.4, 2, r);
  if (r() < 0.5) barril(obra, L / 2 - 0.7, F / 2 - 0.7, "#5a4430", 0.9);
  if (o.loja) placa(obra, "frente", L, F, 0, Math.min(A - 0.3, dy + 3.4), Math.min(L * 0.5, 4), 0.6, "#3a2c1e");
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r, o.loja ? "loja" : "casa", dy, L, Fb, z0) };
}

/** Sertão de Fungos: palafita torta de tábua podre, deque na frente, remendo de lona. */
function casaCharco(p: PredioLocal, r: () => number, c: Cores, sem: number, o: OpcoesCasa = {}): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const dy = p.entravel ? 0.45 : 1.3;
  const pavimentos = A - dy >= 6 ? 2 : 1;
  const deque = Math.min(2.6, F * 0.3);
  const Lb = L - (p.entravel ? 0.4 : 1.0);
  const Fb = F - deque;
  const z0 = -deque / 2;
  const dx = p.entravel ? 0 : (r() - 0.5) * 0.6;
  const vao = p.entravel ? PORTA_DE_ENTRAR : undefined;
  // Estacas tortas fincadas no charco.
  const xs = aoLongo(L, Math.max(2, Math.round(L / 2.8)), 0.3);
  const zs = aoLongo(F, Math.max(2, Math.round(F / 3)), 0.3);
  xs.forEach((x, i) =>
    zs.forEach((z, k) => {
      // Só a fiada de fora e uma do meio: o resto não se vê debaixo do assoalho.
      const borda = i === 0 || i === xs.length - 1 || k === 0 || k === zs.length - 1 || i === Math.floor(xs.length / 2);
      if (borda) esteio(obra, x, z, -0.3, dy, 0.13 + r() * 0.04, "#3a3428", "casca", (r() - 0.5) * 0.3);
    }),
  );
  obra.por("madeira", deformar(bloco(L, 0.14, F, 0, dy - 0.14, 0), (v) => (v.y += Math.sin(v.x * 0.7) * 0.05)), c.ripa, 0.15, 0);
  orelhas(obra, -L / 2 + 0.3, Math.max(0.2, dy - 0.9), F / 2 - 0.3, 2, r, sem + 3);
  const corpo = new Deslocada(obra, dx, dy, z0);
  const Aw = A - dy;
  tabuado(corpo, Lb, Fb, Aw, { tabua: c.parede, ripa: c.ripa }, r, vao, { espaco: 1.0, torto: 1 });
  // Remendos de lona pregados na parede.
  for (let i = 0; i < 1 + Math.floor(r() * 2); i++) {
    const f = (["esquerda", "direita", "fundos"] as Face[])[Math.floor(r() * 3)];
    corpo.por("lona", naFace(bloco(1.2 + r(), 1.0 + r() * 0.6, 0.03, 0, 0, 0.04), f, Lb, Fb, (r() - 0.5) * 2, 0.6 + r() * 0.8), c.lona, 0.15, 0);
  }
  corpo.por("musgo", bloco(Lb + 0.06, 0.35, Fb + 0.06, 0, 0, 0), "#46502e", 0.2, 0);
  janelasDaCasa(corpo, "charco", c, Lb, Fb, pavimentos, r, 0, vao ? vao.largura : 1.6, o.grade);
  if (!vao) portaDeTabua(corpo, "frente", Lb, Fb, 0, 1.0, 2.1, c.porta);
  // Guarda-corpo do deque e escada de mão (ou rampa de tábua no entrável).
  if (!p.entravel) {
    const g = new Deslocada(obra, 0, dy, 0);
    cerca(g, V(-L / 2 + 0.2, 0, F / 2 - 0.2), V(-0.9, 0, F / 2 - 0.2), r, "#4a4234", 2, 0.9);
    cerca(g, V(L / 2 - 0.2, 0, F / 2 - 0.2), V(1.6, 0, F / 2 - 0.2), r, "#4a4234", 2, 0.9);
    escadaDeMao(obra, "frente", L, F, 0.4, dy + 0.2, "#4a4234");
  } else {
    const rampa = bloco(4.6, 0.12, 2.2, 0, 0, 1.1);
    rampa.rotateX(Math.atan2(dy, 2.2));
    obra.por("madeira", rampa.translate(0, 0.02, F / 2), c.ripa, 0.12, 0);
  }
  // Telhado baixo de tábua, embarrigado, com lona por cima onde furou.
  const alto = Math.min(Lb, Fb) * 0.26;
  const tt = new Obra(sem + 2);
  cobertura(tt, "madeira-escura", c.telhado, "duas-aguas", Lb, F, A, alto, { beiral: 0.5, espessura: 0.14, x: dx });
  const telhas = mexer(tt.pecas(), (g) => deformar(g, (v) => (v.y -= Math.sin(Math.min(1, Math.max(0, (v.x - dx) / Lb + 0.5)) * Math.PI) * 0.18)));
  oitoes(obra, "madeira", c.parede, Lb, Fb, A, alto, false, dx, z0);
  t.por("lona", deformar(bloco(Lb * 0.45, 0.05, F * 0.4, dx + (r() - 0.5) * Lb * 0.3, A + alto * 0.5, -F * 0.2), (v) => (v.y -= Math.abs(v.z) * (alto / (F / 2)) * 0.9)), c.lona, 0.15, 0);
  if (r() < 0.5 || p.id.includes("barqueiro")) {
    // Canoa de um pau só, emborcada ao pé da palafita.
    const comp = Math.min(5, F * 0.6);
    const casco = deformar(new THREE.CylinderGeometry(0.4, 0.4, comp, 8, 4, false), (v) => {
      v.z *= 0.55;
      const k = Math.abs(v.y) / (comp / 2);
      v.x *= 1 - k * k * 0.85;
    }).rotateX(Math.PI / 2);
    obra.por("casca", casco.translate(-L / 2 + 0.6, 0.25, 0), "#4a3a2a", 0.1, 0);
  }
  if (o.loja) placa(obra, "frente", L, F, 0, A - 0.8, Math.min(L * 0.5, 4), 0.6, "#3a3428");
  return { corpo: obra.pecas(), telhado: [...t.pecas(), ...telhas], interior: interior(p, c, r, o.loja ? "loja" : "casa", dy, Lb, Fb, z0) };
}

/** Serra: tora cruzada sobre embasamento de pedra, telhado íngreme de tabuinha com neve. */
function casaSerra(p: PredioLocal, r: () => number, c: Cores, sem: number, o: OpcoesCasa = {}): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const dy = p.entravel ? 0.1 : 0.5;
  const pavimentos = A >= 6.4 ? 2 : 1;
  const vao = p.entravel ? PORTA_DE_ENTRAR : undefined;
  obra.por(c.pedraMat, bloco(L - 0.1, dy + 0.05, F - 0.1, 0, 0, 0), c.pedra, 0.15, 0.2);
  const corpo = new Deslocada(obra, 0, dy, 0);
  paredeDeToras(corpo, L, F, A - dy, { tora: c.parede, barro: c.barro }, vao, A > 6 ? 0.27 : 0.2, r);
  janelasDaCasa(corpo, "serra", c, L - 0.5, F - 0.5, pavimentos, r, 0, vao ? vao.largura : 1.6, o.grade);
  if (!vao) {
    portaDeTabua(corpo, "frente", L - 0.5, F - 0.5, 0, 1.1, 2.2, c.porta);
    obra.por(c.pedraMat, bloco(1.8, dy, 0.8, 0, 0, F / 2 + 0.3), c.pedra, 0.12, 0);
  }
  const empenaNaFrente = r() < 0.6;
  const alto = Math.min(L, F) * (0.5 + r() * 0.12);
  cobertura(t, "telha-escura", c.telhado, "duas-aguas", L, F, A, alto, { beiral: 0.55, espessura: 0.16, empenaNaFrente, neve: c.neve });
  oitoes(obra, "madeira", c.escura, L - 0.4, F - 0.4, A, alto * 0.95, empenaNaFrente);
  // Chaminé de pedra encostada na lateral, de dentro da planta.
  const lado = r() < 0.5 ? -1 : 1;
  const hc = A + alto * 0.85 + 0.8;
  obra.por(c.pedraMat, bloco(1.0, hc, 0.9, lado * (L / 2 - 0.5), 0, -F * 0.2), c.pedra, 0.15, 0.2);
  obra.por(c.pedraMat, bloco(1.15, 0.2, 1.05, lado * (L / 2 - 0.5), hc, -F * 0.2), "#5e5c5a", 0.1, 0);
  obra.por("neve", bloco(0.9, 0.08, 0.8, lado * (L / 2 - 0.5), hc + 0.2, -F * 0.2), "#eef1f4", 0.03, 0);
  // Lenha empilhada contra o frio, sob o beiral da frente.
  if (r() < 0.7) lenha(obra, -lado * (L / 2 - 1.2), F / 2 + 0.45, 1.6, 3, r);
  if (p.id.includes("cacador") || r() < 0.3) {
    // Galhada de cervo sobre a porta.
    const y = dy + (vao ? vao.altura : 2.2) + 0.5;
    for (const s of [-1, 1]) obra.por("osso", tora(V(0, y, F / 2 + 0.1), V(s * 0.45, y + 0.5, F / 2 + 0.2), 0.04, 4), "#d8cfba", 0.05, 0);
  }
  if (o.loja) placa(obra, "frente", L, F, 0, Math.min(A - 0.4, dy + 3.2), Math.min(L * 0.5, 4), 0.6, "#3a2c1e");
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r, o.loja ? "loja" : "casa", dy, L - 0.8, F - 0.8) };
}

/** Deserto: adobe de teto chato, platibanda, vigas para fora e a ramada na frente. */
function casaDeserto(p: PredioLocal, r: () => number, c: Cores, sem: number, o: OpcoesCasa = {}): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const pavimentos = A >= 6.4 ? 2 : 1;
  const vao = p.entravel ? PORTA_DE_ENTRAR : undefined;
  paredes(obra, L, F, A, "reboco", c.parede, vao);
  // Pé de pedra vermelha.
  obra.por(c.pedraMat, bloco(L + 0.08, 0.55, F + 0.08, 0, 0, 0), c.pedra, 0.18, 0.2);
  // Platibanda com alturas desiguais.
  for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
    const comp = f === "frente" || f === "fundos" ? L : F;
    const h = 0.45 + r() * 0.25;
    obra.por("reboco", naFace(bloco(comp, h, 0.35, 0, 0, -0.175), f, L, F, 0, A), c.parede, 0.1, 0);
  }
  if (pavimentos === 2) {
    // Varanda de madeira no andar de cima.
    obra.por("madeira", bloco(L * 0.8, 0.18, 1.4, 0, ANDAR, F / 2 + 0.7), c.ripa, 0.1, 0);
    for (const x of aoLongo(L * 0.8, Math.max(3, Math.floor(L / 2.4)), 0.1)) obra.por("madeira", bloco(0.1, 1.0, 0.1, x, ANDAR + 0.18, F / 2 + 1.35), c.ripa, 0.1, 0);
    obra.por("madeira", bloco(L * 0.8, 0.1, 0.12, 0, ANDAR + 1.1, F / 2 + 1.35), c.ripa, 0.1, 0);
    for (const x of [-L * 0.4 + 0.1, L * 0.4 - 0.1]) obra.por("madeira", bloco(0.16, ANDAR, 0.16, x, 0, F / 2 + 1.3), c.ripa, 0.1, 0);
  }
  janelasDaCasa(obra, "deserto", c, L, F, pavimentos, r, 0.2, vao ? vao.largura : 1.6, o.grade);
  if (!vao) portaDeTabua(obra, "frente", L, F, 0, 1.1, 2.2, c.porta);
  // Vigas roliças atravessando a parede, pontas para fora sob a platibanda.
  for (const x of aoLongo(L, Math.max(3, Math.floor(L / 1.3)), 0.5)) obra.por("casca", tora(V(x, A - 0.35, F / 2 - 0.3), V(x, A - 0.35 + (r() - 0.5) * 0.05, F / 2 + 0.45 + r() * 0.2), 0.11, 6), "#8a7258", 0.12, 0);
  // Teto de terra batida sobre as vigas.
  t.por("terra", bloco(L - 0.5, 0.3, F - 0.5, 0, A - 0.25, 0), "#9a7a58", 0.12, 0);
  // Bica de tábua para a chuva rara.
  obra.por("madeira", bloco(0.25, 0.15, 0.9, L * 0.3, A - 0.1, F / 2 + 0.3), c.ripa, 0.1, 0);
  // Ramada: esteios e uma esteira de galhos fazendo sombra.
  if (pavimentos === 1 && (o.loja || r() < 0.6)) {
    const w = Math.min(L * 0.8, 8);
    for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) esteio(obra, x, F / 2 + 2.0, 0, 2.6, 0.1, "#7a6248");
    obra.por("casca", tora(V(-w / 2, 2.6, F / 2 + 2.0), V(w / 2, 2.6, F / 2 + 2.0), 0.08, 5), "#7a6248", 0.1, 0);
    obra.por("palha", bloco(w + 0.4, 0.12, 2.3, 0, 2.66, F / 2 + 1.05), "#9a8460", 0.18, 0);
  }
  if (r() < 0.5) {
    // Caveira de boi pregada sobre a porta.
    const y = (vao ? vao.altura : 2.2) + 0.5;
    obra.por("osso", bolha(0.22, 0, 0.2, sem + 9, 1.2).translate(0, y, F / 2 + 0.12), "#e2d8c2", 0.06, 0);
    for (const s of [-1, 1]) obra.por("osso", tora(V(s * 0.15, y + 0.15, F / 2 + 0.12), V(s * 0.55, y + 0.4, F / 2 + 0.15), 0.035, 4), "#d8cfba", 0.05, 0);
  }
  if (r() < 0.6) barril(obra, L / 2 - 0.5, F / 2 + 0.5, "#7a5a3a", 0.9);
  if (o.loja) {
    if (pavimentos === 2) toldo(obra, "frente", L, F, 0, 2.7, Math.min(L - 1, 6), 1.4, c.lona);
    placa(obra, "frente", L, F, 0, Math.min(A - 0.9, 3.6), Math.min(L * 0.55, 5), 0.7, "#5a3a22");
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r, o.loja ? "loja" : "casa", 0) };
}

/** Trincheira: barracão de tábua escura recuado atrás de sacos de terra, teto de terra. */
function casaTrincheira(p: PredioLocal, r: () => number, c: Cores, sem: number, o: OpcoesCasa = {}): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const pavimentos = A >= 6.4 ? 2 : 1;
  const queimada = !p.entravel && r() < 0.3;
  const madeira = queimada ? "#2a241e" : c.parede;
  const vao = p.entravel ? PORTA_DE_ENTRAR : undefined;
  const recuo = 0.65;
  const [Li, Fi] = [L - recuo * 2, F - recuo * 2];
  tabuado(obra, Li, Fi, A, { tabua: madeira, ripa: c.ripa }, r, vao, { espaco: 0.9, material: "madeira-escura", torto: queimada ? 0.6 : 0 });
  if (pavimentos === 2) obra.por("madeira-escura", bloco(Li + 0.1, 0.2, Fi + 0.1, 0, ANDAR, 0), c.ripa, 0.08, 0);
  janelasDaCasa(obra, "trincheira", c, Li, Fi, pavimentos, r, 0.4, vao ? vao.largura : 1.6, o.grade);
  if (!vao) portaDeTabua(obra, "frente", Li, Fi, 0, 1.1, 2.1, c.porta);
  // Sacos de terra em volta, abertos só na porta.
  const fileiras = 3 + (r() < 0.4 ? 1 : 0);
  sacos(obra, "frente", L, F, L, fileiras, r, c.lona, vao ? 4.6 : 1.8);
  sacos(obra, "fundos", L, F, L - 1.1, fileiras, r, c.lona);
  sacos(obra, "esquerda", L, F, F - 1.1, fileiras, r, c.lona);
  sacos(obra, "direita", L, F, F - 1.1, fileiras, r, c.lona);
  // Teto: tábua com terra por cima, ou uma água de tábua alcatroada.
  if (r() < 0.55) {
    cobertura(t, "madeira-escura", c.telhado, "plano", Li, Fi, A, 0, { beiral: 0.35, espessura: 0.1 });
    t.por("terra", deformar(bloco(Li - 0.2, 0.5, Fi - 0.2, 0, A + 0.2, 0), (v) => (v.y += v.y > A + 0.5 ? -Math.max(Math.abs(v.x) / Li, Math.abs(v.z) / Fi) * 0.3 : 0)), "#3e342a", 0.15, 0);
  } else {
    cobertura(t, "madeira-escura", c.telhado, "uma-agua", Li, Fi, A, 0.9, { beiral: 0.4, espessura: 0.12 });
    for (const s of [-1, 1]) obra.por("madeira-escura", malha([V((s * Li) / 2, A, Fi / 2), V((s * Li) / 2, A, -Fi / 2), V((s * Li) / 2, A + 0.9, -Fi / 2)], s > 0 ? [0, 1, 2] : [1, 0, 2]), madeira, 0.1, 0);
  }
  // Chaminé de lata.
  obra.por("ferro", new THREE.CylinderGeometry(0.14, 0.14, 1.6, 6, 1, true).translate(Li * 0.3, A + 0.6, -Fi * 0.25), "#2e2a26", 0.05, 0);
  if (queimada) obra.por("carvao", bloco(Li * 0.6, 0.25, 0.8, -Li * 0.1, 0, Fi / 2 + 0.2), "#1e1a18", 0.1, 0);
  if (p.id.includes("socorro")) {
    // Posto de socorro: bandeira branca de cruz vermelha e padiolas encostadas.
    bandeira(obra, L / 2 - 2.6, F / 2 - 0.3, A + 3, "#e4ddcc", "#9a2a22");
    for (const x of [-L / 2 + 1.6, -L / 2 + 2.6]) {
      const g = bloco(0.65, 2.0, 0.08, x, 0, 0).rotateX(-0.25);
      obra.por("lona", g.translate(0, 0.1, F / 2 + 0.55), "#bdb29a", 0.1, 0);
    }
  }
  if (o.loja) placa(obra, "frente", L, F, 0, A - 0.6, Math.min(L * 0.5, 4), 0.5, "#2a221a");
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r, o.loja ? "loja" : "bunker", 0, Li, Fi) };
}

function casa(R: Regiao, p: PredioLocal, r: () => number, c: Cores, sem: number, o: OpcoesCasa = {}) {
  if (R === "charco") return casaCharco(p, r, c, sem, o);
  if (R === "serra") return casaSerra(p, r, c, sem, o);
  if (R === "deserto") return casaDeserto(p, r, c, sem, o);
  if (R === "trincheira") return casaTrincheira(p, r, c, sem, o);
  return casaMata(p, r, c, sem, o);
}

// ---------------------------------------------------------------------------------------------
// Galpões

/** Casamata: tora cruzada, sacos em volta, terra por cima e as seteiras. */
function casamata(p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const vao = p.entravel ? PORTA_DE_ENTRAR : undefined;
  const recuo = 0.7;
  const [Li, Fi] = [L - recuo * 2, F - recuo * 2];
  paredeDeToras(obra, Li, Fi, A, { tora: "#3a3026", barro: "#2e2822" }, vao, 0.25, r);
  for (const f of ["frente", "esquerda", "direita"] as Face[]) {
    const comp = f === "frente" ? Li : Fi;
    for (const u of aoLongo(comp, Math.max(1, Math.floor(comp / 3.5)), 1.4)) {
      if (f === "frente" && Math.abs(u) < (vao ? 2.8 : 1.2)) continue;
      obra.por("madeira-escura", naFace(bloco(1.1, 0.22, 0.06, 0, 0, 0.05), f, Li, Fi, u, A * 0.55), "#0f0d0c", 0.02, 0);
    }
  }
  const fileiras = Math.min(4, Math.max(3, Math.round(A / 0.8)));
  sacos(obra, "frente", L, F, L, fileiras - 1, r, c.lona, vao ? 4.6 : 1.8);
  sacos(obra, "fundos", L, F, L - 1.1, fileiras, r, c.lona);
  sacos(obra, "esquerda", L, F, F - 1.1, fileiras, r, c.lona);
  sacos(obra, "direita", L, F, F - 1.1, fileiras, r, c.lona);
  if (!vao) portaDeTabua(obra, "frente", Li, Fi, 0, 1.2, Math.min(2.1, A - 0.3), p.id.includes("paiol") ? "#3a3632" : c.porta);
  // Laje de tora coberta de terra: o morrote da casamata.
  cobertura(t, "madeira-escura", "#2e2620", "plano", Li, Fi, A, 0, { beiral: 0.2, espessura: 0.12 });
  for (const g of telhado("quatro-aguas", Li - 0.2, Fi - 0.2, A + 0.25, Math.min(1.2, Math.min(Li, Fi) * 0.15), 0.45, 0.25)) t.por("terra", g, "#3a3028", 0.18, 0);
  if (p.id.includes("paiol")) for (let i = 0; i < 3; i++) barril(obra, -L / 2 + 0.9 + i * 0.75, F / 2 + 0.6, "#4a3826", 0.9);
  if (p.id.includes("comando")) bandeira(obra, L / 2 - 2.6, F / 2 - 0.4, A + 4, "#5a2a22");
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r, "bunker", 0, Li, Fi) };
}

/** Galpão aberto: esteios de tronco, meia-parede no fundo, telhado de duas águas. */
function galpaoAberto(R: Regiao, p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const dy = R === "charco" ? 0.35 : 0;
  if (dy) obra.por("madeira", bloco(L, 0.14, F, 0, dy - 0.14, 0), c.ripa, 0.15, 0.2);
  const xs = aoLongo(L, Math.max(2, Math.round(L / 3.6) + 1), 0.25);
  const corDoEsteio = R === "serra" ? c.parede : "#4e3e2c";
  for (const x of xs) {
    for (const z of [-F / 2 + 0.25, F / 2 - 0.25]) {
      if (z > 0 && p.entravel && Math.abs(x) < 2.4) continue;
      esteio(obra, x, z, 0, A + 0.1, 0.17, corDoEsteio, "casca", R === "charco" ? (r() - 0.5) * 0.25 : 0);
    }
  }
  for (const s of [-1, 1]) obra.por("casca", tora(V(-L / 2, A, s * (F / 2 - 0.25)), V(L / 2, A, s * (F / 2 - 0.25)), 0.15, 6), "#4e3e2c", 0.1, 0);
  // Meia-parede no fundo (toras na serra, tábua no resto).
  const hm = R === "serra" ? A * 0.9 : 1.4;
  const fundo = new Deslocada(obra, 0, dy, -F / 2 + 0.3);
  if (R === "serra") paredeDeToras(fundo, L, 0.6, hm, { tora: c.parede, barro: c.barro }, undefined, 0.18, r);
  else tabuado(fundo, L, 0.3, hm, { tabua: c.parede, ripa: c.ripa }, r, undefined, { torto: R === "charco" ? 1 : 0, faces: ["frente", "fundos"] });
  const alto = F * (R === "serra" ? 0.38 : 0.3);
  const material: NomeMaterial = R === "mata" && r() < 0.5 ? "palha" : R === "deserto" ? "lona" : c.telhadoMat === "palha" ? "madeira-escura" : c.telhadoMat;
  const cor = material === "lona" ? c.lona : material === "palha" ? c.telhado : R === "mata" ? "#4a3a2c" : c.telhado;
  cobertura(t, material, cor, "duas-aguas", L, F, A, alto, { beiral: 0.6, espessura: material === "palha" ? 0.3 : 0.14, neve: c.neve });
  // Recheio: toras dos madeireiros, lenha da serra, varais de secagem no charco, caixotes no deserto.
  const dentro = new Deslocada(obra, 0, dy, 0);
  if (R === "mata") {
    for (let i = 0; i < 4; i++) {
      const y = 0.35 + (i > 2 ? 0.6 : 0);
      const z = -F * 0.15 + (i % 3) * 0.75;
      dentro.por("casca", tora(V(-L * 0.35, y, z), V(L * 0.1, y, z), 0.35, 8), "#5e4a34", 0.1, 0);
    }
    // Cavalete com tora pronta para o traçador.
    for (const x of [L * 0.22, L * 0.38]) for (const s of [-1, 1]) dentro.por("madeira", tora(V(x, 0, -F * 0.05 + s * 0.4), V(x, 1.0, -F * 0.05 - s * 0.1), 0.05, 4), c.ripa, 0.1, 0);
    dentro.por("casca", tora(V(L * 0.15, 1.1, -F * 0.05), V(L * 0.45, 1.1, -F * 0.05), 0.28, 8), "#6a5038", 0.1, 0);
    cipo(obra, V(-L / 2 + 0.25, 0, F / 2 - 0.25), V(-L / 2 + 1.2, A, F / 2 - 0.3), r, sem + 5);
  } else if (R === "serra") {
    lenha(dentro, -L * 0.05, -F / 2 + 1.2, L * 0.5, 3, r);
  } else if (R === "charco") {
    for (const z of [-F * 0.15, F * 0.12]) {
      for (const y of [1.5, 2.4]) {
        dentro.por("casca", tora(V(-L / 2 + 0.6, y, z), V(L / 2 - 0.6, y, z), 0.04, 4, false), "#4a4234", 0.1, 0);
        for (const x of aoLongo(L - 1.2, Math.floor(L / 0.9), 0.3)) dentro.por("cogumelo", bloco(0.28, 0.22, 0.05, x, y - 0.25, z), r() < 0.5 ? "#b8a47c" : "#9a865e", 0.15, 0);
      }
    }
    orelhas(obra, L / 2 - 0.25, 0.4, -F / 2 + 0.25, 3, r, sem + 4);
  } else {
    for (let i = 0; i < 5; i++) caixote(dentro, -L / 2 + 1 + r() * (L - 2), 0, -F / 2 + 1.2 + r() * 1.5, 0.8, r() * 0.6, "#8a6e4a");
    barril(dentro, L / 2 - 1, F / 2 - 1, "#7a5a3a");
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r, "galpao", dy, L, F) };
}

/** Galpão fechado de tábua (celeiro, barracão da expedição). */
function galpaoFechado(R: Regiao, p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const vao = p.entravel ? PORTA_DE_ENTRAR : undefined;
  const tabua = R === "deserto" ? "#9a8466" : c.parede;
  if (R === "serra") paredeDeToras(obra, L, F, A, { tora: c.parede, barro: c.barro }, vao, 0.22, r);
  else tabuado(obra, L, F, A, { tabua, ripa: c.ripa }, r, vao, { torto: R === "charco" ? 0.8 : 0, espaco: 1.0 });
  const w = Math.min(4, L * 0.35);
  if (!vao) {
    // Portão de duas folhas com travessa em X.
    const h = Math.min(A * 0.75, 3.4);
    portaDeTabua(obra, "frente", L, F, 0, w, h, c.porta);
    const diag = Math.hypot(w, h) * 0.95;
    for (const s of [-1, 1]) obra.por("madeira", naFace(bloco(0.12, diag, 0.05, 0, -diag / 2, 0.12).rotateZ(s * Math.atan2(w, h)).translate(0, h / 2, 0), "frente", L, F, 0, 0), c.ripa, 0.08, 0);
  }
  janelasDaCasa(obra, R, c, L, F, 1, r, 0.6, vao ? vao.largura : w + 0.6);
  const alto = F * 0.32;
  const material: NomeMaterial = R === "deserto" ? "lona" : R === "mata" ? "palha" : c.telhadoMat;
  cobertura(t, material, R === "deserto" ? c.lona : c.telhado, "duas-aguas", L, F, A, alto, { beiral: 0.5, espessura: material === "palha" ? 0.3 : 0.14, neve: c.neve });
  oitoes(obra, "madeira", R === "deserto" ? tabua : c.ripa, L, F, A, alto, false);
  if (R === "deserto") {
    // Caixotes da expedição e lona amarrada sobre a carga.
    for (let i = 0; i < 4; i++) caixote(obra, -L / 2 + 0.8 + i * 0.9, i === 3 ? 0.62 : 0, F / 2 + 0.6, 0.8, r() * 0.3, "#8a6e4a");
    obra.por("lona", deformar(bloco(2.4, 0.9, 1.4, L / 2 - 1.5, 0, F / 2 + 0.8), (v) => (v.y *= 1 - Math.abs(v.x - (L / 2 - 1.5)) * 0.2)), c.lona, 0.12, 0);
  }
  if (R === "charco") orelhas(obra, -L / 2 - 0.05, 0.6, F / 2 - 0.6, 3, r, sem + 2);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r, "galpao", 0) };
}

/** Curral: cerca em volta, cocho e uma ramada no canto. */
function curral(R: Regiao, p: PredioLocal, r: () => number, sem: number): PecasDoPredio {
  const { largura: L, fundo: F } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const [x0, x1, z0, z1] = [-L / 2 + 0.2, L / 2 - 0.2, -F / 2 + 0.2, F / 2 - 0.2];
  const cor = R === "deserto" ? "#7a6448" : "#5e4a36";
  cerca(obra, V(x0, 0, z0), V(x1, 0, z0), r, cor, 3);
  cerca(obra, V(x0, 0, z0), V(x0, 0, z1), r, cor, 3);
  cerca(obra, V(x1, 0, z0), V(x1, 0, z1), r, cor, 3);
  cerca(obra, V(x0, 0, z1), V(-2.3, 0, z1), r, cor, 3);
  cerca(obra, V(2.3, 0, z1), V(x1, 0, z1), r, cor, 3);
  obra.por("madeira", bloco(2.4, 0.5, 0.6, L * 0.2, 0, -F * 0.1), "#5a4430", 0.1, 0);
  const w = Math.min(4, L * 0.35);
  for (const [x, z] of [
    [x0 + 0.2, z0 + 0.2],
    [x0 + w, z0 + 0.2],
    [x0 + 0.2, z0 + w * 0.7],
    [x0 + w, z0 + w * 0.7],
  ]) esteio(obra, x, z, 0, 2.4, 0.09, cor);
  t.por(R === "deserto" ? "palha" : "madeira-escura", bloco(w + 0.6, 0.12, w * 0.7 + 0.6, x0 + w / 2 + 0.1, 2.4, z0 + w * 0.35 + 0.1), R === "deserto" ? "#9a8460" : "#4a3a2c", 0.15, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

function galpao(R: Regiao, p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  if (R === "trincheira") return casamata(p, r, c, sem);
  if (/curra/i.test(p.id) || /curral/i.test(p.nome)) return curral(R, p, r, sem);
  if (p.id.includes("expedicao")) return galpaoFechado(R, p, r, c, sem);
  if (p.id.includes("madeireiro") || p.id.includes("secagem") || p.id.includes("lenha")) return galpaoAberto(R, p, r, c, sem);
  return r() < 0.5 ? galpaoAberto(R, p, r, c, sem) : galpaoFechado(R, p, r, c, sem);
}

// ---------------------------------------------------------------------------------------------
// Tendas e acampamentos

/** Barraca de parede: lona baixa nos lados, cumeeira de frente, frente aberta se entrável. */
function barraca(obra: Obra, t: Obra, L: number, F: number, A: number, cor: THREE.ColorRepresentation, aberta: boolean, x = 0, z = 0, neve = 0) {
  const hp = Math.min(1.6, A * 0.45);
  const o = new Deslocada(obra, x, 0, z);
  o.por("lona", bloco(L, hp, 0.04, 0, 0, -F / 2), cor, 0.12, 0.2);
  for (const s of [-1, 1]) o.por("lona", bloco(0.04, hp, F, (s * L) / 2, 0, 0), cor, 0.12, 0.2);
  const tri = (zz: number, frente: boolean) => malha([V(-L / 2, hp, zz), V(L / 2, hp, zz), V(0, A, zz)], frente ? [0, 1, 2] : [1, 0, 2]);
  o.por("lona", tri(-F / 2, false), cor, 0.12, 0);
  if (!aberta) {
    o.por("lona", bloco(L, hp, 0.04, 0, 0, F / 2), cor, 0.12, 0.2);
    o.por("lona", tri(F / 2, true), cor, 0.12, 0);
    o.por("madeira-escura", bloco(0.5, hp + (A - hp) * 0.6, 0.06, 0, 0, F / 2 + 0.01), "#2a241e", 0.05, 0);
  } else {
    // Abas da porta amarradas para os lados.
    for (const s of [-1, 1]) o.por("lona", deformar(bloco(0.5, hp + 0.4, 0.08, s * (L / 2 - 0.3), 0, F / 2 + 0.05), (v) => (v.z += Math.sin(v.y) * 0.08)), cor, 0.15, 0);
  }
  // Mastros da cumeeira.
  for (const zz of [-F / 2 - 0.05, F / 2 + 0.05]) o.por("casca", tora(V(0, 0, zz), V(0, A + 0.35, zz), 0.06, 5), "#4a3a28", 0.1, 0);
  // Teto da barraca (some quando se entra), com a barriga da lona.
  const ot = new Deslocada(t, x, 0, z);
  for (const s of [-1, 1]) {
    const pts = [V(s * (L / 2 + 0.15), hp - 0.1, -F / 2 - 0.15), V(s * (L / 2 + 0.15), hp - 0.1, F / 2 + 0.15), V(0, A, F / 2 + 0.15), V(0, A, -F / 2 - 0.15)];
    const g = deformar(malha(pts, s > 0 ? [0, 2, 1, 0, 3, 2, 0, 1, 2, 0, 2, 3] : [0, 1, 2, 0, 2, 3, 0, 2, 1, 0, 3, 2]), (p) => (p.y -= Math.sin(Math.min(1, Math.max(0, (p.z + F / 2) / F)) * Math.PI) * 0.08 * Math.max(0, 1 - (p.y - hp) / (A - hp))));
    ot.por("lona", g, cor, 0.12, 0);
  }
  if (neve) ot.por("neve", nevar(malha([V(L / 2, hp, -F / 2), V(L / 2, hp, F / 2), V(0, A, F / 2), V(0, A, -F / 2)], [0, 2, 1, 0, 3, 2]), neve, 0.08), "#eef1f4", 0.03, 0);
  // Espias até as estacas.
  for (const s of [-1, 1]) for (const zz of [-F / 2, F / 2]) o.por("casca", tora(V(s * (L / 2 + 0.9), 0, zz), V(s * (L / 2 + 0.1), hp, zz), 0.015, 3, false), "#9a8a6a", 0.05, 0);
}

/** Totem da gangue: cogumelo gigante entalhado num tronco. */
function totemCogumelo(obra: Obra, x: number, z: number, altura: number, sem: number) {
  obra.por("casca", tora(V(x, 0, z), V(x, altura, z), 0.28, 8), "#d8ccb0", 0.1, 0.2);
  obra.por("cogumelo", bolha(1.1, 1, 0.12, sem, 0.45).translate(x, altura + 0.1, z), "#b89a6a", 0.12, 0);
  obra.por("cogumelo", new THREE.CylinderGeometry(0.95, 0.2, 0.25, 10, 1, true).translate(x, altura - 0.1, z), "#e0d4bc", 0.08, 0);
}

/** Acampamento da Gangue do Cogumelo (e qualquer tenda grande): tendas, paliçada, totens, fogo. */
function acampamento(p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  // Tenda grande no fundo e duas menores nos cantos.
  barraca(obra, t, L * 0.3, F * 0.4, A, c.lona, true, 0, -F / 2 + F * 0.22);
  barraca(obra, t, L * 0.2, F * 0.3, A * 0.7, "#6a5e48", r() < 0.5, -L / 2 + L * 0.13, -F / 2 + F * 0.2);
  barraca(obra, t, L * 0.2, F * 0.3, A * 0.7, "#7a6a50", r() < 0.5, L / 2 - L * 0.13, -F / 2 + F * 0.2);
  fogueira(obra, 0, F * 0.12, r, sem + 3);
  // Alpendre de tábua torta sobre os varais de cogumelo.
  const ax = L / 2 - 2.2;
  for (const [x, z] of [
    [ax - 1.6, F * 0.05],
    [ax + 1.6, F * 0.05],
    [ax - 1.6, F * 0.32],
    [ax + 1.6, F * 0.32],
  ]) esteio(obra, x, z, 0, z > F * 0.2 ? 2.2 : 2.8, 0.1, "#4a3a28", "casca", (r() - 0.5) * 0.2);
  t.por("madeira-escura", deformar(bloco(3.8, 0.1, F * 0.3 + 0.8, ax, 2.5, F * 0.185), (v) => (v.y -= (v.z - F * 0.185) * 0.18)), c.escura, 0.15, 0);
  for (const y of [1.3, 1.9]) {
    obra.por("casca", tora(V(ax - 1.6, y, F * 0.18), V(ax + 1.6, y, F * 0.18), 0.04, 4, false), "#4a4234", 0.1, 0);
    for (let i = 0; i < 7; i++) obra.por("cogumelo", bloco(0.28, 0.22, 0.05, ax - 1.4 + i * 0.47, y - 0.25, F * 0.18), r() < 0.5 ? "#b8a47c" : "#8a7656", 0.15, 0);
  }
  // Paliçada de estacas apontadas no fundo e nos lados; a frente fica aberta.
  const estaca = (x: number, z: number) => {
    const h = 2.2 + r() * 0.8;
    obra.por("casca", tora(V(x, 0, z), V(x, h, z), 0.13, 5, false), "#4a3e30", 0.12, 0.2);
    obra.por("casca", new THREE.ConeGeometry(0.13, 0.45, 5).translate(x, h + 0.22, z), "#5a4a38", 0.1, 0);
  };
  for (const x of aoLongo(L, Math.floor(L / 1.2), 0.2)) estaca(x, -F / 2 + 0.2);
  for (const s of [-1, 1]) for (const z of aoLongo(F, Math.floor(F / 1.3), 0.3).filter((zz) => zz < F * 0.25)) estaca(s * (L / 2 - 0.2), z);
  // Totens de cogumelo guardando a entrada, flâmula do bando e tralha.
  totemCogumelo(obra, -3.2, F / 2 - 1.2, 2.6, sem + 7);
  totemCogumelo(obra, 3.2, F / 2 - 1.2, 2.2, sem + 8);
  bandeira(obra, -L / 2 + 1.0, F * 0.1, A + 2.5, "#5a2a22");
  for (let i = 0; i < 3; i++) caixote(obra, -L / 2 + 1.8 + i * 0.85, 0, F * 0.32, 0.8, r() * 0.4, "#5e4a34");
  barril(obra, -L / 2 + 1.4, F * 0.02, "#4a3a28");
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r, "tenda", 0, L * 0.3, F * 0.4, -F / 2 + F * 0.22) };
}

function tenda(R: Regiao, p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  if (L >= 14 || F >= 14) return acampamento(p, r, c, sem);
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const cor = R === "serra" ? "#7a6a52" : R === "mata" ? "#8a8264" : c.lona;
  const expedicao = p.id.includes("expedicao") || (R === "deserto" && r() < 0.5);
  // Folga para as espias dentro da planta.
  const Lt = L - 2.0;
  const Ft = expedicao ? F - 2.4 : F - 0.4;
  const zt = expedicao ? -1.0 : 0;
  barraca(obra, t, Lt, Ft, A, cor, p.entravel || r() < 0.3, 0, zt, c.neve * 0.7);
  if (expedicao) {
    // Sobreteto avançado como toldo, mesa de campanha e teodolito no tripé.
    for (const s of [-1, 1]) esteio(obra, (s * Lt) / 2, F / 2 - 0.2, 0, A * 0.75, 0.05, "#6a5a44");
    t.por("lona", deformar(bloco(Lt + 0.6, 0.04, 2.4, 0, A * 0.75, F / 2 - 1.3), (v) => (v.y += (F / 2 - 1.3 - v.z) * 0.18)), "#e4dac4", 0.1, 0);
    obra.por("madeira", bloco(1.4, 0.06, 0.8, L / 2 - 0.9, 0.78, F / 2 - 0.9), "#8a6e4a", 0.08, 0);
    for (const [dx, dz] of [
      [-0.6, -0.3],
      [0.6, -0.3],
      [-0.6, 0.3],
      [0.6, 0.3],
    ]) obra.por("madeira", bloco(0.05, 0.78, 0.05, L / 2 - 0.9 + dx, 0, F / 2 - 0.9 + dz), "#6a5236", 0.08, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      obra.por("madeira", tora(V(-L / 2 + 1.0 + Math.cos(a) * 0.4, 0, F / 2 - 0.8 + Math.sin(a) * 0.4), V(-L / 2 + 1.0, 1.3, F / 2 - 0.8), 0.025, 4, false), "#8a6e4a", 0.05, 0);
    }
    obra.por("ferro", bloco(0.18, 0.2, 0.32, -L / 2 + 1.0, 1.3, F / 2 - 0.8), "#6a5a38", 0.05, 0);
    caixote(obra, L / 2 - 0.6, 0, -F / 2 + 0.6, 0.7, 0.2, "#8a6e4a");
  } else if (R !== "deserto") {
    fogueira(obra, L / 2 - 0.9, F / 2 + 0.6, r, sem + 2);
    if (R === "serra" || R === "mata") {
      // Pele esticada num bastidor.
      esteio(obra, -L / 2 + 0.4, F / 2 - 0.6, 0, 1.6, 0.04, "#4a3a28");
      esteio(obra, -L / 2 + 0.4, F / 2 - 1.8, 0, 1.6, 0.04, "#4a3a28");
      obra.por("lona", bloco(0.04, 1.1, 1.0, -L / 2 + 0.4, 0.35, F / 2 - 1.2), "#7a5a3c", 0.15, 0);
    }
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interior(p, c, r, "tenda", 0, Lt, Ft, zt) };
}

// ---------------------------------------------------------------------------------------------
// Torre de vigia

function vigia(R: Regiao, p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const caida = R === "mata" && (p.id === "torre-vigia" || p.nome.toLowerCase().includes("caída"));
  const [bx, bz] = [L / 2 - 0.4, F / 2 - 0.4];
  const topo = Math.max(2.4, A - 2.0);
  const [tx, tz] = [Math.min(bx, 2.4), Math.min(bz, 2.4)];
  const madeira = R === "trincheira" ? "#3a3026" : R === "deserto" ? "#7a6248" : "#5a4630";
  for (const [sx, sz] of QUINAS) obra.por("casca", tora(V(sx * bx, 0, sz * bz), V(sx * tx, topo + 1.1, sz * tz), 0.16, 6), madeira, 0.1, 0.2);
  // Mãos-francesas em X nos quatro lados (a frente, se entrável, fica livre em baixo).
  const niveis = Math.max(1, Math.floor(topo / 3.5));
  const naAltura = (y: number) => [bx + (tx - bx) * (y / (topo + 1.1)), bz + (tz - bz) * (y / (topo + 1.1))];
  for (let k = 0; k < niveis; k++) {
    const y0 = (k * topo) / niveis;
    const y1 = ((k + 1) * topo) / niveis;
    const [ax, az] = naAltura(y0);
    const [cx, cz] = naAltura(y1);
    for (const s of [-1, 1]) {
      if (!(s > 0 && p.entravel && k === 0)) {
        obra.por("casca", tora(V(-ax, y0, s * az), V(cx, y1, s * cz), 0.07, 4, false), madeira, 0.1, 0);
        obra.por("casca", tora(V(ax, y0, s * az), V(-cx, y1, s * cz), 0.07, 4, false), madeira, 0.1, 0);
      }
      obra.por("casca", tora(V(s * ax, y0, -az), V(s * cx, y1, cz), 0.07, 4, false), madeira, 0.1, 0);
      obra.por("casca", tora(V(s * ax, y0, az), V(s * cx, y1, -cz), 0.07, 4, false), madeira, 0.1, 0);
    }
  }
  // Plataforma, guarda-corpo (ou sacos na trincheira) e escada.
  const [pw, pd] = [tx * 2 + 0.8, tz * 2 + 0.8];
  obra.por("madeira", bloco(pw, 0.18, pd, 0, topo, 0), R === "trincheira" ? "#2e261e" : c.ripa, 0.1, 0);
  if (R === "trincheira") {
    const pl = new Deslocada(obra, 0, topo + 0.18, 0);
    for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) sacos(pl, f, pw, pd, pw - 0.6, 3, r, c.lona);
  } else {
    for (const f of ["frente", "fundos", "esquerda", "direita"] as Face[]) {
      const comp = f === "frente" || f === "fundos" ? pw : pd;
      obra.por("madeira", naFace(bloco(comp, 0.9, 0.06, 0, 0, -0.05), f, pw, pd, 0, topo + 0.3), R === "deserto" ? "#8a7258" : c.parede, 0.12, 0);
    }
  }
  escadaDeMao(obra, "frente", tx * 2, tz * 2, 0, topo + 0.2, madeira);
  // Guarita: quatro esteios curtos e a cobertura.
  const alturaDoTeto = topo + 2.2;
  for (const [sx, sz] of QUINAS) obra.por("madeira", bloco(0.12, 2.0, 0.12, sx * (pw / 2 - 0.1), topo + 0.18, sz * (pd / 2 - 0.1)), madeira, 0.1, 0);
  if (R === "deserto") t.por("lona", deformar(bloco(pw + 0.6, 0.05, pd + 0.6, 0, alturaDoTeto, 0), (v) => (v.y += 0.2 - (Math.abs(v.x) + Math.abs(v.z)) * 0.06)), c.lona, 0.12, 0);
  else cobertura(t, R === "mata" ? "palha" : c.telhadoMat, c.telhado, "quatro-aguas", pw, pd, alturaDoTeto, Math.min(pw, pd) * 0.4, { beiral: 0.4, espessura: R === "mata" ? 0.3 : 0.14, neve: c.neve });
  if (R === "mata" || R === "charco") cipo(obra, V(-bx, 0, bz), V(-tx, topo, tz), r, sem + 3, 4);
  if (R === "charco") orelhas(obra, bx, 0.6, bz, 3, r, sem + 4);
  let corpo = obra.pecas();
  let teto = t.pecas();
  if (caida) {
    // Torre caída: adernada, o teto escorregado de lado e tábuas no chão.
    corpo = mexer(corpo, (g) => g.rotateZ(-0.11).rotateX(0.05));
    teto = mexer(teto, (g) => g.rotateZ(-0.35).translate(-1.2, -0.6, 0));
    const chao = new Obra(sem + 9);
    for (let i = 0; i < 5; i++) chao.por("madeira", bloco(0.25, 0.06, 2 + r() * 1.5, 0, 0, 0).rotateY(r() * 3).translate(-L / 2 + 1 + r() * 2, 0.03 + i * 0.03, -F / 2 + 1.5 + r() * (F - 3)), c.ripa, 0.15, 0);
    corpo = [...corpo, ...chao.pecas()];
  }
  return { corpo, telhado: teto, interior: interior(p, c, r, "torre", 0) };
}

// ---------------------------------------------------------------------------------------------
// Igreja: capela de região e o convento austero da Trincheira

/** Espadana: parede de sino sobre o frontão, com dois vãos e os sinos. */
function espadana(obra: Obra, material: NomeMaterial, cor: THREE.ColorRepresentation, x: number, y: number, z: number, w: number) {
  const h = w * 0.8;
  obra.por(material, bloco(w, h, 0.6, x, y, z), cor, 0.08, 0);
  obra.por(material, bloco(w + 0.3, 0.25, 0.75, x, y + h, z), cor, 0.06, 0);
  obra.por(material, malha([V(x - w / 2, y + h + 0.25, z + 0.3), V(x + w / 2, y + h + 0.25, z + 0.3), V(x, y + h + 0.25 + w * 0.3, z + 0.3)], [0, 1, 2]), cor, 0.06, 0);
  for (const s of [-1, 1]) {
    obra.por("madeira-escura", bloco(w * 0.28, h * 0.5, 0.62, x + s * w * 0.22, y + h * 0.3, z), "#141210", 0.02, 0);
    obra.por("ferro", new THREE.CylinderGeometry(0.12, w * 0.1, w * 0.18, 8).translate(x + s * w * 0.22, y + h * 0.48, z), "#5a4a2a", 0.05, 0);
  }
  obra.por("ferro", bloco(0.08, 1.1, 0.08, x, y + h + 0.25 + w * 0.3, z + 0.3), "#2c2a28", 0.02, 0);
  obra.por("ferro", bloco(0.55, 0.08, 0.08, x, y + h + 0.25 + w * 0.3 + 0.7, z + 0.3), "#2c2a28", 0.02, 0);
}

/** Nave com frontão liso, óculo, porta e janelas estreitas; `x`/`z` deslocam a nave. */
function nave(obra: Obra, t: Obra, material: NomeMaterial, cor: string, telhaMat: NomeMaterial, telha: string, L: number, F: number, A: number, entravel: boolean, porta: string, neve: number, x = 0, z = 0) {
  const o = new Deslocada(obra, x, 0, z);
  paredes(o, L, F, A, material, cor, entravel ? PORTA_DE_ENTRAR : undefined);
  const alto = L * 0.42;
  cobertura(t, telhaMat, telha, "duas-aguas", L, F, A, alto, { beiral: 0.45, espessura: 0.18, empenaNaFrente: true, neve, x, z });
  oitoes(obra, material, cor, L, F, A, alto, true, x, z);
  o.por(material, bloco(L + 0.2, 0.3, 0.5, 0, A - 0.15, F / 2), cor, 0.05, 0);
  o.por("vidro", new THREE.CylinderGeometry(0.45, 0.45, 0.1, 10).rotateX(Math.PI / 2).translate(0, A + alto * 0.35, F / 2 + 0.03), "#1e2224", 0.03, 0);
  if (!entravel) portaDeTabua(o, "frente", L, F, 0, 1.8, 3.0, porta);
  else for (const s of [-1, 1]) o.por(material, bloco(0.4, 3.3, 0.5, s * 2.3, 0, F / 2), cor, 0.05, 0);
  for (const u of aoLongo(F, Math.max(2, Math.floor(F / 4.5)), 2)) {
    for (const f of ["esquerda", "direita"] as Face[]) janela(o, f, L, F, u, A * 0.4, 0.55, 2.0, { moldura: cor, materialDaMoldura: material });
  }
  return alto;
}

function interiorDeIgreja(p: PredioLocal, L: number, F: number, x = 0, z = 0): Peca[] {
  if (!p.entravel) return [];
  const base = new Obra(23);
  const o = new Deslocada(base, x, 0, z);
  o.por("pedra", bloco(L - 1, 0.06, F - 1, 0, 0.02, 0), "#6e6a62", 0.08, 0);
  for (let i = 0; i < Math.floor(F / 2.4) - 2; i++) for (const s of [-1, 1]) o.por("madeira", bloco(L * 0.3, 0.5, 0.45, s * L * 0.22, 0, F / 2 - 3.2 - i * 2.2), "#4a3422", 0.08, 0);
  o.por("pedra", bloco(L * 0.35, 1.1, 1.1, 0, 0, -F / 2 + 1.3), "#8a857a", 0.04, 0);
  o.por("madeira", bloco(0.12, 2.2, 0.12, 0, 1.1, -F / 2 + 1.0), "#3a2a1e", 0.04, 0);
  o.por("madeira", bloco(1.0, 0.12, 0.12, 0, 2.7, -F / 2 + 1.0), "#3a2a1e", 0.04, 0);
  return base.pecas();
}

/** Convento isolado: nave de pedra cinza, contrafortes, ala das celas e o claustro murado. */
function convento(p: PredioLocal, c: Cores, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const pedra = "#6f6b64";
  const Ln = Math.min(11, L * 0.55);
  const Fn = F * 0.85;
  const zn = F / 2 - Fn / 2;
  const alto = nave(obra, t, "cantaria", pedra, "telha-escura", "#34302c", Ln, Fn, A, p.entravel, c.porta, 0, 0, zn);
  espadana(obra, "cantaria", pedra, 0, A + alto - 0.4, F / 2 - 0.3, Math.min(4, Ln * 0.38));
  // Contrafortes nos dois lados da nave.
  for (const u of aoLongo(Fn, Math.max(3, Math.floor(Fn / 4)), 1)) {
    for (const s of [-1, 1]) {
      obra.por("cantaria", bloco(0.8, A * 0.8, 1.1, s * (Ln / 2 + 0.4), 0, zn + u), "#67635c", 0.08, 0.25);
      obra.por("cantaria", malha([V(s * Ln / 2, A * 0.8, zn + u + 0.55), V(s * (Ln / 2 + 0.8), A * 0.8, zn + u + 0.55), V(s * Ln / 2, A * 0.95, zn + u + 0.55)], s > 0 ? [0, 1, 2] : [1, 0, 2]), "#67635c", 0.08, 0);
    }
  }
  // Ala das celas: dois andares de janelinhas gradeadas, telhado de uma água.
  const wl = (L - Ln) / 2 - 1.0;
  if (wl > 2.5) {
    const xa = -L / 2 + wl / 2;
    const Fa = F * 0.7;
    const za = -F / 2 + Fa / 2;
    const Aa = Math.min(A * 0.75, 7);
    const ala = new Deslocada(obra, xa, 0, za);
    paredes(ala, wl, Fa, Aa, "cantaria", pedra);
    for (let andar = 0; andar < 2; andar++) {
      for (const u of aoLongo(Fa, Math.max(2, Math.floor(Fa / 2.6)), 1.2)) janela(ala, "esquerda", wl, Fa, u, 1.2 + andar * (Aa / 2), 0.5, 0.7, { moldura: pedra, materialDaMoldura: "cantaria", grade: true });
      for (const u of aoLongo(wl, Math.max(1, Math.floor(wl / 2.6)), 0.9)) janela(ala, "frente", wl, Fa, u, 1.2 + andar * (Aa / 2), 0.5, 0.7, { moldura: pedra, materialDaMoldura: "cantaria", grade: true });
    }
    cobertura(t, "telha-escura", "#34302c", "quatro-aguas", wl, Fa, Aa, Math.min(wl, Fa) * 0.35, { beiral: 0.4, espessura: 0.16, x: xa, z: za });
  }
  // Claustro do outro lado: muro e as cruzes do cemiteriozinho.
  const xc = L / 2 - 0.3;
  const xi = Ln / 2 + 1.2;
  obra.por("cantaria", bloco(0.5, 2.6, F - 0.6, xc, 0, 0), "#625e58", 0.1, 0.25);
  obra.por("cantaria", bloco(xc - xi, 2.6, 0.5, (xc + xi) / 2, 0, -F / 2 + 0.3), "#625e58", 0.1, 0.25);
  obra.por("cantaria", bloco(xc - xi, 2.6, 0.5, (xc + xi) / 2, 0, F / 2 - 0.3), "#625e58", 0.1, 0.25);
  for (let i = 0; i < 6; i++) {
    const [x, z] = [xi + 0.8 + (i % 2) * 1.4, -F / 2 + 2 + Math.floor(i / 2) * 2.2];
    if (x > xc - 0.5) continue;
    obra.por("madeira-escura", bloco(0.1, 1.2, 0.1, x, 0, z), "#2a221a", 0.05, 0);
    obra.por("madeira-escura", bloco(0.6, 0.1, 0.1, x, 0.85, z), "#2a221a", 0.05, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDeIgreja(p, Ln, Fn, 0, zn) };
}

/** Capela de região: tábua e palha na mata e no charco, pedra e neve na serra, adobe no deserto. */
function capela(R: Regiao, p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  if (R === "trincheira") {
    if (L >= 16) return convento(p, c, sem);
    const obra = new Obra(sem);
    const t = new Obra(sem + 1);
    const alto = nave(obra, t, "cantaria", "#6f6b64", "telha-escura", "#34302c", L, F, A, p.entravel, c.porta, 0);
    espadana(obra, "cantaria", "#6f6b64", 0, A + alto - 0.3, F / 2 - 0.3, Math.min(3, L * 0.32));
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDeIgreja(p, L, F) };
  }
  if (R === "serra" || R === "deserto") {
    const obra = new Obra(sem);
    const t = new Obra(sem + 1);
    const deserto = R === "deserto";
    const alto = nave(obra, t, deserto ? "reboco" : c.pedraMat, deserto ? c.parede : c.pedra, deserto ? "madeira" : "telha-escura", deserto ? "#7a6248" : c.telhado, L, F, A, p.entravel, c.porta, c.neve);
    if (deserto) espadana(obra, "reboco", c.parede, 0, A + alto - 0.4, F / 2 - 0.3, Math.min(3.2, L * 0.35));
    else {
      // Campanário de madeira sobre a cumeeira, perto da frente.
      const y = A + alto - 0.3;
      for (const [sx, sz] of QUINAS) obra.por("madeira", bloco(0.15, 1.8, 0.15, sx * 0.6, y, F / 2 - 1.6 + sz * 0.6), c.escura, 0.08, 0);
      obra.por("ferro", new THREE.CylinderGeometry(0.15, 0.35, 0.5, 8).translate(0, y + 1.0, F / 2 - 1.6), "#5a4a2a", 0.05, 0);
      cobertura(t, "telha-escura", c.telhado, "quatro-aguas", 1.4, 1.4, y + 1.8, 0.9, { beiral: 0.15, espessura: 0.1, neve: c.neve, z: F / 2 - 1.6 });
    }
    obra.por(c.pedraMat, bloco(L + 0.1, 0.6, F + 0.1, 0, 0, 0), c.pedra, 0.15, 0.2);
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: interiorDeIgreja(p, L, F) };
  }
  // Mata e charco: capela de tábua, cruz de pau na cumeeira e campanário de esteios ao lado.
  const base = casa(R, p, r, c, sem);
  const obra = new Obra(sem + 5);
  const y = A + Math.min(L, F) * (R === "charco" ? 0.26 : 0.5);
  obra.por("casca", bloco(0.14, 1.6, 0.14, 0, y, F / 2 - 0.3), "#3a2c1e", 0.05, 0);
  obra.por("casca", bloco(0.8, 0.14, 0.14, 0, y + 1.0, F / 2 - 0.3), "#3a2c1e", 0.05, 0);
  const cx = L / 2 - 0.8;
  for (const s of [-1, 1]) esteio(obra, cx + s * 0.5, F / 2 - 0.6, 0, 4.2, 0.1, "#4a3a28");
  obra.por("casca", tora(V(cx - 0.7, 4.0, F / 2 - 0.6), V(cx + 0.7, 4.0, F / 2 - 0.6), 0.08, 5), "#4a3a28", 0.1, 0);
  obra.por("ferro", new THREE.CylinderGeometry(0.12, 0.3, 0.45, 8).translate(cx, 3.55, F / 2 - 0.6), "#5a4a2a", 0.05, 0);
  return somar(base, { corpo: obra.pecas(), telhado: [], interior: [] });
}

// ---------------------------------------------------------------------------------------------
// Ruínas

/** Muros quebrados de topo serrilhado; a frente fica livre no meio quando entrável. */
function muros(obra: Obra, p: PredioLocal, r: () => number, material: NomeMaterial, cor: string, e = 0.55, fator = [0.25, 1]) {
  const { largura: L, fundo: F, altura: A } = p;
  const topos: THREE.BufferGeometry[] = [];
  const trecho = (w: number, d: number, x: number, z: number, frente: boolean) => {
    const partes = Math.max(1, Math.round(Math.max(w, d) / 2.2));
    for (let i = 0; i < partes; i++) {
      const tt = i / partes - 0.5 + 0.5 / partes;
      const [bx, bz] = w > d ? [x + tt * w, z] : [x, z + tt * d];
      const larg = w > d ? w / partes : d / partes;
      if (frente && p.entravel && Math.abs(bx) - larg / 2 < 2.2) continue;
      if (!frente && r() < 0.15) continue;
      const h = A * (fator[0] + r() * (fator[1] - fator[0]));
      const g = deformar(bloco(w > d ? larg : e, h, w > d ? e : larg, bx, 0, bz), (v) => (v.y > h - 0.01 ? (v.y -= r() * 0.5) : 0));
      topos.push(g.clone());
      obra.por(material, g, cor, 0.15, 0.3);
    }
  };
  trecho(L, e, 0, F / 2 - e / 2, true);
  trecho(L, e, 0, -F / 2 + e / 2, false);
  trecho(e, F - e * 2, -L / 2 + e / 2, 0, false);
  trecho(e, F - e * 2, L / 2 - e / 2, 0, false);
  for (let i = 0; i < 6; i++) obra.por(material, bolha(0.4 + r() * 0.5, 0, 0.35, i + 3, 0.6).translate((r() - 0.5) * L * 0.7, 0.15, (r() - 0.5) * F * 0.6 - (p.entravel ? F * 0.1 : 0)), cor, 0.15, 0);
  return topos;
}

/** O que cada região põe por cima de uma ruína: cipó e limo, água parada, neve, areia, carvão. */
function marcasDaRegiao(obra: Obra, R: Regiao, p: PredioLocal, r: () => number, sem: number, topos: THREE.BufferGeometry[]) {
  const { largura: L, fundo: F, altura: A } = p;
  if (R === "mata") {
    for (let i = 0; i < 4; i++) {
      const sx = i % 2 ? 1 : -1;
      const sz = i < 2 ? 1 : -1;
      cipo(obra, V(sx * (L / 2 - 0.2), 0, sz * (F / 2 - 0.2 - r() * 2)), V(sx * (L / 2 - 1.5 - r() * 2), A * 0.8, sz * (F / 2 - 0.4)), r, sem + i * 5, 4);
    }
    for (const g of topos.slice(0, 6)) obra.por("musgo", g.clone().scale(1.02, 0.25, 1.02), "#4a5a30", 0.2, 0);
  } else if (R === "charco") {
    obra.por("agua", bloco(L - 1.4, 0.05, F - 1.4, 0, 0.08, 0), "#3a4a3a", 0.05, 0);
    for (let i = 0; i < 3; i++) orelhas(obra, (r() - 0.5) * (L - 1.5), 0.3, (r() < 0.5 ? -1 : 1) * (F / 2 - 0.4), 2, r, sem + i);
    for (const g of topos.slice(0, 6)) obra.por("musgo", g.clone().scale(1.02, 0.3, 1.02), "#3e4a2c", 0.2, 0);
  } else if (R === "serra") {
    for (const g of topos) obra.por("neve", nevar(g, 0.8, 0.08), "#eef1f4", 0.03, 0);
  } else if (R === "deserto") {
    for (let i = 0; i < 4; i++) {
      const raio = Math.min(1.2 + r() * 0.6, F * 0.2);
      const [x, z] = [(r() < 0.5 ? -1 : 1) * (L / 2 - raio * 1.2), (r() - 0.5) * (F - raio * 2.6)];
      obra.por("terra", bolha(raio, 1, 0.2, sem + i, 0.3).translate(x, 0, z), "#c8956a", 0.1, 0);
    }
  } else {
    for (let i = 0; i < 5; i++) obra.por("carvao", bloco(0.25, 0.2, 2 + r() * 2, 0, 0, 0).rotateY(r() * 3).translate((r() - 0.5) * L * 0.6, 0.1, (r() - 0.5) * F * 0.6), "#1e1a18", 0.1, 0);
  }
}

/** Capela em ruína: frontão de pé com a porta, nave sem teto. */
function capelaRuina(R: Regiao, p: PredioLocal, r: () => number, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const cor = R === "charco" ? "#6a6a5c" : R === "serra" ? "#7a7876" : R === "deserto" ? "#a8785a" : "#8a8476";
  const material: NomeMaterial = R === "deserto" ? "pedra-vermelha" : "cantaria";
  const semFrente = { ...p, entravel: true, fundo: F - 1.4 };
  const topos = muros(new Deslocada(obra, 0, 0, -0.7), semFrente, r, material, cor, 0.6, [0.45, 1]).map((g) => g.translate(0, 0, -0.7));
  // Frontão: dois panos ao lado da porta, verga e o triângulo quebrado com a cruz torta.
  const wd = 2.4;
  const lado = (L - wd * 2) / 2;
  for (const s of [-1, 1]) obra.por(material, bloco(lado, A, 0.7, s * (wd + lado / 2), 0, F / 2 - 0.35), cor, 0.12, 0.3);
  obra.por(material, bloco(wd * 2, A - 3.4, 0.7, 0, 3.4, F / 2 - 0.35), cor, 0.12, 0);
  const pico = A + L * 0.32;
  const ponta = (L / 2) * 0.3;
  obra.por(material, malha([V(-L / 2, A, F / 2), V(ponta, A, F / 2), V(-L * 0.05, pico, F / 2)], [0, 1, 2]), cor, 0.12, 0);
  obra.por(material, malha([V(-L / 2, A, F / 2 - 0.7), V(ponta, A, F / 2 - 0.7), V(-L * 0.05, pico, F / 2 - 0.7)], [1, 0, 2]), cor, 0.12, 0);
  obra.por(material, malha([V(ponta, A, F / 2), V(ponta, A, F / 2 - 0.7), V(-L * 0.05, pico, F / 2 - 0.7), V(-L * 0.05, pico, F / 2)], [0, 1, 2, 0, 2, 3]), cor, 0.12, 0);
  obra.por("ferro", bloco(0.1, 1.2, 0.1, 0, 0, 0).rotateZ(0.3).translate(-L * 0.05, pico, F / 2 - 0.35), "#2c2a28", 0.02, 0);
  marcasDaRegiao(obra, R, p, r, sem + 30, topos);
  if (!p.entravel) obra.por("madeira-escura", bloco(wd * 2, 3.3, 0.1, 0, 0, F / 2 - 0.1), "#2a241e", 0.1, 0);
  return { corpo: obra.pecas(), telhado: [], interior: [] };
}

/** Templo antigo do Mucuri: plataforma de degraus, cela de pedra maciça, pórtico de colunas. */
function templo(p: PredioLocal, r: () => number, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const arenito = "#b08a66";
  // Três degraus em volta, baixos o bastante para subir a pé.
  for (let k = 0; k < 3; k++) obra.por("pedra-vermelha", bloco(L - k * 1.2, 0.3, F - k * 1.2, 0, k * 0.3, 0), k % 2 ? "#9a5a40" : "#8a5038", 0.15, 0.2);
  const y0 = 0.9;
  const Lc = L - 4;
  const Fc = F - 9;
  const zc = -F / 2 + 1.8 + Fc / 2;
  const e = 1.3;
  const cela = new Deslocada(obra, 0, y0, zc);
  // Paredes maciças, mais inteiras que uma ruína comum; a frente é refeita com o portal.
  const Ac = A * 0.72;
  const topos = muros(cela, { ...p, largura: Lc, fundo: Fc, altura: Ac, entravel: true }, r, "cantaria", arenito, e, [0.55, 1]);
  const vao = 4.6;
  const pano = (Lc - vao) / 2 - 1.0;
  for (const s of [-1, 1]) cela.por("cantaria", bloco(pano, Ac * (0.75 + r() * 0.25), e, s * (vao / 2 + 1.0 + pano / 2), 0, Fc / 2 - e / 2), arenito, 0.12, 0.25);
  // Portal: ombreiras salientes e o lintel monolítico.
  for (const s of [-1, 1]) cela.por("cantaria", bloco(1.0, 4.2, e + 0.5, s * (vao / 2 + 0.5), 0, Fc / 2 - e / 2 + 0.1), "#a07a58", 0.1, 0);
  cela.por("cantaria", bloco(vao + 2.6, 1.3, e + 0.6, 0, 4.2, Fc / 2 - e / 2 + 0.1), "#a47e5c", 0.1, 0);
  cela.por("cantaria", bloco(vao + 3.2, 0.35, e + 0.8, 0, 5.5, Fc / 2 - e / 2 + 0.1), "#987252", 0.1, 0);
  // Cornija no alto do que ficou de pé.
  for (const g of topos) {
    g.computeBoundingBox();
    const b = g.boundingBox!;
    if (b.max.y < Ac * 0.8) continue;
    cela.por("cantaria", bloco(b.max.x - b.min.x + 0.3, 0.35, b.max.z - b.min.z + 0.3, (b.max.x + b.min.x) / 2, b.max.y - 0.6, (b.max.z + b.min.z) / 2), "#8e6a4c", 0.1, 0);
  }
  // Pórtico: colunas de tambor, uma tombada.
  const zp = zc + Fc / 2 + 2.6;
  const xs = aoLongo(Lc, 6, 0.8).filter((x) => Math.abs(x) > 2.6);
  const caida = Math.floor(r() * xs.length);
  xs.forEach((x, i) => {
    const h = i === caida ? 1.2 : A * (0.55 + r() * 0.25);
    obra.por("cantaria", new THREE.CylinderGeometry(0.55, 0.62, h, 10).translate(x, y0 + h / 2, zp), arenito, 0.12, 0.2);
    obra.por("cantaria", bloco(1.5, 0.4, 1.5, x, y0, zp), "#9a7656", 0.1, 0);
    if (i !== caida && h > A * 0.6) obra.por("cantaria", bloco(1.5, 0.45, 1.5, x, y0 + h, zp), "#9a7656", 0.1, 0);
    if (i === caida) {
      for (let k = 0; k < 3; k++) obra.por("cantaria", new THREE.CylinderGeometry(0.55, 0.55, 1.3, 10).rotateZ(Math.PI / 2).rotateY(0.4 + k * 0.1).translate(x + 1.2 + k * 1.2, y0 + 0.55, zp + 0.8 + k * 0.5), arenito, 0.12, 0);
    }
  });
  // Lajes do teto que ficaram atravessadas sobre a cela, no fundo.
  for (let i = 0; i < 3; i++) t.por("cantaria", bloco(Lc + 0.4, 0.5, 2.2, 0, y0 + Ac * (0.92 - i * 0.02), zc - Fc / 2 + 1.4 + i * 2.3).rotateZ((r() - 0.5) * 0.04), "#a07a58", 0.1, 0);
  // Estelas lisas ladeando a escada.
  for (const s of [-1, 1]) obra.por("cantaria", bloco(1.0, 3.2, 0.6, s * (L / 2 - 1.8), y0, F / 2 - 1.6), "#9a7454", 0.12, 0);
  // Areia que o vento empurrou para os cantos.
  for (let i = 0; i < 5; i++) {
    const raio = 1.6 + r() * 0.8;
    const [x, z] = [(i % 2 ? 1 : -1) * (L / 2 - raio * 1.25 - r()), (r() - 0.5) * (F - raio * 3)];
    obra.por("terra", bolha(raio, 1, 0.2, sem + i, 0.3).translate(x, 0.2, z), "#c8956a", 0.1, 0);
  }
  const dentro = new Obra(sem + 4);
  if (p.entravel) {
    dentro.por("pedra-vermelha", bloco(Lc - e * 2, 0.08, Fc - e * 2, 0, y0, zc), "#a07050", 0.1, 0);
    dentro.por("cantaria", bloco(3.2, 1.3, 1.8, 0, y0, zc - Fc / 2 + e + 1.4), "#8e6a4c", 0.08, 0);
    for (let i = 0; i < 3; i++) dentro.por("cantaria", bloco(2.0 + r(), 0.5, 1.2, 0, 0, 0).rotateY(r() * 3).translate((r() < 0.5 ? -1 : 1) * (2.5 + r() * (Lc / 2 - 5)), y0, zc + (r() - 0.5) * (Fc - 5)), "#a07a58", 0.1, 0);
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: dentro.pecas() };
}

/** Boca de mina: morro de pedra, emboque escorado de tora, trilhos e vagonete. */
function mina(R: Regiao, p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  const rocha = R === "deserto" ? "#8a5038" : R === "serra" ? "#6a6866" : "#6a6458";
  const mat: NomeMaterial = R === "deserto" ? "pedra-vermelha" : "pedra";
  paredes(obra, L - 1, F - 1, A, mat, rocha, { largura: 4.4, altura: 3.2 });
  for (let i = 0; i < 8; i++) {
    const raio = 0.8 + r() * 0.4;
    const [x, z] = [(i % 2 ? 1 : -1) * (L / 2 - raio * 1.3), -F / 2 + 1.2 + (Math.floor(i / 2) / 3) * (F - 2.4)];
    obra.por(mat, bolha(raio, 0, 0.3, sem + i, 0.8).translate(x, 0.4, z), rocha, 0.15, 0.2);
  }
  // O morro por cima (some ao entrar).
  t.por(mat, deformar(bolha(1, 2, 0.25, sem + 20, 1), (v) => {
    v.x *= L * 0.46;
    v.z *= F * 0.42;
    v.y = Math.max(0, v.y) * (A * 0.9) + A * 0.5;
  }).translate(0, 0, -0.5), rocha, 0.15, 0);
  if (c.neve) t.por("neve", deformar(bolha(1, 1, 0.2, sem + 21, 1), (v) => {
    v.x *= L * 0.38;
    v.z *= F * 0.34;
    v.y = Math.max(0, v.y) * 0.4 + A * 1.32;
  }).translate(0, 0, -0.5), "#eef1f4", 0.03, 0);
  // Emboque: esteios, chapéu e (fechada) as tábuas pregadas em X.
  const zf = F / 2 - 0.4;
  for (const s of [-1, 1]) obra.por("casca", tora(V(s * 2.4, 0, zf), V(s * 2.3, 3.5, zf), 0.2, 6), "#5a4630", 0.1, 0.2);
  obra.por("casca", tora(V(-3.0, 3.5, zf), V(3.0, 3.5, zf), 0.22, 6), "#5a4630", 0.1, 0);
  if (!p.entravel) {
    obra.por("madeira-escura", bloco(4.4, 3.2, 0.1, 0, 0, zf - 0.3), "#0e0c0a", 0.02, 0);
    for (const s of [-1, 1]) obra.por("madeira", bloco(5.2, 0.25, 0.06, 0, 0, 0).rotateZ(s * 0.55).translate(0, 1.7, zf + 0.15), "#6a5038", 0.12, 0);
  } else {
    // Cambotas do túnel lá dentro.
    for (let i = 1; i < Math.floor((F - 2) / 2); i++) {
      const z = zf - i * 2;
      for (const s of [-1, 1]) obra.por("casca", tora(V(s * 2.0, 0, z), V(s * 1.9, 3.1, z), 0.14, 5), "#4a3a28", 0.1, 0);
      obra.por("casca", tora(V(-2.3, 3.1, z), V(2.3, 3.1, z), 0.15, 5), "#4a3a28", 0.1, 0);
    }
  }
  // Trilhos saindo da boca, dormentes e o vagonete virado.
  const [zi, zfim] = [F / 2 - F * 0.5, F / 2 + 2.2];
  for (const s of [-1, 1]) obra.por("ferro", bloco(0.07, 0.1, zfim - zi, s * 0.5, 0.08, (zi + zfim) / 2), "#4a3e34", 0.06, 0);
  for (let z = zfim - 0.2; z > zi; z -= 0.8) obra.por("madeira", bloco(1.5, 0.08, 0.2, 0, 0, z), "#5a4430", 0.12, 0);
  obra.por("ferro", bloco(1.4, 0.9, 1.0, 0, -0.45, 0).rotateZ(1.2).translate(-L / 2 + 2.2, 0.75, F / 2 + 0.8), "#5a4a3c", 0.12, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

/** Barracão queimado: esteios carbonizados, restos de tábua e caibros caídos. */
function queimado(p: PredioLocal, r: () => number, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  for (const x of aoLongo(L, Math.max(2, Math.round(L / 3) + 1), 0.25)) {
    for (const z of [-F / 2 + 0.25, F / 2 - 0.25]) {
      if (z > 0 && p.entravel && Math.abs(x) < 2.4) continue;
      obra.por("carvao", tora(V(x, 0, z), V(x + (r() - 0.5) * 0.3, A * (0.35 + r() * 0.7), z), 0.16, 5), "#221e1a", 0.15, 0.1);
    }
  }
  for (const s of [-1, 1]) for (const z of aoLongo(F, 3, 0.25)) obra.por("carvao", tora(V(s * (L / 2 - 0.25), 0, z), V(s * (L / 2 - 0.25), A * (0.4 + r() * 0.6), z), 0.15, 5), "#262019", 0.15, 0.1);
  // Restos de tábua: pedaços de parede de alturas desiguais.
  for (const f of ["fundos", "esquerda", "direita", "frente"] as Face[]) {
    const comp = f === "frente" || f === "fundos" ? L : F;
    for (const u of aoLongo(comp, Math.floor(comp / 1.6), 0.6)) {
      if (r() < 0.35) continue;
      if (f === "frente" && (p.entravel ? Math.abs(u) < 2.4 : Math.abs(u) < 0.8)) continue;
      obra.por("madeira-escura", naFace(bloco(1.5, 0.5 + r() * A * 0.6, 0.08, 0, 0, -0.1), f, L, F, u, 0), r() < 0.5 ? "#2a221c" : "#3a3026", 0.2, 0.2);
    }
  }
  // Caibros caídos apoiados num lado e montes de cinza.
  for (let i = 0; i < 4; i++) {
    const z = -F / 2 + 1 + i * ((F - 2) / 3);
    obra.por("carvao", tora(V(-L / 2 + 0.4, A * 0.6, z), V(-L / 2 + 3 + r() * 2, 0.1, z + (r() - 0.5)), 0.1, 5), "#1e1a16", 0.1, 0);
  }
  for (let i = 0; i < 3; i++) obra.por("carvao", bolha(1.0 + r() * 0.6, 0, 0.3, sem + i, 0.3).translate((r() - 0.5) * L * 0.5, 0, -F * 0.2 + (r() - 0.5) * F * 0.3), "#2a2622", 0.15, 0);
  obra.por("ferro", new THREE.CylinderGeometry(0.4, 0.4, 0.9, 8).translate(L * 0.25, 0.45, -F * 0.25), "#3a3430", 0.1, 0);
  return { corpo: obra.pecas(), telhado: [], interior: [] };
}

function ruinaDePedra(R: Regiao, p: PredioLocal, r: () => number, sem: number): PecasDoPredio {
  const obra = new Obra(sem);
  const cor = R === "deserto" ? (r() < 0.5 ? "#b08060" : "#9a6a4c") : R === "charco" ? "#626254" : R === "serra" ? "#76747a" : R === "trincheira" ? "#5a5650" : "#8a8476";
  const material: NomeMaterial = R === "deserto" ? (r() < 0.5 ? "reboco" : "pedra-vermelha") : "cantaria";
  const topos = muros(obra, p, r, material, cor, p.largura > 13 ? 0.6 : 0.45);
  // Restos de vigas da casa grande.
  if (p.largura > 13) for (let i = 0; i < 3; i++) obra.por("madeira-escura", tora(V(-p.largura / 2 + 1, p.altura * 0.5, -p.fundo / 2 + 2 + i * 3), V(p.largura * (r() - 0.3) * 0.4, 0.15, -p.fundo / 2 + 3 + i * 3), 0.12, 5), "#3a2c20", 0.1, 0);
  marcasDaRegiao(obra, R, p, r, sem + 30, topos);
  return { corpo: obra.pecas(), telhado: [], interior: [] };
}

function ruina(R: Regiao, p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  const nome = `${p.id} ${p.nome}`.toLowerCase();
  if (nome.includes("templo")) return templo(p, r, sem);
  if (nome.includes("mina")) return mina(R, p, r, c, sem);
  if (nome.includes("capela")) return capelaRuina(R, p, r, sem);
  if (R === "trincheira" && !nome.includes("muro")) return nome.includes("queimad") || nome.includes("barrac") || r() < 0.7 ? queimado(p, r, sem) : ruinaDePedra(R, p, r, sem);
  return ruinaDePedra(R, p, r, sem);
}

// ---------------------------------------------------------------------------------------------
// Fazenda, estação, moinho, fábrica

function fazenda(R: Regiao, p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  const { largura: L, fundo: F } = p;
  const Lh = Math.max(7, L * 0.62);
  const Fh = Math.max(6, F * 0.58);
  const zh = -F / 2 + Fh / 2;
  const base = casa(R, { ...p, largura: Lh, fundo: Fh, altura: Math.min(p.altura, 5) }, r, c, sem);
  const mover = (pp: Peca[]) => mexer(pp, (g) => g.translate(0, 0, zh));
  const casaPos = { corpo: mover(base.corpo), telhado: mover(base.telhado), interior: mover(base.interior) };
  const obra = new Obra(sem + 50);
  const [x0, x1, za, z1] = [-L / 2 + 0.25, L / 2 - 0.25, zh + Fh / 2 + 0.2, F / 2 - 0.25];
  if (R === "serra") {
    // Curral de pastor: muro de pedra seca, com a porteira na frente.
    const muro = (a: THREE.Vector3, b: THREE.Vector3) => {
      const g = bloco(a.distanceTo(b), 1.0, 0.6, 0, 0, 0);
      g.rotateY(-Math.atan2(b.z - a.z, b.x - a.x));
      const m = a.clone().add(b).multiplyScalar(0.5);
      obra.por("pedra", deformar(g.translate(m.x, 0, m.z), (v) => (v.y > 0.9 ? (v.y -= r() * 0.3) : 0)), c.pedra, 0.2, 0.25);
    };
    muro(V(x0, 0, -F / 2 + 0.3), V(x0, 0, z1));
    muro(V(x1, 0, -F / 2 + 0.3), V(x1, 0, z1));
    muro(V(x0, 0, z1), V(-2.3, 0, z1));
    muro(V(2.3, 0, z1), V(x1, 0, z1));
    for (const s of [-1, 1]) esteio(obra, s * 2.3, z1, 0, 1.5, 0.12, "#5a4630");
  } else {
    const quebrada = R === "deserto" || R === "trincheira";
    const cor = R === "deserto" ? "#7a6448" : "#5e4a36";
    const lado = (a: THREE.Vector3, b: THREE.Vector3) => {
      if (quebrada && r() < 0.3) return;
      cerca(obra, a, b, r, cor, quebrada ? 2 : 3);
    };
    lado(V(x0, 0, za), V(x0, 0, z1));
    lado(V(x1, 0, za), V(x1, 0, z1));
    lado(V(x0, 0, z1), V(-2.3, 0, z1));
    lado(V(2.3, 0, z1), V(x1, 0, z1));
  }
  // Cocho, e o monte de feno ou a roda de carroça largada.
  obra.por("madeira", bloco(2.2, 0.5, 0.6, L / 2 - 2.0, 0, (za + z1) / 2), "#5a4430", 0.1, 0);
  if (R === "mata" || R === "serra" || R === "charco") {
    obra.por("palha", bolha(1.2, 1, 0.2, sem + 3, 0.9).translate(-L / 2 + 1.8, 0.8, (za + z1) / 2), "#a08a52", 0.12, 0);
    if (c.neve) obra.por("neve", bolha(1.0, 1, 0.15, sem + 4, 0.4).translate(-L / 2 + 1.8, 1.6, (za + z1) / 2), "#eef1f4", 0.03, 0);
  } else {
    obra.por("madeira", new THREE.TorusGeometry(0.6, 0.06, 4, 12).rotateY(0.2).translate(-L / 2 + 1.0, 0.62, (za + z1) / 2), "#5a4430", 0.1, 0);
  }
  return somar(casaPos, { corpo: obra.pecas(), telhado: [], interior: [] });
}

function estacao(R: Regiao, p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const Lb = L * 0.66;
  const Fb = Math.max(5, F * 0.55);
  const zb = -F / 2 + Fb / 2;
  const base = casa(R, { ...p, largura: Lb, fundo: Fb, altura: Math.min(A, 5) }, r, c, sem);
  const mover = (pp: Peca[]) => mexer(pp, (g) => g.translate(0, 0, zb));
  const obra = new Obra(sem + 60);
  const t = new Obra(sem + 61);
  // Plataforma de tábua em toda a frente.
  const fp = F - Fb;
  obra.por("madeira", bloco(L, 0.5, fp, 0, 0, F / 2 - fp / 2), c.ripa, 0.1, 0.2);
  // Cobertura da plataforma em uma água, apoiada em esteios.
  const ap = Math.min(A, 5) - 0.5;
  for (const x of aoLongo(L, Math.max(3, Math.floor(L / 4)), 0.4)) if (Math.abs(x) > 2.4) obra.por("madeira", bloco(0.2, ap - 0.5, 0.2, x, 0.5, F / 2 - 0.3), c.escura, 0.08, 0);
  obra.por("madeira", bloco(L, 0.22, 0.22, 0, ap, F / 2 - 0.3), c.escura, 0.08, 0);
  const matDaPlataforma: NomeMaterial = c.telhadoMat;
  for (const g of telhado("uma-agua", L, fp + 0.2, ap + 0.1, 0.7, 0.35, 0.12)) t.por(matDaPlataforma, g.translate(0, 0, F / 2 - fp / 2 - 0.1), c.telhado, 0.12, 0);
  if (c.neve) t.por("neve", nevar(telhado("uma-agua", L, fp + 0.2, ap + 0.1, 0.7, 0.35, 0.12)[0].translate(0, 0, F / 2 - fp / 2 - 0.1), c.neve, 0.1), "#eef1f4", 0.03, 0);
  // Placa da parada sobre dois postes.
  for (const s of [-1, 1]) obra.por("madeira", bloco(0.15, 2.6, 0.15, -L / 2 + 1.6 + s * 1.1, 0.5, F / 2 - 0.5), c.escura, 0.08, 0);
  obra.por("madeira", bloco(2.6, 0.55, 0.08, -L / 2 + 1.6, 2.6, F / 2 - 0.5), "#e2d6bc", 0.05, 0);
  // Caixa d'água de tanoaria num estrado alto, no canto do fundo.
  const [xt, zt] = [L / 2 - 1.5, -F / 2 + 1.5];
  for (const [sx, sz] of QUINAS) obra.por("madeira", bloco(0.2, 3.6, 0.2, xt + sx * 0.9, 0, zt + sz * 0.9), c.escura, 0.08, 0);
  obra.por("madeira", new THREE.CylinderGeometry(1.25, 1.3, 2.0, 12).translate(xt, 4.6, zt), "#6a4e34", 0.1, 0);
  for (const y of [3.9, 5.3]) obra.por("ferro", new THREE.CylinderGeometry(1.32, 1.32, 0.08, 12, 1, true).translate(xt, y, zt), "#2c2a28", 0.04, 0);
  cobertura(t, c.telhadoMat === "palha" ? "madeira-escura" : c.telhadoMat, c.telhado, "quatro-aguas", 2.4, 2.4, 5.6, 0.7, { beiral: 0.1, espessura: 0.08, neve: c.neve, x: xt, z: zt });
  for (let i = 0; i < 3; i++) caixote(obra, L / 2 - 1.2 - i * 0.8, 0.5, F / 2 - 1.0, 0.7, r() * 0.3);
  return { corpo: [...mover(base.corpo), ...obra.pecas()], telhado: [...mover(base.telhado), ...t.pecas()], interior: mover(base.interior) };
}

/** Cata-vento de bomba d'água (deserto, serra, trincheira) ou roda d'água (mata, charco). */
function moinho(R: Regiao, p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(sem);
  const t = new Obra(sem + 1);
  if (R === "mata" || R === "charco") {
    const Lh = L * 0.6;
    const xh = -L / 2 + Lh / 2;
    const casinha = new Deslocada(obra, xh, 0, 0);
    const Ah = Math.min(A * 0.45, 4.5);
    tabuado(casinha, Lh, F, Ah, { tabua: c.parede, ripa: c.ripa }, r, undefined, { torto: R === "charco" ? 1 : 0 });
    portaDeTabua(casinha, "frente", Lh, F, 0, 1.0, 2.1, c.porta);
    const alto = Math.min(Lh, F) * 0.5;
    cobertura(t, R === "mata" ? "palha" : "madeira-escura", c.telhado, "duas-aguas", Lh, F, Ah, alto, { beiral: 0.5, espessura: R === "mata" ? 0.3 : 0.14, empenaNaFrente: true, x: xh });
    oitoes(obra, "madeira", c.ripa, Lh, F, Ah, alto, true, xh);
    // Roda d'água de pás, o eixo entrando na casa e a bica que a alimenta.
    const raio = Math.min(F / 2 - 0.3, A * 0.38);
    const xr = L / 2 - 0.6;
    const yr = raio + 0.3;
    for (const dx of [-0.35, 0.35]) obra.por("madeira", new THREE.TorusGeometry(raio, 0.08, 4, 18).rotateY(Math.PI / 2).translate(xr + dx, yr, 0), "#4a3a28", 0.1, 0);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      obra.por("madeira", bloco(0.8, 0.5, 0.06, 0, -0.25, 0).rotateX(a).translate(xr, yr + Math.cos(a) * raio, Math.sin(a) * raio), "#5a4630", 0.1, 0);
    }
    for (let i = 0; i < 4; i++) obra.por("madeira", bloco(0.1, raio * 2, 0.1, 0, -raio, 0).rotateX((i * Math.PI) / 4).translate(xr, yr, 0), "#4a3a28", 0.1, 0);
    obra.por("casca", tora(V(xh + Lh / 2 - 0.2, yr, 0), V(xr + 0.5, yr, 0), 0.15, 6), "#4a3a28", 0.1, 0);
    obra.por("madeira", bloco(0.6, 0.3, F * 0.45, xr, raio * 2 + 0.5, -F * 0.25), "#5a4630", 0.1, 0);
    obra.por("agua", bloco(0.4, 0.05, F * 0.45, xr, raio * 2 + 0.75, -F * 0.25), "#4a5a50", 0.04, 0);
    esteio(obra, xr, -F / 2 + 0.3, 0, raio * 2 + 0.5, 0.1, "#4a3a28");
    if (R === "charco") orelhas(obra, xr - 0.2, 0.3, F / 2 - 0.4, 3, r, sem + 2);
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  // Cata-vento: torre de quatro pés afunilada, roda de pás, leme e a caixa d'água ao lado.
  const madeira = R === "trincheira" ? "#3a3026" : R === "deserto" ? "#8a7258" : "#5a4630";
  const [bx, tx] = [Math.min(L, F) * 0.3, 0.45];
  const xT = -L * 0.12;
  const hT = A - 1.2;
  for (const [sx, sz] of QUINAS) obra.por("madeira", tora(V(xT + sx * bx, 0, sz * bx), V(xT + sx * tx, hT, sz * tx), 0.09, 4), madeira, 0.1, 0.2);
  for (let k = 1; k < 4; k++) {
    const y = (k * hT) / 4;
    const w = bx + (tx - bx) * (y / hT);
    for (const s of [-1, 1]) {
      obra.por("madeira", bloco(w * 2, 0.1, 0.1, xT, y, s * w), madeira, 0.1, 0);
      obra.por("madeira", bloco(0.1, 0.1, w * 2, xT + s * w, y, 0), madeira, 0.1, 0);
    }
  }
  obra.por("madeira", bloco(1.2, 0.12, 1.2, xT, hT, 0), madeira, 0.1, 0);
  const yc = A - 0.4;
  const rr = Math.min(2.2, L * 0.28);
  const quebrada = R === "trincheira";
  const corDaPa = R === "deserto" ? "#c8b898" : "#8a7a64";
  obra.por("ferro", new THREE.CylinderGeometry(0.15, 0.15, 0.9, 8).rotateX(Math.PI / 2).translate(xT, yc, 0.2), "#3a3430", 0.05, 0);
  for (let i = 0; i < 14; i++) {
    if (quebrada && r() < 0.45) continue;
    const a = (i / 14) * Math.PI * 2;
    obra.por("madeira", bloco(0.32, rr * 0.7, 0.03, 0, rr * 0.3, 0).rotateY(0.35).rotateZ(a).translate(xT, yc, 0.6), corDaPa, 0.1, 0);
  }
  obra.por("ferro", new THREE.TorusGeometry(rr * 0.98, 0.03, 3, 16).translate(xT, yc, 0.6), "#3a3430", 0.05, 0);
  obra.por("madeira", bloco(0.06, 0.06, 2.2, xT, yc, -1.0), madeira, 0.1, 0);
  obra.por("madeira", bloco(0.04, 1.0, 1.2, xT, yc - 0.5, -2.1), corDaPa, 0.1, 0);
  // Caixa d'água baixa e o cocho.
  const xc = L / 2 - 1.4;
  obra.por("madeira", new THREE.CylinderGeometry(1.1, 1.15, 1.4, 12).translate(xc, 0.7, F * 0.15), "#6a4e34", 0.1, 0.2);
  obra.por("ferro", new THREE.CylinderGeometry(1.17, 1.17, 0.07, 12, 1, true).translate(xc, 1.1, F * 0.15), "#2c2a28", 0.04, 0);
  obra.por("agua", new THREE.CircleGeometry(1.05, 12).rotateX(-Math.PI / 2).translate(xc, 1.3, F * 0.15), "#4a5a5a", 0.03, 0);
  obra.por("madeira", bloco(0.6, 0.45, 2.0, xc, 0, -F * 0.25), "#5a4430", 0.1, 0);
  if (c.neve) obra.por("neve", bloco(1.2, 0.06, 1.2, xT, hT + 0.12, 0), "#eef1f4", 0.03, 0);
  return { corpo: obra.pecas(), telhado: [], interior: [] };
}

/** Carvoaria: galpão no fundo, fornos de colmeia na frente e a chaminé de pedra. */
function fabrica(R: Regiao, p: PredioLocal, r: () => number, c: Cores, sem: number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const Fg = F * 0.5;
  const zg = -F / 2 + Fg / 2;
  const g = R === "trincheira" ? queimado({ ...p, fundo: Fg, entravel: false }, r, sem) : galpaoFechado(R, { ...p, fundo: Fg, altura: Math.min(A, 6) }, r, c, sem);
  const mover = (pp: Peca[]) => mexer(pp, (x) => x.translate(0, 0, zg));
  const obra = new Obra(sem + 70);
  const n = Math.max(2, Math.min(4, Math.floor(L / 5)));
  const rf = Math.min(2.2, L / (n * 2.4));
  for (const x of aoLongo(L, n, rf + 0.4)) {
    const z = F * 0.18;
    obra.por("tijolo", new THREE.SphereGeometry(rf, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 0, z), R === "trincheira" ? "#3a2e28" : "#8a5a42", 0.15, 0.2);
    obra.por("madeira-escura", bloco(0.9, 1.1, 0.3, x, 0, z + rf - 0.15), "#141010", 0.02, 0);
    obra.por("carvao", bloco(0.8, 0.3, 0.8, x, 0, z + rf + 0.3), "#1e1a18", 0.1, 0);
  }
  const hc = A * 2;
  obra.por(R === "deserto" ? "pedra-vermelha" : "pedra", bloco(1.4, hc, 1.4, L / 2 - 1.0, 0, -F / 2 + 1.0), R === "trincheira" ? "#3e3a36" : c.pedra, 0.12, 0.2);
  obra.por("pedra", bloco(1.7, 0.3, 1.7, L / 2 - 1.0, hc, -F / 2 + 1.0), "#4a4642", 0.1, 0);
  for (let i = 0; i < 2; i++) lenha(obra, -L / 2 + 2 + i * 2.5, F / 2 - 1.0, 2.0, 3, r);
  return { corpo: [...mover(g.corpo), ...obra.pecas()], telhado: mover(g.telhado), interior: mover(g.interior) };
}

// ---------------------------------------------------------------------------------------------
// Longe: volume, telhado e cor (nível 1)

function longe(R: Regiao, p: PredioLocal, c: Cores, r: () => number): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(1);
  const t = new Obra(2);
  const nome = `${p.id} ${p.nome}`.toLowerCase();
  const cimaDe = (tipo: "duas-aguas" | "quatro-aguas", l: number, f: number, base: number, alto: number, mat: NomeMaterial, cor: string, empenaNaFrente = false, z = 0) => {
    const gs = empenaNaFrente ? telhado(tipo, f, l, base, alto, 0.5, 0.15).map((g) => g.rotateY(Math.PI / 2)) : telhado(tipo, l, f, base, alto, 0.5, 0.15);
    t.por(mat, gs[0].translate(0, 0, z), cor, 0.1, 0);
    if (c.neve) t.por("neve", nevar(gs[0], c.neve, 0.1), "#eef1f4", 0.03, 0);
  };
  if (p.tipo === "tenda") {
    if (L >= 14 || F >= 14) {
      for (const [x, z, s] of [
        [0, -F * 0.28, 1],
        [-L * 0.37, -F * 0.3, 0.7],
        [L * 0.37, -F * 0.3, 0.7],
      ]) obra.por("lona", telhado("duas-aguas", F * 0.4 * s, L * 0.3 * s, 0, A * s, 0.1, 0.05)[0].rotateY(Math.PI / 2).translate(x, 0, z), c.lona, 0.1, 0);
      obra.por("casca", bloco(L, 2.4, 0.3, 0, 0, -F / 2 + 0.2), "#4a3e30", 0.1, 0);
    } else obra.por("lona", telhado("duas-aguas", F - 0.4, L - 2, 0, A, 0.1, 0.05)[0].rotateY(Math.PI / 2), R === "serra" ? "#7a6a52" : c.lona, 0.1, 0);
    return { corpo: obra.pecas(), telhado: [], interior: [] };
  }
  if (p.tipo === "ruina") {
    if (nome.includes("templo")) {
      obra.por("pedra-vermelha", bloco(L, 0.9, F, 0, 0, 0), "#8a5038", 0.1, 0);
      obra.por("cantaria", bloco(L - 4, A * 0.65, F - 9, 0, 0.9, -F / 2 + 1.8 + (F - 9) / 2), "#b08a66", 0.1, 0);
      for (const x of [-L * 0.3, -L * 0.18, L * 0.18, L * 0.3]) obra.por("cantaria", bloco(1.1, A * 0.6, 1.1, x, 0.9, F / 2 - 3.6), "#b08a66", 0.1, 0);
      return { corpo: obra.pecas(), telhado: [], interior: [] };
    }
    if (nome.includes("mina")) {
      obra.por(R === "deserto" ? "pedra-vermelha" : "pedra", bolha(1, 1, 0.2, 7, 1).scale(L * 0.5, A * 1.2, F * 0.5), R === "deserto" ? "#8a5038" : "#6a6866", 0.1, 0);
      obra.por("madeira-escura", bloco(4.4, 3.2, 0.3, 0, 0, F / 2 - 0.4), "#100e0c", 0.02, 0);
      return { corpo: obra.pecas(), telhado: [], interior: [] };
    }
    const cor = R === "deserto" ? "#a8785a" : R === "trincheira" ? "#2a2420" : R === "charco" ? "#626254" : "#80796e";
    const mat: NomeMaterial = R === "trincheira" ? "carvao" : R === "deserto" ? "pedra-vermelha" : "cantaria";
    for (const [w, d, x, z] of [
      [L, 0.5, 0, F / 2 - 0.25],
      [L, 0.5, 0, -F / 2 + 0.25],
      [0.5, F, -L / 2 + 0.25, 0],
      [0.5, F, L / 2 - 0.25, 0],
    ]) obra.por(mat, bloco(w, A * (0.4 + r() * 0.6), d, x, 0, z), cor, 0.12, 0);
    return { corpo: obra.pecas(), telhado: [], interior: [] };
  }
  if (p.tipo === "torre") {
    const madeira = R === "trincheira" ? "#3a3026" : "#5a4630";
    for (const [sx, sz] of QUINAS) obra.por("casca", bloco(0.3, A - 2, 0.3, sx * Math.min(L / 2 - 0.4, 2.4), 0, sz * Math.min(F / 2 - 0.4, 2.4)), madeira, 0.1, 0);
    const pw = Math.min(L, 5.6);
    obra.por("madeira", bloco(pw, 1.2, pw, 0, A - 2, 0), madeira, 0.1, 0);
    if (R === "deserto") t.por("lona", bloco(pw + 0.6, 0.1, pw + 0.6, 0, A + 0.2, 0), c.lona, 0.1, 0);
    else cimaDe("quatro-aguas", pw, pw, A + 0.2, pw * 0.4, R === "mata" ? "palha" : c.telhadoMat, c.telhado);
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  if (p.tipo === "moinho") {
    const lado = Math.min(L, F) * 0.4;
    obra.por("madeira", bloco(lado, A, lado, -L * 0.12, 0, 0), "#5a4630", 0.1, 0);
    obra.por("madeira", new THREE.CylinderGeometry(Math.min(2.2, L * 0.28), Math.min(2.2, L * 0.28), 0.1, 10).rotateX(Math.PI / 2).translate(-L * 0.12, A - 0.4, lado / 2 + 0.2), "#8a7a64", 0.1, 0);
    return { corpo: obra.pecas(), telhado: [], interior: [] };
  }
  if (p.tipo === "igreja" && R === "trincheira" && L >= 16) {
    const Ln = Math.min(11, L * 0.55);
    obra.por("cantaria", bloco(Ln, A, F * 0.85, 0, 0, F * 0.075), "#6f6b64", 0.08, 0);
    obra.por("cantaria", bloco((L - Ln) / 2 - 1, Math.min(A * 0.75, 7), F * 0.7, -L / 2 + ((L - Ln) / 2 - 1) / 2, 0, -F * 0.15), "#6f6b64", 0.08, 0);
    cimaDe("duas-aguas", Ln, F * 0.85, A, Ln * 0.42, "telha-escura", "#34302c", true, F * 0.075);
    obra.por("cantaria", bloco(3.6, 3.2, 0.6, 0, A + Ln * 0.42 - 0.4, F / 2 - 0.3), "#6f6b64", 0.08, 0);
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  // Casas e o resto: volume na cor da região e o telhado da região.
  const dy = R === "charco" && !p.entravel ? 1.3 : R === "mata" && !p.entravel ? 0.5 : 0;
  if (dy) obra.por("casca", bloco(L * 0.85, dy, F * 0.85, 0, 0, 0), "#3a3428", 0.1, 0);
  const igrejaDePedra = p.tipo === "igreja" && (R === "trincheira" || R === "serra");
  const material: NomeMaterial = igrejaDePedra ? "cantaria" : R === "deserto" ? "reboco" : R === "serra" ? "casca" : R === "trincheira" ? "madeira-escura" : "madeira";
  const corDaParede = igrejaDePedra ? (R === "serra" ? c.pedra : "#6f6b64") : c.parede;
  const ins = R === "trincheira" && !igrejaDePedra ? 1.3 : 0;
  obra.por(material, bloco(L - ins, A - dy, F - ins, 0, dy, 0), corDaParede, 0.1, 0);
  if (ins) obra.por("lona", bloco(L, 1.0, F, 0, 0, 0), c.lona, 0.1, 0);
  if (R === "serra" || R === "deserto") obra.por(c.pedraMat, bloco(L + 0.05, 0.5, F + 0.05, 0, 0, 0), c.pedra, 0.1, 0);
  if (R === "deserto" && p.tipo !== "igreja") t.por("terra", bloco(L, 0.5, F, 0, A, 0), "#9a7a58", 0.1, 0);
  else if (ins) t.por("terra", bloco(L - ins + 0.4, 0.6, F - ins + 0.4, 0, A, 0), "#3a3028", 0.1, 0);
  else {
    const igreja = p.tipo === "igreja";
    const alto = igreja ? L * 0.42 : Math.min(L, F) * (R === "charco" ? 0.26 : R === "mata" || R === "serra" ? 0.5 : 0.32);
    const mat: NomeMaterial = R === "mata" ? "palha" : igreja && R !== "charco" ? (R === "deserto" ? "madeira" : "telha-escura") : c.telhadoMat;
    cimaDe("duas-aguas", L, F, A, alto, mat, igreja && R === "trincheira" ? "#34302c" : c.telhado, igreja || R === "mata" || R === "serra");
  }
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

// ---------------------------------------------------------------------------------------------

export function gerarErmos(p: PredioLocal, nivel: NivelPredio, semente: number): PecasDoPredio {
  const R = REGIOES[p.lugar] ?? "mata";
  const r = sorteio(semente);
  const c = paleta(R, r);
  if (nivel === 1) return longe(R, p, c, r);
  const sem = Math.floor(r() * 1e6);
  switch (p.tipo) {
    case "comercio":
    case "saloon":
    case "hotel":
      return casa(R, p, r, c, sem, { loja: true });
    case "publico":
    case "banco":
      return casa(R, p, r, c, sem, { loja: true, grade: true });
    case "igreja":
      return capela(R, p, r, c, sem);
    case "estacao":
      return estacao(R, p, r, c, sem);
    case "galpao":
      return galpao(R, p, r, c, sem);
    case "fazenda":
      return fazenda(R, p, r, c, sem);
    case "moinho":
      return moinho(R, p, r, c, sem);
    case "fabrica":
      return fabrica(R, p, r, c, sem);
    case "torre":
      return vigia(R, p, r, c, sem);
    case "tenda":
      return tenda(R, p, r, c, sem);
    case "ruina":
      return ruina(R, p, r, c, sem);
    default:
      return casa(R, p, r, c, sem);
  }
}

const estilo: Estilo = { id: "ermos", nome: "Construções dos ermos (regiões)", gerar: gerarErmos };

export default estilo;
