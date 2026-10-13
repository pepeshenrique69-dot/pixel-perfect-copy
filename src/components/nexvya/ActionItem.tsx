import { Link } from "@tanstack/react-router";
import { CalendarClock, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/nexvya/dates";
import type { Explanation } from "@/lib/nexvya/rules";
import type { Opportunity } from "@/lib/nexvya/types";
import { DemoTag, StageBadge } from "./common";

const DOT: Record<Explanation["bucket"], string> = {
  atrasadas: "bg-destructive",
  hoje: "bg-warning",
  proximas: "bg-primary",
  sem_agendamento: "bg-muted-foreground",
};

export function ActionItem({
  o,
  e,
  onComplete,
  onReschedule,
  compact,
}: {
  o: Opportunity;
  e: Explanation;
  onComplete: (o: Opportunity) => void;
  onReschedule: (o: Opportunity) => void;
  compact?: boolean;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 gap-3">
        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[e.bucket])} aria-hidden="true" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/oportunidades/$id" params={{ id: o.id }} className="font-semibold hover:text-primary hover:underline">
              {o.contact}
            </Link>
            <StageBadge stage={o.stage} />
            {o.value !== null && <span className="text-xs text-muted-foreground tabular">{brl(o.value)}</span>}
            {o.demo && <DemoTag />}
          </div>
          <p className="mt-1 text-sm">{e.headline}</p>
          {!compact && <p className="text-sm text-muted-foreground">{e.reasons.join(" ")}</p>}
          {compact && <p className="text-sm text-muted-foreground">{e.reasons[0]}</p>}
        </div>
      </div>
      <div className="flex shrink-0 gap-2 pl-5 sm:pl-0">
        {e.bucket !== "sem_agendamento" && (
          <Button size="sm" onClick={() => onComplete(o)}>
            <Check className="h-4 w-4" /> Concluir
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onReschedule(o)}>
          <CalendarClock className="h-4 w-4" /> {e.bucket === "sem_agendamento" ? "Agendar" : "Reagendar"}
        </Button>
        {!compact && (
          <Button size="sm" variant="ghost" asChild>
            <Link to="/oportunidades/$id" params={{ id: o.id }} aria-label={`Abrir ${o.contact}`}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </li>
  );
}
