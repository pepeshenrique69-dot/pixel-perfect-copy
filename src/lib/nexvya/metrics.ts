import { addDays, dateOf } from "./dates";
import { bucketOf } from "./rules";
import { isClosed, STAGES, type Opportunity, type Stage } from "./types";

export type Period = "30" | "90" | "365" | "all";
export const PERIODS: { id: Period; label: string }[] = [
  { id: "30", label: "Últimos 30 dias" },
  { id: "90", label: "Últimos 90 dias" },
  { id: "365", label: "Últimos 12 meses" },
  { id: "all", label: "Todo o período" },
];

export const periodStart = (p: Period, today: string) => (p === "all" ? null : addDays(today, -Number(p) + 1));
const inPeriod = (iso: string | null, start: string | null) => !!iso && (!start || dateOf(iso) >= start);

export function summary(opps: Opportunity[], today: string, period: Period) {
  const start = periodStart(period, today);
  const open = opps.filter((o) => !isClosed(o.stage));
  const openWithValue = open.filter((o) => o.value !== null);
  const won = opps.filter((o) => o.stage === "ganho" && inPeriod(o.closedAt, start));
  const lost = opps.filter((o) => o.stage === "perdido" && inPeriod(o.closedAt, start));
  const wonWithValue = won.filter((o) => o.value !== null);
  let overdue = 0;
  let todayCount = 0;
  let unscheduled = 0;
  for (const o of opps) {
    const b = bucketOf(o, today);
    if (b === "atrasadas") overdue++;
    if (b === "hoje") todayCount++;
    if (b === "sem_agendamento") unscheduled++;
  }
  const completedActions = opps.reduce(
    (n, o) => n + o.activities.filter((a) => a.type === "acao_concluida" && inPeriod(a.at, start)).length,
    0,
  );
  return {
    openCount: open.length,
    potentialValue: openWithValue.length ? openWithValue.reduce((s, o) => s + (o.value ?? 0), 0) : null,
    openWithValue: openWithValue.length,
    wonCount: won.length,
    lostCount: lost.length,
    wonValue: wonWithValue.length ? wonWithValue.reduce((s, o) => s + (o.value ?? 0), 0) : null,
    wonWithValue: wonWithValue.length,
    overdue,
    today: todayCount,
    unscheduled,
    completedActions,
  };
}

export function byStage(opps: Opportunity[]) {
  return STAGES.map((s) => {
    const list = opps.filter((o) => o.stage === s.id);
    return {
      stage: s.id as Stage,
      label: s.label,
      count: list.length,
      value: list.reduce((sum, o) => sum + (o.value ?? 0), 0),
    };
  });
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Monthly counts from real records. Returns only months that have any record, from first to current. */
export function monthlySeries(opps: Opportunity[], today: string, maxMonths = 12) {
  const [ty, tm] = today.split("-").map(Number);
  const rows: { key: string; label: string; criadas: number; ganhas: number; perdidas: number }[] = [];
  for (let i = maxMonths - 1; i >= 0; i--) {
    const d = new Date(ty, tm - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    rows.push({ key, label: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, criadas: 0, ganhas: 0, perdidas: 0 });
  }
  const find = (iso: string) => rows.find((r) => r.key === dateOf(iso).slice(0, 7));
  for (const o of opps) {
    const c = find(o.createdAt);
    if (c) c.criadas++;
    if (o.closedAt) {
      const r = find(o.closedAt);
      if (r && o.stage === "ganho") r.ganhas++;
      if (r && o.stage === "perdido") r.perdidas++;
    }
  }
  const first = rows.findIndex((r) => r.criadas + r.ganhas + r.perdidas > 0);
  return first === -1 ? [] : rows.slice(first);
}
