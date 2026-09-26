// Mesa de jogo do Sacramento — estado vivo da partida e regras operacionais.
// Fonte: docs/02 §6 (testes), §7 (combate/iniciativa por cartas), §8 (críticos),
// §9 (Dor, Vida, Teste de Morte), §11 (Sina). Cliente e servidor usam este módulo;
// as rolagens valendo são SEMPRE feitas no servidor.

import type { Character } from "@/lib/types";
import type { Carta, CartaValor } from "./types";
import { NAIPE_SYMBOL } from "./generators";

/* ── Estado por personagem (characters.stats + hp/max_hp + conditions) ── */

export type FichaMesa = {
  vida: number;
  vidaMax: number;
  /** Círculos de Dor riscados (0–5; ao riscar o 6º o ciclo fecha). */
  dor: number;
  sina: Carta[];
  saldo: number;
  xp: number;
  nivel: number;
  atributos: Record<string, number>;
  antecedentes: Record<string, number>;
  derivados: Record<string, number>;
  habilidades: string[];
  condicoes: string[];
  morto: boolean;
};

export function fichaMesa(c: Character): FichaMesa {
  const stats = (c.stats ?? {}) as Record<string, unknown>;
  const skills = (c.skills ?? {}) as { antecedentes?: Record<string, number>; habilidades?: string[] };
  const condicoes = c.conditions ?? [];
  return {
    vida: c.hp,
    vidaMax: c.max_hp,
    dor: typeof stats.dor === "number" ? (stats.dor as number) : 0,
    sina: Array.isArray(stats.sina) ? (stats.sina as Carta[]) : [],
    saldo: typeof stats.saldo === "number" ? (stats.saldo as number) : c.gold,
    xp: c.xp,
    nivel: c.level,
    atributos: (stats.atributos as Record<string, number>) ?? {},
    antecedentes: skills.antecedentes ?? {},
    derivados: (stats.derivados as Record<string, number>) ?? {},
    habilidades: skills.habilidades ?? [],
    condicoes,
    morto: condicoes.includes("Morto"),
  };
}

/** Célula da prancha de estados (3×2): 0 inteiro … 4 à beira da morte, 5 morto. */
export function indiceEstado(f: Pick<FichaMesa, "vida" | "vidaMax" | "morto">): number {
  if (f.morto) return 5;
  if (f.vida <= 0) return 4;
  const r = f.vidaMax > 0 ? f.vida / f.vidaMax : 1;
  if (r >= 1) return 0;
  if (r >= 0.75) return 1;
  if (r >= 0.5) return 2;
  if (r >= 0.25) return 3;
  return 4;
}

export const ROTULO_ESTADO = ["Inteiro", "Surrado", "Ferido", "Muito ferido", "À beira da morte", "Morto"];

/* ── Condições (docs/02 §9–§10; não há lista formal no livro) ── */

export const CONDICOES: { nome: string; efeito: string }[] = [
  { nome: "Atordoado", efeito: "−1 AC na próxima rodada" },
  { nome: "Caído", efeito: "Gasta 1 M para levantar" },
  { nome: "Distraído", efeito: "Não ataca o mesmo alvo no próximo ataque" },
  { nome: "Sangrando", efeito: "1 D por turno até o fim do combate" },
  { nome: "Intimidado", efeito: "Afasta-se do atacante na próxima rodada" },
  { nome: "Desorientado", efeito: "−1 Violência no próximo turno" },
  { nome: "Em cobertura parcial", efeito: "Defesa 6" },
  { nome: "Em cobertura completa", efeito: "Defesa 7; quem atira dela tem −1 Violência" },
  { nome: "Surpreendido", efeito: "Defesa 3" },
  { nome: "Laçado", efeito: "Sem M nem AC comuns; escapa com Suor ou Roubo" },
  { nome: "Envenenado", efeito: "Conforme o veneno (docs/02 §10.5)" },
  { nome: "Pegando fogo", efeito: "1–3 D por rodada" },
  { nome: "Bêbado", efeito: "+1 carta de iniciativa, −1 Violência, +1 M" },
  { nome: "Livramento usado", efeito: "Não recupera por Livramento neste combate" },
  { nome: "Teste de Morte usado", efeito: "Só um por combate" },
  { nome: "Inconsciente", efeito: "Fora de ação" },
  { nome: "Morto", efeito: "Reanimável com Sina até 1 rodada depois (p. 95)" },
];

