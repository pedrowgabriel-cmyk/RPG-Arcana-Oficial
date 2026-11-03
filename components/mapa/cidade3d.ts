// Monta um lugar (lib/mapa/cidades) em Three.js. Prédios fechados e árvores em
// InstancedMesh para aguentar cidade grande no celular; só os entráveis têm
// malha própria, porque abrem o telhado.

import * as THREE from "three";
import type { Relevo } from "@/lib/mapa/relevo";
import { LARGURA_PORTA, faceDaPorta, dentroDoPoligono, type Zona } from "@/lib/mapa/zona";
import type { Area, Chao, Especie, Piso, Predio, TipoArea, TipoPredio, XZ } from "@/lib/mapa/tipos";
import { lugarPorId } from "@/lib/mapa/lugares";
import { corDoContinente } from "./continente3d";
import { etiqueta } from "./etiqueta";

const LADO_TEXTURA = 2048;
const COR_FUNDACAO = "#6b6358";
/** Fração do raio onde o lugar começa a se dissolver no continente. */
export const INICIO_DA_BORDA = 0.82;
const MAX_ARVORES = 4000;

const COR_CHAO: Record<Chao, string> = {
  campo: "#6f7743",
  lama: "#5e4c34",
  areia: "#c9a35f",
  neve: "#dfe4e6",
  cinzas: "#59544d",
  carvao: "#3b3733",
  umido: "#4c5a3c",
  pedra: "#8b8373",
};
const COR_PISO: Record<Piso, string> = {
  terra: "#a98c5e",
  pedra: "#8f8a80",
  lama: "#4f3f2b",
  areia: "#dcbc7c",
  neve: "#f2f5f6",
  madeira: "#6b4a2c",
  trilho: "#3a3430",
};
const COR_AREA: Record<TipoArea, string> = {
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
      img.data[p + 3] = t * 235;
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

function montarAgua(zona: Zona, grupo: THREE.Group) {
  const material = new THREE.MeshLambertMaterial({ color: "#2f6a86", transparent: true, opacity: 0.93 });
  zona.cidade.areas.forEach((a, i) => {
    const nivel = zona.relevo?.niveis.get(i);
    if (a.tipo !== "agua" || nivel === undefined) return;
    const forma = new THREE.Shape(a.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const m = new THREE.Mesh(new THREE.ShapeGeometry(forma).rotateX(-Math.PI / 2), material);
    m.position.y = nivel;
    grupo.add(m);
  });
}

function pintarChao(zona: Zona) {
  const { cidade } = zona;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = LADO_TEXTURA;
  const c = canvas.getContext("2d")!;
  const px = (v: number) => ((v + cidade.raio) / (cidade.raio * 2)) * LADO_TEXTURA;
  const k = LADO_TEXTURA / (cidade.raio * 2);
  c.fillStyle = COR_CHAO[cidade.chao];
  c.fillRect(0, 0, LADO_TEXTURA, LADO_TEXTURA);
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
  // Última faixa na cor do continente: sem isso o lugar vira um disco no mapa.
  const l = lugarPorId(cidade.id);
  const borda = c.createRadialGradient(LADO_TEXTURA / 2, LADO_TEXTURA / 2, LADO_TEXTURA * 0.36, LADO_TEXTURA / 2, LADO_TEXTURA / 2, LADO_TEXTURA * 0.5);
  const cor = corDoContinente(l.mx, l.my);
  borda.addColorStop(0, cor.replace("rgb", "rgba").replace(")", ",0)"));
  borda.addColorStop(1, cor);
  c.fillStyle = borda;
  c.fillRect(0, 0, LADO_TEXTURA, LADO_TEXTURA);
  // E a borda se dissolve no continente, que continua por baixo.
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

function montarEntravel(p: Predio, n: number, grupo: THREE.Group, tetos: Teto[], base: number, fundacao: number) {
  const parede = new THREE.MeshLambertMaterial({ color: corDe(p, n) });
  const interior = new THREE.Group();
  const parte = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
    const malha = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    malha.position.set(p.x + x, y + base, p.z + z);
    malha.castShadow = true;
    return malha;
  };
  grupo.add(parte(p.largura + 0.4, fundacao, p.fundo + 0.4, 0, -fundacao / 2, 0, new THREE.MeshLambertMaterial({ color: COR_FUNDACAO })));
  const e = 0.5;
  const { largura: L, fundo: F, altura: A } = p;
  const face = faceDaPorta(p);
  const cheia = (f: "n" | "s" | "l" | "o") => {
    const [w, d, x, z] = f === "n" ? [L, e, 0, -F / 2] : f === "s" ? [L, e, 0, F / 2] : f === "l" ? [e, F, L / 2, 0] : [e, F, -L / 2, 0];
    grupo.add(parte(w, A, d, x, A / 2, z, parede));
  };
  (["n", "s", "l", "o"] as const).filter((f) => f !== face).forEach(cheia);
  const horizontal = face === "n" || face === "s";
  const comprimento = horizontal ? L : F;
  const lado = (comprimento - LARGURA_PORTA) / 2;
  const fixo = face === "s" ? F / 2 : face === "n" ? -F / 2 : face === "l" ? L / 2 : -L / 2;
  for (const sinal of [-1, 1]) {
    const c = (sinal * (lado + LARGURA_PORTA)) / 2;
    grupo.add(horizontal ? parte(lado, A, e, c, A / 2, fixo, parede) : parte(e, A, lado, fixo, A / 2, c, parede));
  }

  const madeira = new THREE.MeshLambertMaterial({ color: "#5a3a22" });
  const piso = parte(L - 0.4, 0.1, F - 0.4, 0, 0.06, 0, new THREE.MeshLambertMaterial({ color: "#c9ae84" }));
  piso.castShadow = false;
  interior.add(piso, parte(L * 0.6, 1.1, 1, 0, 0.55, face === "n" ? F / 2 - 1.5 : -F / 2 + 1.5, madeira));
  if (L > 11) for (const lx of [-0.28, 0.28]) interior.add(parte(2.2, 0.9, 2.2, L * lx, 0.45, 0, madeira));
  grupo.add(interior);

  let telhado: THREE.Object3D;
  if (SEM_TELHADO.includes(p.tipo)) telhado = new THREE.Group();
  else {
    const m = new THREE.Mesh(prismaUnitario(), new THREE.MeshLambertMaterial({ color: COR_TELHADO[p.tipo] ?? "#6e3a2a", side: THREE.DoubleSide }));
    m.scale.set(L * 1.06, 2.6, F * 1.06);
    m.position.set(p.x, A + base, p.z);
    m.castShadow = true;
    telhado = m;
  }
  grupo.add(telhado);
  tetos.push({ predio: p, telhado, interior });

  const nome = etiqueta(p.nome, 1.5);
  nome.position.set(p.x, A + 6 + base, p.z);
  nome.userData.predio = true;
  grupo.add(nome);
  return nome;
}

function montarFechados(lista: Predio[], grupo: THREE.Group, relevo: Relevo | null) {
  if (!lista.length) return;
  const base = (p: Predio) => relevo?.baseDe(p.id) ?? 0;
  const fundacao = (p: Predio) => relevo?.fundacoes.get(p.id) ?? 0;
  const caixas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: "#fff" }), lista.length);
  const comTelhado = lista.filter((p) => !SEM_TELHADO.includes(p.tipo));
  const telhados = new THREE.InstancedMesh(prismaUnitario(), new THREE.MeshLambertMaterial({ color: "#fff", side: THREE.DoubleSide }), Math.max(1, comTelhado.length));
  const m = new THREE.Matrix4();
  lista.forEach((p, i) => {
    m.makeScale(p.largura, p.altura + fundacao(p), p.fundo).setPosition(p.x, base(p) - fundacao(p), p.z);
    caixas.setMatrixAt(i, m);
    caixas.setColorAt(i, corDe(p, i));
  });
  comTelhado.forEach((p, i) => {
    m.makeScale(p.largura * 1.06, 2.4, p.fundo * 1.06).setPosition(p.x, base(p) + p.altura, p.z);
    telhados.setMatrixAt(i, m);
    telhados.setColorAt(i, new THREE.Color(COR_TELHADO[p.tipo] ?? ["#6e3a2a", "#7a4630", "#5f3426"][i % 3]));
  });
  caixas.castShadow = telhados.castShadow = true;
  telhados.count = comTelhado.length;
  grupo.add(caixas, telhados);
}

