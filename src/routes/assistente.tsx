import { createFileRoute, Link } from "@tanstack/react-router";
import { Copy, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, Field, NativeSelect, PageHeader, Panel, StageBadge, StoreGate } from "@/components/nexvya/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { missingInfo, PURPOSES, recommendedAction, ruleBasedProvider, type DraftPurpose } from "@/lib/nexvya/assistant";
import { isValidISODate, todayISO } from "@/lib/nexvya/dates";
import { actions, type NexvyaState } from "@/lib/nexvya/store";
import { isClosed } from "@/lib/nexvya/types";

export const Route = createFileRoute("/assistente")({
  validateSearch: (s: Record<string, unknown>): { id?: string } => (typeof s.id === "string" ? { id: s.id } : {}),
  head: () => ({
    meta: [
      { title: "Assistente comercial — Nexvya" },
      { name: "description", content: "Sugestões baseadas nos seus registros e rascunhos de mensagens editáveis." },
      { property: "og:title", content: "Assistente comercial — Nexvya" },
      { property: "og:description", content: "Próximos passos e rascunhos de mensagem a partir do contexto da negociação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StoreGate>{(s) => <Assistant s={s} />}</StoreGate>,
});

function Assistant({ s }: { s: NexvyaState }) {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const today = todayISO();
  const id = search.id && s.opportunities.some((o) => o.id === search.id) ? search.id : "";
  const o = s.opportunities.find((x) => x.id === id);

  const [purpose, setPurpose] = useState<DraftPurpose>("acompanhamento");
  const [context, setContext] = useState("");
  const [formal, setFormal] = useState(true);
  const [draft, setDraft] = useState("");
  const [warn, setWarn] = useState("");
  const [objection, setObjection] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [nextDate, setNextDate] = useState("");

  useEffect(() => {
    setDraft("");
    setWarn("");
    setContext("");
  }, [id]);

  async function generate() {
    if (!o) return;
    const r = await ruleBasedProvider.draftMessage({ opportunity: o, purpose, context, formal });
    if (r.ok) {
      setDraft(r.text);
      setWarn("");
    } else {
      setDraft("");
      setWarn(r.message);
    }
  }

  return (
    <>
      <PageHeader title="Assistente comercial" description="Sugestões geradas por regras claras a partir dos seus registros. Nenhuma mensagem é enviada automaticamente." />
      <div className="mb-6 max-w-md">
        <Field label="Oportunidade" htmlFor="a-opp">
          <NativeSelect id="a-opp" value={id} onChange={(e) => navigate({ search: e.target.value ? { id: e.target.value } : {} })}>
            <option value="">Selecione uma oportunidade…</option>
            {s.opportunities.map((x) => <option key={x.id} value={x.id}>{x.contact}{x.company ? ` — ${x.company}` : ""}</option>)}
          </NativeSelect>
        </Field>
      </div>

      {!o ? (
        <EmptyState icon={Sparkles} title="Escolha uma oportunidade" description="O assistente analisa os dados registrados dela para sugerir o próximo passo, apontar o que falta e preparar um rascunho de mensagem." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="grid content-start gap-6 lg:col-span-2">
            <Panel title="Diagnóstico" action={<StageBadge stage={o.stage} />}>
              <p className="text-sm font-medium">Próxima ação recomendada</p>
              <p className="text-sm">{recommendedAction(o).action}</p>
              <p className="mt-1 text-xs text-muted-foreground">{recommendedAction(o).why}</p>
              <p className="mt-4 text-sm font-medium">Informações que faltam</p>
              {missingInfo(o, today).length ? (
                <ul className="mt-1 grid gap-1 text-sm text-muted-foreground">
                  {missingInfo(o, today).map((i) => <li key={i.text}>• {i.text}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nada essencial faltando.</p>
              )}
              <Button size="sm" variant="link" className="mt-2 px-0" asChild>
                <Link to="/oportunidades/$id" params={{ id: o.id }}>Abrir oportunidade</Link>
              </Button>
            </Panel>

            {!isClosed(o.stage) && (
              <Panel title="Registrar objeção e próximo passo">
                <form
                  className="grid gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!objection.trim() && !nextStep.trim()) return toast.error("Preencha a objeção ou o próximo passo.");
                    if (nextDate && (!isValidISODate(nextDate) || nextDate < today)) return toast.error("Escolha uma data válida, a partir de hoje.");
                    if (nextDate && !nextStep.trim()) return toast.error("Descreva o próximo passo para a data escolhida.");
                    if (objection.trim()) actions.addActivity(o.id, "objecao", `Objeção: ${objection.trim()}`);
                    if (nextStep.trim()) actions.setNextStep(o.id, nextStep.trim(), nextDate || o.nextFollowUp);
                    setObjection("");
                    setNextStep("");
                    setNextDate("");
                    toast.success("Registrado no histórico da oportunidade.");
                  }}
                >
                  <Field label="Objeção do contato" htmlFor="a-obj" optional>
                    <Input id="a-obj" value={objection} onChange={(e) => setObjection(e.target.value)} placeholder="Ex.: achou o prazo longo" />
                  </Field>
                  <Field label="Próximo passo" htmlFor="a-step" optional>
                    <Input id="a-step" value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="Ex.: enviar cronograma alternativo" />
                  </Field>
                  <Field label="Data do próximo passo" htmlFor="a-date" optional>
                    <Input id="a-date" type="date" min={today} value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
                  </Field>
                  <Button type="submit" variant="secondary">Registrar</Button>
                </form>
              </Panel>
            )}
          </div>

          <Panel className="lg:col-span-3" title="Rascunho de mensagem" description="Gerado a partir de modelos e do contexto que você informar. Revise antes de usar.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Objetivo" htmlFor="a-purpose">
                <NativeSelect id="a-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value as DraftPurpose)}>
                  {PURPOSES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </NativeSelect>
              </Field>
              <div className="flex items-end gap-3 pb-2">
                <Switch id="a-formal" checked={formal} onCheckedChange={setFormal} />
                <label htmlFor="a-formal" className="text-sm">Tom formal</label>
              </div>
            </div>
            <div className="mt-4">
              <Field label="Contexto adicional" htmlFor="a-ctx" optional={!PURPOSES.find((p) => p.id === purpose)?.needsContext} hint="Esse texto entra na mensagem. Ex.: condições combinadas, resposta a uma dúvida.">
                <Textarea id="a-ctx" rows={3} value={context} onChange={(e) => setContext(e.target.value)} />
              </Field>
            </div>
            <Button className="mt-4" onClick={generate}><Sparkles className="h-4 w-4" /> Gerar rascunho</Button>
            {warn && <p className="mt-4 rounded-lg bg-warning/15 p-3 text-sm" role="alert">{warn}</p>}
            {draft && (
              <div className="mt-4 grid gap-2">
                <label htmlFor="a-draft" className="text-sm font-medium">Mensagem (editável)</label>
                <Textarea id="a-draft" rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(draft);
                        toast.success("Mensagem copiada. Cole no canal que preferir.");
                      } catch {
                        toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.");
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" /> Copiar
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      actions.addActivity(o.id, "nota", `Mensagem preparada (${PURPOSES.find((p) => p.id === purpose)?.label.toLowerCase()}).`);
                      toast.success("Registrado no histórico.");
                    }}
                  >
                    Registrar no histórico
                  </Button>
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
