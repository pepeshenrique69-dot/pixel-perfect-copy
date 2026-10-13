import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { todayISO } from "./dates";
import { buildDemo } from "./demo";
import * as ops from "./ops";
import type { ActivityType, Opportunity, OpportunityInput, Stage } from "./types";

const KEY = "nexvya:v1";

export interface NexvyaState {
  opportunities: Opportunity[];
  introDismissed: boolean;
}

const listeners = new Set<() => void>();
let state: NexvyaState | null = null;

function read(): NexvyaState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.opportunities)) {
        state = { opportunities: p.opportunities, introDismissed: !!p.introDismissed };
        return state;
      }
    }
  } catch {
    /* corrupted storage: start fresh with demo */
  }
  state = { opportunities: buildDemo(todayISO()), introDismissed: false };
  persist();
  return state;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    toast.error("Não foi possível salvar no navegador. Verifique o espaço disponível.");
  }
}

function set(fn: (s: NexvyaState) => NexvyaState) {
  state = fn(read());
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Returns null during SSR / before hydration. */
export function useNexvya(): NexvyaState | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

const now = () => new Date().toISOString();
const mapOne = (id: string, fn: (o: Opportunity) => Opportunity) =>
  set((s) => ({ ...s, opportunities: s.opportunities.map((o) => (o.id === id ? fn(o) : o)) }));

export const actions = {
  create(input: OpportunityInput) {
    const o = ops.createOpportunity(input, now());
    set((s) => ({ ...s, opportunities: [o, ...s.opportunities] }));
    return o;
  },
  update: (id: string, input: OpportunityInput) => mapOne(id, (o) => ops.updateOpportunity(o, input, now())),
  remove: (id: string) => set((s) => ({ ...s, opportunities: s.opportunities.filter((o) => o.id !== id) })),
  moveStage: (id: string, stage: Stage, lossReason = "") => mapOne(id, (o) => ops.changeStage(o, stage, now(), lossReason)),
  completeAction: (id: string, args: { result: string; nextFollowUp: string | null; nextAction: string }) =>
    mapOne(id, (o) => ops.completeAction(o, args, now(), todayISO())),
  reschedule: (id: string, date: string, note = "") => mapOne(id, (o) => ops.reschedule(o, date, note, now())),
  addActivity: (id: string, type: ActivityType, text: string) => mapOne(id, (o) => ops.addActivity(o, type, text, now())),
  setNextStep: (id: string, nextAction: string, nextFollowUp: string | null) =>
    mapOne(id, (o) => ({ ...o, nextAction, nextFollowUp })),
  removeDemo: () => set((s) => ({ ...s, opportunities: s.opportunities.filter((o) => !o.demo) })),
  loadDemo: () =>
    set((s) => ({ ...s, opportunities: [...s.opportunities.filter((o) => !o.demo), ...buildDemo(todayISO())] })),
  clearAll: () => set((s) => ({ ...s, opportunities: [] })),
  setIntroDismissed: (v: boolean) => set((s) => ({ ...s, introDismissed: v })),
  exportJSON: () => JSON.stringify(read(), null, 2),
};
