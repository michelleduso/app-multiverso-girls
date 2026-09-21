"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/common/submit-button";
import { setSubscription } from "@/features/admin/actions";
import type { PlanRow } from "@/types/domain";

function plusDays(base: string, days: number) {
  const d = base ? new Date(`${base}T12:00:00-03:00`) : new Date();
  d.setDate(d.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

/** Ativar / alterar plano / definir vencimento / suspender / renovar — pagamento é externo. */
export function SubscriptionForm({
  partnerId,
  plans,
  initial,
}: {
  partnerId: string;
  plans: PlanRow[];
  initial: { plan_id: string; status: string; starts_at: string; ends_at: string; notes: string };
}) {
  const [state, formAction] = useActionState(setSubscription.bind(null, partnerId), undefined);
  const [status, setStatus] = useState(initial.status);
  const [ends, setEnds] = useState(initial.ends_at);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="plan_id">Plano</Label>
          <Select id="plan_id" name="plan_id" defaultValue={initial.plan_id}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (até {p.max_products} produtos)
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="trial">Teste (trial)</option>
            <option value="active">Ativo</option>
            <option value="expired">Vencido</option>
            <option value="suspended">Suspenso</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="starts_at">Início</Label>
          <Input id="starts_at" name="starts_at" type="date" defaultValue={initial.starts_at} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ends_at">Vencimento</Label>
          <Input id="ends_at" name="ends_at" type="date" value={ends} onChange={(e) => setEnds(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Renovar:</span>
        {[30, 90, 365].map((d) => (
          <Button
            key={d}
            type="button"
            size="xs"
            variant="outline"
            onClick={() => {
              const today = plusDays("", 0);
              // renova a partir do vencimento atual, se ainda estiver no futuro
              const base = ends && ends > today ? ends : today;
              setEnds(plusDays(base, d));
              setStatus("active");
            }}
          >
            +{d} dias
          </Button>
        ))}
        <span className="text-xs text-muted-foreground">(ajusta o vencimento e marca como Ativo; depois clique em Salvar)</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Observações administrativas (internas)</Label>
        <Textarea id="notes" name="notes" maxLength={1000} defaultValue={initial.notes} placeholder="Ex.: pago via PIX em 10/10, 3 meses" />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-emerald-300">
          ✓ Plano atualizado.
        </p>
      )}
      <SubmitButton className="w-fit">Salvar plano</SubmitButton>
    </form>
  );
}
