import { isValidISODate } from "./dates";
import { isClosed, stageLabel, type Activity, type ActivityType, type Opportunity, type OpportunityInput, type Stage } from "./types";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const activity = (type: ActivityType, text: string, at: string): Activity => ({ id: uid(), type, text, at });

export type FieldErrors = Partial<Record<keyof OpportunityInput, string>>;

export function validate(input: OpportunityInput): FieldErrors {
  const e: FieldErrors = {};
  const contact = input.contact.trim();
  if (!contact) e.contact = "Informe o nome ou uma identificação do contato.";
  else if (contact.length > 80) e.contact = "Use no máximo 80 caracteres.";
  if (!input.product.trim()) e.product = "Informe o produto ou serviço em discussão.";
  if (input.value !== null && (!Number.isFinite(input.value) || input.value < 0))
    e.value = "Informe um valor positivo ou deixe em branco.";
  if (input.lastContact !== null && !isValidISODate(input.lastContact)) e.lastContact = "Data inválida.";
  if (input.nextFollowUp !== null && !isValidISODate(input.nextFollowUp)) e.nextFollowUp = "Data inválida.";
  if (input.nextFollowUp && !input.nextAction.trim() && !isClosed(input.stage))
    e.nextAction = "Descreva o que será feito no acompanhamento.";
  if (input.stage === "perdido" && !input.lossReason.trim()) e.lossReason = "Registre o motivo da perda.";
  if (input.notes.length > 2000) e.notes = "Use no máximo 2000 caracteres.";
  return e;
}

const clean = (i: OpportunityInput): OpportunityInput => ({
  ...i,
  contact: i.contact.trim(),
  company: i.company.trim(),
  product: i.product.trim(),
  nextAction: i.nextAction.trim(),
  notes: i.notes.trim(),
  lossReason: i.stage === "perdido" ? i.lossReason.trim() : "",
});

export function createOpportunity(input: OpportunityInput, now: string): Opportunity {
  const c = clean(input);
  return {
    ...c,
    id: uid(),
    activities: [activity("criado", `Oportunidade criada na etapa ${stageLabel(c.stage)}.`, now)],
    createdAt: now,
    closedAt: isClosed(c.stage) ? now : null,
  };
}

export function changeStage(o: Opportunity, stage: Stage, now: string, lossReason = ""): Opportunity {
  if (o.stage === stage) return o;
  const reason = stage === "perdido" ? lossReason.trim() || o.lossReason : "";
  const text =
    `Etapa alterada de ${stageLabel(o.stage)} para ${stageLabel(stage)}.` + (reason ? ` Motivo: ${reason}.` : "");
  return {
    ...o,
    stage,
    lossReason: reason,
    closedAt: isClosed(stage) ? now : null,
    activities: [activity("etapa", text, now), ...o.activities],
  };
}

export function updateOpportunity(o: Opportunity, input: OpportunityInput, now: string): Opportunity {
  const c = clean(input);
  let next: Opportunity = o;
  if (c.stage !== o.stage) next = changeStage(o, c.stage, now, c.lossReason);
  next = { ...next, ...c, activities: [activity("editado", "Dados da oportunidade atualizados.", now), ...next.activities] };
  return next;
}

export function completeAction(
  o: Opportunity,
  args: { result: string; nextFollowUp: string | null; nextAction: string },
  now: string,
  today: string,
): Opportunity {
  const done = o.nextAction || "Acompanhamento";
  const text = `Ação concluída: ${done}.` + (args.result.trim() ? ` Resultado: ${args.result.trim()}.` : "");
  return {
    ...o,
    lastContact: today,
    nextFollowUp: args.nextFollowUp,
    nextAction: args.nextFollowUp ? args.nextAction.trim() : "",
    activities: [activity("acao_concluida", text, now), ...o.activities],
  };
}

export function reschedule(o: Opportunity, date: string, note: string, now: string): Opportunity {
  const text = `Acompanhamento reagendado para ${date.split("-").reverse().join("/")}.` + (note.trim() ? ` ${note.trim()}` : "");
  return { ...o, nextFollowUp: date, activities: [activity("reagendado", text, now), ...o.activities] };
}

export function addActivity(o: Opportunity, type: ActivityType, text: string, now: string): Opportunity {
  return { ...o, activities: [activity(type, text.trim(), now), ...o.activities] };
}
