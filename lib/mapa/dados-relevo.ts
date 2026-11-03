// Formato dos arquivos de relevo. Sem dependências: usado por scripts e pelo jogo.

export const CONT_PASSO = 2; // unidades do mapa impresso entre pontos
export const CONT_LARGURA = 501;
export const CONT_ALTURA = 369;

export const RECORTE_LADO = 301;

/** O livro põe BH numa baía; o traçado 2D a deixa a 30 km do mar. Coordenadas do mapa. */
export const BAIA_DE_BH: readonly (readonly [number, number])[] = [
  [807.2, 483], [807.7, 487], [807.1, 491], [807.5, 495], [812, 503], [826, 512], [842, 515], [858, 524],
  [884, 452], [862, 460], [846, 458], [830, 466], [818, 470], [810, 477],
];

/** Lugares com recorte real de Minas: centro (graus) e lado do quadrado (metros). */
export const RECORTES: Record<string, { lat: number; lon: number; lado: number; altitudeBase: number }> = {
  "belo-horizonte": { lat: -19.945, lon: -43.935, lado: 5400, altitudeBase: 824 },
};

/** Em volta do recorte, a região real entra no continente (unidades do mapa). */
export const REGIAO_REAL = 42;
