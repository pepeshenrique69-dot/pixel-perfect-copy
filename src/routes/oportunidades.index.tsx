import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { DemoTag, EmptyState, NativeSelect, PageHeader, StageBadge, StoreGate } from "@/components/nexvya/common";
import { OpportunityFormDialog } from "@/components/nexvya/OpportunityFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl, fmtDate, todayISO } from "@/lib/nexvya/dates";
import { bucketOf } from "@/lib/nexvya/rules";
import type { NexvyaState } from "@/lib/nexvya/store";
import { STAGES, type Opportunity, type Stage } from "@/lib/nexvya/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/oportunidades/")({
  head: () => ({
    meta: [
      { title: "Oportunidades — Nexvya" },
      { name: "description", content: "Cadastre, pesquise, filtre e organize suas oportunidades comerciais." },
      { property: "og:title", content: "Oportunidades — Nexvya" },
      { property: "og:description", content: "Todas as suas negociações em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StoreGate>{(s) => <List s={s} />}</StoreGate>,
});

type Sort = "proximo" | "recentes" | "valor" | "nome";

export function filterAndSort(opps: Opportunity[], q: string, stage: Stage | "todas", sort: Sort) {
  const term = q.trim().toLowerCase();
  const list = opps.filter(
    (o) =>
      (stage === "todas" || o.stage === stage) &&
      (!term || [o.contact, o.company, o.product, o.nextAction].some((f) => f.toLowerCase().includes(term))),
  );
  const cmp: Record<Sort, (a: Opportunity, b: Opportunity) => number> = {
    proximo: (a, b) => (a.nextFollowUp ?? "9999").localeCompare(b.nextFollowUp ?? "9999"),
    recentes: (a, b) => b.createdAt.localeCompare(a.createdAt),
    valor: (a, b) => (b.value ?? -1) - (a.value ?? -1),
    nome: (a, b) => a.contact.localeCompare(b.contact, "pt-BR"),
  };
  return [...list].sort(cmp[sort]);
}

function List({ s }: { s: NexvyaState }) {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<Stage | "todas">("todas");
  const [sort, setSort] = useState<Sort>("proximo");
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const today = todayISO();
  const list = useMemo(() => filterAndSort(s.opportunities, q, stage, sort), [s, q, stage, sort]);

  return (
    <>
      <PageHeader
        title="Oportunidades"
        description={`${s.opportunities.length} cadastradas.`}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nova oportunidade</Button>}
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Buscar" className="h-10 bg-card pl-9" placeholder="Buscar por contato, empresa, produto ou ação" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect aria-label="Filtrar por etapa" value={stage} onChange={(e) => setStage(e.target.value as Stage | "todas")}>
          <option value="todas">Todas as etapas</option>
          {STAGES.map((st) => <option key={st.id} value={st.id}>{st.label}</option>)}
        </NativeSelect>
        <NativeSelect aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="proximo">Próximo acompanhamento</option>
          <option value="recentes">Mais recentes</option>
          <option value="valor">Maior valor</option>
          <option value="nome">Nome (A–Z)</option>
        </NativeSelect>
      </div>

      {s.opportunities.length === 0 ? (
        <EmptyState icon={Users} title="Nenhuma oportunidade ainda" description="Cadastre a primeira negociação para começar a acompanhar seus próximos passos." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Cadastrar primeira oportunidade</Button>} />
      ) : list.length === 0 ? (
        <EmptyState icon={Search} title="Nada encontrado" description="Nenhuma oportunidade corresponde à busca ou ao filtro." action={<Button variant="outline" onClick={() => { setQ(""); setStage("todas"); }}>Limpar filtros</Button>} />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium">Produto</th>
                  <th className="px-4 py-3 font-medium">Etapa</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Próximo acomp.</th>
                  <th className="px-4 py-3 font-medium">Próxima ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.map((o) => {
                  const late = bucketOf(o, today) === "atrasadas";
                  return (
                    <tr key={o.id} className="cursor-pointer hover:bg-muted/40" onClick={() => nav({ to: "/oportunidades/$id", params: { id: o.id } })}>
                      <td className="px-4 py-3">
                        <Link to="/oportunidades/$id" params={{ id: o.id }} className="font-semibold hover:text-primary" onClick={(e) => e.stopPropagation()}>{o.contact}</Link>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">{o.company || "—"} {o.demo && <DemoTag />}</div>
                      </td>
                      <td className="px-4 py-3">{o.product}</td>
                      <td className="px-4 py-3"><StageBadge stage={o.stage} /></td>
                      <td className="px-4 py-3 text-right tabular">{o.value === null ? "—" : brl(o.value)}</td>
                      <td className={cn("px-4 py-3 tabular", late && "font-semibold text-destructive")}>{fmtDate(o.nextFollowUp)}</td>
                      <td className="max-w-[16rem] truncate px-4 py-3 text-muted-foreground">{o.nextAction || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ul className="grid gap-2 md:hidden">
            {list.map((o) => (
              <li key={o.id}>
                <Link to="/oportunidades/$id" params={{ id: o.id }} className="block rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{o.contact}</span>
                    <StageBadge stage={o.stage} />
                  </div>
                  <p className="text-sm text-muted-foreground">{o.product}{o.value !== null && ` · ${brl(o.value)}`}</p>
                  <p className={cn("mt-1 text-xs", bucketOf(o, today) === "atrasadas" ? "text-destructive" : "text-muted-foreground")}>
                    {o.nextFollowUp ? `${fmtDate(o.nextFollowUp)} — ${o.nextAction}` : "Sem acompanhamento agendado"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <OpportunityFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
