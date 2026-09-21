import { PartnerStoreView } from "@/components/parceiros/partner-store-view";
import { PRODUCT_SELECT } from "@/features/parceiros/queries";
import { getPartnerContext } from "@/features/parceiros/context";
import { createClient } from "@/lib/supabase/server";
import type { ProductRow, PublicPartner } from "@/types/domain";

export const metadata = { title: "Prévia da loja" };

export default async function PreviaPage() {
  const { partner, live } = await getPartnerContext();
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("partner_id", partner.id)
    .eq("status", "active")
    .order("is_featured", { ascending: false })
    .limit(24);

  const view: PublicPartner = {
    id: partner.id,
    trade_name: partner.trade_name,
    description: partner.description,
    logo_url: partner.logo_url,
    category: partner.category,
    city: partner.city,
    state: partner.state,
    whatsapp: partner.whatsapp,
    instagram: partner.instagram,
    website: partner.website,
    in_spotlight: false,
  };

  return (
    <>
      <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
        Prévia da sua página pública. {live ? "Sua loja está no ar." : "Sua loja ainda NÃO está visível para a comunidade."} Cliques aqui
        não contam nas métricas.
      </p>
      <div className="-mx-4 rounded-xl border border-border">
        <PartnerStoreView partner={view} products={(data ?? []) as ProductRow[]} preview />
      </div>
    </>
  );
}