const FORMA: Record<Especie, { copa: THREE.BufferGeometry; cor: string; tronco: number; altura: number }> = {
  copa: { copa: new THREE.IcosahedronGeometry(2.4, 0), cor: "#46603a", tronco: 2.2, altura: 3.4 },
  pinheiro: { copa: new THREE.ConeGeometry(2.2, 6, 6), cor: "#2f4a3a", tronco: 1.6, altura: 4.2 },
  cacto: { copa: new THREE.CylinderGeometry(0.5, 0.6, 3.6, 6), cor: "#5e7a45", tronco: 0.2, altura: 1.8 },
  seca: { copa: new THREE.IcosahedronGeometry(1.5, 0), cor: "#5a4a38", tronco: 2.6, altura: 3 },
  cogumelo: { copa: new THREE.SphereGeometry(2, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), cor: "#7a4f7e", tronco: 2.4, altura: 2.3 },
};

function prng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function montarArvores(zona: Zona, grupo: THREE.Group) {
  const { cidade } = zona;
  const r = prng(cidade.raio + cidade.predios.length);
  const pontos: { x: number; z: number }[] = [];
  const serve = (x: number, z: number) => zona.pontoLivre(x, z) && !zona.predioNoPonto(x, z) && !zona.naRua(x, z, 2);

  for (const a of cidade.areas.filter((a) => a.tipo === "mata")) {
    const xs = a.pts.map((p) => p[0]);
    const zs = a.pts.map((p) => p[1]);
    const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    const quantas = Math.min(1200, Math.round(((x1 - x0) * (z1 - z0)) / 180));
    for (let i = 0; i < quantas; i++) {
      const [x, z] = [x0 + r() * (x1 - x0), z0 + r() * (z1 - z0)];
      if (dentroDoPoligono(x, z, a.pts) && serve(x, z)) pontos.push({ x, z });
    }
  }
  for (let i = 0; i < cidade.arvores * 2 && pontos.length < MAX_ARVORES; i++) {
    const angulo = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * (cidade.raio - 2);
    const [x, z] = [Math.cos(angulo) * d, Math.sin(angulo) * d];
    if (serve(x, z)) pontos.push({ x, z });
  }
  const usados = pontos.slice(0, MAX_ARVORES);
  if (!usados.length) return;

  const f = FORMA[cidade.especie];
  const copa = new THREE.InstancedMesh(f.copa.clone(), new THREE.MeshLambertMaterial({ color: f.cor, flatShading: true }), usados.length);
  const tronco = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.32, 1, 5).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: "#4a3524" }), usados.length);
  const m = new THREE.Matrix4();
  usados.forEach((p, i) => {
    const e = 0.8 + r() * 0.7;
    const y = zona.altura(p.x, p.z);
    m.makeScale(e, e, e).setPosition(p.x, y + f.altura * e, p.z);
    copa.setMatrixAt(i, m);
    m.makeScale(e, e * f.tronco, e).setPosition(p.x, y, p.z);
    tronco.setMatrixAt(i, m);
  });
  copa.castShadow = true;
  grupo.add(copa, tronco);
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
  const grupo = new THREE.Group();
  const tetos: Teto[] = [];
  const nomes: THREE.Sprite[] = [];
  const { cidade } = zona;
  const chao = new THREE.Mesh(malhaDoChao(zona), new THREE.MeshLambertMaterial({ map: pintarChao(zona), transparent: true }));
  chao.receiveShadow = true;
  grupo.add(chao);
  montarAgua(zona, grupo);
  for (const f of cidade.feicoes ?? []) {
    if (f.tipo === "gruta") montarGruta(f.x, f.z, zona, grupo);
  }

  const entraveis = cidade.predios.filter((p) => p.entravel);
  entraveis.forEach((p, i) => nomes.push(montarEntravel(p, i, grupo, tetos, zona.relevo?.baseDe(p.id) ?? 0, zona.relevo?.fundacoes.get(p.id) ?? 0)));
  montarFechados(cidade.predios.filter((p) => !p.entravel), grupo, zona.relevo);
  montarArvores(zona, grupo);
  return { grupo, chao, tetos, nomes };
}
