import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, NativeSelect, PageHeader, Panel, StoreGate } from "@/components/nexvya/common";
import { brl, todayISO } from "@/lib/nexvya/dates";
import { byStage, monthlySeries, PERIODS, summary, type Period } from "@/lib/nexvya/metrics";
import type { NexvyaState } from "@/lib/nexvya/store";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Nexvya" },
      { name: "description", content: "Relatórios baseados exclusivamente nos seus registros comerciais." },
      { property: "og:title", content: "Relatórios — Nexvya" },
      { property: "og:description", content: "Oportunidades por etapa, ganhos, perdas e evolução no tempo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <StoreGate>{(s) => <Reports s={s} />}</StoreGate>,
});

function Reports({ s }: { s: NexvyaState }) {
  const today = todayISO();
  const [period, setPeriod] = useState<Period>("365");
  const m = summary(s.opportunities, today, period);
  const stages = byStage(s.opportunities);
  const series = monthlySeries(s.opportunities, today, 12);

  if (!s.opportunities.length)
    return (
      <>
        <PageHeader title="Relatórios" />
        <EmptyState icon={BarChart3} title="Ainda não há dados" description="Os relatórios são montados a partir das oportunidades cadastradas. Cadastre algumas para ver os números." />
      </>
    );

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Todos os números vêm dos registros deste navegador."
        actions={
          <NativeSelect aria-label="Período" className="w-auto" value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </NativeSelect>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Valor potencial (aberto)" description="Soma das oportunidades abertas com valor. Não é receita.">
          <p className="font-display text-2xl font-semibold tabular">{m.potentialValue === null ? "—" : brl(m.potentialValue)}</p>
          <p className="text-xs text-muted-foreground">{m.openWithValue} de {m.openCount} abertas com valor informado</p>
        </Panel>
        <Panel title="Vendas ganhas no período" description="Valor negociado das oportunidades ganhas.">
          <p className="font-display text-2xl font-semibold tabular">{m.wonValue === null ? "—" : brl(m.wonValue)}</p>
          <p className="text-xs text-muted-foreground">{m.wonCount} ganhas · {m.lostCount} perdidas{m.wonCount + m.lostCount > 0 && ` · ${Math.round((m.wonCount / (m.wonCount + m.lostCount)) * 100)}% de ganho entre as encerradas`}</p>
        </Panel>
        <Panel title="Faturamento recebido" description="Pagamentos efetivamente recebidos.">
          <p className="font-display text-2xl font-semibold text-muted-foreground">Não registrado</p>
          <p className="text-xs text-muted-foreground">Esta versão não registra pagamentos. Uma venda ganha não confirma o recebimento.</p>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Oportunidades por etapa" description="Situação atual de todas as oportunidades.">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stages} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" width={100} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "var(--muted)" }} formatter={(v: number) => [v, "Oportunidades"]} />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Ações" description="Acompanhamentos concluídos no período e atrasados agora.">
          <dl className="grid grid-cols-3 gap-4">
            <div><dt className="text-xs text-muted-foreground">Concluídas</dt><dd className="font-display text-2xl font-semibold tabular">{m.completedActions}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Atrasadas</dt><dd className="font-display text-2xl font-semibold tabular text-destructive">{m.overdue}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Sem data</dt><dd className="font-display text-2xl font-semibold tabular">{m.unscheduled}</dd></div>
          </dl>
          <table className="mt-6 w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-medium">Etapa</th><th className="py-1 text-right font-medium">Qtd.</th><th className="py-1 text-right font-medium">Valor registrado</th></tr></thead>
            <tbody className="divide-y">
              {stages.map((r) => (
                <tr key={r.stage}><td className="py-2">{r.label}</td><td className="py-2 text-right tabular">{r.count}</td><td className="py-2 text-right tabular">{r.value ? brl(r.value) : "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel className="mt-6" title="Evolução ao longo do tempo" description="Últimos 12 meses, a partir do primeiro mês com registros.">
        {series.length >= 2 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} fontSize={12} width={28} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="criadas" name="Criadas" stroke="var(--chart-4)" strokeWidth={2} />
                <Line type="monotone" dataKey="ganhas" name="Ganhas" stroke="var(--chart-2)" strokeWidth={2} />
                <Line type="monotone" dataKey="perdidas" name="Perdidas" stroke="var(--chart-3)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ainda não há histórico suficiente: é preciso registros em pelo menos dois meses diferentes.</p>
        )}
      </Panel>
    </>
  );
}
