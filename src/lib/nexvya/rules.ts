import { diffDays, fmtDate, plural } from "./dates";
import { isClosed, type Opportunity, type Stage } from "./types";

export type Bucket = "atrasadas" | "hoje" | "proximas" | "sem_agendamento";

export const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "atrasadas", label: "Atrasadas" },
  { id: "hoje", label: "Para hoje" },
  { id: "proximas", label: "Próximas" },
  { id: "sem_agendamento", label: "Sem acompanhamento" },
];

/** Closed opportunities (won/lost) never generate actions. */
export function bucketOf(o: Opportunity, today: string): Bucket | null {
  if (isClosed(o.stage)) return null;
  if (!o.nextFollowUp) return "sem_agendamento";
  const d = diffDays(today, o.nextFollowUp);
  if (d < 0) return "atrasadas";
  if (d === 0) return "hoje";
  return "proximas";
}

const STAGE_WEIGHT: Record<Stage, number> = { negociacao: 30, qualificado: 20, novo: 10, ganho: 0, perdido: 0 };

export interface Explanation {
  bucket: Bucket;
  score: number;
  headline: string;
  reasons: string[];
}

/**
 * Transparent priority: overdue first (more days = higher), then today,
 * then unscheduled, then upcoming (sooner = higher). Ties broken by stage:
 * negociação > qualificado > novo.
 */
export function explain(o: Opportunity, today: string): Explanation | null {
  const bucket = bucketOf(o, today);
  if (!bucket) return null;
  const reasons: string[] = [];
  let headline = "";
  let score = STAGE_WEIGHT[o.stage];

  if (bucket === "atrasadas") {
    const n = diffDays(o.nextFollowUp!, today);
    headline = `Acompanhamento atrasado há ${plural(n, "dia", "dias")}.`;
    score += 1000 + Math.min(n, 90) * 10;
  } else if (bucket === "hoje") {
    headline = "Acompanhamento agendado para hoje.";
    score += 800;
  } else if (bucket === "sem_agendamento") {
    headline = "Nenhum acompanhamento agendado.";
    score += 500;
  } else {
    const n = diffDays(today, o.nextFollowUp!);
    headline = `Acompanhamento em ${plural(n, "dia", "dias")} (${fmtDate(o.nextFollowUp)}).`;
    score += Math.max(0, 100 - n);
  }

  reasons.push(o.nextAction ? `Próxima ação registrada: ${o.nextAction}.` : "Nenhuma próxima ação registrada.");
  if (o.lastContact) {
    const n = diffDays(o.lastContact, today);
    if (n >= 14) reasons.push(`Último contato há ${n} dias.`);
  } else {
    reasons.push("Sem data de último contato registrada.");
  }
  if (o.stage === "negociacao") reasons.push("Está na etapa Em negociação.");
  return { bucket, score, headline, reasons };
}

export function prioritized(opps: Opportunity[], today: string, buckets?: Bucket[]) {
  return opps
    .map((o) => ({ o, e: explain(o, today) }))
    .filter((x): x is { o: Opportunity; e: Explanation } => !!x.e && (!buckets || buckets.includes(x.e.bucket)))
    .sort((a, b) => b.e.score - a.e.score);
}
