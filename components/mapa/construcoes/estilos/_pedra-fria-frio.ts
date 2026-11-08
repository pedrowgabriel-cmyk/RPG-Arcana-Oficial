// Peças comuns aos dois estilos do frio (pedra-fria, madeira-fria): telhado assentado
// na parede com neve por cima, pingentes de gelo, oitões, chaminé de pedra com fumaça,
// lenha empilhada, alpendre de telha escura e o tom de cor sorteado.

import * as THREE from "three";
import { sorteio } from "../../natureza/ferramentas";
import type { NomeMaterial } from "../../natureza/tipos";
import { bloco, malha, naFace, Obra, telhado, type Face } from "../kit";

export const PORTA_DE_ENTRAR = { largura: 4.2, altura: 3 };

export const de = <T,>(r: () => number, l: readonly T[]) => l[Math.floor(r() * l.length)];

/** Mesma cor, um tico mais clara ou escura: pedra por pedra, tora por tora. */
export function variar(cor: THREE.ColorRepresentation, r: () => number, quanto = 0.08) {
  return "#" + new THREE.Color(cor).offsetHSL(0, (r() - 0.5) * quanto * 0.3, (r() - 0.5) * quanto).getHexString();
}

export type Telhado = {
  tipo: "duas-aguas" | "quatro-aguas" | "uma-agua";
  /** Retângulo das paredes no referencial do telhado (cumeeira em x; uma-água cai para +z). */
  L: number;
  F: number;
  /** Topo da parede: a face de baixo do telhado encosta aqui, na linha da parede. */
  A: number;
  /** Inclinação: subida por metro. */
  s: number;
  beiral: number;
  esp?: number;
  /** Giro em y aplicado depois (Math.PI / 2 põe a cumeeira em z). */
  giro?: number;
  x?: number;
  z?: number;
  material: NomeMaterial;
  cor: THREE.ColorRepresentation;
  /** Neve por cima: recuo a partir da borda (negativo passa da borda) e espessura. */
  neve?: { recuo: number; espessura: number; cor?: THREE.ColorRepresentation } | null;
  /** Pingentes de gelo por beiral comprido. */
  pingentes?: number;
  /** Fiadas de lajes sobrepostas (telhado de laje de pedra). */
  lajes?: number;
  /** Só a superfície de cima (nível 1). */
  soCima?: boolean;
  semente?: number;
  /** Transformação final (põe o telhado numa face, por exemplo). */
  depois?: (g: THREE.BufferGeometry) => THREE.BufferGeometry;
};

export type Assento = { base: number; alto: number; topo: number; meio: number };

function assento(c: Telhado): Assento {
  const esp = c.esp ?? 0.18;
  const meio = c.tipo === "uma-agua" ? c.F + c.beiral * 2 : c.tipo === "quatro-aguas" ? Math.min(c.L, c.F) / 2 + c.beiral : c.F / 2 + c.beiral;
  const base = c.A - c.s * c.beiral + esp / 2;
  const alto = c.s * meio;
  return { base, alto, topo: base + alto, meio };
}

function posicionar(g: THREE.BufferGeometry, c: Telhado) {
  if (c.giro) g.rotateY(c.giro);
  g.translate(c.x ?? 0, 0, c.z ?? 0);
  return c.depois ? c.depois(g) : g;
}

