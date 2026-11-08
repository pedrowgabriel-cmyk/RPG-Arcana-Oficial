// O que cresce em cada lugar, conforme o catálogo aprovado com o usuário.
// Densidade em exemplares por hectare. `onde` escolhe o chão:
//   "campo" = fora de qualquer área, rua e prédio; um tipo de área = só dentro dela;
//   "ingreme" = encosta (inclinação acima de 0,45); "margem" = até 25 m de água.
// Grupos com `tapete` são cobertura de chão: nascem só em volta da câmera.

import type { TipoArea } from "@/lib/mapa/tipos";
import type { Estado } from "./tipos";

export type Onde = "campo" | "ingreme" | "margem" | TipoArea;

export type Grupo = {
  modelo: string;
  densidade: number;
  onde: Onde[];
  /** Mancha: 0 espalha por igual; perto de 1 forma capões e clareiras. */
  agrupar?: number;
  estado?: Estado;
  escala?: [number, number];
  /** Só estas variações (ex.: paredão cinza ou vermelho). */
  variacoes?: number[];
  tapete?: boolean;
};

const CAMPO_VERDE: Grupo[] = [
  { modelo: "capim-baixo", densidade: 260, onde: ["campo", "pasto", "praca", "cemiterio"], tapete: true },
  { modelo: "capim-alto", densidade: 22, onde: ["campo"], agrupar: 0.6, tapete: true },
  { modelo: "flores", densidade: 6, onde: ["campo", "pasto"], agrupar: 0.7, tapete: true },
];

const MATA_ATLANTICA: Grupo[] = [
  { modelo: "arvore-gigante", densidade: 9, onde: ["mata"] },
  { modelo: "arvore-copa", densidade: 45, onde: ["mata"] },
  { modelo: "samambaia", densidade: 70, onde: ["mata"], tapete: true },
];

