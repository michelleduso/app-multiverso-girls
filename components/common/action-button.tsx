"use client";

import { useState, useTransition, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

/**
 * Botão que dispara uma Server Action já "bindada" com seus argumentos
 * (ex.: `action={joinRide.bind(null, id)}`), com confirmação opcional e erro inline.
 */
export function ActionButton({
  action,
  confirmMessage,
  pendingLabel,
  children,
  onDone,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick"> & {
  action: () => Promise<ActionResult | void>;
  confirmMessage?: string;
  pendingLabel?: string;
  onDone?: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <>
      <Button
        type="button"
        disabled={pending || props.disabled}
        onClick={() => {
          if (confirmMessage && !window.confirm(confirmMessage)) return;
          setError(undefined);
          start(async () => {
            const result = await action();
            if (result?.error) setError(result.error);
            else onDone?.();
          });
        }}
        {...props}
      >
        {pending && pendingLabel ? pendingLabel : children}
      </Button>
      {error && (
        <p role="alert" className="basis-full text-xs text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
