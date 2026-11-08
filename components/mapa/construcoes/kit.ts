// Kit de construção: peças de 1880 com UV em metros (1 unidade de UV = 2 m), para
// a textura entrar depois sem refazer nada. Tudo no referencial do prédio:
// largura em x, fundo em z, fachada em +z, chão em y = 0.

import * as THREE from "three";
import { pecas, preparar, tingir } from "../natureza/ferramentas";
import type { NomeMaterial, Peca } from "../natureza/tipos";

const METROS_POR_UV = 2;

export type Face = "frente" | "fundos" | "esquerda" | "direita";

/** Junta as peças de um prédio, por material. */
export class Obra {
  private itens: { material: NomeMaterial; geometria: THREE.BufferGeometry }[] = [];

  constructor(private semente: number) {}

  /** Põe uma geometria já posicionada, tingida com variação suave e sombra no pé. */
  por(material: NomeMaterial, g: THREE.BufferGeometry, cor: THREE.ColorRepresentation, variacao = 0.06, sombraNoPe = 0.18) {
    this.itens.push({ material, geometria: tingir(preparar(g), cor, variacao, this.semente, sombraNoPe, 1.2) });
    return this;
  }

  pecas(): Peca[] {
    return this.itens.length ? pecas(this.itens) : [];
  }
}

/** Caixa com UV proporcional ao tamanho de cada face: tijolo e tábua não esticam. */
export function caixa(w: number, h: number, d: number) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  const uv = g.attributes.uv;
  // BoxGeometry: 6 faces de 6 vértices na ordem +x, -x, +y, -y, +z, -z.
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let k = 0; k < 6; k++) {
      const i = f * 6 + k;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / METROS_POR_UV, (uv.getY(i) * dims[f][1]) / METROS_POR_UV);
    }
  }
  return g;
}

/** Caixa com o pé em `y` e o centro em x, z. */
export function bloco(w: number, h: number, d: number, x: number, y: number, z: number) {
  return caixa(w, h, d).translate(x, y + h / 2, z);
}

/** Faces da obra: onde fica, para onde aponta e quanto mede. */
export function face(f: Face, L: number, F: number) {
  if (f === "frente") return { centro: new THREE.Vector3(0, 0, F / 2), eixo: new THREE.Vector3(1, 0, 0), normal: new THREE.Vector3(0, 0, 1), comprimento: L };
  if (f === "fundos") return { centro: new THREE.Vector3(0, 0, -F / 2), eixo: new THREE.Vector3(-1, 0, 0), normal: new THREE.Vector3(0, 0, -1), comprimento: L };
  if (f === "direita") return { centro: new THREE.Vector3(L / 2, 0, 0), eixo: new THREE.Vector3(0, 0, -1), normal: new THREE.Vector3(1, 0, 0), comprimento: F };
  return { centro: new THREE.Vector3(-L / 2, 0, 0), eixo: new THREE.Vector3(0, 0, 1), normal: new THREE.Vector3(-1, 0, 0), comprimento: F };
}

/**
 * Coloca uma geometria desenhada "de frente" (largura em x, saindo da parede em +z, pé em y = 0)
 * no ponto `u` ao longo da face, à altura `y`, encostada na parede.
 */
export function naFace(g: THREE.BufferGeometry, f: Face, L: number, F: number, u: number, y: number, afasta = 0) {
  const fc = face(f, L, F);
  const ang = Math.atan2(fc.normal.x, fc.normal.z);
  g.rotateY(ang);
  const p = fc.centro.clone().addScaledVector(fc.eixo, u).addScaledVector(fc.normal, afasta);
  return g.translate(p.x, y, p.z);
}

