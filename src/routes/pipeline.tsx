import { createFileRoute, Link } from "@tanstack/react-router";
import { Columns3, List, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LossReasonDialog } from "@/components/nexvya/ActionDialogs";
import { DemoTag, EmptyState, NativeSelect, PageHeader, StageBadge, StoreGate } from "@/components/nexvya/common";
import { OpportunityFormDialog } from "@/components/nexvya/OpportunityFormDialog";
import { Button } from "@/components/ui/button";
import { brl, fmtDate, todayISO } from "@/lib/nexvya/dates";
import { bucketOf } from "@/lib/nexvya/rules";
import { actions, type NexvyaState } from "@/lib/nexvya/store";
import { STAGES, stageLabel, type Opportunity, type Stage } from "@/lib/nexvya/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline comercial — Nexvya" },
      { name: "description", content: "Quadro visual das negociações por etapa, com arrastar e soltar." },
      { property: "og:title", content: "Pipeline comercial — Nexvya" },
      { property: "og:description", content: "Acompanhe cada negociação da primeira conversa ao fechamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StoreGate>{(s) => <Pipeline s={s} />}</StoreGate>,
});

function Pipeline({ s }: { s: NexvyaState }) {
  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [lose, setLose] = useState<Opportunity | null>(null);
  const [open, setOpen] = useState(false);
  const today = todayISO();

  function move(o: Opportunity, st: Stage) {
    if (o.stage === st) return;
    if (st === "perdido") return setLose(o);
    actions.moveStage(o.id, st);
    toast.success(`${o.contact} movida para ${stageLabel(st)}.`);
  }

  const Card = ({ o }: { o: Opportunity }) => {
    const late = bucketOf(o, today) === "atrasadas";
    return (
      <div
        draggable
        onDragStart={(e) => {
          setDragId(o.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          setDragId(null);
          setOver(null);
        }}
        className={cn("rounded-lg border bg-card p-3 shadow-card transition-opacity md:cursor-grab", dragId === o.id && "opacity-40")}
      >
        <div className="flex items-start justify-between gap-2">
          <Link to="/oportunidades/$id" params={{ id: o.id }} className="text-sm font-semibold leading-tight hover:text-primary">{o.contact}</Link>
          {o.demo && <DemoTag />}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{o.product}</p>
        {o.value !== null && <p className="mt-2 text-sm font-semibold tabular">{brl(o.value)}</p>}
        {(o.nextAction || o.nextFollowUp) && (
          <p className={cn("mt-2 text-xs", late ? "text-destructive" : "text-muted-foreground")}>
            {o.nextFollowUp ? fmtDate(o.nextFollowUp) : "Sem data"}{o.nextAction && ` · ${o.nextAction}`}
          </p>
        )}
        <label className="sr-only" htmlFor={`mv-${o.id}`}>Mover {o.contact} para etapa</label>
        <NativeSelect id={`mv-${o.id}`} className="mt-3 h-8 text-xs" value={o.stage} onChange={(e) => move(o, e.target.value as Stage)}>
          {STAGES.map((st) => <option key={st.id} value={st.id}>{st.id === o.stage ? `Etapa: ${st.label}` : `Mover para ${st.label}`}</option>)}
        </NativeSelect>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Pipeline comercial"
        description="Arraste os cartões entre as colunas ou use o seletor de cada cartão para mudar a etapa."
        actions={
          <>
            <div className="inline-flex rounded-lg border bg-card p-1" role="group" aria-label="Modo de visualização">
              <Button size="sm" variant={view === "kanban" ? "secondary" : "ghost"} onClick={() => setView("kanban")} aria-pressed={view === "kanban"}><Columns3 className="h-4 w-4" /> Quadro</Button>
              <Button size="sm" variant={view === "lista" ? "secondary" : "ghost"} onClick={() => setView("lista")} aria-pressed={view === "lista"}><List className="h-4 w-4" /> Lista</Button>
            </div>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova</Button>
          </>
        }
      />

      {s.opportunities.length === 0 ? (
        <EmptyState icon={Columns3} title="Pipeline vazio" description="Cada oportunidade cadastrada aparece aqui como um cartão na coluna da sua etapa." action={<Button onClick={() => setOpen(true)}>Cadastrar oportunidade</Button>} />
      ) : view === "kanban" ? (
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          {STAGES.map((st) => {
            const items = s.opportunities.filter((o) => o.stage === st.id);
            const total = items.reduce((n, o) => n + (o.value ?? 0), 0);
            return (
              <section
                key={st.id}
                aria-label={st.label}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(st.id);
                }}
                onDragLeave={() => setOver((v) => (v === st.id ? null : v))}
                onDrop={(e) => {
                  e.preventDefault();
                  const o = s.opportunities.find((x) => x.id === dragId);
                  if (o) move(o, st.id);
                  setDragId(null);
                  setOver(null);
                }}
                className={cn("flex w-72 shrink-0 snap-start flex-col rounded-xl bg-muted/70 p-3 transition-colors", over === st.id && "bg-accent ring-2 ring-primary")}
              >
                <header className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold">{st.label} <span className="font-normal text-muted-foreground">({items.length})</span></h2>
                  {total > 0 && <span className="text-xs text-muted-foreground tabular">{brl(total)}</span>}
                </header>
                <div className="grid min-h-24 content-start gap-2">
                  {items.length ? items.map((o) => <Card key={o.id} o={o} />) : <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">{st.hint}</p>}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-6">
          {STAGES.map((st) => {
            const items = s.opportunities.filter((o) => o.stage === st.id);
            return (
              <section key={st.id}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold"><StageBadge stage={st.id} /> {items.length}</h2>
                {items.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{items.map((o) => <Card key={o.id} o={o} />)}</div> : <p className="text-sm text-muted-foreground">Nenhuma oportunidade nesta etapa.</p>}
              </section>
            );
          })}
        </div>
      )}
      <LossReasonDialog opp={lose} onClose={() => setLose(null)} />
      <OpportunityFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