/* ── Tabelas d6 ── */

export const CONSEQUENCIA_DOR: Record<number, { condicao: string; texto: string }> = {
  1: { condicao: "Atordoado", texto: "Atordoamento: −1 AC na próxima rodada" },
  2: { condicao: "Caído", texto: "Queda: gasta 1 M para levantar" },
  3: { condicao: "Distraído", texto: "Distração: não ataca o mesmo alvo no próximo ataque" },
  4: { condicao: "Sangrando", texto: "Sangramento: 1 D por turno até o fim do combate" },
  5: { condicao: "Intimidado", texto: "Intimidação: afasta-se do atacante na próxima rodada" },
  6: { condicao: "Desorientado", texto: "Desorientação: −1 Violência no próximo turno" },
};

export const CRITICO_ACERTO: Record<number, string> = {
  1: "+2 V de dano",
  2: "Alvo perde o próximo turno",
  3: "Alvo não pode mais usar aquela arma",
  4: "+1 Violência até o fim do combate",
  5: "+1 M até o fim do combate",
  6: "Alvo foge e jura vingança",
};

export const CRITICO_FALHA: Record<number, string> = {
  1: "Atinge um aliado ou inocente",
  2: "A arma quebra (desarmado: dano anulado)",
  3: "Inimigos têm +1 contra você até o fim do combate",
  4: "−1 no ataque até o fim do combate",
  5: "Perde o próximo turno",
  6: "Cai e perde 2 ações para levantar",
};

/* ── Rolagens (docs/02 §6–§9) ── */

export type TipoRolagem = "teste" | "ataque" | "melhor2" | "sorte" | "morte" | "dor";

export type Rolagem = {
  tipo: TipoRolagem;
  rotulo: string;
  quem: string;
  dados: number[];
  mod: number;
  na: number | null;
  total: number | null;
  sucesso: boolean | null;
  critico?: "acerto" | "falha" | null;
  criticoTexto?: string;
  texto: string;
};

const d6 = () => 1 + Math.floor(Math.random() * 6);

/** Executa uma rolagem com as regras do livro. Chamar no servidor. */
export function rolar(p: {
  tipo: TipoRolagem;
  rotulo: string;
  quem: string;
  mod?: number;
  na?: number | null;
}): Rolagem {
  const mod = Math.round(p.mod ?? 0);
  const na = p.na ?? null;
  switch (p.tipo) {
    case "sorte": {
      const d = d6();
      return { ...p, tipo: "sorte", dados: [d], mod: 0, na: null, total: d, sucesso: d % 2 === 0, texto: `Sorte: ${d} — ${d % 2 === 0 ? "SIM" : "NÃO"}` };
    }
    case "morte": {
      const d = d6();
      const vive = d === 1 || d === 6;
      return {
        ...p, tipo: "morte", dados: [d], mod: 0, na: null, total: d, sucesso: vive,
        texto: vive ? `Teste de Morte: ${d} — SOBREVIVE (paga 1 M + 1 AC, volta com 3 V)` : `Teste de Morte: ${d} — MORRE`,
      };
    }
    case "dor": {
      const d = d6();
      return { ...p, tipo: "dor", dados: [d], mod: 0, na: null, total: d, sucesso: null, texto: `Consequência de Dor ${d}: ${CONSEQUENCIA_DOR[d].texto}` };
    }
    case "melhor2": {
      const a = d6();
      const b = d6();
      const total = Math.max(a, b) + mod;
      const sucesso = na !== null ? total >= na : null;
      return {
        ...p, tipo: "melhor2", dados: [a, b], mod, na, total, sucesso,
        texto: `Melhor de dois [${a}, ${b}] → ${Math.max(a, b)}${fmtMod(mod)} = ${total}${na !== null ? ` vs NA ${na}: ${sucesso ? "SUCESSO" : "FALHA"}` : ""}`,
      };
    }
    case "ataque": {
      const d = d6();
      const alvo = na ?? 5;
      let critico: Rolagem["critico"] = null;
      let criticoTexto: string | undefined;
      const dados = [d];
      if (d === 6 || d === 1) {
        const conf = d6();
        dados.push(conf);
        if (d === 6 && conf === 6) {
          const t = d6();
          dados.push(t);
          critico = "acerto";
          criticoTexto = CRITICO_ACERTO[t];
        } else if (d === 1 && conf === 1) {
          const t = d6();
          dados.push(t);
          critico = "falha";
          criticoTexto = CRITICO_FALHA[t];
        }
      }
      const total = d + mod;
      // 1 natural sempre falha no ataque (p. 96).
      const sucesso = d === 1 ? false : total >= alvo;
      return {
        ...p, tipo: "ataque", dados, mod, na: alvo, total, sucesso, critico, criticoTexto,
        texto: `Ataque ${d}${fmtMod(mod)} = ${total} vs Defesa ${alvo}: ${sucesso ? "ACERTOU" : "ERROU"}${critico ? ` · CRÍTICO ${critico === "acerto" ? "DE ACERTO" : "DE FALHA"}: ${criticoTexto}` : d === 1 ? " (1 natural)" : ""}`,
      };
    }
    default: {
      const d = d6();
      const total = d + mod;
      const sucesso = na !== null ? total >= na : null;
      return {
        ...p, tipo: "teste", dados: [d], mod, na, total, sucesso,
        texto: `${d}${fmtMod(mod)} = ${total}${na !== null ? ` vs NA ${na}: ${sucesso ? "SUCESSO" : "FALHA"}` : ""}`,
      };
    }
  }
}

