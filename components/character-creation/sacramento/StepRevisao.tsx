"use client";

import { useEffect, useState } from "react";
import { reconciliarHistoria } from "@/lib/character-creation/sacramento/palavras-do-jogador";
import { HowItWorks } from "@/components/campaign-creation/Explainer";
import { PLAYER_GUIDES } from "@/lib/character-creation/sacramento/guidance";
import { habilidadeById, contarParrudeza } from "@/lib/character-creation/sacramento/habilidades";
import {
  ANTECEDENTES,
  ATRIBUTOS,
  type LimitesCriacao,
  calcularDerivados,
  validarFicha,
} from "@/lib/character-creation/sacramento/rules";
import { resumoCompras } from "@/lib/character-creation/sacramento/catalogo";
import { trilhaById } from "@/lib/character-creation/sacramento/story-data";
import {
  ELEMENTOS_VAZIOS,
  FICHA_INICIAL,
  type ElementosHistoria,
  type HistoriaEstruturada,
  type HistoriaSecao,
  type SacramentoCreationData,
} from "@/lib/character-creation/sacramento/types";
import { StoryReview } from "./StoryReview";

type Props = {
  data: Partial<SacramentoCreationData>;
  onUpdate: (partial: Partial<SacramentoCreationData>) => void;
  onGenerateStory: (
    action: "gerar" | "revisar-secao" | "revisar-tudo" | "alterar-ponto",
    opts?: { secao?: HistoriaSecao; feedback?: string; pontoId?: string; novoValor?: string },
  ) => Promise<boolean>;
  isGenerating: boolean;
  secaoGerando: HistoriaSecao | null;
  pontoGerando: string | null;
  aiError: string | null;
  /** Guardrail de custo: reescritas completas ainda disponíveis neste rascunho. */
  reescritasRestantes: number;
  podeReescrever: boolean;
  podeRevisarSecao: boolean;
  /** Elementos mudaram depois do limite — a lenda mantida não reflete as últimas escolhas. */
  historiaDesatualizada: boolean;
  /** Close forjado (URL) — no mobile aparece entre os pontos-chave e o resumo. */
  retratoUrl?: string | null;
  retratoPendente?: "gerando" | "erro";
  /** Regras da mesa (dinheiro inicial muda o saldo exibido/validado). */
  limites?: LimitesCriacao;
};

const LABEL = "font-cinzel text-[10px] uppercase tracking-[0.3em] text-arcana-text-dim";
const CARD_STYLE = {
  background: "rgba(27,27,42,0.72)",
  border: "1px solid rgba(255,255,255,0.08)",
} as const;

/** Esqueleto para quem prefere escrever a própria história. */
function esbocoManual(nome: string, e: ElementosHistoria): HistoriaEstruturada {
  const trilha = trilhaById(e.redencaoTrilhaId);
  return {
    resumo: e.conceito
      ? `${nome || "Seu personagem"} — ${e.conceito}.`
      : `${nome || "Seu personagem"} cruza o Oeste em 1880.`,
    capitulos: [
      { titulo: "Raízes", texto: e.origem ? `Tudo começou em ${e.origem}. ` : "" },
      { titulo: "A virada", texto: e.passadoDetalhe || "" },
      { titulo: "O Oeste hoje", texto: e.ocupacao ? `Hoje vive como ${e.ocupacao}.` : "" },
    ],
    familia: e.familiaDetalhe || (e.familia === "nao" ? "Não há família viva ou presente." : ""),
    vinculos: e.vinculos
      .filter((v) => v.nome.trim())
      .map((v) => ({ ...v, detalhe: v.detalhe ?? "" })),
    redencao: {
      trilhaId: trilha?.id ?? "propria",
      trilhaNome: trilha?.nome ?? "Trilha própria",
      premissa: e.redencaoPremissa || trilha?.premissa || "",
      passos:
        trilha && trilha.passos.length === 6
          ? [...trilha.passos]
          : ["", "", "", "", "", "Encerrar a jornada"],
    },
    ganchos: [""],
    pontosChave: [],
  };
}

