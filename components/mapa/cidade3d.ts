// Monta um lugar (lib/mapa/cidades) em Three.js. Prédios fechados e árvores em
// InstancedMesh para aguentar cidade grande no celular; só os entráveis têm
// malha própria, porque abrem o telhado.

import * as THREE from "three";
import type { Zona } from "@/lib/mapa/zona";
import type { Area, Chao, Piso, Predio, TipoArea, TipoPredio, XZ } from "@/lib/mapa/tipos";
import { lugarPorId } from "@/lib/mapa/lugares";
import { comGrao, copiarContinente } from "./continente3d";
import { METROS_POR_UNIDADE_DO_MAPA } from "@/lib/mapa/dados-relevo";
import { etiqueta } from "./etiqueta";
import { preparar, tingir } from "./natureza/ferramentas";
import { materialDe } from "./natureza/materiais";
import { Natureza } from "./natureza/natureza3d";
import { Construcoes } from "./construcoes/construcoes3d";

const LADO_TEXTURA = 2048;
const COR_DA_AGUA = "#24464a";
/** Fração do raio onde o lugar começa a se dissolver no continente. */
export const INICIO_DA_BORDA = 0.82;

export const COR_CHAO: Record<Chao, string> = {
  campo: "#6f7743",
  lama: "#5e4c34",
  areia: "#c9a35f",
  neve: "#dfe4e6",
  cinzas: "#59544d",
  carvao: "#3b3733",
  umido: "#4c5a3c",
  pedra: "#8b8373",
};
export const COR_PISO: Record<Piso, string> = {
  terra: "#a98c5e",
  pedra: "#8f8a80",
  lama: "#4f3f2b",
  areia: "#dcbc7c",
  neve: "#f2f5f6",
  madeira: "#6b4a2c",
  trilho: "#3a3430",
};
export const COR_AREA: Record<TipoArea, string> = {
  agua: "#2c5c78",
  rochas: "#6e675d",
  lavoura: "#6f7a34",
  pasto: "#8f9a4e",
  mata: "#3f5a35",
  praca: "#b39a6e",
  cemiterio: "#5f6650",
  lama: "#4f3f2b",
  areia: "#d8b876",
  neve: "#eef2f3",
  cinzas: "#4a4641",
  fungos: "#6a4f6e",
};
const COR_PAREDE: Record<TipoPredio, string[]> = {
  casa: ["#a9825c", "#94704e", "#b39268", "#8f6e50"],
  comercio: ["#9a7a58", "#8a6a4a"],
  saloon: ["#8a5a3a"],
  hotel: ["#b5a184", "#a08c6e"],
  igreja: ["#d6cdbb"],
  publico: ["#b9b0a0"],
  banco: ["#a8a297"],
  estacao: ["#8f6048"],
  galpao: ["#6f5a44"],
  fazenda: ["#b08a5a", "#a36a4a"],
  moinho: ["#8d8476"],
  fabrica: ["#6e4a3e"],
  torre: ["#7c7a74"],
  tenda: ["#cdb98f"],
  ruina: ["#4a4640"],
};
const COR_TELHADO: Partial<Record<TipoPredio, string>> = { igreja: "#4a4a55", estacao: "#4a3a30", fabrica: "#3f3a38", tenda: "#e0d2b0", banco: "#5a5a60" };
const SEM_TELHADO: TipoPredio[] = ["ruina"];

function prismaUnitario() {
  // Telhado de duas águas com a cumeeira no eixo x, base de 1×1 e altura 1.
  const s = 0.5;
  const pts = [
    [-s, 0, s], [s, 0, s], [s, 1, 0], [-s, 0, s], [s, 1, 0], [-s, 1, 0],
    [s, 0, -s], [-s, 0, -s], [-s, 1, 0], [s, 0, -s], [-s, 1, 0], [s, 1, 0],
    [-s, 0, -s], [-s, 0, s], [-s, 1, 0],
    [s, 0, s], [s, 0, -s], [s, 1, 0],
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts.flat(), 3));
  g.computeVertexNormals();
  return g;
}

function corDe(p: Predio, n: number) {
  const lista = COR_PAREDE[p.tipo];
  return new THREE.Color(lista[n % lista.length]);
}