/** Triângulos soltos com UV planar em metros, projetada no plano mais de frente para cada face. */
export function malha(pontos: THREE.Vector3[], triangulosIdx: number[]) {
  const pos: number[] = [];
  const uv: number[] = [];
  for (let t = 0; t < triangulosIdx.length; t += 3) {
    const [a, b, c] = [pontos[triangulosIdx[t]], pontos[triangulosIdx[t + 1]], pontos[triangulosIdx[t + 2]]];
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const eixoU = Math.abs(n.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0).cross(n).normalize();
    const eixoV = n.clone().cross(eixoU).normalize();
    for (const p of [a, b, c]) {
      pos.push(p.x, p.y, p.z);
      uv.push(p.dot(eixoU) / METROS_POR_UV, p.dot(eixoV) / METROS_POR_UV);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

export type TipoTelhado = "quatro-aguas" | "duas-aguas" | "uma-agua" | "plano";

/**
 * Telhado com beiral e espessura. Duas águas: cumeeira em x (a empena fica nas laterais).
 * Uma água: cai para a frente. `alturaDaCumeeira` é acima de `base`.
 */
export function telhado(tipo: TipoTelhado, L: number, F: number, base: number, alturaDaCumeeira: number, beiral = 0.6, espessura = 0.18) {
  const [x0, x1, z0, z1] = [-L / 2 - beiral, L / 2 + beiral, -F / 2 - beiral, F / 2 + beiral];
  const topo = base + alturaDaCumeeira;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  let pts: THREE.Vector3[];
  let tris: number[];
  if (tipo === "plano") {
    return [bloco(L + beiral * 2, espessura * 2, F + beiral * 2, 0, base, 0)];
  } else if (tipo === "uma-agua") {
    pts = [v(x0, topo, z0), v(x1, topo, z0), v(x1, base, z1), v(x0, base, z1)];
    tris = [0, 3, 2, 0, 2, 1];
  } else if (tipo === "duas-aguas") {
    pts = [v(x0, base, z1), v(x1, base, z1), v(x1, topo, 0), v(x0, topo, 0), v(x0, base, z0), v(x1, base, z0)];
    tris = [0, 1, 2, 0, 2, 3, 5, 4, 3, 5, 3, 2];
  } else {
    // Quatro águas: cumeeira no lado mais comprido.
    const longoEmX = L >= F;
    const meio = (longoEmX ? L - F : F - L) / 2;
    const [r0, r1] = longoEmX ? [v(-meio, topo, 0), v(meio, topo, 0)] : [v(0, topo, -meio), v(0, topo, meio)];
    pts = [v(x0, base, z1), v(x1, base, z1), v(x1, base, z0), v(x0, base, z0), r0, r1];
    tris = longoEmX ? [0, 1, 5, 0, 5, 4, 2, 3, 4, 2, 4, 5, 1, 2, 5, 3, 0, 4] : [0, 1, 5, 2, 3, 4, 1, 2, 4, 1, 4, 5, 3, 0, 5, 3, 5, 4];
  }
  const cima = malha(pts, tris);
  // Espessura: a mesma superfície, mais baixa e virada, faz o forro do beiral.
  const baixo = malha(
    pts.map((p) => p.clone().add(new THREE.Vector3(0, -espessura, 0))),
    tris.map((_, i) => tris[i - (i % 3) + (2 - (i % 3))]),
  );
  // Testeira: faixa vertical em volta da borda baixa.
  const borda: THREE.BufferGeometry[] = [];
  const bordas: [THREE.Vector3, THREE.Vector3][] = [];
  for (let t = 0; t < tris.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const [a, b] = [pts[tris[t + k]], pts[tris[t + ((k + 1) % 3)]]];
      if (Math.abs(a.y - base) < 0.01 && Math.abs(b.y - base) < 0.01) bordas.push([a, b]);
    }
  }
  for (const [a, b] of bordas) {
    const d = espessura;
    borda.push(malha([a, b, b.clone().setY(a.y - d), a.clone().setY(a.y - d)], [0, 2, 1, 0, 3, 2]));
  }
  return [cima, baixo, ...borda];
}

/** Empena: triângulo da parede sob o telhado de duas águas, nas laterais. */
export function empenas(L: number, F: number, base: number, alturaDaCumeeira: number) {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const fazer = (x: number, sinal: number) =>
    malha([v(x, base, F / 2), v(x, base, -F / 2), v(x, base + alturaDaCumeeira, 0)], sinal > 0 ? [0, 1, 2] : [1, 0, 2]);
  return [fazer(L / 2, 1), fazer(-L / 2, -1)];
}

export type OpcoesDeJanela = {
  /** Cor das venezianas abertas; sem ela, janela sem veneziana. */
  veneziana?: THREE.ColorRepresentation;
  moldura?: THREE.ColorRepresentation;
  materialDaMoldura?: NomeMaterial;
  /** Grade de ferro na frente (sobrado, cadeia, banco). */
  grade?: boolean;
  /** Folha fechada no lugar do vidro (casa abandonada). */
  fechada?: THREE.ColorRepresentation;
};

/** Janela de 1880: vão escuro, moldura saliente, peitoril, verga e venezianas abertas. */
export function janela(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, h: number, o: OpcoesDeJanela = {}) {
  const corMoldura = o.moldura ?? "#efe9dc";
  const matMoldura = o.materialDaMoldura ?? "reboco";
  const m = 0.12;
  obra.por(o.fechada ? "madeira" : "vidro", naFace(bloco(w, h, 0.04, 0, 0, 0), f, L, F, u, y, 0.02), o.fechada ?? "#2a3236", 0.04, 0);
  for (const [bw, bh, bx, by] of [
    [w + m * 2, m * 1.4, 0, h],
    [m, h, -w / 2 - m / 2, 0],
    [m, h, w / 2 + m / 2, 0],
  ] as const) {
    obra.por(matMoldura, naFace(bloco(bw, bh, 0.1, bx, by, 0.05), f, L, F, u, y), corMoldura, 0.04, 0);
  }
  obra.por(matMoldura, naFace(bloco(w + m * 3, m, 0.2, 0, -m, 0.1), f, L, F, u, y), corMoldura, 0.04, 0);
  if (o.veneziana && !o.fechada) {
    for (const lado of [-1, 1]) {
      // Folha aberta encostada na parede, um pouco afastada da moldura.
      obra.por("madeira", naFace(bloco(w / 2, h * 0.98, 0.05, lado * (w / 2 + m + w / 4), 0, 0.04), f, L, F, u, y), o.veneziana, 0.08, 0);
    }
  }
  if (o.grade) {
    const barras = Math.max(3, Math.round(w / 0.2));
    for (let i = 1; i < barras; i++) obra.por("ferro", naFace(bloco(0.03, h, 0.03, -w / 2 + (i * w) / barras, 0, 0.09), f, L, F, u, y), "#2c2a28", 0.02, 0);
  }
}

/** Porta com moldura. `aberta` deixa a folha virada para dentro (entrável). */
export function porta(obra: Obra, f: Face, L: number, F: number, u: number, w: number, h: number, cor: THREE.ColorRepresentation, aberta = false, moldura: THREE.ColorRepresentation = "#efe9dc") {
  const m = 0.14;
  for (const [bw, bh, bx, by] of [
    [w + m * 2, m * 1.6, 0, h],
    [m, h, -w / 2 - m / 2, 0],
    [m, h, w / 2 + m / 2, 0],
  ] as const) {
    obra.por("reboco", naFace(bloco(bw, bh, 0.12, bx, by, 0.06), f, L, F, u, 0), moldura, 0.04, 0);
  }
  if (aberta) {
    for (const lado of [-1, 1]) {
      const folha = bloco(0.06, h * 0.97, w / 2, 0, 0, -w / 4);
      folha.translate(lado * (w / 2 - 0.03), 0, -0.1);
      obra.por("madeira", naFace(folha, f, L, F, u, 0), cor, 0.08, 0);
    }
  } else {
    obra.por("madeira", naFace(bloco(w, h, 0.06, 0, 0, 0.03), f, L, F, u, 0), cor, 0.08, 0);
  }
}

/**
 * Paredes com espessura. Com `vaoDaPorta`, a fachada abre um vão no meio (entrável),
 * com verga em cima; sem ele, é um volume maciço, mais barato.
 */
export function paredes(obra: Obra, L: number, F: number, A: number, material: NomeMaterial, cor: THREE.ColorRepresentation, vaoDaPorta?: { largura: number; altura: number }) {
  if (!vaoDaPorta) {
    obra.por(material, bloco(L, A, F, 0, 0, 0), cor);
    return;
  }
  const e = 0.4;
  obra.por(material, bloco(L, A, e, 0, 0, -F / 2 + e / 2), cor);
  obra.por(material, bloco(e, A, F - e * 2, -L / 2 + e / 2, 0, 0), cor);
  obra.por(material, bloco(e, A, F - e * 2, L / 2 - e / 2, 0, 0), cor);
  const lado = (L - vaoDaPorta.largura) / 2;
  for (const s of [-1, 1]) obra.por(material, bloco(lado, A, e, s * (vaoDaPorta.largura / 2 + lado / 2), 0, F / 2 - e / 2), cor);
  obra.por(material, bloco(vaoDaPorta.largura, A - vaoDaPorta.altura, e, 0, vaoDaPorta.altura, F / 2 - e / 2), cor);
}

/** Barrado (faixa colorida no pé da parede) e cunhais (pilastras nos cantos): o jeito mineiro. */
export function barradoECunhais(obra: Obra, L: number, F: number, A: number, cor: THREE.ColorRepresentation, alturaDoBarrado = 0.7, cunhal = 0.35) {
  const s = 0.03;
  obra.por("reboco", bloco(L + s * 2, alturaDoBarrado, F + s * 2, 0, 0, 0), cor, 0.05, 0.3);
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    obra.por("reboco", bloco(cunhal, A, cunhal, x * (L / 2 - cunhal / 2 + s), 0, z * (F / 2 - cunhal / 2 + s)), cor, 0.05, 0.2);
  }
}

/** Cimalha: frisos sob o beiral, que dão peso ao alto da parede. */
export function cimalha(obra: Obra, L: number, F: number, A: number, cor: THREE.ColorRepresentation) {
  obra.por("reboco", bloco(L + 0.2, 0.25, F + 0.2, 0, A - 0.25, 0), cor, 0.04, 0);
}

/** Varanda/alpendre na face: piso de tábua, esteios e cobertura de uma água. */
export function varanda(obra: Obra, f: Face, L: number, F: number, comprimento: number, profundidade: number, alturaDosEsteios: number, esteios: number, cores: { madeira: THREE.ColorRepresentation; telha: THREE.ColorRepresentation }) {
  obra.por("madeira", naFace(bloco(comprimento, 0.25, profundidade, 0, 0, profundidade / 2), f, L, F, 0, 0), cores.madeira, 0.1, 0.4);
  for (let i = 0; i < esteios; i++) {
    const u = -comprimento / 2 + 0.2 + (i * (comprimento - 0.4)) / Math.max(1, esteios - 1);
    obra.por("madeira", naFace(bloco(0.22, alturaDosEsteios, 0.22, u, 0.25, profundidade - 0.2), f, L, F, 0, 0), cores.madeira, 0.1, 0);
  }
  obra.por("madeira", naFace(bloco(comprimento, 0.2, 0.2, 0, alturaDosEsteios + 0.15, profundidade - 0.2), f, L, F, 0, 0), cores.madeira, 0.1, 0);
  const cobertura = telhado("uma-agua", comprimento, profundidade, 0, 0.6, 0.3, 0.12);
  for (const g of cobertura) obra.por("telha", naFace(g.translate(0, alturaDosEsteios + 0.35, profundidade / 2), f, L, F, 0, 0), cores.telha, 0.12, 0);
}

/** Sacada com laje, guarda-corpo de ferro e porta-janela atrás. */
export function sacada(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, corFerro: THREE.ColorRepresentation = "#2c2a28") {
  const prof = 0.7;
  obra.por("cantaria", naFace(bloco(w, 0.15, prof, 0, 0, prof / 2), f, L, F, u, y), "#bdb4a2", 0.04, 0);
  obra.por("ferro", naFace(bloco(w, 0.05, 0.05, 0, 0.95, prof - 0.03), f, L, F, u, y), corFerro, 0.02, 0);
  const n = Math.max(4, Math.round(w / 0.3));
  for (let i = 0; i <= n; i++) obra.por("ferro", naFace(bloco(0.03, 0.95, 0.03, -w / 2 + (i * w) / n, 0.15, prof - 0.03), f, L, F, u, y), corFerro, 0.02, 0);
}

/** Torre quadrada com sineira vazada e coruchéu (igreja, estação, prefeitura). */
export function torre(obra: Obra, x: number, z: number, lado: number, altura: number, cor: THREE.ColorRepresentation, corDoTopo: THREE.ColorRepresentation, cruz = true) {
  obra.por("reboco", bloco(lado, altura, lado, x, 0, z), cor);
  obra.por("reboco", bloco(lado + 0.3, 0.3, lado + 0.3, x, altura, z), "#efe9dc", 0.04, 0);
  // Sineira: quatro pilares e o vão escuro.
  const s = 0.35;
  for (const [px, pz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    obra.por("reboco", bloco(s, lado * 0.8, s, x + px * (lado / 2 - s / 2), altura + 0.3, z + pz * (lado / 2 - s / 2)), cor);
  }
  obra.por("ferro", bloco(lado * 0.35, lado * 0.35, lado * 0.35, x, altura + 0.3 + lado * 0.3, z), "#7a5a2a", 0.05, 0);
  const topo = altura + 0.3 + lado * 0.8;
  obra.por("reboco", bloco(lado + 0.3, 0.3, lado + 0.3, x, topo, z), "#efe9dc", 0.04, 0);
  for (const g of telhado("quatro-aguas", lado, lado, topo + 0.3, lado * 0.9, 0.1, 0.1)) obra.por("telha", g.translate(x, 0, z), corDoTopo, 0.1, 0);
  if (cruz) {
    const y = topo + 0.3 + lado * 0.9;
    obra.por("ferro", bloco(0.08, 1.2, 0.08, x, y, z), "#2c2a28", 0.02, 0);
    obra.por("ferro", bloco(0.6, 0.08, 0.08, x, y + 0.75, z), "#2c2a28", 0.02, 0);
  }
}

export function chamine(obra: Obra, x: number, z: number, base: number, altura: number, cor: THREE.ColorRepresentation = "#8a6a58") {
  obra.por("tijolo", bloco(0.6, altura, 0.6, x, base, z), cor, 0.1, 0);
  obra.por("tijolo", bloco(0.75, 0.15, 0.75, x, base + altura, z), cor, 0.1, 0);
}

/** Toldo de lona inclinado sobre porta ou vitrine. */
export function toldo(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, profundidade: number, cor: THREE.ColorRepresentation) {
  const g = malha(
    [new THREE.Vector3(-w / 2, 0.6, 0), new THREE.Vector3(w / 2, 0.6, 0), new THREE.Vector3(w / 2, 0, profundidade), new THREE.Vector3(-w / 2, 0, profundidade)],
    [0, 3, 2, 0, 2, 1, 0, 1, 2, 0, 2, 3],
  );
  obra.por("lona", naFace(g, f, L, F, u, y, 0.05), cor, 0.1, 0);
  obra.por("lona", naFace(bloco(w, 0.3, 0.02, 0, -0.3, profundidade + 0.05), f, L, F, u, y), cor, 0.1, 0);
}

/** Placa pintada na fachada (venda, saloon, hotel). */
export function placa(obra: Obra, f: Face, L: number, F: number, u: number, y: number, w: number, h: number, cor: THREE.ColorRepresentation) {
  obra.por("madeira", naFace(bloco(w, h, 0.08, 0, 0, 0.06), f, L, F, u, y), cor, 0.06, 0);
}

/** Interior simples de entrável: assoalho, balcão ou mesa e bancos. */
export function interiorBasico(obra: Obra, L: number, F: number, cores: { piso: THREE.ColorRepresentation; madeira: THREE.ColorRepresentation }) {
  obra.por("madeira", bloco(L - 0.8, 0.08, F - 0.8, 0, 0.02, 0), cores.piso, 0.08, 0);
  obra.por("madeira", bloco(L * 0.55, 1.05, 0.8, 0, 0, -F / 2 + 1.4), cores.madeira, 0.08, 0);
  if (L > 9) {
    for (const lx of [-0.27, 0.27]) {
      obra.por("madeira", bloco(1.6, 0.78, 1.0, L * lx, 0, F * 0.1), cores.madeira, 0.08, 0);
      obra.por("madeira", bloco(1.6, 0.45, 0.35, L * lx, 0, F * 0.1 + 0.8), cores.madeira, 0.08, 0);
    }
  }
}

/** Distribui `n` itens pela face, com folga nas pontas. */
export function aoLongo(comprimento: number, n: number, folga = 1.2) {
  if (n <= 0) return [];
  if (n === 1) return [0];
  const util = comprimento - folga * 2;
  return Array.from({ length: n }, (_, i) => -util / 2 + (i * util) / (n - 1));
}
