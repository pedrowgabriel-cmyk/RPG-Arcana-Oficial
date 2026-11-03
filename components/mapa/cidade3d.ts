// Monta um lugar (lib/mapa/cidades) em Three.js. Prédios fechados e árvores em
// InstancedMesh para aguentar cidade grande no celular; só os entráveis têm
// malha própria, porque abrem o telhado.

import * as THREE from "three";
import { LARGURA_PORTA, faceDaPorta, dentroDoPoligono, type Zona } from "@/lib/mapa/zona";
import type { Area, Chao, Especie, Piso, Predio, TipoArea, TipoPredio, XZ } from "@/lib/mapa/tipos";
import { etiqueta } from "./etiqueta";

const LADO_TEXTURA = 2048;
const MAX_ARVORES = 4000;

const COR_CHAO: Record<Chao, string> = {
  campo: "#7d7a45",
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

function pintarChao(zona: Zona) {
  const { cidade } = zona;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = LADO_TEXTURA;
  const c = canvas.getContext("2d")!;
  const px = (v: number) => ((v + cidade.raio) / (cidade.raio * 2)) * LADO_TEXTURA;
  const k = LADO_TEXTURA / (cidade.raio * 2);
  c.fillStyle = COR_CHAO[cidade.chao];
  c.fillRect(0, 0, LADO_TEXTURA, LADO_TEXTURA);
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
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export type Teto = { predio: Predio; telhado: THREE.Object3D; interior: THREE.Object3D };

function montarEntravel(p: Predio, n: number, grupo: THREE.Group, tetos: Teto[]) {
  const parede = new THREE.MeshLambertMaterial({ color: corDe(p, n) });
  const interior = new THREE.Group();
  const parte = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
    const malha = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    malha.position.set(p.x + x, y, p.z + z);
    malha.castShadow = true;
    return malha;
  };
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
    m.position.set(p.x, A, p.z);
    m.castShadow = true;
    telhado = m;
  }
  grupo.add(telhado);
  tetos.push({ predio: p, telhado, interior });

  const nome = etiqueta(p.nome, 1.5);
  nome.position.set(p.x, A + 6, p.z);
  nome.userData.predio = true;
  grupo.add(nome);
  return nome;
}

function montarFechados(lista: Predio[], grupo: THREE.Group) {
  if (!lista.length) return;
  const caixas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: "#fff" }), lista.length);
  const comTelhado = lista.filter((p) => !SEM_TELHADO.includes(p.tipo));
  const telhados = new THREE.InstancedMesh(prismaUnitario(), new THREE.MeshLambertMaterial({ color: "#fff", side: THREE.DoubleSide }), Math.max(1, comTelhado.length));
  const m = new THREE.Matrix4();
  lista.forEach((p, i) => {
    m.makeScale(p.largura, p.altura, p.fundo).setPosition(p.x, 0, p.z);
    caixas.setMatrixAt(i, m);
    caixas.setColorAt(i, corDe(p, i));
  });
  comTelhado.forEach((p, i) => {
    m.makeScale(p.largura * 1.06, 2.4, p.fundo * 1.06).setPosition(p.x, p.altura, p.z);
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
    m.makeScale(e, e, e).setPosition(p.x, f.altura * e, p.z);
    copa.setMatrixAt(i, m);
    m.makeScale(e, e * f.tronco, e).setPosition(p.x, 0, p.z);
    tronco.setMatrixAt(i, m);
  });
  copa.castShadow = true;
  grupo.add(copa, tronco);
}

export function montarLugar(zona: Zona) {
  const grupo = new THREE.Group();
  const tetos: Teto[] = [];
  const nomes: THREE.Sprite[] = [];
  const { cidade } = zona;
  const chao = new THREE.Mesh(new THREE.CircleGeometry(cidade.raio, 96).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: pintarChao(zona) }));
  chao.receiveShadow = true;
  grupo.add(chao);

  const entraveis = cidade.predios.filter((p) => p.entravel);
  entraveis.forEach((p, i) => nomes.push(montarEntravel(p, i, grupo, tetos)));
  montarFechados(cidade.predios.filter((p) => !p.entravel), grupo);
  montarArvores(zona, grupo);
  return { grupo, chao, tetos, nomes };
}