export const NATUREZA: Record<string, Grupo[]> = {
  tupaciguara: [
    { modelo: "arvore-copa", densidade: 9, onde: ["campo", "pasto"], agrupar: 0.75 },
    { modelo: "arvore-cerrado", densidade: 4, onde: ["campo"], agrupar: 0.6 },
    { modelo: "arbusto", densidade: 3, onde: ["campo"], agrupar: 0.5 },
    { modelo: "matacao", densidade: 0.3, onde: ["campo", "ingreme"] },
    { modelo: "afloramento", densidade: 0.4, onde: ["ingreme", "rochas"] },
    { modelo: "arvore-copa", densidade: 25, onde: ["margem"], agrupar: 0.3 },
    ...MATA_ATLANTICA,
    ...CAMPO_VERDE,
  ],
  "bom-fim": [
    { modelo: "arvore-copa", densidade: 9, onde: ["campo"], agrupar: 0.75 },
    { modelo: "palmeira", densidade: 1.5, onde: ["campo", "praca"], agrupar: 0.4 },
    { modelo: "arbusto", densidade: 5, onde: ["campo"], agrupar: 0.5 },
    { modelo: "taboa", densidade: 30, onde: ["lama", "margem"], tapete: true },
    ...MATA_ATLANTICA,
    ...CAMPO_VERDE,
  ],
  "belo-horizonte": [
    { modelo: "coqueiro", densidade: 14, onde: ["areia"], agrupar: 0.3 },
    { modelo: "palmeira", densidade: 1, onde: ["campo", "praca"] },
    { modelo: "arvore-gigante", densidade: 6, onde: ["ingreme"], agrupar: 0.7 },
    { modelo: "arvore-copa", densidade: 6, onde: ["campo"], agrupar: 0.7 },
    { modelo: "afloramento", densidade: 1.2, onde: ["ingreme", "rochas"] },
    { modelo: "arbusto", densidade: 4, onde: ["campo", "ingreme"], agrupar: 0.5 },
    ...MATA_ATLANTICA,
    ...CAMPO_VERDE,
  ],
  "sacramento-cidade": [
    { modelo: "arvore-queimada", densidade: 6, onde: ["campo"], agrupar: 0.6 },
    { modelo: "arvore-seca", densidade: 1.5, onde: ["campo"], agrupar: 0.5 },
    { modelo: "arbusto", densidade: 5, onde: ["campo"], agrupar: 0.6 },
    { modelo: "capim-alto", densidade: 45, onde: ["campo", "praca"], agrupar: 0.4, tapete: true },
    { modelo: "capim-baixo", densidade: 160, onde: ["campo", "cinzas"], estado: { seca: true }, tapete: true },
    ...MATA_ATLANTICA,
  ],
  celestes: [
    { modelo: "arvore-gigante", densidade: 6, onde: ["campo"], agrupar: 0.8 },
    { modelo: "samambaia", densidade: 40, onde: ["campo"], agrupar: 0.7, tapete: true },
    { modelo: "afloramento", densidade: 1, onde: ["ingreme", "rochas"] },
    ...MATA_ATLANTICA,
    ...CAMPO_VERDE,
  ],
  araguari: [
    { modelo: "arvore-copa", densidade: 6, onde: ["campo"], agrupar: 0.8 },
    { modelo: "arvore-seca", densidade: 1, onde: ["campo"], agrupar: 0.5 },
    { modelo: "pedregulho", densidade: 2, onde: ["campo", "cinzas"], agrupar: 0.6 },
    { modelo: "arbusto", densidade: 3, onde: ["campo"] },
    ...MATA_ATLANTICA,
    { modelo: "capim-baixo", densidade: 200, onde: ["campo", "pasto"], tapete: true },
  ],
  "serra-da-saudade-povoado": [
    { modelo: "pinheiro", densidade: 8, onde: ["campo", "mata"], agrupar: 0.6, estado: { neve: 0.6 } },
    { modelo: "araucaria", densidade: 1.5, onde: ["campo"], agrupar: 0.5, estado: { neve: 0.4 } },
    { modelo: "arbusto-altitude", densidade: 10, onde: ["campo", "ingreme"], agrupar: 0.5, estado: { neve: 0.5 } },
    { modelo: "matacao", densidade: 1, onde: ["campo", "ingreme"], estado: { neve: 0.6 } },
    { modelo: "afloramento", densidade: 1, onde: ["ingreme", "rochas"], estado: { neve: 0.6 } },
    { modelo: "capim-baixo", densidade: 120, onde: ["campo", "pasto"], estado: { seca: true }, tapete: true },
  ],
  "serra-da-saudade-cordilheira": [
    { modelo: "pinheiro", densidade: 40, onde: ["mata"], estado: { neve: 0.8 } },
    { modelo: "pinheiro", densidade: 4, onde: ["campo"], agrupar: 0.7, estado: { neve: 0.8 } },
    { modelo: "araucaria", densidade: 1, onde: ["campo"], agrupar: 0.6, estado: { neve: 0.5 } },
    { modelo: "arbusto-altitude", densidade: 8, onde: ["campo", "ingreme"], estado: { neve: 0.7 } },
    { modelo: "matacao", densidade: 2, onde: ["campo"], estado: { neve: 0.8 } },
    { modelo: "afloramento", densidade: 3, onde: ["ingreme", "rochas"], estado: { neve: 0.8 } },
    { modelo: "pedregulho", densidade: 3, onde: ["campo", "ingreme"], estado: { neve: 0.7 } },
  ],
  "vila-de-desemboque": [
    { modelo: "capim-alto", densidade: 70, onde: ["campo", "praca", "cemiterio", "pasto"], agrupar: 0.3, tapete: true },
    { modelo: "arvore-seca", densidade: 3, onde: ["campo"], agrupar: 0.5 },
    { modelo: "arvore-copa", densidade: 5, onde: ["campo"], agrupar: 0.7 },
    { modelo: "arbusto", densidade: 6, onde: ["campo"], agrupar: 0.4 },
    ...MATA_ATLANTICA,
    { modelo: "capim-baixo", densidade: 160, onde: ["campo"], tapete: true },
  ],
  "maria-da-fe": [
    { modelo: "pinheiro", densidade: 10, onde: ["campo"], agrupar: 0.6, estado: { neve: 0.9 } },
    { modelo: "pinheiro", densidade: 50, onde: ["mata"], estado: { neve: 0.9 } },
    { modelo: "araucaria", densidade: 2, onde: ["campo"], agrupar: 0.5, estado: { neve: 0.7 } },
    { modelo: "arbusto-altitude", densidade: 6, onde: ["campo"], estado: { neve: 0.8 } },
    { modelo: "matacao", densidade: 0.8, onde: ["campo", "ingreme"], estado: { neve: 0.9 } },
    { modelo: "afloramento", densidade: 1, onde: ["ingreme", "rochas"], estado: { neve: 0.9 } },
  ],
  aracuai: [
    { modelo: "mandacaru", densidade: 7, onde: ["campo", "areia"], agrupar: 0.4 },
    { modelo: "xique-xique", densidade: 16, onde: ["campo", "areia"], agrupar: 0.5 },
    { modelo: "arbusto-seco", densidade: 12, onde: ["campo"], agrupar: 0.4 },
    { modelo: "arvore-cerrado", densidade: 3, onde: ["campo"], estado: { seca: true } },
    { modelo: "pedregulho", densidade: 2, onde: ["campo", "areia"] },
    { modelo: "matacao", densidade: 0.4, onde: ["campo", "ingreme"] },
    { modelo: "afloramento", densidade: 1, onde: ["ingreme", "rochas"] },
  ],
  "santo-ozorio": [
    { modelo: "coqueiro", densidade: 16, onde: ["areia"], agrupar: 0.3 },
    { modelo: "coqueiro", densidade: 2, onde: ["campo"], agrupar: 0.6 },
    { modelo: "palmeira", densidade: 1, onde: ["campo", "praca"] },
    { modelo: "arbusto", densidade: 8, onde: ["campo", "areia"], agrupar: 0.5 },
    { modelo: "afloramento", densidade: 1, onde: ["ingreme", "rochas"] },
    ...CAMPO_VERDE,
  ],
  "floresta-do-cipo": [
    { modelo: "arvore-gigante", densidade: 14, onde: ["campo", "mata"], agrupar: 0.5 },
    { modelo: "arvore-copa", densidade: 30, onde: ["campo", "mata"], agrupar: 0.4 },
    { modelo: "samambaia", densidade: 90, onde: ["campo", "mata"], tapete: true },
    { modelo: "arbusto", densidade: 12, onde: ["campo"] },
    { modelo: "matacao", densidade: 0.6, onde: ["campo", "margem"] },
  ],
  "sertao-de-fungos": [
    { modelo: "arvore-pantano", densidade: 16, onde: ["campo", "lama", "margem"], agrupar: 0.5 },
    { modelo: "cogumelo-gigante", densidade: 5, onde: ["campo"], agrupar: 0.7 },
    { modelo: "cogumelo-gigante", densidade: 18, onde: ["fungos"] },
    { modelo: "taboa", densidade: 45, onde: ["lama", "margem"], tapete: true },
    { modelo: "capim-alto", densidade: 12, onde: ["campo"], agrupar: 0.5, tapete: true },
  ],
  "deserto-de-mucuri": [
    { modelo: "mandacaru", densidade: 4, onde: ["campo", "areia"], agrupar: 0.5 },
    { modelo: "xique-xique", densidade: 9, onde: ["campo", "areia"], agrupar: 0.5 },
    { modelo: "arbusto-seco", densidade: 3, onde: ["campo"], agrupar: 0.4 },
    { modelo: "ossada", densidade: 0.1, onde: ["campo", "areia"] },
    { modelo: "pedregulho", densidade: 2, onde: ["campo"] },
    { modelo: "matacao", densidade: 0.5, onde: ["campo", "ingreme"] },
    { modelo: "afloramento", densidade: 1.5, onde: ["ingreme", "rochas"] },
  ],
  "trincheira-do-carvao": [
    { modelo: "arvore-queimada", densidade: 2, onde: ["campo"], agrupar: 0.5 },
    { modelo: "arvore-seca", densidade: 0.5, onde: ["campo"] },
    { modelo: "pedregulho", densidade: 2.5, onde: ["campo", "cinzas", "lama"] },
    { modelo: "capim-baixo", densidade: 60, onde: ["campo"], estado: { seca: true }, tapete: true },
  ],
};
