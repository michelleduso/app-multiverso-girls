"use client";

import { useState, useTransition, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";

/**
 * Ação administrativa com confirmação explícita: primeiro clique abre um mini-formulário
 * (motivo obrigatório + duração, se aplicável); só o segundo clique executa.
 * Serve para toda ação destrutiva/sensível do painel.
 */
export function ReasonAction({
  label,
  confirmLabel,
  variant = "outline",
  size = "sm",
  action,
  askDays = false,
  reasonOptional = false,
  warning,
}: {
  label: string;
  confirmLabel?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  action: (reason: string, days?: number) => Promise<ActionResult | void>;
  askDays?: boolean;
  reasonOptional?: boolean;
  warning?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState(7);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-border bg-background p-3" role="group" aria-label={label}>
      {warning && <p className="text-xs text-destructive">{warning}</p>}
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={reasonOptional ? "Motivo (opcional)" : "Motivo (obrigatório, fica no histórico)"}
        aria-label="Motivo"
        maxLength={500}
        autoFocus
      />
      {askDays && (
        <label className="flex items-center gap-2 text-sm">
          Duração (dias)
          <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-24" />
        </label>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={variant === "outline" ? "default" : variant}
          disabled={pending}
          onClick={() => {
            if (!reasonOptional && reason.trim().length < 3) return setError("Informe o motivo.");
            setError(undefined);
            start(async () => {
              const res = await action(reason.trim(), askDays ? days : undefined);
              if (res?.error) setError(res.error);
              else {
                setOpen(false);
                setReason("");
              }
            });
          }}
        >
          {pending ? "Aplicando..." : (confirmLabel ?? `Confirmar: ${label}`)}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
