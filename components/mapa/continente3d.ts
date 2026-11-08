// Continente inteiro em uma malha só: o desenho vem de um canvas pintado com a
// geografia do mapa impresso e o relevo do desenho das serras.

import * as THREE from "three";
import {
  EAST_COAST,
  FOREST_BLOBS,
  ISLAND_DEF,
  LAKE_DEFS,
  RAILS,
  RIVER_DEFS,
  ROADS,
  WEST_COAST,
  DECOR_LABELS,
  type Pt,
} from "@/lib/mapa/geografia";
import {
  ALEM_LONGE,
  ALEM_PERTO,
  CABO_SUL,
  CONT_ALTURA,
  CONT_LARGURA,
  COSTA_NORDESTE,
  COSTA_NOROESTE,
  INICIO_LONGE,
  INICIO_PERTO,
  RIOS_DE_FORA,
  regiaoDeFora,
  ruidoDeFora,
  type GradeDeFora,
} from "@/lib/mapa/dados-relevo";
import { altitudeContinente, dadosDoContinente } from "@/lib/mapa/relevo";
import { ALTURA_MAPA, LARGURA_MAPA, LUGARES, METROS_POR_UNIDADE_DO_MAPA, cidadesCarregadas, lugarPorId, mundoDoMapa } from "@/lib/mapa/lugares";
import type { XZ } from "@/lib/mapa/tipos";
import { COR_AREA, COR_CHAO, COR_PISO, montarPredios } from "./cidade3d";
import { etiqueta } from "./etiqueta";

const PX_POR_UNIDADE = 4;
/** Metros em que a borda do mapa se mistura com a terra de fora. */
const BORDA_DESFEITA = 3200;
const ARVORES = 9000;
const COR_TERRA = "#6f7743";
const FOLGA_DAS_VIAS = 24; // unidades do mapa: em volta do lugar a rua é a da cidade

let amostra: CanvasRenderingContext2D | null = null;

/**
 * Texturas assadas: a pintura do continente e da terra de fora leva dezenas de segundos
 * e sai sempre igual, então é feita uma vez (scripts/assar-texturas.mjs) e o mapa só carrega.
 * Mudou cidade, relevo ou pintura? Rode o script de novo e suba VERSAO_TEXTURAS.
 */
export const VERSAO_TEXTURAS = 1;
export const TEXTURAS_ASSADAS = ["continente", "alem-perto", "alem-longe"] as const;
type NomeAssada = (typeof TEXTURAS_ASSADAS)[number];
const assadas = new Map<NomeAssada, HTMLImageElement>();
const pintadas = new Map<NomeAssada, HTMLCanvasElement>();
const assando = () => typeof location !== "undefined" && new URLSearchParams(location.search).has("assar");
export const telaGrande = () => window.matchMedia("(min-width: 1024px)").matches;

export async function carregarTexturasAssadas() {
  if (assando() || assadas.size) return;
  const sufixo = telaGrande() ? "" : "-celular";
  await Promise.all(
    TEXTURAS_ASSADAS.map(
      (nome) =>
        new Promise<void>((pronto) => {
          const img = new Image();
          img.onload = () => {
            assadas.set(nome, img);
            pronto();
          };
          // Sem o arquivo, cai na pintura na hora: lenta, mas o mapa abre.
          img.onerror = () => pronto();
          img.src = `/mapa/texturas/${nome}${sufixo}.webp?v=${VERSAO_TEXTURAS}`;
        }),
    ),
  );
}

/** Canvas da textura assada, no tamanho pedido; null se não houver. */
function deAssada(nome: NomeAssada, largura: number, altura: number) {
  const img = assadas.get(nome);
  if (!img) return null;
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = [largura, altura];
  canvas.getContext("2d")!.drawImage(img, 0, 0, largura, altura);
  return canvas;
}

function texturaDe(canvas: HTMLCanvasElement) {
  const textura = new THREE.CanvasTexture(canvas);
  textura.generateMipmaps = true;
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}

/** Para o script de assar: as texturas pintadas nesta abertura. */
export function texturasPintadas() {
  return pintadas;
}

/** Regiões de cor. Leitura das descrições do Doc 2 §5.3. */
const BIOMAS: { x: number; y: number; rx: number; ry: number; cor: string }[] = [
  { x: 150, y: 625, rx: 130, ry: 70, cor: "#c9a35f" }, // Deserto de Mucuri
  { x: 560, y: 508, rx: 110, ry: 55, cor: "#4c5a3c" }, // Sertão de Fungos
  { x: 745, y: 252, rx: 60, ry: 45, cor: "#5b534a" }, // Trincheira do Carvão
  { x: 800, y: 170, rx: 90, ry: 60, cor: "#5a6a4a" }, // chuva de Araguari
  { x: 600, y: 70, rx: 150, ry: 60, cor: "#d9dde0" }, // Montanha de Gelo
  { x: 862, y: 60, rx: 100, ry: 45, cor: "#c8ced2" }, // Alto da Friaca
  { x: 290, y: 340, rx: 70, ry: 55, cor: "#6a6450" }, // Sacramento queimada
];

function fechar(c: CanvasRenderingContext2D, pts: readonly Pt[]) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
}

