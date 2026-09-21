import Link from "next/link";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RemoteImage } from "@/components/common/remote-image";
import { RideStateBadge } from "@/components/rides/ride-state-badge";
import { JoinButton } from "@/components/rides/join-button";
import { tipoDeRole } from "@/lib/constants/comunidade";
import { formatDay, formatHour } from "@/lib/format";
import { getRideState } from "@/lib/rides";
import { cn } from "@/lib/utils";
import type { ParticipationStatus, RideRow } from "@/types/domain";

/**
 * Card do feed. Mostra somente a CIDADE de saída — nunca endereço ou ponto de
 * encontro (esses dados nem são carregados nas consultas do feed).
 */
export function RideCard({
  ride,
  userId,
  participation,
}: {
  ride: RideRow;
  userId: string;
  participation: ParticipationStatus | null;
}) {
  const state = getRideState(ride);
  const tipo = tipoDeRole(ride.ride_type);
  const inactive = state === "encerrado" || state === "cancelado";
  const confirmed = ride.confirmed_count;

  return (
    <Card className={cn("gap-0 overflow-hidden py-0", inactive && "opacity-70")}>
      {ride.image_url && (
        <RemoteImage src={ride.image_url} className="aspect-[16/7] w-full object-cover" />
      )}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {tipo.emoji} {tipo.label}
            {ride.visibility === "private" && (
              <span className="ml-2 inline-flex items-center gap-0.5">
                <Lock className="size-3" /> Privado
              </span>
            )}
          </span>
          <RideStateBadge state={state} />
        </div>

        <div className="flex flex-col gap-1">
          <Link
            href={`/roles/${ride.id}`}
            className={cn("text-lg font-semibold leading-snug hover:underline", state === "cancelado" && "line-through")}
          >
            🏍️ {ride.title}
          </Link>
          <p className="text-sm text-muted-foreground">
            📍 {ride.city}/{ride.state}
          </p>
          <p className="text-sm text-muted-foreground">
            🕗 {formatDay(ride.starts_at)} · Saída {formatHour(ride.starts_at)}
          </p>
        </div>

        {ride.description && (
          <p className="line-clamp-3 text-sm italic text-foreground/80">“{ride.description}”</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            👩 {confirmed} {confirmed === 1 ? "confirmada" : "confirmadas"}
            {ride.max_participants ? (
              <span className="text-muted-foreground"> · limite {ride.max_participants}</span>
            ) : null}
          </p>
          <JoinButton
            rideId={ride.id}
            state={state}
            isOrganizer={ride.organizer_id === userId}
            participation={participation}
            requiresApproval={ride.requires_approval}
          />
        </div>
      </div>
    </Card>
  );
}
