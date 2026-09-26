// Formatos das propostas por seção do Hub de História (AiAssist).
// Estritos para o GPT: toda prop required e additionalProperties:false.

export type Section = "hooks" | "npc" | "scene" | "mission";

const PROPOSAL_BASE = {
  titulo: { type: "string" },
  referencias: {
    type: "string",
    description:
      "Páginas do livro citadas (ex.: 'pp. 152–167') ou 'decisão proposta' quando um dado mecânico não vem do livro. Vazio se nada mecânico foi sugerido.",
  },
} as const;

export function schemaFor(section: Section) {
  const proposalProps: Record<string, unknown> = (() => {
    switch (section) {
      case "hooks":
        return {
          ...PROPOSAL_BASE,
          texto: { type: "string", description: "O gancho: situação aberta, 2–4 frases." },
        };
      case "npc":
        return {
          ...PROPOSAL_BASE,
          nome: { type: "string" },
          ocupacao: { type: "string" },
          descricao: { type: "string" },
          desejo: { type: "string" },
          medo: { type: "string" },
          segredo: { type: "string" },
          agenda: { type: "string" },
        };
      case "scene":
        return {
          ...PROPOSAL_BASE,
          lugar: { type: "string" },
          descricaoPublica: { type: "string" },
          fatosVerdadeiros: { type: "string" },
          rumores: { type: "string" },
          testesPossiveis: {
            type: "string",
            description: "Testes POSSÍVEIS (nunca exigidos) com Antecedente sugerido.",
          },
          consequenciasPossiveis: { type: "string" },
        };
      case "mission":
        return {
          ...PROPOSAL_BASE,
          proponente: { type: "string" },
          objetivo: { type: "string" },
          motivo: { type: "string" },
          recompensa: {
            type: "string",
            description: "Proposta de recompensa em réis ou favor — sujeita ao Juiz.",
          },
          consequencias: { type: "string" },
        };
    }
  })();

  const required = ["titulo", "referencias", ...Object.keys(proposalProps)].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );

  return {
    type: "object",
    properties: {
      proposals: {
        type: "array",
        items: {
          type: "object",
          properties: proposalProps,
          required,
          additionalProperties: false,
        },
      },
    },
    required: ["proposals"],
    additionalProperties: false,
  } as const;
}

export const SECTION_ASK: Record<Section, string> = {
  hooks: "Gere 3 propostas de ganchos de história para esta campanha.",
  npc: "Gere 3 propostas de NPCs (apenas campos narrativos — sem ficha mecânica).",
  scene: "Gere 2 propostas de cenas preparadas.",
  mission: "Gere 2 propostas de missões.",
};

