// Formato dos arquivos de relevo. Sem dependências: usado por scripts e pelo jogo.

export const CONT_PASSO = 2; // unidades do mapa impresso entre pontos
export const CONT_LARGURA = 501;
export const CONT_ALTURA = 369;

export const RECORTE_LADO = 301;

/**
 * Escala do mundo, entre GTA e Red Dead: 1 unidade do mapa impresso = 42 m.
 * O continente tem cerca de 42 km; a história segue em 1 unidade = 1 km (lib/mapa/viagem.ts).
 */
export const METROS_POR_UNIDADE_DO_MAPA = 42;

/** Lugares que colidiriam nesta escala, afastados só no 3D. */
export const POSICAO_3D: Record<string, { x: number; y: number }> = {
  "deserto-de-mucuri": { x: 215, y: 665 },
  "serra-da-saudade-cordilheira": { x: 552, y: 128 },
};

/** Lugares com recorte real de Minas: centro (graus) e lado do quadrado (metros). */
export const RECORTES: Record<string, { lat: number; lon: number; lado: number; altitudeBase: number }> = {
  "belo-horizonte": { lat: -19.945, lon: -43.935, lado: 5400, altitudeBase: 824 },
};

/** Em volta do recorte, a região real entra no continente (unidades do mapa). */
export const REGIAO_REAL = 170;
