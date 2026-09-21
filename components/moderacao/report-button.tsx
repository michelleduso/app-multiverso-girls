"use client";

import { useActionState, useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/common/submit-button";
import { createReport } from "@/features/moderacao/actions";
import { MOTIVOS_DE_DENUNCIA } from "@/lib/constants/comunidade";

type Target = "profile" | "message" | "group" | "ride" | "behavior";

/** Botão "Denunciar" com formulário inline (motivo + descrição opcional). */
export function ReportButton({
  targetType,
  targetId,
  label = "Denunciar",
  compact = false,
}: {
  targetType: Target;
  targetId: string;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createReport, undefined);

  if (state?.ok) {
    return (
      <p role="status" className="text-xs text-muted-foreground">
        Denúncia enviada. Nossa equipe de moderação vai analisar. Obrigada por cuidar da comunidade 💜
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="ghost"
        size={compact ? "xs" : "sm"}
        className="w-fit text-muted-foreground"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <Flag /> {label}
      </Button>
      {open && (
        <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
          <input type="hidden" name="target_type" value={targetType} />
          <input type="hidden" name="target_id" value={targetId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`reason-${targetId}`}>Motivo</Label>
            <Select id={`reason-${targetId}`} name="reason" required defaultValue="">
              <option value="" disabled>
                Escolha um motivo
              </option>
              {MOTIVOS_DE_DENUNCIA.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`desc-${targetId}`}>Detalhes (opcional)</Label>
            <Textarea id={`desc-${targetId}`} name="description" maxLength={1000} placeholder="Conte o que aconteceu" />
          </div>
          {state?.error && (
            <p role="alert" className="text-xs text-destructive">
              {state.error}
            </p>
          )}
          <div className="flex gap-2">
            <SubmitButton size="sm" pendingLabel="Enviando...">
              Enviar denúncia
            </SubmitButton>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