export default function StepRevisao({
  data,
  onUpdate,
  onGenerateStory,
  isGenerating,
  secaoGerando,
  pontoGerando,
  aiError,
  reescritasRestantes,
  podeReescrever,
  podeRevisarSecao,
  historiaDesatualizada,
  retratoUrl,
  retratoPendente,
  limites,
}: Props) {
  const [feedbackGeral, setFeedbackGeral] = useState("");

  // Mobile: o retrato revelado surge no meio da lenda, entre os pontos-chave e
  // o resumo — impacto no primeiro scroll, e a página segue normal.
  const retratoSlot =
    retratoUrl || retratoPendente ? (
      <div className="lg:hidden">
        {retratoUrl ? (
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              background: "#151019",
              border: "1px solid rgba(209,171,85,0.45)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 32px rgba(209,171,85,0.15)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={retratoUrl}
              alt="Seu retrato, revelado pelo retratista"
              className="w-full object-cover object-top"
              style={{ aspectRatio: "3 / 4" }}
            />
            <div
              className="absolute inset-x-0 bottom-0 px-4 py-3"
              style={{ background: "linear-gradient(to top, rgba(7,7,13,0.85), transparent)" }}
            >
              <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-arcana-gold-bright">
                Revelado pelo retratista
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-4" style={CARD_STYLE}>
            <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-arcana-gold">
              O retratista
            </p>
            <p className="font-crimson text-base italic text-arcana-text-dim mt-1">
              {retratoPendente === "erro"
                ? "“A chapa rachou na revelação — na criação do personagem eu bato outra, sem cobrar nada.”"
                : "“Sua fotografia ainda está na câmara de revelação. Chega junto com o resto, confia.”"}
            </p>
          </div>
        )}
      </div>
    ) : undefined;

  const historia = data.historia;
  const modoManual = data.historiaModo === "manual";

  const elementos = data.elementos ?? ELEMENTOS_VAZIOS;
  const ficha = data.ficha ?? FICHA_INICIAL;

  // Esboço manual montado antes de o jogador mudar as respostas: atualiza os
  // trechos automáticos (origem, ocupação, família) com o que vale agora.
  useEffect(() => {
    if (!modoManual || !historia) return;
    const atualizada = reconciliarHistoria(historia, elementos);
    if (JSON.stringify(atualizada) !== JSON.stringify(historia)) onUpdate({ historia: atualizada });
  }, [modoManual, historia, elementos, onUpdate]);
  const derivados = calcularDerivados(ficha, contarParrudeza(ficha.habilidades));
  const validacao = validarFicha(ficha, limites?.dinheiroInicial, limites);
  const compras = resumoCompras(ficha.compras ?? [], limites?.dinheiroInicial, limites?.multiplicadorPrecos ?? 1);

  const habilidadesNomes = (() => {
    const parr = contarParrudeza(ficha.habilidades);
    const outras = ficha.habilidades
      .filter((id) => id !== "parrudeza")
      .map((id) => habilidadeById(id)?.nome ?? id);
    return parr > 0 ? [...outras, `Parrudeza ×${parr}`] : outras;
  })();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="hidden lg:block">
        <HowItWorks guide={PLAYER_GUIDES.revisao} />
      </div>

      {/* Quem é — só nome e conceito; o resto a cena ao lado mostra melhor */}
      <div>
        <h3 className="font-cinzel text-xl uppercase tracking-[0.15em] text-arcana-gold-bright">
          {data.name || "—"}
        </h3>
        {elementos.conceito && (
          <p className="font-crimson text-base italic text-arcana-text-dim mt-0.5">
            {elementos.conceito}
          </p>
        )}
      </div>

      {/* História — nasce e é lapidada aqui */}
      {!historia && !isGenerating && (
        <div className="rounded-2xl p-5 space-y-4" style={CARD_STYLE}>
          <div>
            <span className={LABEL}>História</span>
            <p className="font-crimson text-sm italic text-arcana-text-dim mt-1">
              Falta dar vida aos elementos. Como quer construir a biografia?
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                onUpdate({ historiaModo: "ia" });
                void onGenerateStory("gerar");
              }}
              className="text-left rounded-xl p-4 space-y-2 transition-all hover:-translate-y-px"
              style={{
                background: "rgba(209,171,85,0.08)",
                border: "1px solid rgba(209,171,85,0.5)",
                boxShadow: "0 0 16px rgba(209,171,85,0.12)",
              }}
            >
              <span className="block font-cinzel text-xs uppercase tracking-[0.2em] text-arcana-gold-bright">
                Gerar com IA
              </span>
              <span className="block font-crimson text-sm text-arcana-text-dim leading-snug">
                A IA escreve a partir do que você preencheu; depois você ajusta ponto a ponto.
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdate({
                  historiaModo: "manual",
                  historia: esbocoManual(data.name ?? "", elementos),
                })
              }
              className="text-left rounded-xl p-4 space-y-2 transition-all hover:-translate-y-px"
              style={{
                background: "rgba(27,27,42,0.6)",
                border: "1px solid var(--color-arcana-border)",
              }}
            >
              <span className="block font-cinzel text-xs uppercase tracking-[0.2em] text-arcana-text">
                Escrever eu mesmo
              </span>
              <span className="block font-crimson text-sm text-arcana-text-dim leading-snug">
                Você preenche cada parte na mesma estrutura: resumo, jornada, vínculos e redenção.
              </span>
            </button>
          </div>
          {aiError && (
            <p className="font-crimson text-sm italic text-arcana-danger" role="alert">
              {aiError}
            </p>
          )}
        </div>
      )}

      {!historia && isGenerating && (
        <div className="rounded-2xl p-8 text-center space-y-3" style={CARD_STYLE}>
          <p className="font-cinzel text-sm uppercase tracking-[0.25em] text-arcana-gold-bright animate-pulse">
            Escrevendo sua lenda…
          </p>
          <p className="font-crimson text-base italic text-arcana-text-dim">
            A IA está tecendo origem, vínculos e a trilha de redenção.
          </p>
        </div>
      )}

      {historia && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className={LABEL}>História</span>
            {!modoManual ? (
              <button
                type="button"
                onClick={() => onUpdate({ historiaModo: "manual" })}
                className="font-crimson text-sm italic text-arcana-text-dim underline underline-offset-4 hover:text-arcana-text transition-colors"
              >
                Assumir a escrita manualmente
              </button>
            ) : (
              <span className="font-crimson text-sm italic text-arcana-text-dim">
                Edite cada seção com suas palavras
              </span>
            )}
          </div>
          {aiError && (
            <p className="font-crimson text-sm italic text-arcana-danger" role="alert">
              {aiError}
            </p>
          )}
          {!modoManual && !podeReescrever && (
            <div
              className="rounded-2xl p-4 space-y-1"
              style={{
                background: "rgba(224,112,95,0.08)",
                border: "1px solid rgba(224,112,95,0.4)",
              }}
            >
              <p className="font-cinzel text-[10px] uppercase tracking-[0.25em] text-arcana-danger">
                Escritas da lenda esgotadas
              </p>
              <p className="font-crimson text-base text-arcana-text leading-relaxed">
                {historiaDesatualizada
                  ? "Suas últimas mudanças não geraram história nova — a lenda atual foi mantida. Ajuste o texto manualmente pelos botões Editar."
                  : "Este personagem usou todas as reescritas com IA. Daqui em diante, ajuste o texto manualmente pelos botões Editar."}
              </p>
            </div>
          )}
          <StoryReview
            historia={historia}
            modoManual={modoManual}
            isGenerating={isGenerating}
            secaoGerando={secaoGerando}
            pontoGerando={pontoGerando}
            retratoSlot={retratoSlot}
            onChange={(h) => onUpdate({ historia: h })}
            onRegenSection={
              modoManual || !podeRevisarSecao
                ? undefined
                : (secao, feedback) => {
                    void onGenerateStory("revisar-secao", { secao, feedback });
                  }
            }
            onAlterarPonto={
              modoManual || !podeReescrever
                ? undefined
                : (pontoId, novoValor) => {
                    void onGenerateStory("alterar-ponto", { pontoId, novoValor });
                  }
            }
          />
          {!modoManual && podeReescrever && (
            <div className="rounded-2xl p-4 space-y-3" style={CARD_STYLE}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className={LABEL}>Refazer a história inteira</span>
                <span className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-arcana-gold">
                  {reescritasRestantes} {reescritasRestantes === 1 ? "escrita restante" : "escritas restantes"}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={feedbackGeral}
                  onChange={(ev) => setFeedbackGeral(ev.target.value)}
                  placeholder="O que mudar no todo? Ex.: tom mais sombrio, menos nomes novos"
                  maxLength={400}
                  className="arcana-input flex-1 font-crimson text-base"
                />
                <button
                  type="button"
                  onClick={() => {
                    void onGenerateStory("revisar-tudo", {
                      feedback: feedbackGeral.trim() || "Reescreva com outra abordagem.",
                    });
                    setFeedbackGeral("");
                  }}
                  disabled={isGenerating}
                  className={
                    isGenerating ? "arcana-btn-disabled arcana-btn-sm" : "arcana-btn-ghost arcana-btn-sm"
                  }
                >
                  Refazer tudo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ficha conferida — compacta: os 6 números grandes já vivem na régua da cena */}
      <div className="rounded-2xl p-5 space-y-3" style={CARD_STYLE}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className={LABEL}>Ficha · Nível {ficha.nivel}</span>
          <span className="font-cinzel text-[10px] uppercase tracking-[0.2em] text-arcana-text-dim">
            {derivados.xp} XP · sobra ${compras.saldo}
          </span>
        </div>
        <p className="font-crimson text-base text-arcana-text">
          Vida {derivados.vidaMaxima} · Dor {derivados.capacidadeDor} · Defesa {derivados.defesa} ·
          Movim. {derivados.movimentos} · Ações {derivados.acoesCombate} · Iniciativa{" "}
          {derivados.cartasIniciativa}♠
        </p>
        <div className="space-y-2">
          <p className="font-crimson text-base text-arcana-text-dim">
            <span className={LABEL}>Atributos</span>{" "}
            {ATRIBUTOS.map((a) => `${a.nome} ${ficha.atributos[a.id]}`).join(" · ")}
          </p>
          <p className="font-crimson text-base text-arcana-text-dim">
            <span className={LABEL}>Antecedentes</span>{" "}
            {ANTECEDENTES.filter((a) => ficha.antecedentes[a.id] > 0)
              .map((a) => `${a.nome} ${ficha.antecedentes[a.id]}`)
              .join(" · ") || "—"}
          </p>
          <p className="font-crimson text-base text-arcana-text-dim">
            <span className={LABEL}>Habilidades</span> {habilidadesNomes.join(" · ") || "—"}
          </p>
          {(ficha.montarias?.length ?? 0) > 0 && (
            <p className="font-crimson text-base text-arcana-text-dim">
              <span className={LABEL}>{ficha.montarias.length > 1 ? "Montarias" : "Montaria"}</span>{" "}
              {ficha.montarias
                .map(
                  (m) =>
                    `${m.nome || (m.animal === "cavalo" ? "Cavalo" : "Mula")} · Pot ${m.potencia} · Res ${m.resistencia} · Vida ${6 + m.resistencia}`,
                )
                .join(" — ")}
            </p>
          )}
          <p className="font-crimson text-base text-arcana-text-dim">
            <span className={LABEL}>Alforje</span>{" "}
            {compras.custoTotal > 0
              ? `${(ficha.compras ?? []).reduce((n, c) => n + c.quantidade, 0)} itens · $${compras.custoTotal} gastos`
              : "Nada comprado — $200 intactos"}
          </p>
        </div>
        {validacao.erros.length > 0 && (
          <div className="space-y-1">
            {validacao.erros.map((err) => (
              <p key={err} className="font-crimson text-sm italic text-arcana-danger">
                {err}
              </p>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
