import { cache } from "react";
import { requirePartner } from "@/lib/auth";
import { subscriptionState } from "@/lib/partners";
import { createClient } from "@/lib/supabase/server";
import { getSupportContact } from "@/features/parceiros/queries";
import type { PartnerRow, PlanRow, SubscriptionRow } from "@/types/domain";

/** Loja + assinatura + plano do parceiro logado (uma consulta por requisição). */
export const getPartnerContext = cache(async () => {
  const me = await requirePartner();
  const supabase = await createClient();

  const { data: partner } = await supabase.from("partners").select("*").eq("owner_id", me.id).single();
  const p = partner as PartnerRow;

  const [{ data: sub }, { data: plans }, support] = await Promise.all([
    supabase.from("partner_subscriptions").select("partner_id, plan_id, status, starts_at, ends_at").eq("partner_id", p.id).maybeSingle(),
    supabase.from("plans").select("*").order("sort"),
    getSupportContact(),
  ]);

  const subscription = (sub as SubscriptionRow | null) ?? null;
  const allPlans = (plans ?? []) as PlanRow[];
  const plan = allPlans.find((x) => x.id === subscription?.plan_id) ?? null;
  const state = subscriptionState(subscription);
  // "publicável" = aprovado + plano em vigor (mesma regra do banco: partner_is_live)
  const live = p.status === "approved" && state.inForce;

  return { user: me, partner: p, subscription, plan, plans: allPlans, planState: state.state, live, support };
});
