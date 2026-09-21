import { cityKey } from "@/lib/format";
import type { RideRow } from "@/types/domain";

/** Limite inferior para listar rolês "atuais": saiu há até 3h ainda conta. */
export function upcomingSince() {
  return new Date(Date.now() - 3 * 3_600_000).toISOString();
}

export type RideState = "aberto" | "lotado" | "encerrado" | "cancelado";

export function isRideFull(ride: Pick<RideRow, "max_participants" | "confirmed_count">) {
  return ride.max_participants != null && ride.confirmed_count >= ride.max_participants;
}

/** Estado visual: cancelado > encerrado (manual ou já passou) > lotado > aberto. */
export function getRideState(ride: RideRow, now = Date.now()): RideState {
  if (ride.status === "cancelled") return "cancelado";
  // dá 3h de tolerância depois da saída antes de considerar "encerrado" automaticamente
  if (ride.status === "closed" || new Date(ride.starts_at).getTime() < now - 3 * 3_600_000) {
    return "encerrado";
  }
  if (isRideFull(ride)) return "lotado";
  return "aberto";
}

export const RIDE_STATE_LABEL: Record<RideState, string> = {
  aberto: "Aberto",
  lotado: "Lotado",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

/**
 * Ordenação do feed: 1) mesma cidade da usuária, 2) data mais próxima.
 * Estável para rolês da mesma cidade/mesmo horário.
 */
export function sortRidesForFeed(rides: RideRow[], userCity: string | null | undefined) {
  const mine = cityKey(userCity);
  return [...rides].sort((a, b) => {
    const aMine = mine && cityKey(a.city) === mine ? 0 : 1;
    const bMine = mine && cityKey(b.city) === mine ? 0 : 1;
    if (aMine !== bMine) return aMine - bMine;
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  });
}
