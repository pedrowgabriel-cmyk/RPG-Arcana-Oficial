// O que o JOGADOR escreveu (story.elementos) é a fonte da verdade do personagem.
// A história estruturada pode ser um esboço montado antes de ele terminar de
// responder — então o Juiz sempre recebe as respostas originais, e partes do
// esboço que ficaram velhas são refeitas a partir delas.

import type { ElementosHistoria, HistoriaEstruturada } from "./types";
import { faccaoById, trilhaById } from "./story-data";

const FAMILIA_ROTULO: Record<string, string> = {
  sim: "Tem família",
  nao: "Sem família",
  complicada: "Família complicada",
};

/** Respostas do jogador em pares rótulo/texto, na ordem do criador. */
export function palavrasDoJogador(e: Partial<ElementosHistoria> | null | undefined): { rotulo: string; texto: string }[] {
  if (!e) return [];
  const faccao =
    e.faccaoId && e.faccaoId !== "nenhuma"
      ? `${faccaoById(e.faccaoId)?.nome ?? e.faccaoId}${e.faccaoRelacao ? ` — ${e.faccaoRelacao}` : ""}`
      : "";
  const trilha = e.redencaoTrilhaId ? trilhaById(e.redencaoTrilhaId)?.nome : "";
  const linhas: { rotulo: string; texto: string }[] = [
    { rotulo: "Conceito", texto: e.conceito ?? "" },
    { rotulo: "Origem", texto: e.origem ?? "" },
    { rotulo: "Ocupação", texto: e.ocupacao ?? "" },
    {
      rotulo: "Família",
      texto: [e.familia ? FAMILIA_ROTULO[e.familia] : "", e.familiaDetalhe ?? ""].filter(Boolean).join(": "),
    },
    { rotulo: "Passado sombrio", texto: e.passadoSombrio ? e.passadoDetalhe || "Sim" : "" },
    { rotulo: "Facção", texto: faccao },
    {
      rotulo: "Vínculos",
      texto: (e.vinculos ?? [])
        .filter((v) => v.nome?.trim())
        .map((v) => `${v.nome} (${v.relacao})${v.detalhe ? `: ${v.detalhe}` : ""}`)
        .join("; "),
    },
    {
      rotulo: "Redenção",
      texto: [trilha, e.redencaoPremissa].filter(Boolean).join(" — "),
    },
  ];
  return linhas.filter((l) => l.texto.trim());
}

const STUB_RAIZES = /^Tudo começou em .+\.\s*$/;
const STUB_HOJE = /^Hoje vive como .+\.$/;
const STUB_SEM_FAMILIA = /^Não há família viva ou presente/;

/**
 * Refaz trechos do esboço automático que não batem mais com as respostas
 * (ex.: jogador trocou a origem depois do esboço). Texto que o jogador ou a IA
 * escreveram de verdade nunca é tocado.
 */
export function reconciliarHistoria(h: HistoriaEstruturada, e: ElementosHistoria | undefined): HistoriaEstruturada {
  if (!e) return h;
  const capitulos = h.capitulos.map((c) => {
    const texto = c.texto.trim();
    if (c.titulo === "Raízes" && (texto === "" || STUB_RAIZES.test(texto)) && e.origem) {
      return { ...c, texto: `Tudo começou em ${e.origem}.` };
    }
    if (c.titulo === "A virada" && texto === "" && e.passadoDetalhe) {
      return { ...c, texto: e.passadoDetalhe };
    }
    if (c.titulo === "O Oeste hoje" && (texto === "" || STUB_HOJE.test(texto)) && e.ocupacao) {
      return { ...c, texto: `Hoje vive como ${e.ocupacao}.` };
    }
    return c;
  });
  const familiaVazia = !h.familia?.trim() || STUB_SEM_FAMILIA.test(h.familia.trim());
  const familia =
    familiaVazia && e.familiaDetalhe?.trim() && e.familia !== "nao" ? e.familiaDetalhe.trim() : h.familia;
  return { ...h, capitulos, familia };
}
