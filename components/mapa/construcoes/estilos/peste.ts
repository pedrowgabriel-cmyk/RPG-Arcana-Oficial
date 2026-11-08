// Vila abandonada pela peste (Desemboque): casario colonial inteiro, mas largado.
// Cal amarelada e manchada de umidade, reboco caído mostrando o tijolo, janelas e portas
// pregadas com tábua, cruz de alerta pintada de vermelho nas portas, telhas faltando
// (o ripado aparece), mato nas calhas, carroças largadas na frente. Igreja fechada,
// casa do coveiro ainda em uso, tenda de quarentena.

import * as THREE from "three";
import { bolha, sorteio } from "../../natureza/ferramentas";
import type { NomeMaterial } from "../../natureza/tipos";
import { aoLongo, barradoECunhais, bloco, chamine, cimalha, empenas, janela, malha, naFace, Obra, paredes, porta, sacada, telhado, type Face, type TipoTelhado } from "../kit";
import type { Estilo, NivelPredio, PecasDoPredio, PredioLocal } from "../tipos";
import { caibro, entulho, frontao, moita, ObraVelha, perfilQuebrado, porParede, torreBarroca, trepadeira, type Vao } from "./_barroco-queimado-pecas";

const CAL = ["#d2bf93", "#cdb586", "#d8c7a0", "#c4b08a", "#cbb991", "#c9bba2"];
const BARRADO = ["#6b5a3e", "#5e5a48", "#7a4a32", "#4e5a52", "#6a4a3a", "#55604e"];
const MADEIRA = ["#6e6252", "#7a6c5a", "#655a4c", "#80705c"];
const PORTA = ["#4e4034", "#5a4a3a", "#3e4440", "#5a3a2e"];
const TELHA = ["#7e4a36", "#74463a", "#865240", "#6e4a3c"];
const MATO = ["#7a7444", "#6e6a3c", "#857a48", "#5e6236", "#55602f"];
const VERMELHO = "#8e1c16";
const FRISO = "#d8ccb0";
const BURACO = "#1a1512";

type Cores = { cal: string; barrado: string; madeira: string; porta: string; telha: string };

function paleta(r: () => number): Cores {
  const de = (l: string[]) => l[Math.floor(r() * l.length)];
  return { cal: de(CAL), barrado: de(BARRADO), madeira: de(MADEIRA), porta: de(PORTA), telha: de(TELHA) };
}

const ALTURA_DO_PAVIMENTO = 3.6;
const PORTA_DE_ENTRAR = { largura: 4.2, altura: 3 };
const FACES: Face[] = ["frente", "direita", "fundos", "esquerda"];
const comp = (f: Face, L: number, F: number) => (f === "frente" || f === "fundos" ? L : F);

// ---------------------------------------------------------------------------
// Peças da peste

/** Barrado e cunhais do jeito mineiro, mas com o barrado aberto no vão de entrar. */
function barrado(obra: Obra, L: number, F: number, A: number, cor: string, entravel: boolean, alto = 0.7, cunhal = 0.35) {
  if (!entravel) return barradoECunhais(obra, L, F, A, cor, alto, cunhal);
  const s = 0.03;
  obra.por("reboco", bloco(L + s * 2, alto, 0.12, 0, 0, -F / 2 + 0.03), cor, 0.05, 0.3);
  for (const sx of [-1, 1]) obra.por("reboco", bloco(0.12, alto, F, sx * (L / 2 - 0.03), 0, 0), cor, 0.05, 0.3);
  const lado = (L - PORTA_DE_ENTRAR.largura) / 2;
  for (const sx of [-1, 1]) obra.por("reboco", bloco(lado + s, alto, 0.12, sx * (PORTA_DE_ENTRAR.largura / 2 + lado / 2 + s / 2), 0, F / 2 - 0.03), cor, 0.05, 0.3);
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ])
    obra.por("reboco", bloco(cunhal, A, cunhal, x * (L / 2 - cunhal / 2 + s), 0, z * (F / 2 - cunhal / 2 + s)), cor, 0.05, 0.2);
}

/** Cruz de alerta pintada: "+" ou "X", com escorrido de tinta. */
function cruzVermelha(obra: Obra, f: Face, L: number, F: number, u: number, y: number, tamanho: number, r: () => number, material: NomeMaterial = "reboco", afasta = 0.08) {
  const x = r() < 0.35;
  const e = tamanho * 0.16;
  for (const giro of x ? [Math.PI / 4, -Math.PI / 4] : [0, Math.PI / 2]) {
    const g = bloco(e, tamanho, 0.02, 0, -tamanho / 2, 0).rotateZ(giro + (r() - 0.5) * 0.12);
    obra.por(material, naFace(g, f, L, F, u, y + tamanho / 2, afasta), VERMELHO, 0.15, 0);
  }
  // Escorrido.
  for (let i = 0; i < 2; i++) obra.por(material, naFace(bloco(0.04, tamanho * (0.2 + r() * 0.3), 0.02, (r() - 0.5) * tamanho * 0.4, -tamanho * (0.2 + r() * 0.3), 0), f, L, F, u, y, afasta), VERMELHO, 0.15, 0);
}

/** Tábuas pregadas atravessando um vão (janela ou porta). */
function tabuas(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, h: number, cor: string, r: () => number, n = 3) {
  for (let i = 0; i < n; i++) {
    const giro = (r() - 0.5) * (i === n - 1 && r() < 0.5 ? 0.9 : 0.3);
    const yy = y + h * ((i + 0.6) / (n + 0.2));
    obra.por("madeira", naFace(bloco(w + 0.45, 0.2, 0.05, 0, -0.1, 0).rotateZ(giro), f, L, F, u + (r() - 0.5) * 0.1, yy, 0.14), cor, 0.15, 0);
  }
}

/** Janela pregada (ou de veneziana caída, pendurada torta). */
function janelaLargada(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, h: number, cor: Cores, r: () => number) {
  if (r() < 0.75) {
    janela(obra, f, L, F, u, y, w, h, { fechada: cor.porta, moldura: FRISO });
    tabuas(obra, f, L, F, u, y, w, h, cor.madeira, r, 2 + Math.floor(r() * 2));
  } else {
    janela(obra, f, L, F, u, y, w, h, { moldura: FRISO });
    // Uma folha de veneziana pendurada por uma dobradiça só.
    const g = bloco(w / 2, h * 0.95, 0.05, w / 4, -h * 0.95, 0).rotateZ(0.35 + r() * 0.3);
    obra.por("madeira", naFace(g, f, L, F, u + w / 2 + 0.1, y + h, 0.08), cor.porta, 0.1, 0);
  }
}

