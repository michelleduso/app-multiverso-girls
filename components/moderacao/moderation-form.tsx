"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/common/submit-button";
import { moderateReport } from "@/features/moderacao/actions";
import { ACOES_DE_MODERACAO } from "@/lib/constants/comunidade";

export function ModerationForm({ reportId, actions }: { reportId: string; actions: (keyof typeof ACOES_DE_MODERACAO)[] }) {
  const [state, formAction] = useActionState(moderateReport.bind(null, reportId), undefined);
  const [action, setAction] = useState<string>(actions[0]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="action">Ação</Label>
        <Select id="action" name="action" value={action} onChange={(e) => setAction(e.target.value)}>
          {actions.map((a) => (
            <option key={a} value={a}>
              {ACOES_DE_MODERACAO[a]}
            </option>
          ))}
        </Select>
      </div>
      {action === "suspend_user" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="days">Duração (dias)</Label>
          <Input id="days" name="days" type="number" min={1} max={365} defaultValue={7} required />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reason">Motivo (registrado no histórico)</Label>
        <Textarea id="reason" name="reason" required minLength={3} maxLength={500} placeholder="Descreva o motivo da decisão" />
      </div>
      {(action === "ban_user" || action === "delete_group") && (
        <p className="text-xs text-destructive">Ação severa: confirme que a decisão está de acordo com as regras da comunidade.</p>
      )}
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <SubmitButton variant={action === "ban_user" || action === "delete_group" ? "destructive" : "default"} className="w-fit">
        Aplicar ação
      </SubmitButton>
    </form>
  );
}
