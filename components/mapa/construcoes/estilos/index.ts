// Estilo de cada lugar. Cada estilo vive em ./<id>.ts com `export default` do tipo Estilo.

import type { Estilo } from "../tipos";

const CARREGAR: Record<string, () => Promise<{ default: Estilo }>> = {
  "colonial": () => import("./colonial"),
  "festa": () => import("./festa"),
  "porto": () => import("./porto"),
  "barroco-queimado": () => import("./barroco-queimado"),
  "peste": () => import("./peste"),
  "platos": () => import("./platos"),
  "mineracao": () => import("./mineracao"),
  "pedra-fria": () => import("./pedra-fria"),
  "madeira-fria": () => import("./madeira-fria"),
  "pedra-vermelha": () => import("./pedra-vermelha"),
  "balneario": () => import("./balneario"),
  "ermos": () => import("./ermos"),
};

export const ESTILO_DO_LUGAR: Record<string, string> = {
  "tupaciguara": "colonial",
  "bom-fim": "festa",
  "belo-horizonte": "porto",
  "sacramento-cidade": "barroco-queimado",
  "vila-de-desemboque": "peste",
  "celestes": "platos",
  "araguari": "mineracao",
  "serra-da-saudade-povoado": "pedra-fria",
  "maria-da-fe": "madeira-fria",
  "aracuai": "pedra-vermelha",
  "santo-ozorio": "balneario",
  "floresta-do-cipo": "ermos",
  "sertao-de-fungos": "ermos",
  "serra-da-saudade-cordilheira": "ermos",
  "deserto-de-mucuri": "ermos",
  "trincheira-do-carvao": "ermos",
};

export async function carregarEstilo(lugar: string): Promise<Estilo> {
  const id = ESTILO_DO_LUGAR[lugar] ?? "colonial";
  return (await (CARREGAR[id] ?? CARREGAR.colonial)()).default;
}

export async function carregarEstiloPorId(id: string): Promise<Estilo> {
  return (await (CARREGAR[id] ?? CARREGAR.colonial)()).default;
}