/** Porta fechada com tábuas em X e a cruz vermelha; no entrável, arrombada. */
function portaLargada(obra: Obra, f: Face, L: number, F: number, u: number, w: number, h: number, cor: Cores, r: () => number, entravel: boolean) {
  if (entravel) {
    porta(obra, f, L, F, u, w, h, cor.porta, true, FRISO);
    // Cruz pintada na parede ao lado e as tábuas arrancadas no chão.
    cruzVermelha(obra, f, L, F, u + (r() < 0.5 ? -1 : 1) * (w / 2 + 0.75), 1.3, 0.9, r);
    for (let i = 0; i < 2; i++) obra.por("madeira", naFace(bloco(w * 0.5, 0.05, 0.2, 0, 0, 0).rotateY((r() - 0.5) * 1.2), f, L, F, u + (r() - 0.5) * w * 0.6, 0.02, 0.8 + r() * 0.8), cor.madeira, 0.12, 0);
    return;
  }
  porta(obra, f, L, F, u, w, h, cor.porta, false, FRISO);
  for (const s of [-1, 1]) obra.por("madeira", naFace(bloco(Math.hypot(w, h) * 0.95, 0.2, 0.05, 0, -0.1, 0).rotateZ(s * Math.atan2(h, w)), f, L, F, u, h / 2, 0.12), cor.madeira, 0.15, 0);
  cruzVermelha(obra, f, L, F, u, h * 0.35, Math.min(w, 1.2) * 0.9, r, "madeira", 0.16);
}

/** Reboco caído mostrando o tijolo de adobe. */
function descascado(obra: Obra, L: number, F: number, A: number, r: () => number, n: number, entravel = false) {
  for (let i = 0; i < n; i++) {
    const f = FACES[Math.floor(r() * 4)];
    const c = comp(f, L, F);
    const w = 0.5 + r() * 1.2;
    const h = 0.4 + r() * 0.9;
    if (entravel && f === "frente") continue;
    obra.por("tijolo", naFace(bloco(w, h, 0.02, 0, 0, 0), f, L, F, (r() - 0.5) * (c - w - 1), 0.8 + r() * Math.max(0.2, A - h - 1.6), 0.012), r() < 0.5 ? "#8a5a42" : "#9a6a4a", 0.15, 0);
  }
}

/** Telhado com telha faltando (o ripado à mostra) e mato na calha. Vai em `telhado`. */
function telhadoLargado(t: Obra, tipo: TipoTelhado, L: number, F: number, A: number, alto: number, cor: string, r: () => number, buracos: number) {
  const b = 0.7;
  for (const g of telhado(tipo, L, F, A, alto, b)) t.por("telha", g, cor, 0.16, 0);
  if (tipo !== "duas-aguas" && tipo !== "quatro-aguas") return;
  const meia = (tt: number) => (tipo === "duas-aguas" ? L / 2 + b : L >= F ? L / 2 + b - tt * (F / 2 + b) : (L / 2 + b) * (1 - tt));
  const naAgua = (x: number, tt: number, s: number, sobe = 0.06) => new THREE.Vector3(x, A + alto * tt + sobe, s * (F / 2 + b) * (1 - tt));
  for (let i = 0; i < buracos; i++) {
    const s = r() < 0.65 ? 1 : -1;
    const t0 = 0.12 + r() * 0.4;
    const t1 = Math.min(0.88, t0 + 0.18 + r() * 0.25);
    const w = 0.8 + r() * 1.6;
    const livre = meia(t1) - w / 2 - 0.4;
    if (livre <= 0) continue;
    const x = (r() * 2 - 1) * livre;
    const q = [naAgua(x - w / 2, t0, s), naAgua(x + w / 2, t0, s), naAgua(x + w / 2, t1, s), naAgua(x - w / 2, t1, s)];
    t.por("madeira-escura", malha(q, s > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]), BURACO, 0.05, 0);
    for (let k = 1; k <= 2; k++) {
      const p = naAgua(x, t0 + ((t1 - t0) * k) / 3, s, 0.1);
      t.por("madeira", bloco(w + 0.3, 0.05, 0.07, p.x, p.y, p.z), "#6a5a48", 0.1, 0);
    }
  }
}

/** Tufos de mato na calha, posicionados (separado para não poluir a função acima). */
function matoNaCalha(t: Obra, L: number, F: number, A: number, alto: number, tipo: TipoTelhado, r: () => number) {
  const b = 0.7;
  const meia = (tt: number) => (tipo === "duas-aguas" ? L / 2 + b : L >= F ? L / 2 + b - tt * (F / 2 + b) : (L / 2 + b) * (1 - tt));
  for (let i = 0; i < 2 + Math.floor(r() * 4); i++) {
    const s = r() < 0.6 ? 1 : -1;
    const tt = 0.06;
    const x = (r() * 2 - 1) * Math.max(0.5, meia(tt) - 1);
    const g = bolha(1, 0, 0.5, Math.floor(r() * 1e5), 1).scale(0.3 + r() * 0.45, 0.18 + r() * 0.14, 0.25);
    t.por("musgo", g.translate(x, A + alto * tt + 0.06, s * (F / 2 + b) * (1 - tt)), MATO[Math.floor(r() * MATO.length)], 0.2, 0);
  }
}

/** Carroça largada: caixa de tábua, rodas de raio, lança no chão; às vezes de roda quebrada. */
function carroca(obra: Obra, x: number, z: number, giro: number, r: () => number) {
  const quebrada = r() < 0.45;
  const mad = MADEIRA[Math.floor(r() * MADEIRA.length)];
  const lista: [NomeMaterial, THREE.BufferGeometry, string, boolean?][] = [];
  const y = 0.85;
  lista.push(["madeira", bloco(1.3, 0.1, 2.6, 0, y, 0), mad]);
  for (const s of [-1, 1]) lista.push(["madeira", bloco(0.06, 0.45, 2.6, s * 0.65, y + 0.1, 0), mad]);
  lista.push(["madeira", bloco(1.3, 0.45, 0.06, 0, y + 0.1, -1.27), mad]);
  lista.push(["madeira-escura", bloco(1.7, 0.1, 0.1, 0, 0.58, 0.35), "#3e352c"]);
  const roda = () => {
    const g: THREE.BufferGeometry[] = [new THREE.TorusGeometry(0.58, 0.05, 4, 12)];
    for (let k = 0; k < 3; k++) g.push(bloco(0.05, 1.12, 0.05, 0, -0.56, 0).rotateZ((k * Math.PI) / 3));
    return g;
  };
  for (const s of [-1, 1]) {
    for (const g of roda()) {
      if (quebrada && s > 0) lista.push(["madeira", g.rotateX(Math.PI / 2).translate(1.5, 0.06, 0.9), "#5a4e40", true]);
      else lista.push(["madeira", g.rotateY(Math.PI / 2).translate(s * 0.82, 0.6, 0.35), "#5a4e40"]);
    }
  }
  lista.push(["madeira", caibro(new THREE.Vector3(0, 0.75, 1.3), new THREE.Vector3(0.25, 0.06, 3.3), 0.1), mad]);
  // Pano largado na borda.
  if (r() < 0.6) lista.push(["lona", bloco(0.9, 0.03, 1.3, 0, 0, 0).rotateZ(-0.9).translate(-0.72, y + 0.3, -0.3), r() < 0.5 ? "#b8aa8a" : "#7e3a2a"]);
  for (const [m, g, c, solto] of lista) {
    // Sem a roda direita, a carroça tomba para aquele lado.
    if (quebrada && !solto) g.rotateZ(-0.16).translate(0, -0.05, 0);
    obra.por(m, g.rotateY(giro).translate(x, 0, z), c, 0.12, 0);
  }
}