function pintar() {
  const pronta = deAssada("continente", LARGURA_MAPA * PX_POR_UNIDADE, ALTURA_MAPA * PX_POR_UNIDADE);
  if (pronta) {
    amostra = pronta.getContext("2d")!;
    return texturaDe(pronta);
  }
  const canvas = document.createElement("canvas");
  canvas.width = LARGURA_MAPA * PX_POR_UNIDADE;
  canvas.height = ALTURA_MAPA * PX_POR_UNIDADE;
  const c = canvas.getContext("2d", { willReadFrequently: true })!;
  c.scale(PX_POR_UNIDADE, PX_POR_UNIDADE);
  c.fillStyle = COR_TERRA;
  c.fillRect(0, 0, LARGURA_MAPA, ALTURA_MAPA);

  c.filter = "blur(14px)";
  for (const b of BIOMAS) {
    c.fillStyle = b.cor;
    c.beginPath();
    c.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.filter = "blur(3px)";
  c.fillStyle = "#3f5a35";
  for (const f of FOREST_BLOBS) {
    c.beginPath();
    c.ellipse(f.cx, f.cy, f.rx, f.ry, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.filter = "none";

  c.fillStyle = "#2c5c78";
  fechar(c, [...WEST_COAST, [755, ALTURA_MAPA], [0, ALTURA_MAPA]]);
  c.fill();
  fechar(c, [...EAST_COAST, [LARGURA_MAPA, ALTURA_MAPA], [LARGURA_MAPA, 320]]);
  c.fill();
  for (const l of LAKE_DEFS) {
    c.beginPath();
    c.ellipse(l.cx, l.cy, l.rx, l.ry, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = COR_TERRA;
  c.beginPath();
  c.ellipse(ISLAND_DEF.cx, ISLAND_DEF.cy, ISLAND_DEF.rx, ISLAND_DEF.ry, 0, 0, Math.PI * 2);
  c.fill();

  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = "#2c5c78";
  c.lineWidth = 1.6;
  for (const r of RIVER_DEFS) {
    fechar(c, r.pts);
    c.stroke();
  }
  pintarRelevo(c);
  salpicar(c);
  pintarCidades(c);
  amostra = c;
  pintadas.set("continente", canvas);
  return texturaDe(canvas);
}

/** Manchas de vegetação e solo, em duas escalas: o desenho sozinho fica chapado de perto. */
function salpicar(c: CanvasRenderingContext2D, x0 = 0, y0 = 0, w = LARGURA_MAPA, h = ALTURA_MAPA, tetos = [Infinity, Infinity], semente = 91) {
  const r = (() => {
    let a = semente;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  // Mesma densidade por área do mapa; se o teto cortar a quantidade, a mancha cresce para cobrir igual.
  const area = (w * h) / (LARGURA_MAPA * ALTURA_MAPA);
  c.save();
  c.globalCompositeOperation = "soft-light";
  for (const [base, tamanho, forca, teto] of [[3800, 18, 0.1, tetos[0]], [60000, 1.6, 0.15, tetos[1]]] as const) {
    const quantas = Math.round(Math.min(base * area, teto));
    const cresce = Math.sqrt((base * area) / Math.max(1, quantas));
    for (let i = 0; i < quantas; i++) {
      c.fillStyle = r() > 0.5 ? `rgba(22,44,20,${forca})` : `rgba(226,204,150,${forca})`;
      c.beginPath();
      c.ellipse(x0 + r() * w, y0 + r() * h, tamanho * cresce * (0.5 + r()), tamanho * cresce * (0.3 + r() * 0.7), r() * 3, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

/** Ruas e áreas de cada lugar direto no chão do continente: vistas de longe, as cidades existem. */
function pintarCidades(c: CanvasRenderingContext2D) {
  const k = 1 / METROS_POR_UNIDADE_DO_MAPA;
  let a = 131;
  const semente = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  c.save();
  c.lineCap = "round";
  c.lineJoin = "round";
  for (const cidade of cidadesCarregadas()) {
    const l = lugarPorId(cidade.id);
    const trilha = (pts: readonly XZ[]) => {
      c.beginPath();
      pts.forEach(([x, z], i) => (i ? c.lineTo(l.mx + x * k, l.my + z * k) : c.moveTo(l.mx + x * k, l.my + z * k)));
    };
    // Tom do chão do lugar em manchas soltas, que somem no campo sem formar borda.
    const raio = cidade.raio * k;
    const rgb = new THREE.Color(COR_CHAO[cidade.chao]);
    const cor = `${Math.round(rgb.r * 255)},${Math.round(rgb.g * 255)},${Math.round(rgb.b * 255)}`;
    for (let i = 0; i < 90; i++) {
      const [ang, d, e] = [semente() * Math.PI * 2, Math.sqrt(semente()) * raio * 1.1, raio * (0.3 + semente() * 0.5)];
      const [x, y] = [l.mx + Math.cos(ang) * d, l.my + Math.sin(ang) * d];
      const g = c.createRadialGradient(x, y, 0, x, y, e);
      g.addColorStop(0, `rgba(${cor},0.16)`);
      g.addColorStop(1, `rgba(${cor},0)`);
      c.fillStyle = g;
      c.fillRect(x - e, y - e, e * 2, e * 2);
    }
    // Áreas suaves: vistas do alto, retângulos fortes viram remendo.
    for (const a of cidade.areas) {
      if (a.tipo === "agua") continue;
      c.fillStyle = COR_AREA[a.tipo];
      c.globalAlpha = 0.42;
      trilha(a.pts);
      c.closePath();
      c.fill();
    }
    c.globalAlpha = 1;
    for (const r of cidade.ruas) {
      c.strokeStyle = COR_PISO[r.piso];
      c.lineWidth = Math.max(0.2, r.largura * k);
      trilha(r.pts);
      c.stroke();
    }
  }
  c.restore();
}

/** Abre o buraco do lugar detalhado em qualquer material do continente. */
function abrirBuraco(s: THREE.WebGLProgramParametersWithUniforms, uRaio: { value: number }, instanciado: boolean) {
  s.uniforms.uRaio = uRaio;
  const matriz = instanciado ? "modelMatrix * instanceMatrix" : "modelMatrix";
  s.vertexShader = s.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec2 vMundo;")
    .replace("#include <begin_vertex>", `#include <begin_vertex>\nvMundo = (${matriz} * vec4(position, 1.0)).xz;`);
  s.fragmentShader = s.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying vec2 vMundo;\nuniform float uRaio;")
    .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (length(vMundo) < uRaio) discard;");
}

/** Mata do continente: densa nas manchas do mapa oficial, solta no resto. */
function montarMatas(uRaio: { value: number }) {
  let a = 77;
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const material = new THREE.MeshLambertMaterial({ color: "#3b5533", flatShading: true });
  material.onBeforeCompile = (s) => abrirBuraco(s, uRaio, true);
  const copas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material, ARVORES);
  const m = new THREE.Matrix4();
  let n = 0;
  for (let i = 0; i < ARVORES * 3 && n < ARVORES; i++) {
    const noBosque = r() < 0.8;
    const f = FOREST_BLOBS[Math.floor(r() * FOREST_BLOBS.length)];
    const ang = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    const [mx, my] = noBosque ? [f.cx + Math.cos(ang) * d * f.rx, f.cy + Math.sin(ang) * d * f.ry] : [r() * LARGURA_MAPA, r() * ALTURA_MAPA];
    const h = altitudeContinente(mx, my);
    if (h < 3 || h > 620) continue;
    const p = mundoDoMapa(mx, my);
    const e = 16 + r() * 22;
    m.makeScale(e, e * 1.4, e).setPosition(p.x, h + e, p.z);
    copas.setMatrixAt(n++, m);
  }
  copas.count = n;
  return copas;
}

/** Prédios de todos os lugares em versão leve, para as vizinhas aparecerem no horizonte. */
function montarVizinhas() {
  const mapa = new Map<string, THREE.Object3D>();
  for (const cidade of cidadesCarregadas()) {
    const l = lugarPorId(cidade.id);
    if (!cidade.predios.length) continue;
    const g = new THREE.Group();
    montarPredios(cidade.predios, g, (p) => {
      const q = mundoDoMapa(l.mx + p.x / METROS_POR_UNIDADE_DO_MAPA, l.my + p.z / METROS_POR_UNIDADE_DO_MAPA);
      return { x: q.x, z: q.z, y: altitudeContinente(l.mx + p.x / METROS_POR_UNIDADE_DO_MAPA, l.my + p.z / METROS_POR_UNIDADE_DO_MAPA), fundacao: 3 };
    });
    mapa.set(cidade.id, g);
  }
  return mapa;
}

const uOrigem = { value: new THREE.Vector2() };
let grao: { value: THREE.Texture } | null = null;

/** Mesmo grão no continente e nos lugares: é o que esconde a troca de nível de detalhe. */
export function comGrao(s: THREE.WebGLProgramParametersWithUniforms) {
  grao ??= { value: texturaDeGrao() };
  s.uniforms.uOrigem = uOrigem;
  s.uniforms.uGrao = grao;
  s.fragmentShader = s.fragmentShader
    .replace("#include <common>", "#include <common>\nuniform vec2 uOrigem;\nuniform sampler2D uGrao;")
    .replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      vec2 uvGrao = (vMundo + uOrigem) / 260.0;
      float grao = texture2D(uGrao, uvGrao).r * 0.6 + texture2D(uGrao, uvGrao / 5.3).r * 0.4;
      diffuseColor.rgb *= 1.0 + (grao - 0.5) * 1.0;`,
    );
}

/** Copia o chão do continente: o lugar nasce com a mesma cor do que está em volta. */
export function copiarContinente(destino: CanvasRenderingContext2D, mx: number, my: number, raioEmUnidades: number, lado: number) {
  const px = PX_POR_UNIDADE;
  destino.drawImage(amostra!.canvas, (mx - raioEmUnidades) * px, (my - raioEmUnidades) * px, raioEmUnidades * 2 * px, raioEmUnidades * 2 * px, 0, 0, lado, lado);
}

/* ── Além do mapa ──
 * O resto do país, que se vê de longe e não se visita: sertão ao norte, cerrado a noroeste,
 * serras de mata a leste, mar a oeste e ao sul. Duas peças (perto, fina; longe, grossa), pintadas
 * com a mesma receita do mapa: cor de região, matas, rios, relevo sombreado e manchas. O mapa
 * entra pintado no meio da peça de perto e se desfaz nela, então a emenda não tem linha.
 */
const BANDA = BORDA_DESFEITA / METROS_POR_UNIDADE_DO_MAPA;
const COR_MAR = "#2c5c78";
const COR_MATA = "#3f5a35";
const ARVORES_DE_FORA = 5000;

function lerGrade(g: GradeDeFora, inicio: number, mx: number, my: number) {
  const a = dadosDoContinente();
  const fx = Math.max(0, Math.min(g.largura - 1.001, (mx - g.x0) / g.passo));
  const fy = Math.max(0, Math.min(g.altura - 1.001, (my - g.y0) / g.passo));
  const [i, j] = [Math.floor(fx), Math.floor(fy)];
  const [u, v] = [fx - i, fy - j];
  const k = inicio + j * g.largura + i;
  return a[k] * (1 - u) * (1 - v) + a[k + 1] * u * (1 - v) + a[k + g.largura] * (1 - u) * v + a[k + g.largura + 1] * u * v;
}

const dentroDaGrade = (g: GradeDeFora, mx: number, my: number) =>
  mx >= g.x0 && my >= g.y0 && mx <= g.x0 + (g.largura - 1) * g.passo && my <= g.y0 + (g.altura - 1) * g.passo;

/** Altitude em qualquer ponto, dentro ou fora do mapa. */
function alturaEmToda(mx: number, my: number) {
  if (mx >= 0 && my >= 0 && mx <= LARGURA_MAPA && my <= ALTURA_MAPA) return altitudeContinente(mx, my);
  return dentroDaGrade(ALEM_PERTO, mx, my) ? lerGrade(ALEM_PERTO, INICIO_PERTO, mx, my) : lerGrade(ALEM_LONGE, INICIO_LONGE, mx, my);
}

const foraDoMapa = (mx: number, my: number) =>
  Math.hypot(mx - Math.max(0, Math.min(LARGURA_MAPA, mx)), my - Math.max(0, Math.min(ALTURA_MAPA, my)));

function sorteio(semente: number) {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pesos de região numa grade grossa: a conta da costa é cara para cada pixel. */
function campoDeRegiao(x0: number, y0: number, w: number, h: number, passo: number) {
  const [nx, ny] = [Math.ceil(w / passo) + 1, Math.ceil(h / passo) + 1];
  const dados = new Float32Array(nx * ny * 2);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const r = regiaoDeFora(x0 + i * passo, y0 + j * passo);
      dados[(j * nx + i) * 2] = r.mata;
      dados[(j * nx + i) * 2 + 1] = r.cerrado;
    }
  }
  return (mx: number, my: number) => {
    const fx = Math.max(0, Math.min(nx - 1.001, (mx - x0) / passo));
    const fy = Math.max(0, Math.min(ny - 1.001, (my - y0) / passo));
    const [i, j] = [Math.floor(fx), Math.floor(fy)];
    const [u, v] = [fx - i, fy - j];
    const k = (c: number) => {
      const q = (a: number, b: number) => dados[((j + b) * nx + i + a) * 2 + c];
      return q(0, 0) * (1 - u) * (1 - v) + q(1, 0) * u * (1 - v) + q(0, 1) * (1 - u) * v + q(1, 1) * u * v;
    };
    const [mata, cerrado] = [k(0), k(1)];
    return { mata, cerrado, sertao: Math.max(0, 1 - mata - cerrado) };
  };
}

/** Manchas de mata de fora, em unidades do mapa: cerradas nas serras do leste, ralas no sertão. */
type ManchaDeMata = { x: number; y: number; rx: number; ry: number; giro: number };
let matasDeFora: ManchaDeMata[] | null = null;
function listarMatasDeFora() {
  if (matasDeFora) return matasDeFora;
  const r = sorteio(313);
  const g = ALEM_LONGE;
  const [w, h] = [(g.largura - 1) * g.passo, (g.altura - 1) * g.passo];
  const lista: ManchaDeMata[] = [];
  const pertoDeRio = (x: number, y: number) =>
    RIOS_DE_FORA.some((rio) => rio.pts.some(([a, b], i) => i % 3 === 0 && Math.hypot(a - x, b - y) < 22));
  for (let i = 0; i < 26000; i++) {
    const [x, y] = [g.x0 + r() * w, g.y0 + r() * h];
    const tam = r();
    const giro = r() * Math.PI;
    const sorte = r();
    if (foraDoMapa(x, y) < 6 || alturaEmToda(x, y) < 4) continue;
    const reg = regiaoDeFora(x, y);
    // Perto do mapa a densidade é a dele; longe vale a da região.
    const longe = THREE.MathUtils.smoothstep(foraDoMapa(x, y), 0, 120);
    const chance = (1 - longe) * 0.12 + longe * (reg.mata * 0.55 + reg.cerrado * 0.06 + reg.sertao * 0.015) + (pertoDeRio(x, y) ? 0.5 : 0);
    if (sorte > chance) continue;
    const [rx, ry] = [6 + tam * 26 * (0.6 + reg.mata), 4 + tam * 15 * (0.6 + reg.mata)];
    lista.push({ x, y, rx, ry, giro });
  }
  return (matasDeFora = lista);
}

const MAR_DE_FORA = (() => {
  const costa = [...COSTA_NOROESTE, ...WEST_COAST.slice(1), ...CABO_SUL.slice(1), ...[...EAST_COAST].reverse().slice(1), ...COSTA_NORDESTE.slice(1)];
  return [...costa, [9000, costa.at(-1)![1]], [9000, 9000], [-9000, 9000], [-9000, costa[0][1]]] as Pt[];
})();

/** Canvas pequeno a partir de uma função por pixel, desenhado esticado e liso. */
function porPixel(nx: number, ny: number, f: (i: number, j: number, px: Uint8ClampedArray, p: number) => void) {
  const t = document.createElement("canvas");
  [t.width, t.height] = [nx, ny];
  const tc = t.getContext("2d")!;
  const img = tc.createImageData(nx, ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) f(i, j, img.data, (j * nx + i) * 4);
  tc.putImageData(img, 0, 0);
  return t;
}

/**
 * Pinta uma peça de fora. Cobre a grade inteira; `miolo` é o que entra pintado por cima
 * (o mapa na peça de perto, a peça de perto na de longe), com a borda desfeita por `mascara`.
 */
function pintarFora(
  g: GradeDeFora,
  inicio: number,
  pxPorUnidade: number,
  passoDeCor: number,
  tetos: [number, number],
  miolo: { canvas: HTMLCanvasElement; x0: number; y0: number; w: number; h: number; mascara: (mx: number, my: number) => number },
) {
  const [x0, y0] = [g.x0, g.y0];
  const [w, h] = [(g.largura - 1) * g.passo, (g.altura - 1) * g.passo];
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = [Math.round(w * pxPorUnidade), Math.round(h * pxPorUnidade)];
  const c = canvas.getContext("2d")!;
  c.setTransform(pxPorUnidade, 0, 0, pxPorUnidade, -x0 * pxPorUnidade, -y0 * pxPorUnidade);
  c.imageSmoothingQuality = "high";
  const regiao = campoDeRegiao(x0, y0, w, h, Math.max(16, passoDeCor * 4));
  const altura = (mx: number, my: number) => lerGrade(g, inicio, mx, my);

  // Tom do mapa na borda: média bem borrada, para a terra de fora nascer da cor dele.
  const borrado = document.createElement("canvas");
  [borrado.width, borrado.height] = [40, 30];
  const bc = borrado.getContext("2d", { willReadFrequently: true })!;
  bc.drawImage(amostra!.canvas, 0, 0, 40, 30);
  const media = bc.getImageData(0, 0, 40, 30).data;
  const terra = new THREE.Color(COR_TERRA);
  const tomDoMapa = (mx: number, my: number, alvo: number[]) => {
    const i = Math.max(0, Math.min(39, Math.floor((mx / LARGURA_MAPA) * 40)));
    const j = Math.max(0, Math.min(29, Math.floor((my / ALTURA_MAPA) * 30)));
    const p = (j * 40 + i) * 4;
    const [r, gg, b] = [media[p], media[p + 1], media[p + 2]];
    // Onde a borda é mar, a terra de fora parte do chão comum do mapa.
    if (b > gg) [alvo[0], alvo[1], alvo[2]] = [terra.r * 255, terra.g * 255, terra.b * 255];
    else [alvo[0], alvo[1], alvo[2]] = [r, gg, b];
  };
  const cores = {
    seco: [163, 146, 96], caatinga: [125, 120, 80], chapada: [178, 158, 104], escarpa: [150, 112, 76],
    cerrado: [140, 138, 79], campo: [162, 152, 90], vereda: [86, 106, 58],
    mata: [60, 86, 50], mata2: [76, 98, 57], clareira: [109, 118, 70], rocha: [112, 106, 90],
  };
  const mistura = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const doMapa = [0, 0, 0];

  // 1. Cor da região, ponto a ponto, numa grade grossa esticada.
  const [nx, ny] = [Math.ceil(w / passoDeCor) + 1, Math.ceil(h / passoDeCor) + 1];
  const cor = porPixel(nx, ny, (i, j, px, p) => {
    const [mx, my] = [x0 + i * passoDeCor, y0 + j * passoDeCor];
    const hh = altura(mx, my);
    const dec = Math.abs(altura(mx + 2, my) - hh) + Math.abs(altura(mx, my + 2) - hh);
    const R = regiao(mx, my);
    const [n1, n2, n3] = [ruidoDeFora(mx / 34, my / 34, 401), ruidoDeFora(mx / 110, my / 110, 402), ruidoDeFora(mx / 14, my / 14, 403)];
    const escarpa = THREE.MathUtils.smoothstep(dec, 14, 40);
    let sertao = mistura(cores.seco, cores.caatinga, THREE.MathUtils.smoothstep(n1 + (n3 - 0.5) * 0.4, 0.42, 0.62));
    sertao = mistura(sertao, cores.chapada, THREE.MathUtils.smoothstep(hh, 210, 280) * (1 - escarpa) * 0.7);
    sertao = mistura(sertao, cores.escarpa, escarpa * 0.8);
    let cerrado = mistura(cores.cerrado, cores.campo, THREE.MathUtils.smoothstep(n2 + (n3 - 0.5) * 0.3, 0.45, 0.65));
    cerrado = mistura(cerrado, cores.vereda, (1 - THREE.MathUtils.smoothstep(hh, 60, 160)) * 0.6);
    let mata = mistura(cores.mata, cores.mata2, n1);
    mata = mistura(mata, cores.clareira, THREE.MathUtils.smoothstep(n2 + (n3 - 0.5) * 0.3, 0.6, 0.72) * 0.7);
    mata = mistura(mata, cores.rocha, escarpa * THREE.MathUtils.smoothstep(hh, 380, 560));
    const fora = mistura(mistura(sertao, cerrado, R.cerrado / Math.max(0.001, R.cerrado + R.sertao)), mata, R.mata);
    // Do tom do mapa para o da região, em manchas.
    tomDoMapa(mx, my, doMapa);
    const t = THREE.MathUtils.smoothstep(foraDoMapa(mx, my) + (n2 - 0.5) * 120 + (n3 - 0.5) * 30, 0, 150);
    const final = mistura(doMapa, fora, t);
    [px[p], px[p + 1], px[p + 2], px[p + 3]] = [final[0], final[1], final[2], 255];
  });
  c.drawImage(cor, x0 - passoDeCor / 2, y0 - passoDeCor / 2, nx * passoDeCor, ny * passoDeCor);

  // 2. Matas, como as manchas do mapa.
  c.filter = `blur(${Math.max(0.6, 0.75 * pxPorUnidade).toFixed(1)}px)`;
  c.fillStyle = COR_MATA;
  c.beginPath();
  for (const f of listarMatasDeFora()) {
    if (f.x + f.rx < x0 || f.y + f.ry < y0 || f.x - f.rx > x0 + w || f.y - f.ry > y0 + h) continue;
    c.moveTo(f.x + f.rx * Math.cos(f.giro), f.y + f.rx * Math.sin(f.giro));
    c.ellipse(f.x, f.y, f.rx, f.ry, f.giro, 0, Math.PI * 2);
  }
  c.globalAlpha = 0.85;
  c.fill();
  c.globalAlpha = 1;
  c.filter = "none";

  // 3. Mar e rios.
  c.fillStyle = COR_MAR;
  fechar(c, MAR_DE_FORA);
  c.fill();
  c.strokeStyle = COR_MAR;
  c.lineCap = "round";
  c.lineJoin = "round";
  for (const r of RIOS_DE_FORA) {
    c.lineWidth = Math.max(r.largura, 1.2 / pxPorUnidade);
    fechar(c, r.pts);
    c.stroke();
  }

  // 4. Relevo sombreado: a mesma conta de pintarRelevo, na grade de fora.
  const k = CONT_PASSO_FORA / g.passo;
  const sombra = porPixel(g.largura, g.altura, (i, j, px, p) => {
    const a = dadosDoContinente();
    const q = inicio + j * g.largura + i;
    const hh = a[q];
    const dec = ((i + 1 < g.largura ? a[q + 1] : hh) - hh + ((j + 1 < g.altura ? a[q + g.largura] : hh) - hh)) * k;
    const luz = Math.max(58, Math.min(198, 128 - dec * 1.8));
    // Neve só onde a serra do mapa passa da borda; fora dele não neva.
    const neve = THREE.MathUtils.smoothstep(hh, 660, 860) * (1 - THREE.MathUtils.smoothstep(foraDoMapa(g.x0 + i * g.passo, g.y0 + j * g.passo), 20, 140));
    px[p] = px[p + 1] = px[p + 2] = luz + (255 - luz) * neve;
    px[p + 3] = hh > 0 ? 255 : 0;
  });
  c.save();
  c.globalCompositeOperation = "overlay";
  c.drawImage(sombra, x0 - g.passo / 2, y0 - g.passo / 2, g.largura * g.passo, g.altura * g.passo);
  c.restore();

  // 5. Manchas de solo, na densidade do mapa.
  salpicar(c, x0, y0, w, h, tetos, 97);

  // 6. O miolo por cima, com a borda desfeita em manchas.
  const passoMascara = Math.max(1, 1 / pxPorUnidade) * 2;
  const [mx_, my_] = [Math.ceil(miolo.w / passoMascara) + 1, Math.ceil(miolo.h / passoMascara) + 1];
  const mascara = porPixel(mx_, my_, (i, j, px, p) => {
    px[p] = px[p + 1] = px[p + 2] = 255;
    px[p + 3] = 255 * miolo.mascara(miolo.x0 + i * passoMascara, miolo.y0 + j * passoMascara);
  });
  const recorte = document.createElement("canvas");
  [recorte.width, recorte.height] = [Math.round(miolo.w * pxPorUnidade), Math.round(miolo.h * pxPorUnidade)];
  const rc = recorte.getContext("2d")!;
  rc.imageSmoothingQuality = "high";
  rc.drawImage(miolo.canvas, 0, 0, recorte.width, recorte.height);
  rc.globalCompositeOperation = "destination-in";
  rc.drawImage(mascara, -passoMascara / 2 * pxPorUnidade, -passoMascara / 2 * pxPorUnidade, mx_ * passoMascara * pxPorUnidade, my_ * passoMascara * pxPorUnidade);
  c.drawImage(recorte, miolo.x0, miolo.y0, miolo.w, miolo.h);

  const textura = new THREE.CanvasTexture(canvas);
  textura.generateMipmaps = true;
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  return { textura, canvas };
}
const CONT_PASSO_FORA = 2; // o sombreado do mapa mede o declive a cada 2 unidades

/** Malha de uma grade de fora, sem as células que `pular` diz que outra peça cobre. */
function malhaDeFora(g: GradeDeFora, inicio: number, mapa: THREE.Texture, uRaio: { value: number }, pular: (mx: number, my: number) => boolean, baixar: (mx: number, my: number) => number, recuo: number) {
  const [w, h] = [(g.largura - 1) * g.passo, (g.altura - 1) * g.passo];
  const geo = new THREE.PlaneGeometry(w * METROS_POR_UNIDADE_DO_MAPA, h * METROS_POR_UNIDADE_DO_MAPA, g.largura - 1, g.altura - 1).rotateX(-Math.PI / 2);
  const centro = mundoDoMapa(g.x0 + w / 2, g.y0 + h / 2);
  geo.translate(centro.x, 0, centro.z);
  const a = dadosDoContinente();
  const pos = geo.attributes.position;
  for (let j = 0; j < g.altura; j++) {
    for (let i = 0; i < g.largura; i++) {
      const [mx, my] = [g.x0 + i * g.passo, g.y0 + j * g.passo];
      pos.setY(j * g.largura + i, a[inicio + j * g.largura + i] - baixar(mx, my));
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < g.altura - 1; j++) {
    for (let i = 0; i < g.largura - 1; i++) {
      if (pular(g.x0 + (i + 0.5) * g.passo, g.y0 + (j + 0.5) * g.passo)) continue;
      const [p, q] = [j * g.largura + i, (j + 1) * g.largura + i];
      indices.push(p, q, p + 1, q, q + 1, p + 1);
    }
  }
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const material = new THREE.MeshLambertMaterial({ map: mapa, polygonOffset: true, polygonOffsetFactor: recuo, polygonOffsetUnits: recuo });
  material.onBeforeCompile = (s) => {
    abrirBuraco(s, uRaio, false);
    comGrao(s);
  };
  const malha = new THREE.Mesh(geo, material);
  malha.renderOrder = 1;
  return malha;
}

/** Árvores nas matas de fora perto do mapa: de longe, a serra do leste tem copa. */
function montarMatasDeFora(uRaio: { value: number }) {
  const r = sorteio(919);
  const material = new THREE.MeshLambertMaterial({ color: "#3b5533", flatShading: true });
  material.onBeforeCompile = (s) => abrirBuraco(s, uRaio, true);
  const copas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material, ARVORES_DE_FORA);
  const matas = listarMatasDeFora().filter((f) => dentroDaGrade(ALEM_PERTO, f.x, f.y) && foraDoMapa(f.x, f.y) > 4);
  const m = new THREE.Matrix4();
  let n = 0;
  for (let i = 0; i < ARVORES_DE_FORA * 3 && n < ARVORES_DE_FORA && matas.length; i++) {
    const f = matas[Math.floor(r() * matas.length)];
    const [ang, d] = [r() * Math.PI * 2, Math.sqrt(r())];
    const [mx, my] = [f.x + Math.cos(ang) * d * f.rx * 0.8, f.y + Math.sin(ang) * d * f.ry * 0.8];
    const h = alturaEmToda(mx, my);
    if (h < 3 || foraDoMapa(mx, my) < 2) continue;
    const p = mundoDoMapa(mx, my);
    const e = 18 + r() * 24;
    m.makeScale(e, e * 1.4, e).setPosition(p.x, h + e, p.z);
    copas.setMatrixAt(n++, m);
  }
  copas.count = n;
  return copas;
}

/** Fora do mapa: dá para ver, não para ir. */
function montarAlemDoMapa(uRaio: { value: number }) {
  const grupo = new THREE.Group();
  const P = ALEM_PERTO;
  const L = ALEM_LONGE;
  const [wP, hP] = [(P.largura - 1) * P.passo, (P.altura - 1) * P.passo];
  // Dentro do mapa, a peça de perto só aparece na faixa onde a borda se desfaz.
  const ate = (mx: number, my: number) => Math.min(mx, my, LARGURA_MAPA - mx, ALTURA_MAPA - my);
  // Celular: metade da resolução e um quarto das manchas, senão a memória de vídeo estoura.
  const grande = telaGrande();
  const pxPerto = (grande ? 4096 : 2048) / wP;
  const pxLonge = (grande ? 2048 : 1024) / ((L.largura - 1) * L.passo);
  const assadaPerto = deAssada("alem-perto", Math.round(wP * pxPerto), Math.round(hP * pxPerto));
  const assadaLonge = deAssada("alem-longe", Math.round((L.largura - 1) * L.passo * pxLonge), Math.round((L.altura - 1) * L.passo * pxLonge));
  const perto = assadaPerto ? { canvas: assadaPerto, textura: texturaDe(assadaPerto) } : pintarFora(P, INICIO_PERTO, pxPerto, 4, grande ? [16_000, 150_000] : [4000, 37_500], {
    canvas: amostra!.canvas,
    x0: 0,
    y0: 0,
    w: LARGURA_MAPA,
    h: ALTURA_MAPA,
    mascara: (mx, my) => {
      const n = ruidoDeFora(mx / 26, my / 26, 501) * 0.65 + ruidoDeFora(mx / 9, my / 9, 502) * 0.35;
      return THREE.MathUtils.smoothstep(ate(mx, my) / BANDA + (n - 0.5) * 1.1, 0.12, 0.62);
    },
  });
  pintadas.set("alem-perto", perto.canvas);
  const longe = assadaLonge ? { canvas: assadaLonge, textura: texturaDe(assadaLonge) } : pintarFora(L, INICIO_LONGE, pxLonge, 12, grande ? [12_000, 0] : [3000, 0], {
    canvas: perto.canvas,
    x0: P.x0,
    y0: P.y0,
    w: wP,
    h: hP,
    mascara: (mx, my) => THREE.MathUtils.smoothstep(Math.min(mx - P.x0, my - P.y0, P.x0 + wP - mx, P.y0 + hP - my), 0, 60),
  });
  pintadas.set("alem-longe", longe.canvas);
  const dentroDoMapa = (mx: number, my: number) => ate(mx, my) > BANDA + 12;
  grupo.add(
    malhaDeFora(P, INICIO_PERTO, perto.textura, uRaio, dentroDoMapa, (mx, my) => (ate(mx, my) >= 0 ? 3 : 0), 1),
    malhaDeFora(L, INICIO_LONGE, longe.textura, uRaio, (mx, my) => dentroDaGrade(P, mx - L.passo, my - L.passo) && dentroDaGrade(P, mx + L.passo, my + L.passo), () => 0, 3),
    montarMatasDeFora(uRaio),
  );
  return grupo;
}

/** Grão que repete pelo mundo: mantém o chão nítido entre a cidade e o continente. */
function texturaDeGrao() {
  const lado = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = lado;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#808080";
  c.fillRect(0, 0, lado, lado);
  let a = 53;
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 5200; i++) {
    const [x, y, raio] = [r() * lado, r() * lado, 3 + r() * 26];
    const tom = r() > 0.5 ? 255 : 0;
    const g = c.createRadialGradient(x, y, 0, x, y, raio);
    g.addColorStop(0, `rgba(${tom},${tom},${tom},0.16)`);
    g.addColorStop(1, `rgba(${tom},${tom},${tom},0)`);
    c.fillStyle = g;
    // Repete nas quatro bordas para a emenda não aparecer.
    for (const [dx, dy] of [[0, 0], [lado, 0], [-lado, 0], [0, lado], [0, -lado]]) {
      c.setTransform(1, 0, 0, 1, dx, dy);
      c.fillRect(x - raio, y - raio, raio * 2, raio * 2);
    }
  }
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Estradas e trilhos em linha fina: pintados na textura viram borrão de perto. */
function montarVias() {
  const pontosDe = (lista: readonly (readonly Pt[])[]) => {
    const v: number[] = [];
    for (const pts of lista) {
      for (let i = 1; i < pts.length; i++) {
        const [a, b] = [pts[i - 1], pts[i]];
        const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3);
        for (let s = 0; s < n; s++) {
          const q = [s / n, (s + 1) / n].map((t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
          if (q.some(([x, y]) => LUGARES.some((l) => Math.hypot(x - l.mx, y - l.my) < FOLGA_DAS_VIAS))) continue;
          for (const [x, y] of q) {
            const p = mundoDoMapa(x, y);
            v.push(p.x, altitudeContinente(x, y) + 30, p.z);
          }
        }
      }
    }
    return new THREE.Float32BufferAttribute(v, 3);
  };
  const linha = (lista: readonly (readonly Pt[])[], cor: string) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", pontosDe(lista));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: cor }));
  };
  return [linha(ROADS.map((r) => r.pts), "#d7b27a"), linha(RAILS, "#1f1a18")];
}

/** Cor da altitude, por cima do desenho: rocha nas serras, neve no alto. */
function pintarRelevo(c: CanvasRenderingContext2D) {
  const a = dadosDoContinente();
  const img = new ImageData(CONT_LARGURA, CONT_ALTURA);
  for (let j = 0; j < CONT_ALTURA; j++) {
    for (let i = 0; i < CONT_LARGURA; i++) {
      const k = j * CONT_LARGURA + i;
      const h = a[k];
      const dec = (a[k + 1] ?? h) - h + ((a[k + CONT_LARGURA] ?? h) - h);
      const p = k * 4;
      const luz = Math.max(58, Math.min(198, 128 - dec * 1.8));
      const neve = THREE.MathUtils.smoothstep(h, 660, 860);
      img.data[p] = img.data[p + 1] = img.data[p + 2] = luz + (255 - luz) * neve;
      img.data[p + 3] = h > 0 ? 255 : 0;
    }
  }
  const t = document.createElement("canvas");
  t.width = CONT_LARGURA;
  t.height = CONT_ALTURA;
  t.getContext("2d")!.putImageData(img, 0, 0);
  c.save();
  c.globalCompositeOperation = "overlay";
  c.drawImage(t, 0, 0, LARGURA_MAPA, ALTURA_MAPA);
  c.restore();
}

export function montarContinente() {
  if (assando()) (window as unknown as { __texturas: typeof pintadas }).__texturas = pintadas;
  const grupo = new THREE.Group();
  const a = dadosDoContinente();
  const geo = new THREE.PlaneGeometry(
    LARGURA_MAPA * METROS_POR_UNIDADE_DO_MAPA,
    ALTURA_MAPA * METROS_POR_UNIDADE_DO_MAPA,
    CONT_LARGURA - 1,
    CONT_ALTURA - 1,
  ).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, a[i]);
  geo.computeVertexNormals();

  const uRaio = { value: 0 };
  const material = new THREE.MeshLambertMaterial({ map: pintar() });
  // O lugar aberto tem malha própria: o continente abre um buraco para ela.
  material.onBeforeCompile = (s) => {
    abrirBuraco(s, uRaio, false);
    comGrao(s);
    // A borda do mapa se desfaz em manchas sobre a terra de fora, sem linha reta.
    s.uniforms.uMeioMapa = { value: new THREE.Vector2((LARGURA_MAPA * METROS_POR_UNIDADE_DO_MAPA) / 2, (ALTURA_MAPA * METROS_POR_UNIDADE_DO_MAPA) / 2) };
    s.fragmentShader = s.fragmentShader
      .replace("uniform vec2 uOrigem;", "uniform vec2 uOrigem;\nuniform vec2 uMeioMapa;")
      .replace(
        "#include <clipping_planes_fragment>\nif (length(vMundo) < uRaio) discard;",
        `#include <clipping_planes_fragment>
        if (length(vMundo) < uRaio) discard;
        vec2 abs_ = abs(vMundo + uOrigem);
        float ate = min(uMeioMapa.x - abs_.x, uMeioMapa.y - abs_.y) / ${BORDA_DESFEITA.toFixed(1)};
        float mancha = texture2D(uGrao, (vMundo + uOrigem) / 9000.0).r + texture2D(uGrao, (vMundo + uOrigem) / 2300.0).r * 0.5;
        if (ate < 1.0 && ate + (mancha - 0.75) * 1.3 < 0.5) discard;`,
      );
  };
  const malha = new THREE.Mesh(geo, material);
  const vias = montarVias();
  const vizinhas = montarVizinhas();
  malha.add(...vias, montarMatas(uRaio), ...vizinhas.values(), montarAlemDoMapa(uRaio));
  grupo.add(malha);

  const oceano = new THREE.Mesh(new THREE.CircleGeometry(400_000, 64).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: "#2c5c78" }));
  oceano.position.y = -0.5;
  grupo.add(oceano);

  const nomes: THREE.Sprite[] = [];
  const rotulo = (texto: string, mx: number, my: number, forte: boolean) => {
    const s = etiqueta(texto);
    const p = mundoDoMapa(mx, my);
    s.position.set(p.x, altitudeContinente(mx, my) + 300, p.z);
    s.userData.forte = forte;
    nomes.push(s);
    grupo.add(s);
  };
  for (const l of LUGARES) rotulo(l.nome, l.mx, l.my, true);
  for (const d of DECOR_LABELS) rotulo(d.nome.replace("\n", " "), d.x, d.y, false);
  return { grupo, malha, nomes, uRaio, uOrigem, vias, vizinhas };
}
