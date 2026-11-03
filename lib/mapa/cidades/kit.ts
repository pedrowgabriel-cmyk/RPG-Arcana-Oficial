// Ferramentas para montar cidades com pouco texto. Tudo determinístico: a mesma
// seed gera a mesma cidade em todos os aparelhos.

import type { Predio, TipoPredio } from "../tipos";

export function sorteio(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Fileira = {
  /** Prefixo dos ids; a função numera. */
  id: string;
  nome: string;
  tipo?: TipoPredio;
  /** Início da fileira (centro do primeiro prédio). */
  x: number;
  z: number;
  /** Eixo em que a fileira avança. */
  eixo: "x" | "z";
  quantidade: number;
  /** Largura e fundo mínimos e máximos, em metros. */
  largura?: [number, number];
  fundo?: [number, number];
  altura?: [number, number];
  /** Vão entre prédios. */
  vao?: number;
  seed: number;
};

/** Fileira de prédios de preenchimento ao longo de uma rua. Não entráveis. */
export function fileira(f: Fileira): Predio[] {
  const r = sorteio(f.seed);
  const entre = ([a, b]: [number, number]) => Math.round(a + r() * (b - a));
  const [largura, fundo, altura] = [f.largura ?? [7, 11], f.fundo ?? [7, 10], f.altura ?? [3, 5]] as [number, number][];
  const lista: Predio[] = [];
  let cursor = 0;
  for (let i = 0; i < f.quantidade; i++) {
    const w = entre(largura);
    const d = entre(fundo);
    const passo = f.eixo === "x" ? w : d;
    cursor += i === 0 ? 0 : passo / 2;
    lista.push({
      id: `${f.id}-${i + 1}`,
      nome: f.nome,
      tipo: f.tipo ?? "casa",
      x: f.eixo === "x" ? f.x + cursor : f.x,
      z: f.eixo === "z" ? f.z + cursor : f.z,
      largura: w,
      fundo: d,
      altura: entre(altura),
      entravel: false,
    });
    cursor += passo / 2 + (f.vao ?? 3);
  }
  return lista;
}

type Quarteirao = {
  id: string;
  nome: string;
  tipo?: TipoPredio;
  /** Limites do quarteirão. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  largura?: [number, number];
  fundo?: [number, number];
  altura?: [number, number];
  vao?: number;
  seed: number;
};

/** Enche um quarteirão retangular em linhas, sem passar dos limites. Não entráveis. */
export function quarteirao(q: Quarteirao): Predio[] {
  const r = sorteio(q.seed);
  const entre = ([a, b]: [number, number]) => Math.round(a + r() * (b - a));
  const [largura, fundo, altura] = [q.largura ?? [7, 11], q.fundo ?? [7, 10], q.altura ?? [3, 5]] as [number, number][];
  const vao = q.vao ?? 3;
  const lista: Predio[] = [];
  let z = q.z0;
  let n = 0;
  while (z + fundo[1] <= q.z1) {
    let x = q.x0;
    while (x + largura[1] <= q.x1) {
      const w = entre(largura);
      const d = entre(fundo);
      n++;
      lista.push({ id: `${q.id}-${n}`, nome: q.nome, tipo: q.tipo ?? "casa", x: x + w / 2, z: z + d / 2, largura: w, fundo: d, altura: entre(altura), entravel: false });
      x += w + vao;
    }
    z += fundo[1] + vao;
  }
  return lista;
}
