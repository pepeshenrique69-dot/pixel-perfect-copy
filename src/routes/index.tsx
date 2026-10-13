import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarCheck, CircleDollarSign, Plus, Target, ThumbsDown, Trophy, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { CompleteActionDialog, ConfirmDialog, RescheduleDialog } from "@/components/nexvya/ActionDialogs";
import { ActionItem } from "@/components/nexvya/ActionItem";
import { EmptyState, NativeSelect, PageHeader, Panel, StatCard, StoreGate } from "@/components/nexvya/common";
import { OpportunityFormDialog } from "@/components/nexvya/OpportunityFormDialog";
import { Button } from "@/components/ui/button";
import { brl, todayISO } from "@/lib/nexvya/dates";
import { monthlySeries, PERIODS, summary, type Period } from "@/lib/nexvya/metrics";
import { prioritized } from "@/lib/nexvya/rules";
import { actions, type NexvyaState } from "@/lib/nexvya/store";
import { STAGES, type Opportunity, type Stage } from "@/lib/nexvya/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visão geral — Nexvya" },
      { name: "description", content: "Painel com oportunidades abertas, acompanhamentos atrasados e próximas ações." },
      { property: "og:title", content: "Visão geral — Nexvya" },
      { property: "og:description", content: "Seu centro de comando comercial: o que exige atenção e por quê." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StoreGate>{(s) => <Overview s={s} />}</StoreGate>,
});

function Overview({ s }: { s: NexvyaState }) {
  const today = todayISO();
  const [period, setPeriod] = useState<Period>("30");
  const [stage, setStage] = useState<Stage | "todas">("todas");
  const [formOpen, setFormOpen] = useState(false);
  const [complete, setComplete] = useState<Opportunity | null>(null);
  const [resched, setResched] = useState<Opportunity | null>(null);
  const [confirmDemo, setConfirmDemo] = useState(false);

  const opps = useMemo(() => (stage === "todas" ? s.opportunities : s.opportunities.filter((o) => o.stage === stage)), [s, stage]);
  const m = summary(opps, today, period);
  const attention = prioritized(opps, today, ["atrasadas", "hoje", "sem_agendamento"]).slice(0, 5);
  const upcoming = prioritized(opps, today, ["proximas"]).slice(0, 4);
  const series = monthlySeries(s.opportunities, today, 6);
  const demoCount = s.opportunities.filter((o) => o.demo).length;

  return (
    <>
      <PageHeader
        title="Visão geral"
        description="O que exige sua atenção agora e como estão suas negociações."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Nova oportunidade
          </Button>
        }
      />

      {!s.introDismissed && (
        <div className="relative mb-6 overflow-hidden rounded-xl bg-navy p-6 text-navy-foreground animate-rise">
          <button
            type="button"
            className="absolute right-3 top-3 rounded-md p-1.5 text-navy-muted hover:bg-sidebar-accent"
            onClick={() => actions.setIntroDismissed(true)}
            aria-label="Dispensar introdução"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold">Bem-vindo à Nexvya</h2>
          <p className="mt-1 max-w-2xl text-sm text-navy-muted">
            Cadastre cada negociação como uma <strong className="text-navy-foreground">oportunidade</strong>, defina a próxima ação e uma data. A
            Nexvya mostra quem precisa de atenção, por que precisa e o que fazer a seguir. No <strong className="text-navy-foreground">pipeline</strong>,
            arraste os cartões conforme a negociação avança: Novo → Qualificado → Em negociação → Ganho ou Perdido.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> Cadastrar oportunidade
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/pipeline">Ver o pipeline</Link>
            </Button>
          </div>
        </div>
      )}

      {demoCount > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-lg border border-dashed bg-card px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            <strong>{demoCount} oportunidades de demonstração</strong> <span className="text-muted-foreground">estão incluídas para você explorar. Elas são marcadas como “demo”.</span>
          </p>
          <Button size="sm" variant="outline" onClick={() => setConfirmDemo(true)}>Remover dados de demonstração</Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="ov-period">Período</label>
        <NativeSelect id="ov-period" className="w-auto" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
          {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </NativeSelect>
        <label className="sr-only" htmlFor="ov-stage">Etapa</label>
        <NativeSelect id="ov-stage" className="w-auto" value={stage} onChange={(e) => setStage(e.target.value as Stage | "todas")}>
          <option value="todas">Todas as etapas</option>
          {STAGES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
        </NativeSelect>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Oportunidades abertas" value={m.openCount} icon={Target} tone="primary" />
        <StatCard
          label="Valor potencial"
          value={m.potentialValue === null ? "—" : brl(m.potentialValue)}
          hint={m.potentialValue === null ? "Nenhuma oportunidade aberta com valor" : `Soma de ${m.openWithValue} com valor informado`}
          icon={CircleDollarSign}
        />
        <StatCard label="Atrasadas" value={m.overdue} icon={AlertTriangle} tone={m.overdue ? "danger" : "default"} />
        <StatCard label="Para hoje" value={m.today} icon={CalendarCheck} />
        <StatCard label="Ganhas no período" value={m.wonCount} icon={Trophy} tone="success" />
        <StatCard label="Perdidas no período" value={m.lostCount} icon={ThumbsDown} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Panel
          className="lg:col-span-3"
          title="Exige atenção primeiro"
          description="Ordem: atrasadas (mais dias primeiro), hoje, sem agendamento. Empates: negociação > qualificado > novo."
          action={<Button size="sm" variant="ghost" asChild><Link to="/acoes">Ver tudo</Link></Button>}
        >
          {attention.length ? (
            <ul className="grid gap-2">
              {attention.map(({ o, e }) => (
                <ActionItem key={o.id} o={o} e={e} compact onComplete={setComplete} onReschedule={setResched} />
              ))}
            </ul>
          ) : (
            <EmptyState icon={CalendarCheck} title="Nada pendente" description="Nenhum acompanhamento atrasado, para hoje ou sem data." />
          )}
        </Panel>
        <Panel className="lg:col-span-2" title="Próximas ações">
          {upcoming.length ? (
            <ul className="divide-y">
              {upcoming.map(({ o, e }) => (
                <li key={o.id} className="py-2.5">
                  <Link to="/oportunidades/$id" params={{ id: o.id }} className="text-sm font-semibold hover:text-primary">{o.contact}</Link>
                  <p className="text-sm text-muted-foreground">{o.nextAction || "Sem ação descrita"} · {e.headline.replace("Acompanhamento em ", "em ")}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum acompanhamento futuro agendado.</p>
          )}
        </Panel>
      </div>

      <Panel className="mt-6" title="Evolução comercial" description="Oportunidades criadas, ganhas e perdidas por mês, a partir dos seus registros.">
        {series.length >= 2 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip cursor={{ fill: "var(--muted)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="criadas" name="Criadas" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ganhas" name="Ganhas" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="perdidas" name="Perdidas" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">É preciso pelo menos dois meses de registros para mostrar a evolução. Continue registrando suas oportunidades.</p>
        )}
      </Panel>

      <OpportunityFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <CompleteActionDialog opp={complete} onClose={() => setComplete(null)} />
      <RescheduleDialog opp={resched} onClose={() => setResched(null)} />
      <ConfirmDialog
        open={confirmDemo}
        onOpenChange={setConfirmDemo}
        title="Remover dados de demonstração?"
        description="As oportunidades marcadas como demo serão excluídas. As que você cadastrou continuam intactas."
        confirmLabel="Remover"
        onConfirm={() => {
          actions.removeDemo();
          toast.success("Dados de demonstração removidos.");
        }}
      />
    </>
  );
}
