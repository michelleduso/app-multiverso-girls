"use server";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

/** Métricas anônimas: o banco guarda só tipo/loja/produto/hora — nenhum id de usuária. */
export async function trackImpressions(productIds: string[]) {
  const ids = productIds.filter(isUuid).slice(0, 50);
  if (ids.length === 0) return;
  const supabase = await createClient();
  await supabase.rpc("track_impressions", { p_products: ids });
}

export async function trackStoreView(partnerId: string) {
  if (!isUuid(partnerId)) return;
  const supabase = await createClient();
  await supabase.rpc("track_commercial_event", { p_kind: "store_view", p_partner: partnerId, p_product: null });
}
