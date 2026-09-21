"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/common/submit-button";
import { saveMeetingPoint } from "@/features/roles/actions";

/** Organizadora define/edita o ponto de encontro (visível só às confirmadas). */
export function MeetingPointForm({ rideId, current }: { rideId: string; current: string }) {
  const [state, formAction] = useActionState(saveMeetingPoint.bind(null, rideId), undefined);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Label htmlFor="meeting_point" className="flex items-center gap-1">
        <Lock className="size-3.5" /> Ponto de encontro
      </Label>
      <Input
        id="meeting_point"
        name="meeting_point"
        maxLength={300}
        defaultValue={current}
        placeholder="Posto X — 08h"
      />
      <p className="text-xs text-muted-foreground">
        Só você e as participantes confirmadas veem este campo. Nunca use endereço residencial.
        Deixe em branco para remover.
      </p>
      {state?.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
      <SubmitButton size="sm" className="w-fit">
        Salvar ponto de encontro
      </SubmitButton>
    </form>
  );
}
