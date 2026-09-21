import { createClient } from "@/lib/supabase/server";
import { todayRange } from "@/lib/format";
import { sortRidesForFeed } from "@/lib/rides";
import type { ParticipationStatus, RideRow } from "@/types/domain";

/**
 * Nunca seleciona `ride_private_details` aqui: o feed e as páginas públicas do
 * rolê só carregam a CIDADE. O ponto de encontro é lido em outra consulta,
 * que a RLS só libera para organizadora/participantes confirmadas.
 */
export const RIDE_SELECT =
  "id, organizer_id, group_id, title, description, city, state, starts_at, ride_type, max_participants, image_url, visibility, requires_approval, status, confirmed_count, organizer:profiles!organizer_id(id, display_name, avatar_url)";

export type FeedTab = "hoje" | "proximos" | "cidade" | "meus";
export const FEED_TABS: { value: FeedTab; label: string }[] = [
  { value: "hoje", label: "Pra hoje" },
  { value: "proximos", label: "Próximos" },
  { value: "cidade", label: "Minha cidade" },
  { value: "meus", label: "Meus rolês" },
];

const FEED_LIMIT = 60;
/** rolês que saíram há pouco ainda aparecem (quem está a caminho / chegando). */
const GRACE_MS = 3 * 3_600_000;

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function getFeed(tab: FeedTab, me: { id: string; city: string | null }) {
  const supabase = await createClient();
  const since = new Date(Date.now() - GRACE_MS).toISOString();

  let rides: RideRow[] = [];

  if (tab === "meus") {
    const { data: mine } = await supabase
      .from("ride_participants")
      .select("ride_id")
      .eq("user_id", me.id)
      .in("status", ["pending", "confirmed"]);
    const ids = (mine ?? []).map((p) => p.ride_id as string);
    if (ids.length === 0) return { rides, participation: {} as Record<string, ParticipationStatus> };

    const { data } = await supabase
      .from("rides")
      .select(RIDE_SELECT)
      .in("id", ids)
      .order("starts_at", { ascending: false })
      .limit(FEED_LIMIT);
    const all = (data ?? []) as unknown as RideRow[];
    // próximos primeiro (mais perto → mais longe), depois os já realizados
    const upcoming = all.filter((r) => r.starts_at >= since).reverse();
    const past = all.filter((r) => r.starts_at < since);
    rides = [...upcoming, ...past];
  } else {
    let query = supabase
      .from("rides")
      .select(RIDE_SELECT)
      .eq("status", "open")
      .gte("starts_at", since)
      .order("starts_at", { ascending: true })
      .limit(FEED_LIMIT);

    if (tab === "hoje") {
      const { end } = todayRange();
      query = query.lte("starts_at", end);
    }
    if (tab === "cidade" && me.city) {
      query = query.ilike("city", escapeLike(me.city.trim()));
    }
    const { data } = await query;
    rides = sortRidesForFeed((data ?? []) as unknown as RideRow[], me.city);
  }

  const participation = await getMyParticipation(
    rides.map((r) => r.id),
    me.id
  );
  return { rides, participation };
}

export async function getMyParticipation(rideIds: string[], userId: string) {
  const result: Record<string, ParticipationStatus> = {};
  if (rideIds.length === 0) return result;
  const supabase = await createClient();
  const { data } = await supabase
    .from("ride_participants")
    .select("ride_id, status")
    .eq("user_id", userId)
    .in("ride_id", rideIds);
  for (const row of data ?? []) result[row.ride_id as string] = row.status as ParticipationStatus;
  return result;
}