/** Barril e baú largados. */
function tralha(obra: Obra, x: number, z: number, r: () => number) {
  if (r() < 0.5) obra.por("madeira", new THREE.CylinderGeometry(0.32, 0.32, 0.8, 8).rotateZ(r() < 0.5 ? Math.PI / 2 : 0).translate(x, 0.32, z), "#6a5440", 0.12, 0.2);
  else obra.por("madeira", bloco(0.9, 0.55, 0.55, x, 0, z).rotateY(r()), "#5a4634", 0.12, 0.2);
}

/** Caixão de seis lados. */
function caixao(comprimento = 1.95, largura = 0.6, altura = 0.42) {
  const ombro = comprimento * 0.25;
  const contorno = [
    [largura * 0.35, -comprimento / 2],
    [largura / 2, -comprimento / 2 + ombro * 2.4],
    [largura * 0.38, comprimento / 2],
    [-largura * 0.38, comprimento / 2],
    [-largura / 2, -comprimento / 2 + ombro * 2.4],
    [-largura * 0.35, -comprimento / 2],
  ];
  const forma = new THREE.Shape(contorno.map(([a, b]) => new THREE.Vector2(a, b)));
  const g = new THREE.ExtrudeGeometry(forma, { depth: altura, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
  return g;
}

/** Mato seco no pé das paredes e trepadeira subindo. */
function matoEmVolta(obra: ObraVelha, L: number, F: number, A: number, r: () => number, quanto = 1, entravel = false) {
  const [f0, u0] = [obra.fuligem, obra.umidade];
  obra.fuligem = obra.umidade = 0;
  for (let i = 0; i < Math.round((3 + r() * 3) * quanto); i++) {
    const f = FACES[Math.floor(r() * 4)];
    const c = comp(f, L, F);
    const g = bolha(1, 0, 0.5, Math.floor(r() * 1e5), 1).scale(0.5 + r() * 0.8, 0.35 + r() * 0.4, 0.4);
    let u = (r() - 0.5) * c * 0.9;
    if (entravel && f === "frente" && Math.abs(u) < 2.8) u = (u < 0 ? -1 : 1) * Math.min(c / 2 - 0.5, 2.8 + r());
    obra.por("musgo", naFace(g.translate(0, 0.2, 0.25), f, L, F, u, 0), MATO[Math.floor(r() * MATO.length)], 0.2, 0.2);
  }
  if (r() < 0.6 * quanto) {
    const f = FACES[1 + Math.floor(r() * 3)];
    const c = comp(f, L, F);
    const h = A * (0.5 + r() * 0.45);
    trepadeira(obra, f, L, F, (r() - 0.5) * c * 0.7, A - h - 0.1, h, 1 + r() * 1.6, Math.floor(r() * 1e5), "#4e5a30");
  }
  obra.fuligem = f0;
  obra.umidade = u0;
}

// ---------------------------------------------------------------------------
// Casa e derivados

type OpcoesCasa = { telhado?: TipoTelhado; sacadas?: boolean; grade?: boolean; carroca?: boolean; semCruz?: boolean };

function casa(p: PredioLocal, r: () => number, cor: Cores, o: OpcoesCasa = {}): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const pavimentos = A >= 6.4 ? 2 : 1;
  const obra = new ObraVelha(Math.floor(r() * 1e6), 0.1, 0.32);
  paredes(obra, L, F, A, "reboco", cor.cal, p.entravel ? PORTA_DE_ENTRAR : undefined);
  barrado(obra, L, F, A, cor.barrado, p.entravel);
  cimalha(obra, L, F, A, FRISO);
  if (pavimentos === 2) obra.por("reboco", bloco(L + 0.12, 0.2, F + 0.12, 0, ALTURA_DO_PAVIMENTO, 0), FRISO, 0.04, 0);
  // Fachada: porta no meio, janelas pregadas.
  const vaos = Math.max(1, Math.floor((L - 1.6) / 2.4));
  const posicoes = aoLongo(L, vaos, 1.3);
  const meio = Math.floor(vaos / 2);
  posicoes.forEach((u, i) => {
    if (i === meio) {
      if (!o.semCruz) portaLargada(obra, "frente", L, F, p.entravel ? 0 : u, p.entravel ? PORTA_DE_ENTRAR.largura : 1.2, p.entravel ? PORTA_DE_ENTRAR.altura : 2.5, cor, r, p.entravel);
      else porta(obra, "frente", L, F, p.entravel ? 0 : u, p.entravel ? PORTA_DE_ENTRAR.largura : 1.2, p.entravel ? PORTA_DE_ENTRAR.altura : 2.5, cor.porta, p.entravel, FRISO);
    } else if (!p.entravel || Math.abs(u) > PORTA_DE_ENTRAR.largura / 2 + 0.9) janelaLargada(obra, "frente", L, F, u, 1.0, 1.0, 1.55, cor, r);
  });
  for (let andar = 1; andar < pavimentos; andar++) {
    const y = andar * ALTURA_DO_PAVIMENTO + 0.4;
    posicoes.forEach((u) => {
      if (o.sacadas && r() < 0.7) sacada(obra, "frente", L, F, u, y - 0.1, 1.5, "#3a2a22");
      janelaLargada(obra, "frente", L, F, u, y, 1.0, o.sacadas ? 2.0 : 1.55, cor, r);
    });
  }
  for (const f of ["esquerda", "direita", "fundos"] as Face[]) {
    const c = comp(f, L, F);
    for (const u of aoLongo(c, Math.max(0, Math.floor((c - 2) / 4.5)), 1.6))
      for (let andar = 0; andar < pavimentos; andar++) if (r() > 0.3) janelaLargada(obra, f, L, F, u, 1.0 + andar * ALTURA_DO_PAVIMENTO, 0.9, 1.4, cor, r);
  }
  if (o.grade) for (const u of posicoes) if (Math.abs(u) > 2.6) for (let i = 1; i < 5; i++) obra.por("ferro", naFace(bloco(0.03, 1.55, 0.03, -0.5 + i * 0.2, 0, 0.2), "frente", L, F, u, 1.0), "#2a2622", 0.02, 0);
  descascado(obra, L, F, A, r, 2 + Math.floor(r() * 4), !!p.entravel);
  // Telhado velho.
  const tipo = o.telhado ?? (r() < 0.6 ? "quatro-aguas" : "duas-aguas");
  const t = new ObraVelha(7, 0, 0.15);
  const alto = Math.min(L, F) * (0.26 + r() * 0.08);
  telhadoLargado(t, tipo, L, F, A, alto, cor.telha, r, 1 + Math.floor(r() * 3));
  matoNaCalha(t, L, F, A, alto, tipo, r);
  if (tipo === "duas-aguas") for (const g of empenas(L, F, A, alto)) obra.por("reboco", g, cor.cal);
  if (r() < 0.4) chamine(obra, (r() - 0.5) * L * 0.5, -F * 0.2, A, alto + 0.6, "#7a6050");
  matoEmVolta(obra, L, F, A, r, 1, !!p.entravel);
  const corpo = obra.pecas();
  if (o.carroca ?? (!p.entravel && r() < 0.22 && L >= 7)) {
    const c = new Obra(Math.floor(r() * 1e5));
    const s = r() < 0.5 ? -1 : 1;
    carroca(c, s * (L / 2 - 2.2), F / 2 + 1.3, Math.PI / 2 + (r() - 0.5) * 0.4 + (s > 0 ? Math.PI : 0), r);
    tralha(c, -s * (L / 2 - 1.2), F / 2 + 0.6, r);
    corpo.push(...c.pecas());
  }
  return { corpo, telhado: t.pecas(), interior: interior(p, r) };
}

function interior(p: PredioLocal, r: () => number) {
  if (!p.entravel) return [];
  const o = new ObraVelha(3, 0, 0.2);
  const { largura: L, fundo: F } = p;
  o.por("madeira", bloco(L - 0.8, 0.08, F - 0.8, 0, 0.02, 0), "#7a6a52", 0.1, 0);
  // Mesa tombada, cadeira caída, cama de doente com lençol e um caixão.
  o.por("madeira", bloco(1.6, 0.08, 0.9, 0, 0, 0).translate(0, 0.45, 0).rotateZ(1.35).translate(-L * 0.2, 0, -F * 0.1), "#5a4430", 0.1, 0);
  o.por("madeira", bloco(0.45, 0.9, 0.45, L * 0.05, 0, F * 0.05).rotateX(1.4).translate(0, 0.25, 0), "#5a4430", 0.1, 0);
  o.por("madeira", bloco(1.0, 0.45, 2.0, L / 2 - 1.1, 0, -F / 2 + 1.5), "#5a4430", 0.1, 0);
  o.por("lona", bloco(0.95, 0.12, 1.9, L / 2 - 1.1, 0.45, -F / 2 + 1.5), "#d6ccb4", 0.1, 0);
  o.por("madeira", caixao().translate(-L / 2 + 1.2, 0.02, -F / 2 + 1.6), "#4a3626", 0.1, 0);
  if (r() < 0.5) o.por("madeira", bloco(L * 0.45, 1.05, 0.7, 0, 0, -F / 2 + 1.0), "#5a4430", 0.1, 0);
  return o.pecas();
}

function comercio(p: PredioLocal, r: () => number, cor: Cores, letreiro: string): PecasDoPredio {
  const base = casa(p, r, cor);
  const entravel = !!p.entravel;
  const o = new Obra(11);
  const { largura: L, fundo: F, altura: A } = p;
  // Toldo rasgado: tiras de lona caídas.
  const w = Math.min(L - 1, 6);
  const tiras = 4 + Math.floor(r() * 3);
  for (let i = 0; i < tiras; i++) {
    if (r() < 0.3) continue;
    const u = -w / 2 + (w / tiras) * (i + 0.5);
    const caida = entravel ? r() * 0.15 : r();
    const g = malha([new THREE.Vector3(-w / tiras / 2, 0.6, 0), new THREE.Vector3(w / tiras / 2, 0.6, 0), new THREE.Vector3(w / tiras / 2, -caida * 1.2, 1.4 - caida), new THREE.Vector3(-w / tiras / 2, -caida * 1.2, 1.4 - caida)], [0, 3, 2, 0, 2, 1, 0, 1, 2, 0, 2, 3]);
    o.por("lona", naFace(g, "frente", L, F, u, entravel ? 3.3 : 2.9, 0.05), r() < 0.5 ? "#a89a7a" : "#7a3a2c", 0.15, 0);
  }
  // Placa despencada de um lado.
  o.por("madeira", naFace(bloco(Math.min(L * 0.55, 5), 0.7, 0.08, 0, -0.35, 0.06).rotateZ((r() < 0.5 ? -1 : 1) * (entravel ? 0.04 : 0.12 + r() * 0.15)), "frente", L, F, 0, Math.max(entravel ? 3.75 : 0, Math.min(A - 0.6, 4.1))), letreiro, 0.1, 0);
  return { ...base, corpo: [...base.corpo, ...o.pecas()] };
}

/** Alpendre com uma parte desabada: o telhado da ponta caiu até o chão. */
function alpendreCaido(obra: Obra, L: number, F: number, prof: number, h: number, cor: Cores, r: () => number, entravel: boolean) {
  const n = Math.max(3, Math.floor(L / 3));
  const posts = aoLongo(L * 0.92, n, 0.2);
  const caiu = r() < 0.5 ? -1 : 1;
  const corte = caiu * L * 0.18;
  obra.por("madeira", naFace(bloco(L * 0.92, 0.25, prof, 0, 0, prof / 2), "frente", L, F, 0, 0), cor.madeira, 0.12, 0.3);
  for (const u of posts) {
    const naParteCaida = caiu > 0 ? u > corte : u < corte;
    if (entravel && Math.abs(u) < 2.4) continue;
    if (naParteCaida) obra.por("madeira", naFace(bloco(2.6, 0.2, 0.2, 0, 0, 0).rotateY(r() * 2), "frente", L, F, u, 0.3, prof * 0.6), cor.madeira, 0.12, 0);
    else obra.por("madeira", naFace(bloco(0.2, h, 0.2, 0, 0, 0), "frente", L, F, u, 0.25, prof - 0.2), cor.madeira, 0.12, 0);
  }
  // Cobertura: parte inteira em uma água; parte caída inclinada até o chão.
  const ini = -L * 0.46;
  const fim = L * 0.46;
  const [a0, a1] = caiu > 0 ? [ini, corte] : [corte, fim];
  const [c0, c1] = caiu > 0 ? [corte, fim] : [ini, corte];
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const zf = F / 2;
  obra.por("telha", malha([v(a0, h + 0.3, zf + prof + 0.3), v(a1, h + 0.3, zf + prof + 0.3), v(a1, h + 0.9, zf), v(a0, h + 0.9, zf)], [0, 1, 2, 0, 2, 3]), cor.telha, 0.14, 0);
  obra.por("telha", malha([v(c0, 0.3, zf + prof + 0.2), v(c1, 0.3, zf + prof + 0.2), v(c1, h + 0.9, zf), v(c0, h + 0.9, zf)], [0, 1, 2, 0, 2, 3]), cor.telha, 0.14, 0);
}

// ---------------------------------------------------------------------------
// Igreja fechada

function igreja(p: PredioLocal, r: () => number, cor: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new ObraVelha(Math.floor(r() * 1e6), 0.08, 0.3);
  const e = 0.6;
  const branco = r() < 0.5 ? "#ddd2b8" : "#d6c8a6";
  const cantaria = "#9a8e72";
  const temTorre = L >= 12;
  const lado = Math.max(3, L * 0.26);
  // Entrável: a torre vai para o canto dos fundos e a porta fica no meio da fachada.
  const atras = temTorre && !!p.entravel;
  const Lf = temTorre && !atras ? L - lado : L;
  const desloca = temTorre && !atras ? -lado / 2 : 0;
  // Fachada com frontão em curva, porta e óculo; a torre fica ao lado (como na tela).
  const alto = Math.min(4.5, Lf * 0.42);
  const perfil = frontao(Lf, A, alto, () => 0.9);
  const vaoPorta: Vao = p.entravel ? { u: 0, y: 0, w: 4.4, h: Math.max(3.05, Math.min(4.0, A - 0.4)), flecha: Math.min(0.9, Math.max(0, A - 3.45)) } : { u: 0, y: 0, w: 2.2, h: Math.min(3.6, A - 0.4), flecha: 0.6 };
  const fach = new ObraVelha(41, 0.06, 0.3);
  const vaos: Vao[] = [vaoPorta, { u: 0, y: A + 0.2, w: 1.1, h: 1.1, flecha: 0, oculo: true }];
  if (Lf >= 8) for (const s of [-1, 1]) vaos.push({ u: s * Lf * 0.3, y: A * 0.5, w: 1.0, h: 1.9, flecha: 0.3 });
  const ok = porParede(fach, "frente", Lf, F, perfil, vaos, "reboco", branco, { cor: cantaria, largura: 0.24 }, e);
  for (const s of [-1, 1]) fach.por("cantaria", naFace(bloco(0.5, A, 0.16, s * (Lf / 2 - 0.25), 0, 0.08), "frente", Lf, F, 0, 0), cantaria, 0.05, 0.2);
  fach.por("cantaria", naFace(bloco(Lf + 0.3, 0.35, 0.3, 0, 0, 0.15), "frente", Lf, F, 0, A), cantaria, 0.05, 0);
  // Porta: folhas pregadas e cruz grande; ou arrombada.
  if (p.entravel) {
    for (let i = 0; i < 3; i++) fach.por("madeira", naFace(bloco(2.2, 0.05, 0.22, 0, 0, 0).rotateY((r() - 0.5) * 1.4), "frente", Lf, F, (r() - 0.5) * 3, 0.03, 1 + r() * 1.5), cor.madeira, 0.12, 0);
    cruzVermelha(fach, "frente", Lf, F, vaoPorta.w / 2 + 0.9, 1.5, 1.0, r);
  } else {
    fach.por("madeira", naFace(bloco(vaoPorta.w, vaoPorta.h, 0.08, 0, 0, -0.2), "frente", Lf, F, 0, 0), cor.porta, 0.08, 0);
    tabuas(fach, "frente", Lf, F, 0, 0.4, vaoPorta.w, vaoPorta.h - 0.6, cor.madeira, r, 3);
    cruzVermelha(fach, "frente", Lf, F, 0, 0.9, 1.6, r, "madeira", 0.2);
  }
  for (const v of ok) if (v.y > 0.01 && !v.oculo) tabuas(fach, "frente", Lf, F, v.u, v.y, v.w, v.h, cor.madeira, r, 2);
  fach.por("ferro", bloco(0.1, 1.3, 0.1, 0, A + 0.2 + alto * 0.85 + 0.6, F / 2 - 0.3), "#2c2a28", 0.02, 0);
  fach.por("ferro", bloco(0.6, 0.1, 0.1, 0, A + 0.2 + alto * 0.85 + 1.3, F / 2 - 0.3), "#2c2a28", 0.02, 0);
  const pecasFachada = fach.pecas().map((pc) => ({ ...pc, geometria: pc.geometria.translate(desloca, 0, 0) }));
  // Nave: três paredes (fundo e laterais) com janelas altas pregadas.
  obra.por("reboco", bloco(L, A, e, 0, 0, -F / 2 + e / 2), branco, 0.08, 0.25);
  for (const s of [-1, 1]) obra.por("reboco", bloco(e, A, F - e * 2, s * (L / 2 - e / 2), 0, 0), branco, 0.08, 0.25);
  barrado(obra, L, F, A, cor.barrado, !!p.entravel, 0.9, 0.5);
  cimalha(obra, L, F, A, FRISO);
  for (const u of aoLongo(F - (temTorre ? lado : 0), Math.max(2, Math.floor(F / 5)), 2))
    for (const f of ["esquerda", "direita"] as Face[]) {
      const uu = u + (f === "esquerda" ? -1 : 1) * (temTorre ? (atras ? -1 : 1) * lado / 2 : 0);
      janela(obra, f, L, F, uu, A * 0.42, 1.1, 2.1, { fechada: cor.porta, moldura: FRISO });
      tabuas(obra, f, L, F, uu, A * 0.42, 1.1, 2.1, cor.madeira, r, 2);
    }
  descascado(obra, L, F, A, r, 4, !!p.entravel);
  // Torre de coruchéu bulboso.
  if (temTorre) torreBarroca(obra, L / 2 - lado / 2, atras ? -F / 2 + lado / 2 : F / 2 - lado / 2, lado, A + alto * 0.55, { fuste: branco, cantaria, cupula: "#5a5248" }, r, 0);
  // Telhado em duas águas no comprimento, com telha faltando.
  const t = new ObraVelha(22, 0, 0.12);
  const altoT = L * 0.36;
  const tt = new Obra(23);
  telhadoLargado(tt, "duas-aguas", F, L, A, altoT, cor.telha, r, 2 + Math.floor(r() * 2));
  matoNaCalha(tt, F, L, A, altoT, "duas-aguas", r);
  const pecasTelhado = [...t.pecas(), ...tt.pecas().map((pc) => ({ ...pc, geometria: pc.geometria.rotateY(Math.PI / 2) }))];
  const emp = new ObraVelha(24, 0.06, 0.2);
  for (const g of empenas(F, L, A, altoT)) emp.por("reboco", g.rotateY(Math.PI / 2), branco);
  matoEmVolta(obra, L, F, A, r, 1.3, !!p.entravel);
  const dentro = new ObraVelha(25, 0, 0.15);
  if (p.entravel) {
    dentro.por("madeira", bloco(L - 1.2, 0.08, F - 1.2, 0, 0.02, 0), "#7a6a52", 0.1, 0);
    // A igreja virou depósito de mortos: caixões enfileirados na nave.
    for (let i = 0; i < Math.floor(F / 2.6) - 2; i++) {
      for (const s of [-1, 1]) {
        if (r() < 0.25) continue;
        dentro.por("madeira", caixao().rotateY(Math.PI / 2).translate(s * L * 0.24, 0.05, F / 2 - 4 - i * 2.2), r() < 0.6 ? "#4a3626" : "#5a4430", 0.1, 0);
      }
    }
    dentro.por("reboco", bloco(L * 0.4, 1.4, 1.2, 0, 0, -F / 2 + 1.3), "#d8ccb0", 0.04, 0);
    for (let i = 0; i < 4; i++) dentro.por("osso", new THREE.CylinderGeometry(0.06, 0.06, 0.4, 5).translate(-L * 0.15 + i * L * 0.1, 1.6, -F / 2 + 1.3), "#e8dcc0", 0.05, 0);
  }
  return { corpo: [...obra.pecas(), ...emp.pecas(), ...pecasFachada], telhado: pecasTelhado, interior: dentro.pecas() };
}

/** Capela do cemitério: pequena, fechada, sineira de espadana no frontão. */
function capela(p: PredioLocal, r: () => number, cor: Cores): PecasDoPredio {
  const base = igreja(p, r, cor);
  const o = new ObraVelha(61, 0.05, 0.3);
  const { fundo: F, altura: A, largura: L } = p;
  const alto = Math.min(4.5, L * 0.42);
  const topo = A + 0.2 + alto * 0.85;
  porParede(o, "frente", 2.4, F, [new THREE.Vector2(-1.2, 2.2), new THREE.Vector2(1.2, 2.2)], [{ u: 0, y: 0.35, w: 0.9, h: 1.5, flecha: 0.45 }], "reboco", "#d6c8a6", undefined, 0.4);
  const pecas = o.pecas().map((pc) => ({ ...pc, geometria: pc.geometria.translate(0, topo - 0.5, -0.25) }));
  return { ...base, corpo: [...base.corpo, ...pecas] };
}

/** Casa do coveiro: ainda habitada. Porta sem cruz, caixões no alpendre dos fundos, pás e lanterna. */
function casaDoCoveiro(p: PredioLocal, r: () => number, cor: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const fundoCasa = F - 3;
  const base = casa({ ...p, fundo: fundoCasa }, r, cor, { telhado: "duas-aguas", semCruz: true, carroca: false });
  const leva = (lista: PecasDoPredio["corpo"]) => lista.map((pc) => ({ ...pc, geometria: pc.geometria.translate(0, 0, 1.5) }));
  const o = new ObraVelha(71, 0, 0.2);
  // Alpendre dos fundos: esteios, uma água de tábua, caixões empilhados.
  const zA = -F / 2 + 1.5;
  for (const x of [-L / 2 + 0.3, 0, L / 2 - 0.3]) o.por("madeira", bloco(0.18, 2.5, 0.18, x, 0, -F / 2 + 0.2), cor.madeira, 0.1, 0);
  const t = new Obra(72);
  for (const g of telhado("uma-agua", L, 3, 0, 0.5, 0.2, 0.08)) t.por("madeira", g.rotateY(Math.PI).translate(0, 2.5, zA), "#5e5244", 0.14, 0);
  for (let i = 0; i < 4; i++) {
    const pilha = i < 3 ? 0 : 1;
    o.por("madeira", caixao().translate(-L / 2 + 1.0 + (i % 3) * 0.75, pilha * 0.44 + 0.02, zA).rotateY(0), i === 1 ? "#8a7458" : "#6a5440", 0.1, 0);
  }
  // Caixão de pé ao lado da porta, pás e picareta encostadas, lanterna e cruz.
  o.por("madeira", caixao().rotateX(-Math.PI / 2 + 0.12).translate(L / 2 - 1.2, 0.98, F / 2 + 0.45), "#6a5440", 0.1, 0);
  for (let i = 0; i < 2; i++) {
    o.por("madeira", bloco(0.05, 1.5, 0.05, 0, 0, 0).rotateZ(0.2 - i * 0.12).translate(-L / 2 + 1.0 + i * 0.35, 0, F / 2 + 0.15), "#7a6248", 0.1, 0);
    o.por("ferro", bloco(0.25, 0.32, 0.03, 0, 0, 0).translate(-L / 2 + 1.0 + i * 0.35, 0.02, F / 2 + 0.2), "#3a3632", 0.05, 0);
  }
  o.por("ferro", bloco(0.22, 0.32, 0.22, L / 2 - 2.0, 2.6, F / 2 + 0.25), "#e0a040", 0.1, 0);
  o.por("madeira", bloco(0.12, 0.9, 0.06, 0, A - 0.95, F / 2 + 0.06), "#3e3026", 0.05, 0);
  o.por("madeira", bloco(0.55, 0.12, 0.06, 0, A - 0.6, F / 2 + 0.06), "#3e3026", 0.05, 0);
  // Monte de terra cavada e uma cruz de cova pronta.
  o.por("terra", bolha(1, 1, 0.3, 9, 0.35).scale(1.2, 1, 0.8).translate(L / 2 - 1.3, 0, -F / 2 + 1.4), "#6a4a32", 0.1, 0);
  entulho(o, -L / 2 + 1, -F / 2 + 0.6, 0.6, 0.6, 0.2, "#7a7266", r);
  const corpo = [...leva(base.corpo), ...o.pecas()];
  return { corpo, telhado: [...leva(base.telhado), ...t.pecas()], interior: leva(base.interior) };
}

function fazenda(p: PredioLocal, r: () => number, cor: Cores): PecasDoPredio {
  const base = casa({ ...p, altura: Math.min(p.altura, 5.2) }, r, cor, { carroca: false });
  const o = new ObraVelha(31, 0.05, 0.3);
  o.por("cantaria", bloco(p.largura + 0.6, 0.6, p.fundo + 0.6, 0, -0.3, 0), "#8a8270", 0.08, 0.3);
  alpendreCaido(o, p.largura, p.fundo, 2.6, 2.7, cor, r, p.entravel);
  const c = new Obra(32);
  carroca(c, -p.largura / 2 + 1.5, p.fundo / 2 + 4.0, 0.3, r);
  return { ...base, corpo: [...base.corpo, ...o.pecas(), ...c.pecas()] };
}

function galpao(p: PredioLocal, r: () => number, cor: Cores, estabulo: boolean): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new ObraVelha(Math.floor(r() * 1e6), 0, 0.3);
  const mad = cor.madeira;
  paredes(obra, L, F, A, "madeira", mad, p.entravel ? PORTA_DE_ENTRAR : undefined);
  // Mata-juntas e tábuas que caíram (fresta escura).
  for (const f of FACES) {
    const c = comp(f, L, F);
    for (const u of aoLongo(c, Math.floor(c / 0.9), 0.3)) {
      if (f === "frente" && p.entravel && Math.abs(u) < 2.3) continue;
      if (r() < 0.12) obra.por("madeira-escura", naFace(bloco(0.32, A * (0.3 + r() * 0.5), 0.02, 0, 0, 0.01), f, L, F, u + 0.45, A * 0.2 * r()), BURACO, 0.05, 0);
      obra.por("madeira", naFace(bloco(0.08, A, 0.05, 0, 0, 0.02), f, L, F, u, 0), "#5a4e40", 0.1, 0);
    }
  }
  if (!p.entravel) {
    obra.por("madeira-escura", naFace(bloco(Math.min(4, L * 0.4), A * 0.75, 0.06, 0, 0, 0.03), "frente", L, F, 0, 0), "#3e352c", 0.08, 0);
    cruzVermelha(obra, "frente", L, F, 0, A * 0.25, 1.2, r, "madeira", 0.08);
  } else cruzVermelha(obra, "frente", L, F, PORTA_DE_ENTRAR.largura / 2 + 1.0, 1.4, 0.9, r, "madeira", 0.08);
  const t = new ObraVelha(42, 0, 0.1);
  const alto = F * 0.3;
  telhadoLargado(t, "duas-aguas", L, F, A, alto, "#6a4a3a", r, 2 + Math.floor(r() * 3));
  matoNaCalha(t, L, F, A, alto, "duas-aguas", r);
  for (const g of empenas(L, F, A, alto)) obra.por("madeira", g, mad);
  if (estabulo) {
    // Cocho e feno largado na frente.
    obra.por("madeira", naFace(bloco(2.4, 0.6, 0.6, 0, 0, 0.4), "frente", L, F, -L / 2 + 2, 0), mad, 0.12, 0.2);
    obra.por("palha", bolha(1, 1, 0.4, 3, 0.5).scale(1.2, 0.7, 1.0).translate(L / 2 - 1.6, 0.2, F / 2 + 1.0), "#a08a52", 0.15, 0);
  } else chamine(obra, L * 0.3, -F * 0.25, 0, A + alto + 0.8, "#6a5a4c");
  matoEmVolta(obra, L, F, A, r, 1, !!p.entravel);
  const corpo = obra.pecas();
  if (!p.entravel || r() < 0.6) {
    const c = new Obra(43);
    carroca(c, (r() < 0.5 ? -1 : 1) * (L / 2 + 1.0), F * 0.1, r() * 0.6, r);
    corpo.push(...c.pecas());
  }
  return { corpo, telhado: t.pecas(), interior: interior(p, r) };
}

