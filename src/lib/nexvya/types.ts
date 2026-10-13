export type Stage = "novo" | "qualificado" | "negociacao" | "ganho" | "perdido";

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "novo", label: "Novo", hint: "Contato recém-identificado, ainda sem conversa aprofundada." },
  { id: "qualificado", label: "Qualificado", hint: "Necessidade confirmada e interesse em conversar." },
  { id: "negociacao", label: "Em negociação", hint: "Proposta, valores ou condições em discussão." },
  { id: "ganho", label: "Ganho", hint: "Negócio fechado." },
  { id: "perdido", label: "Perdido", hint: "Negócio não avançou. Registre o motivo." },
];

export const stageLabel = (s: Stage) => STAGES.find((x) => x.id === s)?.label ?? s;
export const isClosed = (s: Stage) => s === "ganho" || s === "perdido";

export type ActivityType =
  | "criado"
  | "etapa"
  | "nota"
  | "acao_concluida"
  | "reagendado"
  | "objecao"
  | "editado";

export interface Activity {
  id: string;
  type: ActivityType;
  text: string;
  at: string; // ISO datetime
}

export interface Opportunity {
  id: string;
  contact: string;
  company: string;
  product: string;
  value: number | null;
  stage: Stage;
  lastContact: string | null; // YYYY-MM-DD
  nextFollowUp: string | null; // YYYY-MM-DD
  nextAction: string;
  notes: string;
  lossReason: string;
  activities: Activity[];
  createdAt: string; // ISO datetime
  closedAt: string | null; // ISO datetime
  demo?: boolean;
}

export type OpportunityInput = Pick<
  Opportunity,
  | "contact"
  | "company"
  | "product"
  | "value"
  | "stage"
  | "lastContact"
  | "nextFollowUp"
  | "nextAction"
  | "notes"
  | "lossReason"
>;

export const emptyInput = (): OpportunityInput => ({
  contact: "",
  company: "",
  product: "",
  value: null,
  stage: "novo",
  lastContact: null,
  nextFollowUp: null,
  nextAction: "",
  notes: "",
  lossReason: "",
});
