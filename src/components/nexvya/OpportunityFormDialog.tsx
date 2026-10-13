import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { validate, type FieldErrors } from "@/lib/nexvya/ops";
import { actions } from "@/lib/nexvya/store";
import { emptyInput, isClosed, STAGES, type Opportunity, type OpportunityInput } from "@/lib/nexvya/types";
import { Field, NativeSelect } from "./common";

export function OpportunityFormDialog({
  open,
  onOpenChange,
  opportunity,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opportunity?: Opportunity;
  onSaved?: (o: Opportunity | undefined) => void;
}) {
  const [v, setV] = useState<OpportunityInput>(emptyInput());
  const [valueText, setValueText] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) return;
    const base = opportunity ? { ...opportunity } : emptyInput();
    setV(base);
    setValueText(base.value === null ? "" : String(base.value));
    setErrors({});
  }, [open, opportunity]);

  const up = <K extends keyof OpportunityInput>(k: K, val: OpportunityInput[K]) => setV((s) => ({ ...s, [k]: val }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = valueText.trim().replace(/\./g, "").replace(",", ".");
    const value = raw === "" ? null : Number(raw);
    const input = { ...v, value: value === null || Number.isNaN(value) ? (raw === "" ? null : NaN) : value };
    const errs = validate(input);
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Revise os campos destacados.");
      return;
    }
    if (opportunity) {
      actions.update(opportunity.id, input);
      toast.success("Oportunidade atualizada.");
      onSaved?.(undefined);
    } else {
      const o = actions.create(input);
      toast.success("Oportunidade cadastrada.");
      onSaved?.(o);
    }
    onOpenChange(false);
  }

  const closed = isClosed(v.stage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{opportunity ? "Editar oportunidade" : "Nova oportunidade"}</DialogTitle>
          <DialogDescription>Só o nome e o produto são obrigatórios. Você pode completar o resto depois.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contato" htmlFor="f-contact" error={errors.contact}>
              <Input id="f-contact" value={v.contact} onChange={(e) => up("contact", e.target.value)} placeholder="Ex.: Maria Silva" autoFocus />
            </Field>
            <Field label="Empresa" htmlFor="f-company" optional>
              <Input id="f-company" value={v.company} onChange={(e) => up("company", e.target.value)} />
            </Field>
            <Field label="Produto ou serviço" htmlFor="f-product" error={errors.product}>
              <Input id="f-product" value={v.product} onChange={(e) => up("product", e.target.value)} placeholder="Ex.: Consultoria" />
            </Field>
            <Field label="Valor estimado (R$)" htmlFor="f-value" error={errors.value} optional>
              <Input id="f-value" inputMode="decimal" value={valueText} onChange={(e) => setValueText(e.target.value)} placeholder="Ex.: 2500" />
            </Field>
            <Field label="Etapa" htmlFor="f-stage" hint={STAGES.find((s) => s.id === v.stage)?.hint}>
              <NativeSelect id="f-stage" value={v.stage} onChange={(e) => up("stage", e.target.value as OpportunityInput["stage"])}>
                {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Último contato" htmlFor="f-last" error={errors.lastContact} optional>
              <Input id="f-last" type="date" value={v.lastContact ?? ""} onChange={(e) => up("lastContact", e.target.value || null)} />
            </Field>
          </div>
          {v.stage === "perdido" && (
            <Field label="Motivo da perda" htmlFor="f-loss" error={errors.lossReason}>
              <Input id="f-loss" value={v.lossReason} onChange={(e) => up("lossReason", e.target.value)} placeholder="Ex.: escolheu outro fornecedor" />
            </Field>
          )}
          {!closed && (
            <div className="grid gap-4 rounded-lg bg-muted/60 p-4 sm:grid-cols-2">
              <Field label="Próximo acompanhamento" htmlFor="f-next" error={errors.nextFollowUp} optional>
                <Input id="f-next" type="date" value={v.nextFollowUp ?? ""} onChange={(e) => up("nextFollowUp", e.target.value || null)} />
              </Field>
              <Field label="Próxima ação" htmlFor="f-action" error={errors.nextAction} optional={!v.nextFollowUp}>
                <Input id="f-action" value={v.nextAction} onChange={(e) => up("nextAction", e.target.value)} placeholder="Ex.: enviar proposta" />
              </Field>
            </div>
          )}
          <Field label="Observações" htmlFor="f-notes" error={errors.notes} hint="Não registre dados confidenciais, como senhas ou documentos." optional>
            <Textarea id="f-notes" rows={3} value={v.notes} onChange={(e) => up("notes", e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{opportunity ? "Salvar alterações" : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
