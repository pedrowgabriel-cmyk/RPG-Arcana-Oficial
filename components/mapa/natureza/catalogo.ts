// Catálogo de modelos da natureza. Cada modelo vive em ./modelos/<id>.ts com
// `export default` do tipo Modelo; o grupo diz quem cuida dele.

import type { Modelo } from "./tipos";

export type Grupo = "quentes" | "frio" | "mata" | "pantano" | "deserto" | "pedra" | "chao" | "agua";

export const CATALOGO: { id: string; nome: string; grupo: Grupo; carregar: () => Promise<{ default: Modelo }> }[] = [
  { id: "arvore-copa", nome: "Árvore de copa larga (ipê, jatobá)", grupo: "quentes", carregar: () => import("./modelos/arvore-copa") },
  { id: "arvore-cerrado", nome: "Árvore do cerrado", grupo: "quentes", carregar: () => import("./modelos/arvore-cerrado") },
  { id: "palmeira", nome: "Palmeira", grupo: "quentes", carregar: () => import("./modelos/palmeira") },
  { id: "coqueiro", nome: "Coqueiro", grupo: "quentes", carregar: () => import("./modelos/coqueiro") },
  { id: "buriti", nome: "Buriti", grupo: "quentes", carregar: () => import("./modelos/buriti") },
  { id: "pinheiro", nome: "Pinheiro (conífera)", grupo: "frio", carregar: () => import("./modelos/pinheiro") },
  { id: "araucaria", nome: "Araucária", grupo: "frio", carregar: () => import("./modelos/araucaria") },
  { id: "arbusto-altitude", nome: "Arbusto de altitude", grupo: "frio", carregar: () => import("./modelos/arbusto-altitude") },
  { id: "arvore-gigante", nome: "Árvore gigante com cipó", grupo: "mata", carregar: () => import("./modelos/arvore-gigante") },
  { id: "samambaia", nome: "Samambaia", grupo: "mata", carregar: () => import("./modelos/samambaia") },
  { id: "arvore-seca", nome: "Árvore seca sem folha", grupo: "mata", carregar: () => import("./modelos/arvore-seca") },
  { id: "arvore-queimada", nome: "Árvore queimada", grupo: "mata", carregar: () => import("./modelos/arvore-queimada") },
  { id: "arvore-pantano", nome: "Árvore morta de pântano", grupo: "pantano", carregar: () => import("./modelos/arvore-pantano") },
  { id: "cogumelo-gigante", nome: "Cogumelo gigante", grupo: "pantano", carregar: () => import("./modelos/cogumelo-gigante") },
  { id: "taboa", nome: "Taboa e junco", grupo: "pantano", carregar: () => import("./modelos/taboa") },
  { id: "mandacaru", nome: "Mandacaru", grupo: "deserto", carregar: () => import("./modelos/mandacaru") },
  { id: "xique-xique", nome: "Xique-xique", grupo: "deserto", carregar: () => import("./modelos/xique-xique") },
  { id: "arbusto-seco", nome: "Arbusto seco", grupo: "deserto", carregar: () => import("./modelos/arbusto-seco") },
  { id: "ossada", nome: "Ossada", grupo: "deserto", carregar: () => import("./modelos/ossada") },
  { id: "afloramento", nome: "Afloramento de rocha", grupo: "pedra", carregar: () => import("./modelos/afloramento") },
  { id: "matacao", nome: "Matacão", grupo: "pedra", carregar: () => import("./modelos/matacao") },
  { id: "lajedo", nome: "Lajedo", grupo: "pedra", carregar: () => import("./modelos/lajedo") },
  { id: "paredao", nome: "Trecho de paredão", grupo: "pedra", carregar: () => import("./modelos/paredao") },
  { id: "pedregulho", nome: "Pedregulho", grupo: "pedra", carregar: () => import("./modelos/pedregulho") },
  { id: "gruta", nome: "Boca de gruta", grupo: "pedra", carregar: () => import("./modelos/gruta") },
  { id: "capim-alto", nome: "Capim alto", grupo: "chao", carregar: () => import("./modelos/capim-alto") },
  { id: "capim-baixo", nome: "Capim baixo", grupo: "chao", carregar: () => import("./modelos/capim-baixo") },
  { id: "arbusto", nome: "Arbusto", grupo: "chao", carregar: () => import("./modelos/arbusto") },
  { id: "flores", nome: "Flores do campo", grupo: "chao", carregar: () => import("./modelos/flores") },
  { id: "cachoeira", nome: "Cachoeira", grupo: "agua", carregar: () => import("./modelos/cachoeira") },
  { id: "corredeira", nome: "Corredeira", grupo: "agua", carregar: () => import("./modelos/corredeira") },
];

export async function carregarModelo(id: string): Promise<Modelo> {
  const item = CATALOGO.find((m) => m.id === id);
  if (!item) throw new Error(`Modelo inexistente: ${id}`);
  return (await item.carregar()).default;
}
