// Os 16 lugares no continente e a carga sob demanda de cada um: uma cidade só
// pesa no aparelho de quem está nela.

import { CITIES, REGION_PLACES } from "./geografia";
import { carregarContinente, carregarRecorte, gerarRelevo } from "./relevo";
import type { Cidade, Ponto } from "./tipos";
import { Zona } from "./zona";

/** Decisão de campanha: 1 unidade do mapa impresso = 1 km. O livro não dá escala. */
export const METROS_POR_UNIDADE_DO_MAPA = 1000;
export const LARGURA_MAPA = 1000;
export const ALTURA_MAPA = 736;
export const LUGAR_INICIAL = "tupaciguara";

export type Lugar = { id: string; nome: string; mx: number; my: number };

const NOMES: Record<string, string> = { celestes: "Celestes" };

export const LUGARES: Lugar[] = [...CITIES, ...REGION_PLACES].map((l) => ({
  id: l.id,
  nome: NOMES[l.id] ?? l.nome.replace("\n", " "),
  mx: l.x,
  my: l.y,
}));

export function lugarPorId(id: string): Lugar {
  return LUGARES.find((l) => l.id === id) ?? LUGARES.find((l) => l.id === LUGAR_INICIAL)!;
}

/** Ponto do mapa impresso em metros, com a origem no centro do mapa. */
export function mundoDoMapa(mx: number, my: number): Ponto {
  return { x: (mx - LARGURA_MAPA / 2) * METROS_POR_UNIDADE_DO_MAPA, z: (my - ALTURA_MAPA / 2) * METROS_POR_UNIDADE_DO_MAPA };
}

export function mundoDoLugar(id: string): Ponto {
  const l = lugarPorId(id);
  return mundoDoMapa(l.mx, l.my);
}

export const CARREGAR: Record<string, () => Promise<{ default: Cidade }>> = {
  aracuai: () => import("./cidades/aracuai"),
  araguari: () => import("./cidades/araguari"),
  "belo-horizonte": () => import("./cidades/belo-horizonte"),
  "bom-fim": () => import("./cidades/bom-fim"),
  celestes: () => import("./cidades/celestes"),
  "deserto-de-mucuri": () => import("./cidades/deserto-de-mucuri"),
  "floresta-do-cipo": () => import("./cidades/floresta-do-cipo"),
  "maria-da-fe": () => import("./cidades/maria-da-fe"),
  "sacramento-cidade": () => import("./cidades/sacramento-cidade"),
  "santo-ozorio": () => import("./cidades/santo-ozorio"),
  "serra-da-saudade-cordilheira": () => import("./cidades/serra-da-saudade-cordilheira"),
  "serra-da-saudade-povoado": () => import("./cidades/serra-da-saudade-povoado"),
  "sertao-de-fungos": () => import("./cidades/sertao-de-fungos"),
  "trincheira-do-carvao": () => import("./cidades/trincheira-do-carvao"),
  tupaciguara: () => import("./cidades/tupaciguara"),
  "vila-de-desemboque": () => import("./cidades/vila-de-desemboque"),
};

export async function carregarCidade(id: string): Promise<Cidade> {
  return (await (CARREGAR[id] ?? CARREGAR[LUGAR_INICIAL])()).default;
}

/** Lugar pronto para andar: planta mais relevo. */
export async function carregarZona(id: string): Promise<Zona> {
  const cidade = await carregarCidade(id);
  const [, dem] = await Promise.all([carregarContinente(), carregarRecorte(cidade.id)]);
  const l = lugarPorId(cidade.id);
  return new Zona(cidade, gerarRelevo(cidade, l.mx, l.my, dem));
}
