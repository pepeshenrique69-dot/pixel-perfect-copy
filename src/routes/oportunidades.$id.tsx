import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, Check, Pencil, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CompleteActionDialog, ConfirmDialog, LossReasonDialog, RescheduleDialog } from "@/components/nexvya/ActionDialogs";
import { DemoTag, EmptyState, NativeSelect, Panel, StageBadge, StoreGate } from "@/components/nexvya/common";
import { OpportunityFormDialog } from "@/components/nexvya/OpportunityFormDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { missingInfo, recommendedAction } from "@/lib/nexvya/assistant";
import { brl, fmtDate, fmtDateTime, todayISO } from "@/lib/nexvya/dates";
import { explain } from "@/lib/nexvya/rules";
import { actions } from "@/lib/nexvya/store";
import { isClosed, STAGES, type ActivityType, type Opportunity, type Stage } from "@/lib/nexvya/types";

export const Route = createFileRoute("/oportunidades/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da oportunidade — Nexvya" },
      { name: "description", content: "Histórico, próximos passos e sugestões para esta negociação." },
      { property: "og:title", content: "Detalhes da oportunidade — Nexvya" },
      { property: "og:description", content: "Histórico e próximos passos de uma negociação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DetailRoute,
});

function DetailRoute() {
  const { id } = Route.useParams();
  return (
    <StoreGate>
      {(s) => {
        const o = s.opportunities.find((x) => x.id === id);
        if (!o)
          return (
            <EmptyState
              icon={Trash2}
              title="Oportunidade não encontrada"
              description="Ela pode ter sido excluída ou o link está incorreto."
              action={<Button asChild><Link to="/oportunidades">Voltar às oportunidades</Link></Button>}
            />
          );
        return <Detail o={o} />;
      }}
    </StoreGate>
  );
}

const ACT_LABEL: Record<ActivityType, string> = {
  criado: "Criação",
  etapa: "Etapa",
  nota: "Nota",
  acao_concluida: "Ação concluída",
  reagendado: "Reagendamento",
  objecao: "Objeção",
  editado: "Edição",
};

function Detail({ o }: { o: Opportunity }) {
  const nav = useNavigate();
  const today = todayISO();
  const [edit, setEdit] = useState(false);
  const [del, setDel] = useState(false);
  const [complete, setComplete] = useState<Opportunity | null>(null);
  const [resched, setResched] = useState<Opportunity | null>(null);
  const [lose, setLose] = useState<Opportunity | null>(null);
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState<"nota" | "objecao">("nota");
  const e = explain(o, today);
  const insights = missingInfo(o, today);
  const rec = recommendedAction(o);

  function onStage(st: Stage) {
    if (st === "perdido") return setLose(o);
    actions.moveStage(o.id, st);
    toast.success(`Etapa alterada para ${STAGES.find((x) => x.id === st)?.label}.`);
  }

  return (
    <>
      <Link to="/oportunidades" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Oportunidades
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold md:text-3xl">{o.contact}</h1>
            <StageBadge stage={o.stage} />
            {o.demo && <DemoTag />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[o.company, o.product, o.value !== null ? brl(o.value) : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /> Editar</Button>
          <Button variant="outline" asChild><Link to="/assistente" search={{ id: o.id }}><Sparkles className="h-4 w-4" /> Assistente</Link></Button>
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDel(true)}><Trash2 className="h-4 w-4" /> Excluir</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <Panel title="Próximo passo">
            {isClosed(o.stage) ? (
              <p className="text-sm text-muted-foreground">
                Negociação encerrada como <strong>{o.stage === "ganho" ? "ganha" : "perdida"}</strong>
                {o.closedAt && ` em ${fmtDateTime(o.closedAt)}`}.{o.lossReason && ` Motivo: ${o.lossReason}.`}
              </p>
            ) : (
              <>
                {e && <p className="text-sm font-medium">{e.headline}</p>}
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs text-muted-foreground">Próxima ação</dt><dd>{o.nextAction || "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Data</dt><dd className="tabular">{fmtDate(o.nextFollowUp)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Último contato</dt><dd className="tabular">{fmtDate(o.lastContact)}</dd></div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {o.nextFollowUp && <Button size="sm" onClick={() => setComplete(o)}><Check className="h-4 w-4" /> Concluir ação</Button>}
                  <Button size="sm" variant="outline" onClick={() => setResched(o)}><CalendarClock className="h-4 w-4" /> {o.nextFollowUp ? "Reagendar" : "Agendar"}</Button>
                </div>
              </>
            )}
            <div className="mt-5 grid gap-1.5 sm:max-w-xs">
              <label htmlFor="d-stage" className="text-xs font-medium text-muted-foreground">Alterar etapa (o histórico é mantido)</label>
              <NativeSelect id="d-stage" value={o.stage} onChange={(ev) => onStage(ev.target.value as Stage)}>
                {STAGES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
              </NativeSelect>
            </div>
          </Panel>

          <Panel title="Histórico de atividades">
            <form
              className="mb-5 grid gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (!note.trim()) return toast.error("Escreva algo antes de registrar.");
                actions.addActivity(o.id, noteType, noteType === "objecao" ? `Objeção: ${note.trim()}` : note);
                setNote("");
                toast.success(noteType === "objecao" ? "Objeção registrada." : "Nota registrada.");
              }}
            >
              <label htmlFor="d-note" className="sr-only">Nova anotação</label>
              <Textarea id="d-note" rows={2} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Registre uma conversa, decisão ou objeção…" />
              <div className="flex gap-2">
                <NativeSelect aria-label="Tipo de registro" className="w-auto" value={noteType} onChange={(ev) => setNoteType(ev.target.value as "nota" | "objecao")}>
                  <option value="nota">Nota</option>
                  <option value="objecao">Objeção</option>
                </NativeSelect>
                <Button type="submit" variant="secondary">Registrar</Button>
              </div>
            </form>
            <ol className="relative grid gap-4 border-l pl-5">
              {o.activities.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                  <p className="text-xs text-muted-foreground">{ACT_LABEL[a.type]} · {fmtDateTime(a.at)}</p>
                  <p className="text-sm">{a.text}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel title="Sugestão" description="Baseada na etapa e nos registros.">
            <p className="text-sm font-medium">{rec.action}</p>
            <p className="mt-1 text-xs text-muted-foreground">{rec.why}</p>
          </Panel>
          <Panel title="O que falta registrar">
            {insights.length ? (
              <ul className="grid gap-2 text-sm">
                {insights.map((i) => (
                  <li key={i.text} className="flex gap-2">
                    <span className={i.level === "atencao" ? "text-destructive" : "text-muted-foreground"}>•</span>
                    {i.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Os dados principais estão completos.</p>
            )}
          </Panel>
          {o.notes && (
            <Panel title="Observações">
              <p className="whitespace-pre-wrap text-sm">{o.notes}</p>
            </Panel>
          )}
        </div>
      </div>

      <OpportunityFormDialog open={edit} onOpenChange={setEdit} opportunity={o} />
      <CompleteActionDialog opp={complete} onClose={() => setComplete(null)} />
      <RescheduleDialog opp={resched} onClose={() => setResched(null)} />
      <LossReasonDialog opp={lose} onClose={() => setLose(null)} />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        title={`Excluir ${o.contact}?`}
        description="A oportunidade e todo o seu histórico serão excluídos definitivamente. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={() => {
          actions.remove(o.id);
          toast.success("Oportunidade excluída.");
          nav({ to: "/oportunidades" });
        }}
      />
    </>
  );
}