function moinho(p: PredioLocal, r: () => number): PecasDoPredio {
  const raio = Math.min(p.largura, p.fundo) / 2;
  const obra = new ObraVelha(51, 0, 0.35);
  obra.por("reboco", new THREE.CylinderGeometry(raio * 0.75, raio, p.altura, 12, 1, true).translate(0, p.altura / 2, 0), "#cdbd98", 0.1, 0.3);
  obra.por("madeira", naFace(bloco(1.2, 2.2, 0.1, 0, 0, raio * 0.05), "frente", raio * 2, raio * 2, 0, 0), "#4e4034", 0.08, 0);
  tabuas(obra, "frente", raio * 2, raio * 2, 0, 0.3, 1.2, 1.8, "#7a6c5a", r, 2);
  const t = new Obra(52);
  for (const g of telhadoCone(raio, p.altura)) t.por("palha", g, "#6e5e44", 0.12, 0);
  // Pás: duas inteiras, uma partida, uma caída no chão.
  const giro = r() * Math.PI;
  for (let i = 0; i < 3; i++) {
    const comp_ = i === 2 ? raio * 0.9 : raio * 2.6;
    const pa = bloco(0.3, comp_, 0.08, 0, 0, 0).translate(0, raio * 0.2, 0).rotateZ(giro + (i * Math.PI) / 2);
    obra.por("madeira", pa.translate(0, p.altura * 0.85, raio + 0.4), "#9a8a6a", 0.1, 0);
  }
  obra.por("madeira", bloco(0.3, 0.08, raio * 2.4, raio * 0.8, 0.05, raio + 1.0).rotateY(0.3), "#9a8a6a", 0.1, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

function telhadoCone(raio: number, altura: number) {
  const g = new THREE.ConeGeometry(raio * 0.95, raio * 1.1, 12);
  return [g.translate(0, altura + raio * 0.55, 0)];
}

function vigia(p: PredioLocal, r: () => number): PecasDoPredio {
  // Torre de vigia de madeira, torta, com tábuas do parapeito faltando.
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new ObraVelha(81, 0, 0.25);
  const torto = (r() - 0.5) * 0.08;
  const pecas: [THREE.BufferGeometry, string][] = [];
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ])
    pecas.push([bloco(0.3, A, 0.3, (x * L) / 2.6, 0, (z * F) / 2.6), "#5e5244"]);
  pecas.push([bloco(L * 0.9, 0.25, F * 0.9, 0, A - 2, 0), "#6a5c4a"]);
  for (let i = 0; i < 5; i++) if (r() < 0.6) pecas.push([bloco((L * 0.9) / 5, 1.0, 0.1, -L * 0.36 + (i * L * 0.9) / 5, A - 1.75, (F * 0.9) / 2), "#6a5c4a"]);
  for (const [g, c] of pecas) obra.por("madeira", g.rotateZ(torto), c, 0.1, 0);
  const t = new Obra(82);
  for (const g of telhado("quatro-aguas", L * 0.95, F * 0.95, A + 0.6, 1.4, 0.3)) t.por("telha-escura", g.rotateZ(torto), "#5b3a30", 0.1, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

function tenda(p: PredioLocal, r: () => number): PecasDoPredio {
  // Tenda de quarentena: lona com a cruz vermelha, catres dentro.
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new Obra(91);
  for (const g of telhado("duas-aguas", L, F, 0.2, A, 0.1, 0.05)) obra.por("lona", g, "#cfc3a4", 0.12, 0);
  for (const z of [-F / 2, F / 2]) obra.por("madeira", bloco(0.12, A + 0.4, 0.12, 0, 0, z), "#5a4e40", 0.1, 0);
  // Cruz vermelha pintada na água da frente.
  const th = Math.atan2(A, F / 2 + 0.1);
  const e = 0.22;
  for (const g of [bloco(e, 1.2, 0.02, 0, -0.6, 0), bloco(1.2, e, 0.02, 0, -e / 2, 0)])
    obra.por("lona", g.rotateX(th - Math.PI / 2).translate(0, 0.2 + A * 0.5 + 0.04, (F / 2 + 0.1) * 0.5 + 0.03), VERMELHO, 0.1, 0);
  void r;
  const dentro = new Obra(92);
  for (const s of [-1, 1]) {
    dentro.por("madeira", bloco(0.8, 0.45, 1.9, s * L * 0.22, 0, 0), "#6a5a46", 0.1, 0);
    dentro.por("lona", bloco(0.75, 0.1, 1.8, s * L * 0.22, 0.45, 0), "#d8cdb2", 0.1, 0);
  }
  return { corpo: obra.pecas(), telhado: [], interior: p.entravel ? dentro.pecas() : [] };
}

/** Casa que ruiu: paredes de cal caídas, telhado despencado dentro. */
function ruina(p: PredioLocal, r: () => number, cor: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new ObraVelha(Math.floor(r() * 1e6), 0.05, 0.35);
  FACES.forEach((f, i) => {
    const c = comp(f, L, F);
    const perfil = perfilQuebrado(c, A, i === 0 ? (p.entravel ? 0 : 0.35) : 0.5 + r() * 0.4, r, [1, 0.7]);
    const vaos: Vao[] = f === "frente" ? [p.entravel ? { u: 0, y: 0, w: 4.4, h: 3.0, flecha: 0 } : { u: 0, y: 0, w: 1.2, h: 2.5, flecha: 0 }] : [];
    for (const u of aoLongo(c, Math.max(1, Math.floor((c - 1.6) / 2.6)), 1.3)) if (Math.abs(u) > 2.6 || f !== "frente") vaos.push({ u, y: 1.0, w: 1.0, h: 1.5, flecha: 0 });
    porParede(obra, f, L, F, perfil, vaos, "reboco", cor.cal, { cor: FRISO, material: "reboco", largura: 0.12 }, 0.45);
  });
  // O telhado caiu inteiro para dentro: duas águas tortas apoiadas no chão.
  const t = new Obra(95);
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  t.por("telha", malha([v(-L / 2 + 0.6, 0.4, F / 2 - 0.8), v(L / 2 - 0.8, 1.2, F / 2 - 0.6), v(L / 2 - 1.2, A * 0.7, -0.4), v(-L / 2 + 0.5, A * 0.55, -0.2)], [0, 1, 2, 0, 2, 3]), cor.telha, 0.16, 0);
  t.por("telha", malha([v(-L / 2 + 0.6, A * 0.5, 0.2), v(L / 2 - 0.6, A * 0.65, 0.1), v(L / 2 - 0.9, 0.3, -F / 2 + 0.8), v(-L / 2 + 0.7, 0.6, -F / 2 + 0.6)], [0, 2, 1, 0, 3, 2]), cor.telha, 0.16, 0);
  for (let i = 0; i < 3; i++) t.por("madeira", caibro(v((r() - 0.5) * L * 0.7, 0.1, -F / 2 + 0.7), v((r() - 0.5) * L * 0.7, A * 0.8, F * 0.2), 0.16), "#5e5244", 0.1, 0);
  matoEmVolta(obra, L, F, A, r, 1.5, !!p.entravel);
  const o = new ObraVelha(96, 0, 0);
  moita(o, (r() - 0.5) * L * 0.4, F * 0.25, 1, 0.9, 5, MATO[2]);
  const caido = t.pecas();
  return { corpo: [...obra.pecas(), ...o.pecas(), ...(p.entravel ? [] : caido)], telhado: p.entravel ? caido : [], interior: interior(p, r) };
}

// ---------------------------------------------------------------------------
// Longe

function longe(p: PredioLocal, r: () => number, cor: Cores): PecasDoPredio {
  const { largura: L, fundo: F, altura: A } = p;
  const obra = new ObraVelha(1, 0, 0.3);
  const t = new Obra(2);
  if (p.tipo === "tenda") {
    for (const g of telhado("duas-aguas", L, F, 0.2, A, 0.1).slice(0, 1)) obra.por("lona", g, "#cfc3a4", 0.1, 0);
    return { corpo: obra.pecas(), telhado: [], interior: [] };
  }
  const madeira = p.tipo === "galpao" || p.tipo === "torre";
  obra.por(madeira ? "madeira" : "reboco", bloco(L, A, F, 0, 0, 0), madeira ? cor.madeira : cor.cal, 0.08, 0.25);
  if (!madeira) obra.por("reboco", bloco(L + 0.04, 0.7, F + 0.04, 0, 0, 0), cor.barrado, 0.05, 0);
  if (p.tipo === "ruina") return { corpo: obra.pecas(), telhado: [], interior: [] };
  const duas = p.tipo === "igreja" || p.tipo === "galpao" || p.tipo === "fabrica" || p.tipo === "estacao";
  const alto = p.tipo === "igreja" ? L * 0.36 : Math.min(L, F) * 0.3;
  if (p.tipo === "igreja") {
    for (const g of telhado("duas-aguas", F, L, A, alto, 0.5).slice(0, 1)) t.por("telha", g.rotateY(Math.PI / 2), cor.telha, 0.1, 0);
    if (L >= 12) {
      const lado = Math.max(3, L * 0.26);
      const h = A + Math.min(4.5, (L - lado) * 0.42) * 0.55 + lado * 1.05;
      obra.por("reboco", bloco(lado, h, lado, L / 2 - lado / 2, 0, F / 2 - lado / 2), "#ddd2b8", 0.06, 0);
      obra.por("telha-escura", new THREE.ConeGeometry(lado * 0.42, lado * 1.25, 6).translate(L / 2 - lado / 2, h + lado * 0.62, F / 2 - lado / 2), "#5a5248", 0.08, 0);
    }
    return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
  }
  const tipo: TipoTelhado = duas ? "duas-aguas" : "quatro-aguas";
  for (const g of telhado(tipo, L, F, A, alto, 0.5, 0.15).slice(0, 1)) t.por("telha", g, cor.telha, 0.12, 0);
  // Um buraco escuro no telhado (telha faltando).
  const x = (r() - 0.5) * L * 0.3;
  const zz = (tt: number) => (F / 2 + 0.5) * (1 - tt);
  const q = [0.3, 0.6].flatMap((tt) => [new THREE.Vector3(x - 0.8, A + alto * tt + 0.06, zz(tt)), new THREE.Vector3(x + 0.8, A + alto * tt + 0.06, zz(tt))]);
  t.por("madeira-escura", malha([q[0], q[1], q[3], q[2]], [0, 1, 2, 0, 2, 3]), BURACO, 0.05, 0);
  return { corpo: obra.pecas(), telhado: t.pecas(), interior: [] };
}

export function gerarPeste(p: PredioLocal, nivel: NivelPredio, semente: number): PecasDoPredio {
  const r = sorteio(semente);
  const cor = paleta(r);
  if (nivel === 1) return longe(p, r, cor);
  const id = p.id ?? "";
  if (id === "casa-coveiro") return casaDoCoveiro(p, r, cor);
  if (id === "capela-cemiterio") return capela(p, r, cor);
  switch (p.tipo) {
    case "igreja":
      return igreja(p, r, cor);
    case "comercio":
      return comercio(p, r, cor, id === "botica" ? "#3e4a3a" : "#4a3a2a");
    case "saloon": {
      const base = comercio(p, r, cor, "#3a2a1c");
      const o = new ObraVelha(13, 0, 0.25);
      alpendreCaido(o, p.largura, p.fundo, 2.2, 2.8, cor, r, p.entravel);
      return { ...base, corpo: [...base.corpo, ...o.pecas()] };
    }
    case "hotel":
      return casa({ ...p, altura: Math.max(p.altura, 6.6) }, r, cor, { sacadas: true });
    case "banco":
    case "publico":
      return casa(p, r, cor, { grade: id === "cadeia" || p.tipo === "banco", sacadas: id === "camara" });
    case "estacao": {
      const base = galpao(p, r, cor, true);
      const o = new ObraVelha(19, 0, 0.25);
      alpendreCaido(o, p.largura, p.fundo, 3.0, 3.2, cor, r, p.entravel);
      return { ...base, corpo: [...base.corpo, ...o.pecas()] };
    }
    case "fazenda":
      return fazenda(p, r, cor);
    case "galpao":
      return galpao(p, r, cor, id === "estabulo" || r() < 0.4);
    case "moinho":
      return moinho(p, r);
    case "fabrica": {
      const base = galpao(p, r, cor, false);
      const o = new Obra(61);
      chamine(o, p.largura * 0.35, -p.fundo * 0.3, 0, p.altura * 2.2, "#7a5040");
      return { ...base, corpo: [...base.corpo, ...o.pecas()] };
    }
    case "torre":
      return vigia(p, r);
    case "tenda":
      return tenda(p, r);
    case "ruina":
      return ruina(p, r, cor);
    default:
      return casa(p, r, cor);
  }
}

const estilo: Estilo = { id: "peste", nome: "Vila abandonada pela peste (Desemboque)", gerar: gerarPeste };

export default estilo;
