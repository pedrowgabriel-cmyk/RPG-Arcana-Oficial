// Contrato dos estilos de construção. O prédio chega no próprio referencial:
// centro em x = z = 0, chão em y = 0, largura em x, fundo em z, FACHADA E PORTA em +z.
// O motor gira e assenta no terreno; o estilo só desenha.

import type { Predio } from "@/lib/mapa/tipos";
import type { Peca } from "../natureza/tipos";

/** 0 = perto (fachada com janela, porta, beiral); 1 = longe (volume, telhado e cor). */
export type NivelPredio = 0 | 1;

/** Teto de triângulos por prédio: casa comum gasta bem menos; igreja e marco podem ir ao teto. */
export const TETO_PREDIO: Record<NivelPredio, number> = { 0: 4000, 1: 300 };

export type PredioLocal = Omit<Predio, "x" | "z" | "porta"> & {
  /** Lugar a que pertence: o mesmo estilo pode variar por cidade. */
  lugar: string;
};

export type PecasDoPredio = {
  /** Paredes, fachada, varanda, torre: o que fica sempre. */
  corpo: Peca[];
  /** Some quando alguém entra ou o Juiz aproxima (só nos entráveis importa). */
  telhado: Peca[];
  /** Piso e móveis: só nos entráveis, aparece com o telhado aberto. */
  interior: Peca[];
};

export type Estilo = {
  id: string;
  nome: string;
  /**
   * Desenha o prédio. Determinístico pela `semente`. Entrável precisa de vão de porta
   * de pelo menos 4 m em +z (o jogador passa por ele) e de interior.
   */
  gerar(p: PredioLocal, nivel: NivelPredio, semente: number): PecasDoPredio;
};
