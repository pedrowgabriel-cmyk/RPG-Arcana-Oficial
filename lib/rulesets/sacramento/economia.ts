// Economia da mesa — REGRA DE MESA, não do livro.
// docs/02 §18: "Não existe regra de ... inflação ... Se a campanha precisar
// disso, criar parâmetros de mesa identificados." O Juiz escolhe um nível da
// régua e TUDO que custa réis é multiplicado: lojas, dinheiro inicial, serviços
// da Base e recompensas. Valores com precisão de 0,01 réis (docs/01 §9).

export type NivelEconomia = {
  id: string;
  nome: string;
  multiplicador: number;
  emoji: string;
  /** Comentário de balcão exibido quando o Juiz escolhe o nível. */
  fala: string;
};

export const REGUA_ECONOMIA: NivelEconomia[] = [
  { id: "vaca-gorda", nome: "Vaca Gorda", multiplicador: 0.5, emoji: "🐄", fala: "Safra boa, gado gordo — sobra até pra cachaça." },
  { id: "preco-de-mae", nome: "Preço de Mãe", multiplicador: 0.75, emoji: "🥧", fala: "Pra você eu faço camarada, filho. Não conta pros outros." },
  { id: "tabela", nome: "Preço de Tabela", multiplicador: 1, emoji: "📜", fala: "O que tá no livro, tá no balcão. Nem um réis a mais." },
  { id: "ta-salgado", nome: "Tá Salgado", multiplicador: 1.25, emoji: "🧂", fala: "O frete de Diamantina subiu, moço. Não fui eu que inventei." },
  { id: "olho-da-cara", nome: "Olho da Cara", multiplicador: 1.5, emoji: "👁️", fala: "Quer barato? Volta semana que vem. Ou nunca." },
  { id: "assalto-sem-mascara", nome: "Assalto sem Máscara", multiplicador: 2, emoji: "🎭", fala: "Aqui ninguém precisa de revólver pra te roubar." },
  { id: "rim-e-meio", nome: "Rim e Meio", multiplicador: 3, emoji: "💀", fala: "Paga em réis, em ouro ou num rim. O rim tá em promoção." },
];

export const NIVEL_PADRAO = "tabela";

export type EconomiaMesa = {
  nivelId: string;
  alteradaEm?: string;
};

export function nivelEconomia(id: string | undefined | null): NivelEconomia {
  return REGUA_ECONOMIA.find((n) => n.id === id) ?? REGUA_ECONOMIA.find((n) => n.id === NIVEL_PADRAO)!;
}

/** Economia atual a partir de sessions.settings. */
export function economiaDaMesa(settings: unknown): NivelEconomia {
  const e = (settings as { economia?: EconomiaMesa } | null)?.economia;
  return nivelEconomia(e?.nivelId);
}

/** Aplica o multiplicador, arredondando em centavos de réis. */
export function comInflacao(valor: number, multiplicador: number): number {
  return Math.round(valor * multiplicador * 100) / 100;
}

export function formatarReis(valor: number): string {
  return `$${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(valor) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Referências do livro que também sobem/descem com a régua (docs/02 §16.2 e §18). */
export const REFERENCIAS_ECONOMIA: { grupo: string; itens: { nome: string; valor: number }[] }[] = [
  {
    grupo: "Recompensas por crime (p. 48)",
    itens: [
      { nome: "Vandalismo / insulto à lei", valor: 10 },
      { nome: "Agressão", valor: 50 },
      { nome: "Furto / assalto", valor: 100 },
      { nome: "Roubo de diligência / incêndio", valor: 200 },
      { nome: "Roubo de cavalo", valor: 250 },
      { nome: "Assassinato / roubo de trem", valor: 400 },
      { nome: "Assassinato de agente da lei", valor: 500 },
    ],
  },
  {
    grupo: "Base do Bando (pp. 100–101)",
    itens: [
      { nome: "Fundar a Base", valor: 150 },
      { nome: "Armeiro: recuperar meia munição", valor: 5 },
      { nome: "Armeiro: melhorar arma", valor: 20 },
      { nome: "Cirurgião: remover veneno", valor: 50 },
      { nome: "Cirurgião: dano permanente", valor: 100 },
      { nome: "Farmacêutico: unguento", valor: 3 },
      { nome: "Especialista em bombas: dinamite", valor: 10 },
      { nome: "Informante: recompensa de missão", valor: 150 },
      { nome: "Informante: missão grande (Bônus+)", valor: 500 },
    ],
  },
];