/** Rocha exposta onde é íngreme e terra seca nas cristas. */
function pintarEncostas(c: CanvasRenderingContext2D, zona: Zona) {
  const relevo = zona.relevo;
  if (!relevo) return;
  const lado = relevo.n + 1;
  const img = new ImageData(lado, lado);
  for (let j = 0; j < lado; j++) {
    for (let i = 0; i < lado; i++) {
      const [x, z] = [i * relevo.passo - relevo.raio, j * relevo.passo - relevo.raio];
      const t = THREE.MathUtils.smoothstep(relevo.inclinacao(x, z), 0.22, 0.6);
      const p = (j * lado + i) * 4;
      img.data[p] = 112;
      img.data[p + 1] = 100;
      img.data[p + 2] = 84;
      img.data[p + 3] = t * 235 * (1 - THREE.MathUtils.smoothstep(Math.hypot(x, z) / relevo.raio, 0.62, INICIO_DA_BORDA));
    }
  }
  const t = document.createElement("canvas");
  t.width = t.height = lado;
  t.getContext("2d")!.putImageData(img, 0, 0);
  c.drawImage(t, 0, 0, LADO_TEXTURA, LADO_TEXTURA);
}

/** Malha do chão: grade do relevo, sem as células fora do raio. */
function malhaDoChao(zona: Zona) {
  const relevo = zona.relevo!;
  const { n, passo, raio, h } = relevo;
  const lado = n + 1;
  const pos = new Float32Array(lado * lado * 3);
  const uv = new Float32Array(lado * lado * 2);
  for (let j = 0; j < lado; j++) {
    for (let i = 0; i < lado; i++) {
      const k = j * lado + i;
      pos[k * 3] = i * passo - raio;
      pos[k * 3 + 1] = h[k];
      pos[k * 3 + 2] = j * passo - raio;
      uv[k * 2] = i / n;
      uv[k * 2 + 1] = 1 - j / n;
    }
  }
  // Celular desenha um ponto a cada dois: a colisão segue usando a grade inteira.
  const s = window.matchMedia("(min-width: 1024px)").matches ? 1 : 2;
  const ind: number[] = [];
  for (let j = 0; j + s <= n; j += s) {
    for (let i = 0; i + s <= n; i += s) {
      if (Math.hypot((i + s / 2) * passo - raio, (j + s / 2) * passo - raio) > raio) continue;
      const a = j * lado + i;
      const [b, c, d] = [a + lado * s, a + s, a + lado * s + s];
      ind.push(a, b, c, c, b, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(ind);
  g.computeVertexNormals();
  return g;
}

/** Lagos e açudes com a água animada da natureza. Cor escura: clara ela vira espuma. */
function montarAgua(zona: Zona, grupo: THREE.Group) {
  let quantas = 0;
  zona.cidade.areas.forEach((a, i) => {
    const nivel = zona.relevo?.niveis.get(i);
    if (a.tipo !== "agua" || nivel === undefined) return;
    const forma = new THREE.Shape(a.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geometria = tingir(preparar(new THREE.ShapeGeometry(forma).rotateX(-Math.PI / 2)), COR_DA_AGUA, 0.06, i);
    const m = new THREE.Mesh(geometria, materialDe("agua"));
    m.position.y = nivel;
    grupo.add(m);
    quantas++;
  });
  return quantas > 0;
}

function pintarChao(zona: Zona) {
  const { cidade } = zona;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = LADO_TEXTURA;
  const c = canvas.getContext("2d")!;
  const px = (v: number) => ((v + cidade.raio) / (cidade.raio * 2)) * LADO_TEXTURA;
  const k = LADO_TEXTURA / (cidade.raio * 2);
  const l = lugarPorId(cidade.id);
  copiarContinente(c, l.mx, l.my, cidade.raio / METROS_POR_UNIDADE_DO_MAPA, LADO_TEXTURA);
  pintarEncostas(c, zona);
  const trilha = (pts: readonly XZ[]) => {
    c.beginPath();
    pts.forEach(([x, z], i) => (i ? c.lineTo(px(x), px(z)) : c.moveTo(px(x), px(z))));
  };
  const area = (a: Area) => {
    c.fillStyle = COR_AREA[a.tipo];
    trilha(a.pts);
    c.closePath();
    c.fill();
  };
  for (const a of cidade.areas) area(a);
  c.lineCap = "round";
  c.lineJoin = "round";
  for (const r of cidade.ruas) {
    c.strokeStyle = COR_PISO[r.piso];
    c.lineWidth = Math.max(1.5, r.largura * k);
    trilha(r.pts);
    c.stroke();
  }
  // A borda se dissolve no continente, que continua por baixo.
  const fim = c.createRadialGradient(LADO_TEXTURA / 2, LADO_TEXTURA / 2, LADO_TEXTURA * INICIO_DA_BORDA * 0.5, LADO_TEXTURA / 2, LADO_TEXTURA / 2, LADO_TEXTURA * 0.5);
  fim.addColorStop(0, "rgba(0,0,0,0)");
  fim.addColorStop(1, "rgba(0,0,0,1)");
  c.globalCompositeOperation = "destination-out";
  c.fillStyle = fim;
  c.fillRect(0, 0, LADO_TEXTURA, LADO_TEXTURA);
  c.globalCompositeOperation = "source-over";
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export type Teto = { predio: Predio; telhado: THREE.Object3D; interior: THREE.Object3D };


/** Caixa e telhado em instância; `onde` diz a posição: local no lugar, global no continente. */
export function montarPredios(lista: Predio[], grupo: THREE.Group, onde: (p: Predio) => { x: number; z: number; y: number; fundacao: number }) {
  if (!lista.length) return;
  const caixas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: "#fff" }), lista.length);
  const comTelhado = lista.filter((p) => !SEM_TELHADO.includes(p.tipo));
  const telhados = new THREE.InstancedMesh(prismaUnitario(), new THREE.MeshLambertMaterial({ color: "#fff", side: THREE.DoubleSide }), Math.max(1, comTelhado.length));
  const m = new THREE.Matrix4();
  lista.forEach((p, i) => {
    const o = onde(p);
    m.makeScale(p.largura, p.altura + o.fundacao, p.fundo).setPosition(o.x, o.y - o.fundacao, o.z);
    caixas.setMatrixAt(i, m);
    caixas.setColorAt(i, corDe(p, i));
  });
  comTelhado.forEach((p, i) => {
    const o = onde(p);
    m.makeScale(p.largura * 1.06, 2.4, p.fundo * 1.06).setPosition(o.x, o.y + p.altura, o.z);
    telhados.setMatrixAt(i, m);
    telhados.setColorAt(i, new THREE.Color(COR_TELHADO[p.tipo] ?? ["#6e3a2a", "#7a4630", "#5f3426"][i % 3]));
  });
  caixas.castShadow = telhados.castShadow = true;
  telhados.count = comTelhado.length;
  grupo.add(caixas, telhados);
}




/** Boca de gruta na encosta. O interior vem depois, como lugar próprio. */
function montarGruta(x: number, z: number, zona: Zona, grupo: THREE.Group) {
  const y = zona.altura(x, z);
  const rocha = new THREE.Mesh(new THREE.IcosahedronGeometry(9, 1), new THREE.MeshLambertMaterial({ color: "#6e675d", flatShading: true }));
  rocha.scale.set(1.5, 0.9, 1);
  rocha.position.set(x, y + 3, z);
  const boca = new THREE.Mesh(new THREE.CircleGeometry(4.5, 16), new THREE.MeshBasicMaterial({ color: "#090807" }));
  boca.position.set(x, y + 3.2, z + 8.2);
  grupo.add(rocha, boca);
}

export function montarLugar(zona: Zona) {
  const raiz = new THREE.Group();
  // Prédios e árvores trocam de nível de detalhe juntos; o chão só some aos poucos.
  const grupo = new THREE.Group();
  const nomes: THREE.Sprite[] = [];
  const { cidade } = zona;
  const material = new THREE.MeshLambertMaterial({ map: pintarChao(zona), transparent: true });
  material.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vMundo;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvMundo = (modelMatrix * vec4(position, 1.0)).xz;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 vMundo;");
    comGrao(s);
  };
  const chao = new THREE.Mesh(malhaDoChao(zona), material);
  chao.receiveShadow = true;
  raiz.add(chao, grupo);
  const temAgua = montarAgua(zona, grupo);
  for (const f of cidade.feicoes ?? []) {
    if (f.tipo === "gruta") montarGruta(f.x, f.z, zona, grupo);
  }

  // Prédios no estilo da cidade; enquanto o estilo carrega, nada some: as caixas leves ficam.
  const construcoes = new Construcoes(zona, (predios) => {
    const g = new THREE.Group();
    montarPredios(predios, g, (p) => ({ x: p.x, z: p.z, y: zona.relevo?.baseDe(p.id) ?? 0, fundacao: zona.relevo?.fundacoes.get(p.id) ?? 0 }));
    return g;
  });
  grupo.add(construcoes.grupo);
  void construcoes.carregar();
  for (const p of cidade.predios.filter((p) => p.entravel)) {
    const nome = etiqueta(p.nome, 1.5);
    nome.position.set(p.x, p.altura + 6 + (zona.relevo?.baseDe(p.id) ?? 0), p.z);
    nome.userData.predio = true;
    grupo.add(nome);
    nomes.push(nome);
  }
  // Árvores, pedras e capim: modelos da natureza, carregados logo depois do lugar.
  const natureza = new Natureza(zona);
  grupo.add(natureza.grupo);
  void natureza.carregar();
  return { grupo: raiz, detalhes: grupo, chao, material, tetos: construcoes.tetos, nomes, natureza, temAgua, construcoes };
}