/** Põe o telhado (e a neve, as lajes e os pingentes) na obra `t`. Devolve as alturas. */
export function cobrir(t: Obra, c: Telhado): Assento {
  const esp = c.esp ?? 0.18;
  const a = assento(c);
  const r = sorteio(c.semente ?? 1);
  const partes = telhado(c.tipo, c.L, c.F, a.base, a.alto, c.beiral, esp);
  for (const g of c.soCima ? partes.slice(0, 1) : partes) t.por(c.material, posicionar(g, c), c.cor, 0.12, 0);
  const ang = Math.atan(c.s);
  if (c.lajes && !c.soCima) {
    // Fiadas: tiras grossas na água do telhado, a de cima por cima da de baixo.
    const comprimento = c.L + c.beiral * 2;
    const lados = c.tipo === "uma-agua" ? [1] : [1, -1];
    for (const lado of lados) {
      for (let i = 0; i < c.lajes; i++) {
        const f = (i + 0.5) / c.lajes;
        const d = a.meio * f;
        const z = lado * (c.F / 2 + c.beiral - d);
        const y = a.base + c.s * d + 0.03;
        const g = bloco(comprimento + 0.04, 0.07, 0.42, 0, -0.035, 0).rotateX(lado * ang).translate(0, y, z);
        t.por(c.material, posicionar(g, c), variar(c.cor, r, 0.1), 0.12, 0);
      }
    }
  }
  if (c.neve) {
    const k = c.neve.recuo;
    const e = c.neve.espessura;
    const alto = c.tipo === "uma-agua" ? c.s * (a.meio - 2 * k) : c.s * (a.meio - k);
    const camada = telhado(c.tipo, c.L, c.F, a.base + c.s * k + e, alto, c.beiral - k, e);
    for (const g of c.soCima ? camada.slice(0, 1) : camada) t.por("neve", posicionar(g, c), c.neve.cor ?? "#eef1f3", 0.04, 0);
  }
  if (c.pingentes && !c.soCima) {
    const lados = c.tipo === "uma-agua" ? [1] : [1, -1];
    const y = a.base - esp;
    for (const lado of lados) {
      for (let i = 0; i < c.pingentes; i++) {
        const comp = 0.2 + r() * 0.55;
        const x = (r() - 0.5) * (c.L + c.beiral * 2 - 0.4);
        const g = new THREE.ConeGeometry(0.05 + r() * 0.03, comp, 4, 1, true).rotateX(Math.PI).translate(x, y - comp / 2, lado * (c.F / 2 + c.beiral - 0.04));
        t.por("neve", posicionar(g, c), "#d9e6ec", 0.05, 0);
      }
    }
  }
  return a;
}

/** Oitões (empenas) do telhado de duas águas, encostados na face de baixo do telhado. */
export function oitoes(obra: Obra, c: Telhado, material: NomeMaterial, cor: THREE.ColorRepresentation, lados: (1 | -1)[] = [1, -1]) {
  const a = assento(c);
  const esp = c.esp ?? 0.18;
  const topo = a.topo - esp / 2;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  for (const s of lados) {
    const x = (s * c.L) / 2;
    const g = malha([v(x, c.A, c.F / 2), v(x, c.A, -c.F / 2), v(x, topo, 0)], s > 0 ? [0, 1, 2] : [1, 0, 2]);
    obra.por(material, posicionar(g, c), cor);
  }
  return a;
}

/** Fumaça parada sobre a chaminé: três novelos que sobem, crescem e clareiam. */
export function fumaca(obra: Obra, x: number, y: number, z: number, semente: number) {
  const r = sorteio(semente);
  const vento = r() * Math.PI * 2;
  let [px, py, pz] = [x, y + 0.25, z];
  for (let i = 0; i < 3; i++) {
    const raio = 0.32 + i * 0.2;
    px += Math.cos(vento) * (0.2 + i * 0.25);
    pz += Math.sin(vento) * (0.2 + i * 0.25);
    py += raio * 1.2;
    const g = new THREE.IcosahedronGeometry(raio, 0).scale(1.15, 0.8, 1).rotateY(r() * 3).translate(px, py, pz);
    obra.por("neve", g, ["#8f9497", "#aeb2b4", "#c7cacb"][i], 0.06, 0);
  }
}

/** Chaminé de pedra com laje de chapéu, neve em cima e fumaça. */
export function chamineDePedra(obra: Obra, x: number, z: number, base: number, topo: number, cor: THREE.ColorRepresentation, semente: number, lado = 0.9) {
  obra.por("pedra", bloco(lado, topo - base, lado * 0.9, x, base, z), cor, 0.12, 0);
  obra.por("pedra", bloco(lado + 0.12, 0.25, lado * 0.9 + 0.12, x, topo - 0.6, z), cor, 0.1, 0);
  // Chapéu: laje sobre dois calços, a fumaça sai pelos lados.
  for (const s of [-1, 1]) obra.por("cantaria", bloco(0.16, 0.28, lado * 0.7, x + (s * lado) / 3, topo, z), "#6d6a64", 0.08, 0);
  obra.por("cantaria", bloco(lado + 0.3, 0.12, lado * 0.9 + 0.3, x, topo + 0.28, z), "#6a6660", 0.08, 0);
  obra.por("neve", bloco(lado + 0.22, 0.08, lado * 0.9 + 0.22, x, topo + 0.4, z), "#eef1f3", 0.04, 0);
  fumaca(obra, x, topo + 0.4, z, semente);
}

