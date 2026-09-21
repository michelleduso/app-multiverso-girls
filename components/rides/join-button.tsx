"use client";

import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/common/action-button";
import { joinRide, leaveRide } from "@/features/roles/actions";
import type { RideState } from "@/lib/rides";
import type { ParticipationStatus } from "@/types/domain";

/** "Eu topo!" e os demais estados da participação da usuária logada. */
export function JoinButton({
  rideId,
  state,
  isOrganizer,
  participation,
  requiresApproval,
}: {
  rideId: string;
  state: RideState;
  isOrganizer: boolean;
  participation: ParticipationStatus | null;
  requiresApproval: boolean;
}) {
  if (isOrganizer) {
    return (
      <Button variant="secondary" size="lg" disabled>
        Você organiza
      </Button>
    );
  }

  if (participation === "confirmed") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-300">
          <Check className="size-4" /> Confirmada
        </span>
        {state === "aberto" || state === "lotado" ? (
          <ActionButton
            action={leaveRide.bind(null, rideId)}
            variant="ghost"
            size="sm"
            confirmMessage="Sair deste rolê?"
            pendingLabel="Saindo..."
          >
            Sair
          </ActionButton>
        ) : null}
      </div>
    );
  }

  if (participation === "pending") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-sm text-amber-300">
          <Clock className="size-4" /> Aguardando aprovação
        </span>
        <ActionButton action={leaveRide.bind(null, rideId)} variant="ghost" size="sm" pendingLabel="Cancelando...">
          Cancelar pedido
        </ActionButton>
      </div>
    );
  }

  if (participation === "declined" || participation === "removed") {
    return (
      <Button variant="secondary" size="lg" disabled>
        Indisponível
      </Button>
    );
  }

  if (state !== "aberto") {
    return (
      <Button variant="secondary" size="lg" disabled>
        {state === "lotado" ? "Lotado" : state === "cancelado" ? "Cancelado" : "Encerrado"}
      </Button>
    );
  }

  return (
    <ActionButton action={joinRide.bind(null, rideId)} size="lg" pendingLabel="Enviando...">
      {requiresApproval ? "Pedir para participar" : "Eu topo!"}
    </ActionButton>
  );
}
