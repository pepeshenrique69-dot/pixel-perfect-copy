import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addDays, isValidISODate, todayISO } from "@/lib/nexvya/dates";
import { actions } from "@/lib/nexvya/store";
import type { Opportunity } from "@/lib/nexvya/types";
import { Field } from "./common";

export function CompleteActionDialog({ opp, onClose }: { opp: Opportunity | null; onClose: () => void }) {
  const [result, setResult] = useState("");
  const [date, setDate] = useState("");
  const [next, setNext] = useState("");
  const [err, setErr] = useState<{ date?: string; next?: string }>({});
  useEffect(() => {
    setResult("");
    setDate("");
    setNext("");
    setErr({});
  }, [opp]);
  if (!opp) return null;
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const er: typeof err = {};
    if (date && !isValidISODate(date)) er.date = "Data inválida.";
    if (date && date < todayISO()) er.date = "Escolha hoje ou uma data futura.";
    if (date && !next.trim()) er.next = "Descreva a próxima ação.";
    setErr(er);
    if (Object.keys(er).length) return;
    actions.completeAction(opp!.id, { result, nextFollowUp: date || null, nextAction: next });
    toast.success("Ação concluída e registrada no histórico.");
    onClose();
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir ação</DialogTitle>
          <DialogDescription>{opp.contact} — {opp.nextAction || "acompanhamento"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Field label="Resultado" htmlFor="c-result" optional hint="O que aconteceu? Fica registrado no histórico.">
            <Textarea id="c-result" rows={2} value={result} onChange={(e) => setResult(e.target.value)} placeholder="Ex.: pediu para retornar com valores" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Próximo acompanhamento" htmlFor="c-date" error={err.date} optional>
              <Input id="c-date" type="date" value={date} min={todayISO()} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Próxima ação" htmlFor="c-next" error={err.next} optional={!date}>
              <Input id="c-next" value={next} onChange={(e) => setNext(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Concluir</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RescheduleDialog({ opp, onClose }: { opp: Opportunity | null; onClose: () => void }) {
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    setDate(addDays(todayISO(), 1));
    setNote("");
    setErr("");
  }, [opp]);
  if (!opp) return null;
  const quick = [1, 3, 7];
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidISODate(date)) return setErr("Informe uma data válida.");
    if (date < todayISO()) return setErr("Escolha hoje ou uma data futura.");
    actions.reschedule(opp!.id, date, note);
    toast.success("Acompanhamento reagendado.");
    onClose();
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reagendar acompanhamento</DialogTitle>
          <DialogDescription>{opp.contact}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="flex flex-wrap gap-2">
            {quick.map((n) => (
              <Button key={n} type="button" size="sm" variant="secondary" onClick={() => setDate(addDays(todayISO(), n))}>
                +{n} {n === 1 ? "dia" : "dias"}
              </Button>
            ))}
          </div>
          <Field label="Nova data" htmlFor="r-date" error={err}>
            <Input id="r-date" type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Observação" htmlFor="r-note" optional>
            <Input id="r-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: cliente pediu para retornar semana que vem" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Reagendar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LossReasonDialog({ opp, onClose }: { opp: Opportunity | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    setReason("");
    setErr("");
  }, [opp]);
  if (!opp) return null;
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como perdida</DialogTitle>
          <DialogDescription>Registrar o motivo ajuda a identificar padrões nos relatórios.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reason.trim()) return setErr("Informe o motivo da perda.");
            actions.moveStage(opp.id, "perdido", reason);
            toast.success(`${opp.contact} movida para Perdido.`);
            onClose();
          }}
        >
          <Field label="Motivo da perda" htmlFor="l-reason" error={err}>
            <Input id="l-reason" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: preço acima do orçamento" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="destructive">Confirmar perda</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
