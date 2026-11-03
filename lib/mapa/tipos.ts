// Formato de um lugar do mapa. Tudo em metros, com a origem no centro do lugar:
// x cresce para leste e z para sul. Prédios sempre alinhados aos eixos.

export type Ponto = { x: number; z: number };
export type XZ = readonly [number, number];

export type TipoPredio =
  | "casa"
  | "comercio"
  | "saloon"
  | "hotel"
  | "igreja"
  | "publico"
  | "banco"
  | "estacao"
  | "galpao"
  | "fazenda"
  | "moinho"
  | "fabrica"
  | "torre"
  | "tenda"
  | "ruina";

export type Face = "n" | "s" | "l" | "o";

export type Predio = {
  /** Único no lugar. */
  id: string;
  nome: string;
  tipo: TipoPredio;
  x: number;
  z: number;
  largura: number;
  fundo: number;
  altura: number;
  /** Só prédios entráveis têm interior e porta. */
  entravel: boolean;
  porta?: Face;
  /** Citado pelo livro ou pelo Doc 2; o resto é preenchimento da cidade. */
  canon?: boolean;
};

export type Piso = "terra" | "pedra" | "lama" | "areia" | "neve" | "madeira" | "trilho";
export type Rua = { pts: XZ[]; largura: number; piso: Piso };

export type TipoArea = "agua" | "rochas" | "lavoura" | "pasto" | "mata" | "praca" | "cemiterio" | "lama" | "areia" | "neve" | "cinzas" | "fungos";
/** `agua` e `rochas` bloqueiam o passo. `mata` ganha árvores. */
export type Area = { tipo: TipoArea; pts: XZ[]; nome?: string };

export type Chao = "campo" | "lama" | "areia" | "neve" | "cinzas" | "carvao" | "umido" | "pedra";
export type Especie = "copa" | "pinheiro" | "cacto" | "seca" | "cogumelo";

export type Cidade = {
  id: string;
  nome: string;
  tipo: "cidade" | "vila" | "regiao";
  /** Até onde se anda sem o Juiz guiar. */
  raio: number;
  chao: Chao;
  especie: Especie;
  /** Árvores soltas fora das áreas de mata. */
  arvores: number;
  /** Onde o bando chega de viagem. */
  chegada: Ponto;
  predios: Predio[];
  ruas: Rua[];
  areas: Area[];
};
