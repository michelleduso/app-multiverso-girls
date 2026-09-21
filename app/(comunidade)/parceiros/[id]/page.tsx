import { notFound } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { PartnerStoreView } from "@/components/parceiros/partner-store-view";
import { ImpressionTracker, StoreViewTracker } from "@/components/parceiros/trackers";
import { PARTNER_PUBLIC_SELECT, PRODUCT_SELECT } from "@/features/parceiros/queries";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { ProductRow, PublicPartner } from "@/types/domain";

export default async function LojaParceiraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  await requireMember();
  const supabase = await createClient();

  // a view só devolve lojas aprovadas com plano em vigor; a RLS de products, só produtos no ar
  const { data } = await supabase.from("public_partners").select(PARTNER_PUBLIC_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const partner = data as PublicPartner;

  const { data: prods } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("partner_id", id)
    .order("is_featured", { ascending: false })
    .order("campaign_start", { ascending: false })
    .limit(24);
  const products = (prods ?? []) as ProductRow[];

  return (
    <>
      <PageHeader title={partner.trade_name} back="/parceiros" />
      <PartnerStoreView partner={partner} products={products} />
      <StoreViewTracker partnerId={id} />
      <ImpressionTracker productIds={products.map((p) => p.id)} />
    </>
  );
}
