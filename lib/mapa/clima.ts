// Tempo do mapa, controlado pelo Juiz: um tempo geral e ajustes por lugar que
// se espalham em volta dele. Valores de 0 a 1. Sem Three.js.

import { LUGARES, lugarPorId } from "./lugares";

export type Tempo = { nuvens: number; chuva: number; vento: number; tempestade: number };

export type Clima = {
  /** Para onde o vento sopra, em graus: 0 = norte, 90 = leste. */
  ventoDirecao: number;
  geral: Tempo;
  regioes: Record<string, Tempo>;
};

export const CAMPOS_DO_TEMPO: { id: keyof Tempo; nome: string }[] = [
  { id: "nuvens", nome: "Nuvens" },
  { id: "chuva", nome: "Chuva" },
  { id: "vento", nome: "Vento" },
  { id: "tempestade", nome: "Tempestade" },
];

export const PREDEFINIDOS: { id: string; nome: string; tempo: Tempo }[] = [
  { id: "limpo", nome: "Limpo", tempo: { nuvens: 0.15, chuva: 0, vento: 0.15, tempestade: 0 } },
  { id: "nublado", nome: "Nublado", tempo: { nuvens: 0.7, chuva: 0, vento: 0.35, tempestade: 0 } },
  { id: "chuva", nome: "Chuva", tempo: { nuvens: 0.88, chuva: 0.7, vento: 0.45, tempestade: 0.1 } },
  { id: "tempestade", nome: "Tempestade", tempo: { nuvens: 1, chuva: 1, vento: 0.8, tempestade: 0.6 } },
  { id: "tufao", nome: "Tufão", tempo: { nuvens: 1, chuva: 1, vento: 1, tempestade: 1 } },
];

export const CLIMA_PADRAO: Clima = { ventoDirecao: 70, geral: { ...PREDEFINIDOS[0].tempo, nuvens: 0.35 }, regioes: {} };

/** Unidades do mapa impresso: até onde o tempo de um lugar se espalha. */
const ALCANCE_DA_REGIAO = 160;
/** A partir daqui a tempestade de um lugar gira como tufão. */
export const LIMIAR_DO_TUFAO = 0.75;

const CAMPOS = CAMPOS_DO_TEMPO.map((c) => c.id);

/** Tempo num ponto do mapa impresso: o geral, puxado pelo lugar mais próximo de cada ajuste. */
export function tempoEm(clima: Clima, mx: number, my: number): Tempo {
  const t = { ...clima.geral };
  for (const [id, regional] of Object.entries(clima.regioes)) {
    const l = lugarPorId(id);
    const d = Math.hypot(mx - l.mx, my - l.my) / ALCANCE_DA_REGIAO;
    const peso = Math.exp(-d * d * 1.6);
    if (peso < 0.01) continue;
    for (const c of CAMPOS) t[c] += (regional[c] - t[c]) * peso;
  }
  return t;
}

/** Lugares em tufão, com a força acima do limiar. */
export function tufoes(clima: Clima) {
  return Object.entries(clima.regioes)
    .filter(([, t]) => t.tempestade > LIMIAR_DO_TUFAO)
    .map(([id, t]) => {
      const l = lugarPorId(id);
      return { id, mx: l.mx, my: l.my, forca: (t.tempestade - LIMIAR_DO_TUFAO) / (1 - LIMIAR_DO_TUFAO), raio: ALCANCE_DA_REGIAO * 0.9 };
    });
}

/** Aproxima `atual` de `alvo` na fração `k`; regiões novas nascem do tempo geral. */
export function aproximarClima(atual: Clima, alvo: Clima, k: number): Clima {
  const mistura = (a: Tempo, b: Tempo): Tempo => Object.fromEntries(CAMPOS.map((c) => [c, a[c] + (b[c] - a[c]) * k])) as Tempo;
  const regioes: Record<string, Tempo> = {};
  for (const id of new Set([...Object.keys(atual.regioes), ...Object.keys(alvo.regioes)])) {
    const de = atual.regioes[id] ?? atual.geral;
    const para = alvo.regioes[id] ?? alvo.geral;
    const novo = mistura(de, para);
    // Região retirada some quando já se confunde com o geral.
    if (alvo.regioes[id] || CAMPOS.some((c) => Math.abs(novo[c] - alvo.geral[c]) > 0.01)) regioes[id] = novo;
  }
  const giro = ((((alvo.ventoDirecao - atual.ventoDirecao) % 360) + 540) % 360) - 180;
  return { ventoDirecao: atual.ventoDirecao + giro * k, geral: mistura(atual.geral, alvo.geral), regioes };
}

export function climaValido(c: unknown): c is Clima {
  const v = c as Clima | null;
  return !!v && typeof v.ventoDirecao === "number" && !!v.geral && typeof v.regioes === "object";
}

export const OPCOES_DE_REGIAO = [{ id: "geral", nome: "Todo o mapa" }, ...LUGARES.map((l) => ({ id: l.id, nome: l.nome }))];
