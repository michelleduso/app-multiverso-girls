import type { SubscriptionRow } from "@/types/domain";

export type SubscriptionState = "none" | "scheduled" | "trial" | "active" | "expired" | "suspended";

/**
 * Estado efetivo da assinatura (espelha `partner_plan_in_force` no banco):
 * "active/trial" só vale se já começou e não venceu.
 */
export function subscriptionState(sub: SubscriptionRow | null | undefined, now = Date.now()): {
  state: SubscriptionState;
  inForce: boolean;
} {
  if (!sub) return { state: "none", inForce: false };
  if (sub.status === "suspended") return { state: "suspended", inForce: false };
  if (sub.status === "expired") return { state: "expired", inForce: false };
  if (new Date(sub.starts_at).getTime() > now) return { state: "scheduled", inForce: false };
  if (sub.ends_at && new Date(sub.ends_at).getTime() <= now) return { state: "expired", inForce: false };
  return { state: sub.status, inForce: true };
}

export function daysUntil(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - now) / 86_400_000);
}

export function formatPrice(value: number | string | null | undefined) {
  if (value == null || value === "") return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

/** Só dígitos; assume DDI 55 quando vier com 10–11 dígitos. */
export function whatsappDigits(raw: string | null | undefined) {
  const d = (raw ?? "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

export function whatsappLink(number: string | null | undefined, message: string) {
  const d = whatsappDigits(number);
  if (d.length < 12) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}

/** Aceita apenas http(s); qualquer outra coisa (javascript:, data:...) vira null. */
export function safeHttpUrl(raw: string | null | undefined) {
  const value = (raw ?? "").trim();
  if (!value) return null;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export const APP_NAME = "Multiverso Girls";
