/**
 * Rule-based commercial assistant.
 *
 * Every suggestion is derived from data the user registered. No AI model is
 * called in this version. To evolve, implement `AssistantProvider` with a
 * server function (createServerFn) that calls an AI provider using a secret
 * kept on the server — never in the browser.
 */
import { diffDays } from "./dates";
import type { Opportunity } from "./types";

export interface Insight {
  level: "atencao" | "info";
  text: string;
}

export function missingInfo(o: Opportunity, today: string): Insight[] {
  const out: Insight[] = [];
  if (o.stage === "ganho") return out;
  if (o.stage === "perdido") {
    if (!o.lossReason) out.push({ level: "atencao", text: "Motivo da perda não registrado — ele ajuda a entender padrões." });
    return out;
  }
  if (o.nextFollowUp && diffDays(o.nextFollowUp, today) > 0)
    out.push({ level: "atencao", text: `Acompanhamento atrasado há ${diffDays(o.nextFollowUp, today)} dia(s).` });
  if (!o.nextFollowUp) out.push({ level: "atencao", text: "Sem data de próximo acompanhamento. Agende para não esquecer." });
  if (!o.nextAction) out.push({ level: "atencao", text: "Próxima ação não definida." });
  if (o.value === null) out.push({ level: "info", text: "Valor estimado não informado — ajuda a priorizar e a medir o pipeline." });
  if (!o.lastContact) out.push({ level: "info", text: "Data do último contato não registrada." });
  if (o.stage === "negociacao" && !o.notes && !o.activities.some((a) => a.type === "objecao"))
    out.push({ level: "info", text: "Em negociação sem condições ou objeções registradas. Anote o que foi discutido." });
  if (o.stage === "qualificado" && !o.notes) out.push({ level: "info", text: "Registre a necessidade identificada do contato." });
  return out;
}

export function recommendedAction(o: Opportunity): { action: string; why: string } {
  const lastObjection = o.activities.find((a) => a.type === "objecao");
  switch (o.stage) {
    case "novo":
      return { action: "Fazer o primeiro contato e entender a necessidade", why: "Na etapa Novo, o objetivo é confirmar se existe interesse real." };
    case "qualificado":
      return { action: "Apresentar proposta ou agendar uma demonstração", why: "A necessidade já foi identificada; o próximo passo é mostrar a solução." };
    case "negociacao":
      return lastObjection
        ? { action: "Responder à objeção registrada e confirmar o próximo passo", why: `Última objeção registrada: ${lastObjection.text.replace(/^Objeção: /, "")}` }
        : { action: "Revisar a proposta e perguntar se há dúvidas pendentes", why: "Em negociação, esclarecer dúvidas evita que a conversa esfrie." };
    case "ganho":
      return { action: "Confirmar entrega e recebimento; pedir uma indicação", why: "Negócio ganho não significa pagamento recebido." };
    case "perdido":
      return { action: "Registrar o aprendizado e, se fizer sentido, reavaliar no futuro", why: o.lossReason ? `Motivo registrado: ${o.lossReason}.` : "Sem motivo registrado." };
  }
}

export type DraftPurpose = "acompanhamento" | "proposta" | "retomada" | "objecao" | "agradecimento";

export const PURPOSES: { id: DraftPurpose; label: string; needsContext?: boolean }[] = [
  { id: "acompanhamento", label: "Acompanhamento" },
  { id: "proposta", label: "Envio de proposta" },
  { id: "retomada", label: "Retomar conversa parada" },
  { id: "objecao", label: "Responder objeção", needsContext: true },
  { id: "agradecimento", label: "Agradecimento pelo fechamento" },
];

export interface DraftRequest {
  opportunity: Opportunity;
  purpose: DraftPurpose;
  context: string;
  formal: boolean;
}

export type DraftResult = { ok: true; text: string } | { ok: false; message: string };

export interface AssistantProvider {
  draftMessage(req: DraftRequest): Promise<DraftResult>;
}

const firstName = (s: string) => s.trim().split(/\s+/)[0] ?? s;

export function draftMessage({ opportunity: o, purpose, context, formal }: DraftRequest): DraftResult {
  const ctx = context.trim();
  if (purpose === "objecao" && !ctx)
    return { ok: false, message: "Descreva a objeção do contato (por exemplo: “achou o preço alto”) para gerar uma resposta coerente." };
  const hi = formal ? `Olá, ${firstName(o.contact)}, tudo bem?` : `Oi, ${firstName(o.contact)}! Tudo certo?`;
  const bye = formal ? "Fico à disposição.\n\nAtenciosamente," : "Qualquer coisa, é só me chamar!\n\nAbraço,";
  const about = `sobre ${o.product.toLowerCase()}${o.company ? ` para a ${o.company}` : ""}`;
  const extra = ctx ? `\n\n${ctx}` : "";
  let body = "";
  switch (purpose) {
    case "acompanhamento":
      body = `Passando para dar sequência à nossa conversa ${about}.${o.nextAction ? ` Como combinado, o próximo passo seria: ${o.nextAction.toLowerCase()}.` : ""} Você tem disponibilidade para conversarmos esta semana?`;
      break;
    case "proposta":
      body = `Conforme conversamos, segue a proposta ${about}.${o.value !== null ? " Os valores e condições estão detalhados no documento." : ""} Se quiser, podemos revisar juntos os pontos principais.`;
      break;
    case "retomada":
      body = `Faz um tempo que conversamos ${about}. Queria saber se o assunto ainda faz sentido para você neste momento ou se prefere que eu retome mais adiante.`;
      break;
    case "objecao":
      body = `Obrigado por compartilhar sua preocupação. Entendo o ponto e quero esclarecer da melhor forma.`;
      break;
    case "agradecimento":
      body = `Muito obrigado pela confiança ${about}. Vou acompanhar de perto as próximas etapas para que tudo saia como combinado.`;
      break;
  }
  return { ok: true, text: `${hi}\n\n${body}${extra}\n\n${bye}` };
}

export const ruleBasedProvider: AssistantProvider = {
  draftMessage: async (req) => draftMessage(req),
};
