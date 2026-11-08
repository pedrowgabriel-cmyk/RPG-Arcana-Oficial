// Contrato dos modelos da natureza. Todo modelo é gerado por código, em metros,
// com a base no chão (y = 0) e o centro em x = z = 0, sempre com UV e cor por
// vértice: hoje a cor faz o trabalho; depois a textura entra no mesmo material.

import type * as THREE from "three";

export type NomeMaterial =
  | "casca"
  | "casca-clara"
  | "folhagem"
  | "neve"
  | "pedra"
  | "pedra-vermelha"
  | "pedra-escura"
  | "musgo"
  | "terra"
  | "cogumelo"
  | "carvao"
  | "osso"
  | "cacto"
  | "petala"
  // Construções
  | "reboco"
  | "tijolo"
  | "madeira"
  | "madeira-escura"
  | "telha"
  | "telha-escura"
  | "cantaria"
  | "ferro"
  | "vidro"
  | "lona"
  | "palha"
  | "agua";

/** 0 = perto (modelo cheio), 1 = meio, 2 = longe (silhueta). */
export type Nivel = 0 | 1 | 2;

/** Teto de triângulos por nível. O visualizador avisa quando passa. */
export const TETO_DE_TRIANGULOS: Record<Nivel, number> = { 0: 3000, 1: 600, 2: 80 };

export type Estado = {
  /** 0 a 1: quanto de neve acumulada. */
  neve?: number;
  seca?: boolean;
  queimada?: boolean;
};

export type Peca = { material: NomeMaterial; geometria: THREE.BufferGeometry };

export type Modelo = {
  id: string;
  nome: string;
  /** Quantas formas diferentes `variacao` produz (0 até variacoes - 1). */
  variacoes: number;
  /** Altura típica em metros, para a distribuição e a câmera do visualizador. */
  altura: [number, number];
  /** Raio ocupado no chão, em metros: distância mínima entre dois iguais. */
  raio: number;
  /** Estados que o modelo sabe desenhar. */
  estados: (keyof Estado)[];
  gerar(variacao: number, nivel: Nivel, estado: Estado): Peca[];
};
