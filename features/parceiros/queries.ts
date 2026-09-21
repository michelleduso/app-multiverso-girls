import { createClient } from "@/lib/supabase/server";
import { cityKey } from "@/lib/format";
import type { ProductRow, PublicPartner } from "@/types/domain";

export const PRODUCT_SELECT =
  "id, partner_id, name, description, category, price, sale_price, image_url, external_url, whatsapp, city, state, status, is_featured, campaign_start, campaign_end, created_at";
export const PARTNER_PUBLIC_SELECT =
  "id, trade_name, description, logo_url, category, city, state, whatsapp, instagram, website, in_spotlight";

function shuffle<T>(items: T[]) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Só lojas no ar (a view já filtra: aprovada + plano em vigor). */
export async function getPartnersByIds(ids: string[]) {
  const map = new Map<string, PublicPartner>();
  if (ids.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase.from("public_partners").select(PARTNER_PUBLIC_SELECT).in("id", [...new Set(ids)]);
  for (const p of (data ?? []) as PublicPartner[]) map.set(p.id, p);
  return map;
}

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T | undefined) ?? fallback;
}

export async function getSupportContact() {
  return getSetting<{ email?: string; whatsapp?: string }>("support_contact", {});
}

/**
 * Cards patrocinados do feed: poucos (limite configurável, padrão 2), só produtos
 * marcados como destaque de parceiros no ar; prioriza a cidade da usuária e sorteia
 * entre os candidatos para dar chance igual às lojas.
 */
export async function getSponsoredProducts(userCity: string | null) {
  const max = Math.min(Math.max(Number(await getSetting<number>("sponsored_max", 2)) || 0, 0), 5);
  if (max === 0) return { products: [] as ProductRow[], partners: new Map<string, PublicPartner>() };

  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("is_featured", true).limit(30);
  const all = (data ?? []) as ProductRow[];
  const mine = cityKey(userCity);
  const local = all.filter((p) => mine && cityKey(p.city) === mine);
  const picked = [...shuffle(local), ...shuffle(all.filter((p) => !local.includes(p)))].slice(0, max);
  return { products: picked, partners: await getPartnersByIds(picked.map((p) => p.partner_id)) };
}

/** "Parceiros em destaque": só planos com spotlight. */
export async function getSpotlightPartners(userCity: string | null, limit = 6) {
  const supabase = await createClient();
  const { data } = await supabase.from("public_partners").select(PARTNER_PUBLIC_SELECT).eq("in_spotlight", true).limit(30);
  const all = (data ?? []) as PublicPartner[];
  const mine = cityKey(userCity);
  const local = all.filter((p) => mine && cityKey(p.city) === mine);
  return [...shuffle(local), ...shuffle(all.filter((p) => !local.includes(p)))].slice(0, limit);
}
