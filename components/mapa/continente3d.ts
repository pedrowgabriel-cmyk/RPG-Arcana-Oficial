// Continente inteiro em uma malha só: o desenho vem de um canvas pintado com a
// geografia do mapa impresso e o relevo do desenho das serras.

import * as THREE from "three";
import {
  EAST_COAST,
  FOREST_BLOBS,
  ISLAND_DEF,
  LAKE_DEFS,
  RAILS,
  RIDGES,
  RIVER_DEFS,
  ROADS,
  WEST_COAST,
  DECOR_LABELS,
  type Pt,
} from "@/lib/mapa/geografia";
import { ALTURA_MAPA, LARGURA_MAPA, LUGARES, METROS_POR_UNIDADE_DO_MAPA, mundoDoMapa } from "@/lib/mapa/lugares";
import { etiqueta } from "./etiqueta";

const PX_POR_UNIDADE = 2;
const DIVISOES_X = 250;
const DIVISOES_Z = 184;
const ALTURA_SERRA = 9000; // exagerada: serra real some nesta distância
const RAIO_PLANO = 16; // unidades do mapa: em volta de cada lugar o chão é plano

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
  const c = canvas.getContext("2d")!;
  c.scale(PX_POR_UNIDADE, PX_POR_UNIDADE);
  c.fillStyle = "#8a8748";
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
  c.fillStyle = "#8a8748";
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
  for (const r of ROADS) {
    c.strokeStyle = "#c2a06a";
    c.lineWidth = r.kind === "main" ? 2 : 1.2;
    c.setLineDash(r.kind === "main" || r.kind === "sec" ? [] : [4, 3]);
    fechar(c, r.pts);
    c.stroke();
  }
  c.setLineDash([3, 2]);
  c.strokeStyle = "#2a2522";
  c.lineWidth = 1.2;
  for (const r of RAILS) {
    fechar(c, r);
    c.stroke();
  }
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}

function distanciaSegmento(x: number, y: number, r: (typeof RIDGES)[number]) {
  const dx = r.x2 - r.x1;
  const dy = r.y2 - r.y1;
  const t = Math.max(0, Math.min(1, ((x - r.x1) * dx + (y - r.y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - r.x1 - t * dx, y - r.y1 - t * dy);
}

function altitude(mx: number, my: number) {
  let h = 0;
  for (const r of RIDGES) {
    const d = distanciaSegmento(mx, my, r);
    h = Math.max(h, Math.exp(-(d * d) / 900) * (0.75 + 0.25 * Math.sin(mx * 0.09) * Math.cos(my * 0.11)));
  }
  const perto = Math.min(...LUGARES.map((l) => Math.hypot(mx - l.mx, my - l.my)));
  return h * ALTURA_SERRA * THREE.MathUtils.smoothstep(perto, RAIO_PLANO * 0.5, RAIO_PLANO);
}

export function montarContinente() {
  const grupo = new THREE.Group();
  const geo = new THREE.PlaneGeometry(
    LARGURA_MAPA * METROS_POR_UNIDADE_DO_MAPA,
    ALTURA_MAPA * METROS_POR_UNIDADE_DO_MAPA,
    DIVISOES_X,
    DIVISOES_Z,
  ).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const mx = pos.getX(i) / METROS_POR_UNIDADE_DO_MAPA + LARGURA_MAPA / 2;
    const my = pos.getZ(i) / METROS_POR_UNIDADE_DO_MAPA + ALTURA_MAPA / 2;
    pos.setY(i, altitude(mx, my));
  }
  geo.computeVertexNormals();
  const malha = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: pintar() }));
  malha.position.y = -2;
  grupo.add(malha);

  const nomes: THREE.Sprite[] = [];
  const rotulo = (texto: string, mx: number, my: number, forte: boolean) => {
    const s = etiqueta(texto);
    const p = mundoDoMapa(mx, my);
    s.position.set(p.x, 1500, p.z);
    s.userData.forte = forte;
    nomes.push(s);
    grupo.add(s);
  };
  for (const l of LUGARES) rotulo(l.nome, l.mx, l.my, true);
  for (const d of DECOR_LABELS) rotulo(d.nome.replace("\n", " "), d.x, d.y, false);
  return { grupo, nomes };
}