/** Lenha empilhada contra a parede: o volume e as pontas das achas viradas para fora. */
export function lenha(obra: Obra, f: Face, L: number, F: number, u: number, w: number, h: number, r: () => number, dx = 0) {
  const prof = 0.55;
  obra.por("madeira", naFace(bloco(w, h, prof, 0, 0, prof / 2), f, L, F, u, 0).translate(dx, 0, 0), "#5e4630", 0.1, 0.2);
  const n = Math.max(3, Math.round(w / 0.45));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < Math.max(1, Math.floor(h / 0.4)); j++) {
      if (r() < 0.35) continue;
      const g = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 5).rotateX(Math.PI / 2).translate(-w / 2 + (i + 0.5) * (w / n), 0.18 + j * 0.36, prof + 0.03);
      obra.por("madeira", naFace(g, f, L, F, u, 0).translate(dx, 0, 0), variar("#a07d55", r, 0.12), 0.05, 0);
    }
  }
  obra.por("neve", naFace(bloco(w, 0.07, prof, 0, h, prof / 2), f, L, F, u, 0).translate(dx, 0, 0), "#eef1f3", 0.04, 0);
}

/** Alpendre na frente: piso de tábua, esteios, frechal e telhado de uma água com neve. */
export function alpendre(
  obra: Obra,
  t: Obra,
  L: number,
  F: number,
  o: { comprimento: number; profundidade: number; altura: number; esteios: number; madeira: THREE.ColorRepresentation; telha: THREE.ColorRepresentation; material?: NomeMaterial; neve?: number; piso?: number; guarda?: boolean; u?: number; pingentes?: number },
) {
  const u = o.u ?? 0;
  const piso = o.piso ?? 0.25;
  const P = o.profundidade;
  obra.por("madeira", naFace(bloco(o.comprimento, piso, P, 0, 0, P / 2), "frente", L, F, u, 0), o.madeira, 0.1, 0.4);
  const us: number[] = [];
  for (let i = 0; i < o.esteios; i++) us.push(-o.comprimento / 2 + 0.2 + (i * (o.comprimento - 0.4)) / Math.max(1, o.esteios - 1));
  for (const x of us) obra.por("madeira", naFace(bloco(0.24, o.altura, 0.24, x, piso, P - 0.2), "frente", L, F, u, 0), o.madeira, 0.1, 0);
  obra.por("madeira", naFace(bloco(o.comprimento, 0.22, 0.24, 0, piso + o.altura - 0.05, P - 0.2), "frente", L, F, u, 0), o.madeira, 0.1, 0);
  if (o.guarda) {
    const trecho = o.comprimento / 2 - 1.4;
    if (trecho > 0.5) {
      for (const s of [-1, 1]) {
        for (const y of [0.45, 0.9]) obra.por("madeira", naFace(bloco(trecho, 0.09, 0.09, s * (1.2 + trecho / 2), piso + y, P - 0.2), "frente", L, F, u, 0), o.madeira, 0.1, 0);
      }
    }
  }
  // Telhado: cai da parede para a frente.
  cobrir(t, {
    tipo: "uma-agua",
    L: o.comprimento,
    F: P,
    A: piso + o.altura + 0.15,
    s: 0.32,
    beiral: 0.35,
    esp: 0.12,
    material: o.material ?? "telha-escura",
    cor: o.telha,
    neve: o.neve === undefined ? { recuo: 0.15, espessura: 0.1 } : o.neve > 0 ? { recuo: -0.05, espessura: o.neve } : null,
    pingentes: o.pingentes,
    semente: Math.round(o.comprimento * 97),
    depois: (g) => naFace(g.translate(0, 0, P / 2), "frente", L, F, u, 0),
  });
}

/** Barril e caixote, para encher a frente de venda, porto e oficina. */
export function barril(obra: Obra, x: number, z: number, r: () => number, y = 0) {
  obra.por("madeira", new THREE.CylinderGeometry(0.32, 0.36, 0.95, 8).translate(x, y + 0.475, z), variar("#6a4a2e", r, 0.1), 0.08, 0.2);
  obra.por("neve", new THREE.CylinderGeometry(0.3, 0.3, 0.05, 8).translate(x, y + 0.97, z), "#eef1f3", 0.04, 0);
}

export function caixote(obra: Obra, x: number, z: number, r: () => number, y = 0) {
  const s = 0.55 + r() * 0.25;
  obra.por("madeira", bloco(s, s * 0.8, s, x, y, z).rotateY((r() - 0.5) * 0.4), variar("#7a5a38", r, 0.1), 0.08, 0.2);
}