function fmtMod(m: number): string {
  return m === 0 ? "" : m > 0 ? ` + ${m}` : ` − ${Math.abs(m)}`;
}

/* ── Iniciativa por cartas (docs/02 §7.1) ── */

export const ORDEM_VALOR: Record<CartaValor, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, J: 11, Q: 12, K: 13, A: 14,
};

export type Combatente = {
  id: string;
  nome: string;
  tipo: "pj" | "npc";
  cartas: Carta[];
  carta: Carta;
  /** Descartou figura: vai para o fim da ordem com o bônus. */
  descarte?: string;
  ndc?: number;
  vida?: number;
  vidaMax?: number;
};

export type Iniciativa = {
  ativa: boolean;
  rodada: number;
  vez: number;
  ordem: Combatente[];
};

export const BONUS_DESCARTE: Partial<Record<CartaValor, string>> = {
  A: "+1 Violência neste combate",
  K: "+1 AC neste combate",
  Q: "+1 M neste combate",
  J: "+1 V temporário",
};

/** Ordena: valor desc; empate PJ×NPC → NPC antes; descartes vão para o fim. */
export function ordenarIniciativa(lista: Combatente[]): Combatente[] {
  return [...lista].sort((a, b) => {
    if (!!a.descarte !== !!b.descarte) return a.descarte ? 1 : -1;
    const dv = ORDEM_VALOR[b.carta.valor] - ORDEM_VALOR[a.carta.valor];
    if (dv !== 0) return dv;
    if (a.tipo !== b.tipo) return a.tipo === "npc" ? -1 : 1;
    return 0;
  });
}

export function maiorCarta(cartas: Carta[]): Carta {
  return [...cartas].sort((a, b) => ORDEM_VALOR[b.valor] - ORDEM_VALOR[a.valor])[0];
}

export function nomeCarta(c: Carta): string {
  return `${c.valor}${NAIPE_SYMBOL[c.naipe]}`;
}

export function cartaVermelha(c: Carta): boolean {
  return c.naipe === "copas" || c.naipe === "ouros";
}

/* ── Cena pública (sessions.settings.cenaAtual) ── */

export type CenaAtual = {
  titulo: string;
  lugar?: string;
  descricao?: string;
  imagem?: string;
  elementoId?: string;
};

export function cenaDaMesa(settings: unknown): CenaAtual | null {
  const c = (settings as { cenaAtual?: CenaAtual } | null)?.cenaAtual;
  return c && c.titulo ? c : null;
}

