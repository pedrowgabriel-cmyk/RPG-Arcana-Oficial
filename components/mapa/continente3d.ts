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
import { CONT_ALTURA, CONT_LARGURA } from "@/lib/mapa/dados-relevo";
import { altitudeContinente, dadosDoContinente } from "@/lib/mapa/relevo";
import { ALTURA_MAPA, LARGURA_MAPA, LUGARES, METROS_POR_UNIDADE_DO_MAPA, cidadesCarregadas, lugarPorId, mundoDoMapa } from "@/lib/mapa/lugares";
import type { XZ } from "@/lib/mapa/tipos";
import { COR_AREA, COR_CHAO, COR_PISO, montarPredios } from "./cidade3d";
import { etiqueta } from "./etiqueta";

const PX_POR_UNIDADE = 4;
const ARVORES = 9000;
const COR_TERRA = "#6f7743";
const FOLGA_DAS_VIAS = 24; // unidades do mapa: em volta do lugar a rua é a da cidade

let amostra: CanvasRenderingContext2D | null = null;

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
  const textura = new THREE.CanvasTexture(canvas);
  textura.generateMipmaps = true;
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}

/** Manchas de vegetação e solo, em duas escalas: o desenho sozinho fica chapado de perto. */
function salpicar(c: CanvasRenderingContext2D) {
  const r = (() => {
    let a = 91;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })();
  c.save();
  c.globalCompositeOperation = "soft-light";
  for (const [quantas, tamanho, forca] of [[3800, 18, 0.1], [60000, 1.6, 0.15]] as const) {
    for (let i = 0; i < quantas; i++) {
      c.fillStyle = r() > 0.5 ? `rgba(22,44,20,${forca})` : `rgba(226,204,150,${forca})`;
      c.beginPath();
      c.ellipse(r() * LARGURA_MAPA, r() * ALTURA_MAPA, tamanho * (0.5 + r()), tamanho * (0.3 + r() * 0.7), r() * 3, 0, Math.PI * 2);
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
    for (let i = 0; i < 70; i++) {
      const [ang, d, e] = [semente() * Math.PI * 2, Math.sqrt(semente()) * raio * 1.05, raio * (0.2 + semente() * 0.4)];
      const [x, y] = [l.mx + Math.cos(ang) * d, l.my + Math.sin(ang) * d];
      const g = c.createRadialGradient(x, y, 0, x, y, e);
      g.addColorStop(0, `rgba(${cor},0.34)`);
      g.addColorStop(1, `rgba(${cor},0)`);
      c.fillStyle = g;
      c.fillRect(x - e, y - e, e * 2, e * 2);
    }
    for (const a of cidade.areas) {
      if (a.tipo === "agua") continue;
      c.fillStyle = COR_AREA[a.tipo];
      c.globalAlpha = 0.8;
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
      diffuseColor.rgb *= 1.0 + (grao - 0.5) * 1.5;`,
    );
}

/** Copia o chão do continente: o lugar nasce com a mesma cor do que está em volta. */
export function copiarContinente(destino: CanvasRenderingContext2D, mx: number, my: number, raioEmUnidades: number, lado: number) {
  const px = PX_POR_UNIDADE;
  destino.drawImage(amostra!.canvas, (mx - raioEmUnidades) * px, (my - raioEmUnidades) * px, raioEmUnidades * 2 * px, raioEmUnidades * 2 * px, 0, 0, lado, lado);
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
  };
  const malha = new THREE.Mesh(geo, material);
  const vias = montarVias();
  const vizinhas = montarVizinhas();
  malha.add(...vias, montarMatas(uRaio), ...vizinhas.values());
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
