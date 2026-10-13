import type { LucideIcon } from "lucide-react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { stageLabel, type Stage } from "@/lib/nexvya/types";
import { useNexvya, type NexvyaState } from "@/lib/nexvya/store";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, children, className, action }: { title?: string; description?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border bg-card p-5 shadow-card animate-rise", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: { label: string; value: ReactNode; hint?: string; icon: LucideIcon; tone?: "default" | "danger" | "success" | "primary" }) {
  const toneCls = {
    default: "bg-secondary text-secondary-foreground",
    danger: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
    primary: "bg-accent text-accent-foreground",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card animate-rise">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("rounded-md p-1.5", toneCls)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 font-display text-2xl font-semibold tabular">{value}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card/50 px-6 py-10 text-center">
      <span className="rounded-full bg-accent p-3 text-accent-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const STAGE_CLS: Record<Stage, string> = {
  novo: "bg-secondary text-secondary-foreground",
  qualificado: "bg-accent text-accent-foreground",
  negociacao: "bg-primary/15 text-primary",
  ganho: "bg-success/15 text-success",
  perdido: "bg-destructive/10 text-destructive",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", STAGE_CLS[stage])}>{stageLabel(stage)}</span>;
}

export function DemoTag() {
  return <span className="rounded border border-dashed px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">demo</span>;
}

export function NativeSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
    />
  );
}

export function Field({ label, htmlFor, error, hint, children, optional }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode; optional?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>
        {label} {optional && <span className="font-normal text-muted-foreground">(opcional)</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Renders children only after browser data has loaded. */
export function StoreGate({ children }: { children: (s: NexvyaState) => ReactNode }) {
  const s = useNexvya();
  if (!s)
    return (
      <div className="grid gap-4" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  return <>{children(s)}</>;
}