export function iniciativaDaMesa(settings: unknown): Iniciativa | null {
  const i = (settings as { iniciativa?: Iniciativa } | null)?.iniciativa;
  return i && i.ativa && Array.isArray(i.ordem) ? i : null;
}

/* ── Dano e cura no corpo (§9) — mesma conta para Juiz e jogador ── */

export type AjusteCorpo = { canal: "vida" | "dor"; delta: number };

/**
 * Aplica dano/cura em Vida ou Dor. Dor fecha ciclo no 6º círculo: −1 V,
 * consequência d6 e os círculos são apagados (p. 86–87); cada ciclo completo
 * conta. `d6` é injetável para o servidor sortear.
 */
export function calcularAjusteCorpo(
  estado: { nome: string; hp: number; maxHp: number; dor: number; condicoes: string[] },
  ajuste: AjusteCorpo,
  d6: () => number = () => 1 + Math.floor(Math.random() * 6),
): { hp: number; dor: number; condicoes: string[]; texto: string } {
  const condicoes = [...estado.condicoes];
  const add = (c: string) => {
    if (!condicoes.includes(c)) condicoes.push(c);
  };
  let hp = estado.hp;
  let dor = estado.dor;
  const partes: string[] = [];
  const delta = Math.round(ajuste.delta);

  if (ajuste.canal === "vida") {
    const antes = hp;
    hp = Math.max(0, Math.min(estado.maxHp, hp + delta));
    partes.push(delta < 0 ? `${estado.nome} perdeu ${antes - hp} V` : `${estado.nome} recuperou ${hp - antes} V`);
  } else {
    dor = dor + delta;
    if (delta < 0) {
      dor = Math.max(0, dor);
      partes.push(`${estado.nome} aliviou ${Math.abs(delta)} de Dor`);
    } else {
      partes.push(`${estado.nome} sofreu ${delta} de Dor`);
      while (dor >= 6) {
        const d = d6();
        const cons = CONSEQUENCIA_DOR[d];
        dor -= 6;
        hp = Math.max(0, hp - 1);
        add(cons.condicao);
        partes.push(`6 de Dor: −1 V · d6 = ${d} → ${cons.texto}`);
      }
    }
  }
  if (hp === 0 && estado.hp > 0) {
    add("Inconsciente");
    partes.push("VIDA ZERADA: Livramento, Sina ou Teste de Morte");
  }
  const final = hp > 0 ? condicoes.filter((c) => c !== "Inconsciente") : condicoes;
  partes.push(`(Vida ${hp}/${estado.maxHp} · Dor ${dor}/6)`);
  return { hp, dor, condicoes: final, texto: partes.join(" — ") };
}

/* ── Notas do jogador (characters.stats.notas) ── */

export type CorNota = "papel" | "ouro" | "sangue" | "mato" | "ceu";

export type Nota = {
  id: string;
  titulo: string;
  texto: string;
  cor: CorNota;
  fixada: boolean;
  atualizadaEm: string;
};

export function notasDe(c: Character): Nota[] {
  const n = (c.stats as { notas?: unknown } | null)?.notas;
  return Array.isArray(n) ? (n as Nota[]) : [];
}

/** Saneia notas vindas do cliente (limites de tamanho e quantidade). */
export function sanearNotas(raw: unknown): Nota[] {
  if (!Array.isArray(raw)) return [];
  const cores: CorNota[] = ["papel", "ouro", "sangue", "mato", "ceu"];
  return raw.slice(0, 200).flatMap((n) => {
    const x = (n ?? {}) as Partial<Nota>;
    if (typeof x.id !== "string" || !x.id) return [];
    return [
      {
        id: x.id.slice(0, 64),
        titulo: String(x.titulo ?? "").slice(0, 120),
        texto: String(x.texto ?? "").slice(0, 20000),
        cor: cores.includes(x.cor as CorNota) ? (x.cor as CorNota) : "papel",
        fixada: x.fixada === true,
        atualizadaEm: typeof x.atualizadaEm === "string" ? x.atualizadaEm : new Date().toISOString(),
      },
    ];
  });
}
