// Mapa 3D — regras de movimento e energia. Sem Three.js: mesa, celular e
// servidor podem usar este módulo.
//
// A energia é decisão de campanha (Doc 2 §10.9), não regra do livro.
// 100 de energia rendem 10 km a pé ou 25 km a cavalo: dá para rodar o lugar
// inteiro, e sair dele é com o Juiz (lib/mapa/viagem.ts).

import type { Ponto } from "./tipos";

export const ENERGIA_MAX = 100;

export type Meio = "pe" | "cavalo";

export const MEIOS: Record<Meio, { rotulo: string; energiaPor100m: number; metrosPorMinuto: number; metrosPorSegundo: number }> = {
  pe: { rotulo: "A pé", energiaPor100m: 1, metrosPorMinuto: 80, metrosPorSegundo: 8 },
  cavalo: { rotulo: "A cavalo", energiaPor100m: 0.4, metrosPorMinuto: 300, metrosPorSegundo: 20 },
};

export type Bloqueios = {
  /** Prédios que o Juiz trancou. */
  entrada: string[];
  /** Prédios cujo interior o Juiz escondeu dos jogadores. */
  vista: string[];
};

/** Cada personagem chega num lugar próprio perto do ponto de chegada, sempre o mesmo. */
export function pontoDeChegada(id: string, chegada: Ponto): Ponto {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const angulo = ((h % 12) / 12) * Math.PI * 2;
  return { x: chegada.x + Math.cos(angulo) * 3, z: chegada.z + Math.sin(angulo) * 3 };
}

export function distanciaMetros(rota: Ponto[]) {
  let metros = 0;
  for (let i = 1; i < rota.length; i++) metros += Math.hypot(rota[i].x - rota[i - 1].x, rota[i].z - rota[i - 1].z);
  return metros;
}

export function custoEnergia(metros: number, meio: Meio) {
  return Math.ceil((metros / 100) * MEIOS[meio].energiaPor100m);
}

/** Andar no controle é sempre a pé: desconta só a energia inteira já percorrida. */
export function descontarPassos(metros: number) {
  const metrosPorPonto = 100 / MEIOS.pe.energiaPor100m;
  const gasto = Math.floor(metros / metrosPorPonto);
  return { gasto, sobra: metros - gasto * metrosPorPonto };
}

export function minutosDeJogo(metros: number, meio: Meio) {
  return Math.max(1, Math.round(metros / MEIOS[meio].metrosPorMinuto));
}

/** Percurso custa o que a rota custa; quem não tem energia para ele não sai do lugar. */
export function custoDaViagem(rota: Ponto[], meio: Meio, energia: number) {
  const metros = distanciaMetros(rota);
  const custo = custoEnergia(metros, meio);
  return { metros, custo, minutos: minutosDeJogo(metros, meio), podeIr: custo <= energia };
}

export const RAIO_DE_VISAO = 150;

/** O jogador só enxerga quem está por perto; a mesa do Juiz enxerga todos. */
export function aoAlcance(eu: Ponto, outro: Ponto) {
  return Math.hypot(eu.x - outro.x, eu.z - outro.z) <= RAIO_DE_VISAO;
}
