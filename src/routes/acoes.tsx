import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { useState } from "react";
import { CompleteActionDialog, RescheduleDialog } from "@/components/nexvya/ActionDialogs";
import { ActionItem } from "@/components/nexvya/ActionItem";
import { EmptyState, PageHeader, StoreGate } from "@/components/nexvya/common";
import { todayISO } from "@/lib/nexvya/dates";
import { BUCKETS, prioritized, type Bucket } from "@/lib/nexvya/rules";
import type { NexvyaState } from "@/lib/nexvya/store";
import type { Opportunity } from "@/lib/nexvya/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/acoes")({
  head: () => ({
    meta: [
      { title: "Central de ações — Nexvya" },
      { name: "description", content: "Acompanhamentos atrasados, de hoje, próximos e sem agendamento, com o motivo de cada um." },
      { property: "og:title", content: "Central de ações — Nexvya" },
      { property: "og:description", content: "Saiba quem precisa de atenção e por quê." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StoreGate>{(s) => <Actions s={s} />}</StoreGate>,
});

const EMPTY: Record<Bucket, string> = {
  atrasadas: "Nenhum acompanhamento atrasado. Bom trabalho!",
  hoje: "Nada agendado para hoje.",
  proximas: "Nenhum acompanhamento futuro agendado.",
  sem_agendamento: "Todas as oportunidades abertas têm uma data de acompanhamento.",
};

function Actions({ s }: { s: NexvyaState }) {
  const today = todayISO();
  const all = prioritized(s.opportunities, today);
  const counts = Object.fromEntries(BUCKETS.map((b) => [b.id, all.filter((x) => x.e.bucket === b.id).length])) as Record<Bucket, number>;
  const [tab, setTab] = useState<Bucket>(counts.atrasadas ? "atrasadas" : "hoje");
  const [complete, setComplete] = useState<Opportunity | null>(null);
  const [resched, setResched] = useState<Opportunity | null>(null);
  const items = all.filter((x) => x.e.bucket === tab);

  return (
    <>
      <PageHeader title="Central de ações" description="Cada item mostra o motivo da recomendação. Oportunidades ganhas ou perdidas não geram ações." />
      <div role="tablist" aria-label="Categorias" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            role="tab"
            aria-selected={tab === b.id}
            onClick={() => setTab(b.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === b.id && "border-primary bg-primary text-primary-foreground hover:bg-primary",
            )}
          >
            {b.label}
            <span className={cn("rounded-full px-1.5 text-xs tabular", tab === b.id ? "bg-primary-foreground/20" : "bg-muted", b.id === "atrasadas" && counts.atrasadas > 0 && tab !== b.id && "bg-destructive/15 text-destructive")}>{counts[b.id]}</span>
          </button>
        ))}
      </div>
      {items.length ? (
        <ul className="grid gap-2">
          {items.map(({ o, e }) => <ActionItem key={o.id} o={o} e={e} onComplete={setComplete} onReschedule={setResched} />)}
        </ul>
      ) : (
        <EmptyState icon={CalendarCheck} title="Tudo em dia" description={EMPTY[tab]} />
      )}
      <p className="mt-6 text-xs text-muted-foreground">
        Critério de prioridade: atrasadas primeiro (quanto mais dias, mais acima), depois as de hoje, as sem data e as próximas (mais próximas primeiro). Em caso de empate, Em negociação vem antes de Qualificado e Novo. A Nexvya não estima intenção de compra.
      </p>
      <CompleteActionDialog opp={complete} onClose={() => setComplete(null)} />
      <RescheduleDialog opp={resched} onClose={() => setResched(null)} />
    </>
  );
}
