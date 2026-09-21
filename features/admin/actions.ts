"use server";

import { revalidatePath } from "next/cache";
import { friendlyError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid, str } from "@/lib/validation";
import type { ActionResult, FormState } from "@/lib/action-result";

/**
 * Toda ação passa por uma RPC `security definer` que revalida `is_admin()` no banco
 * e grava na auditoria — o front nunca é a única barreira.
 */
async function call(name: string, args: Record<string, unknown>): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(name, args);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/admin", "layout");
  revalidatePath("/moderacao", "layout");
  return { ok: true };
}

export async function reviewProfile(userId: string, decision: "approved" | "rejected", reason: string) {
  if (!isUuid(userId)) return { error: "Perfil inválido." };
  return call("admin_review_profile", { p_user: userId, p_decision: decision, p_reason: reason || null });
}

/** Suspender (dias) ou banir uma motoqueira — reaproveita a RPC `moderate` (histórico de moderação). */
export async function moderateProfile(userId: string, action: "suspend_user" | "ban_user", reason: string, days?: number) {
  if (!isUuid(userId)) return { error: "Perfil inválido." };
  return call("moderate", {
    p_report: null,
    p_action: action,
    p_reason: reason,
    p_days: days ?? null,
    p_target_type: "profile",
    p_target_id: userId,
  });
}

export async function moderateRideAdmin(rideId: string, reason: string) {
  if (!isUuid(rideId)) return { error: "Rolê inválido." };
  return call("moderate", {
    p_report: null,
    p_action: "remove_content",
    p_reason: reason,
    p_days: null,
    p_target_type: "ride",
    p_target_id: rideId,
  });
}

export async function moderateGroupAdmin(groupId: string, action: "suspend_group" | "delete_group", reason: string) {
  if (!isUuid(groupId)) return { error: "Grupo inválido." };
  return call("moderate", {
    p_report: null,
    p_action: action,
    p_reason: reason,
    p_days: null,
    p_target_type: "group",
    p_target_id: groupId,
  });
}

export async function reviewPartner(partnerId: string, decision: "approved" | "rejected" | "suspended" | "pending", reason: string) {
  if (!isUuid(partnerId)) return { error: "Parceiro inválido." };
  return call("admin_review_partner", { p_partner: partnerId, p_decision: decision, p_reason: reason || null });
}

export async function setProductStatus(productId: string, status: "paused" | "blocked" | "draft", reason: string) {
  if (!isUuid(productId)) return { error: "Produto inválido." };
  return call("admin_set_product_status", { p_product: productId, p_status: status, p_reason: reason });
}

/** Ativar/alterar plano, vencimento e status. Renovar = novo vencimento + status "active". */
export async function setSubscription(partnerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (!isUuid(partnerId)) return { error: "Parceiro inválido." };
  const plan = str(formData, "plan_id");
  const status = str(formData, "status");
  const startsRaw = str(formData, "starts_at");
  const endsRaw = str(formData, "ends_at");
  const notes = str(formData, "notes");

  if (!["basic", "featured", "premium"].includes(plan)) return { error: "Escolha o plano." };
  if (!["trial", "active", "expired", "suspended"].includes(status)) return { error: "Escolha o status." };
  const starts = startsRaw ? new Date(`${startsRaw}T00:00:00-03:00`) : null;
  const ends = endsRaw ? new Date(`${endsRaw}T23:59:59-03:00`) : null;
  if ((starts && Number.isNaN(starts.getTime())) || (ends && Number.isNaN(ends.getTime()))) return { error: "Datas inválidas." };
  if (notes.length > 1000) return { error: "As observações podem ter até 1000 caracteres." };

  const res = await call("admin_set_subscription", {
    p_partner: partnerId,
    p_plan: plan,
    p_status: status,
    p_starts: starts?.toISOString() ?? null,
    p_ends: ends?.toISOString() ?? null,
    p_notes: notes || null,
  });
  return res.error ? { error: res.error } : { ok: true };
}

export async function setSetting(key: "support_contact" | "sponsored_max", _prev: FormState, formData: FormData): Promise<FormState> {
  let value: unknown;
  if (key === "sponsored_max") {
    value = Number(str(formData, "value"));
    if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 5) return { error: "Use um número de 0 a 5." };
  } else {
    const email = str(formData, "email");
    const whatsapp = str(formData, "whatsapp");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail inválido." };
    value = { email, whatsapp };
  }
  const res = await call("admin_set_setting", { p_key: key, p_value: value });
  return res.error ? { error: res.error } : { ok: true };
}
