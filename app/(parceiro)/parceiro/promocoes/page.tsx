import { Card } from "@/components/ui/card";
import { PromotionForm } from "@/components/parceiros/partner-forms";
import { getPartnerContext } from "@/features/parceiros/context";
import { PRODUCT_SELECT } from "@/features/parceiros/queries";
import { splitStartsAt } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/types/domain";

export const metadata = { title: "Promoções" };

export default async function PromocoesPage() {
  const { partner, plan } = await getPartnerContext();
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("partner_id", partner.id)
    .neq("status", "blocked")
    .order("created_at", { ascending: false });
  const products = (data ?? []) as ProductRow[];

  const canPromote = Boolean(plan?.can_promote);
  const canFeature = Boolean(plan?.can_feature);

  return (
    <>
      <h1 className="text-xl font-bold">Promoções</h1>
      <p className="text-sm text-muted-foreground">
        Defina preço promocional, fim da campanha e destaque para produtos já cadastrados. Não há cálculo de frete nem checkout: o cliente
        fecha direto com você.
      </p>
      {!canPromote && (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          {plan
            ? `Promoções e destaques não estão incluídos no ${plan.name}. Fale com a equipe para conhecer o Parceiro Destaque.`
            : "Ative um plano para usar promoções."}
        </p>
      )}
      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Cadastre um produto primeiro.
        </p>
      ) : (
        products.map((p) => (
          <Card key={p.id} className="gap-3 p-4">
            <p className="font-medium">
              {p.name} {p.sale_price != null && <span className="text-xs text-emerald-300">· em promoção</span>}
            </p>
            <PromotionForm
              productId={p.id}
              salePrice={p.sale_price != null ? String(p.sale_price).replace(".", ",") : ""}
              campaignEnd={p.campaign_end ? splitStartsAt(p.campaign_end).date : ""}
              featured={p.is_featured}
              canPromote={canPromote}
              canFeature={canFeature}
            />
          </Card>
        ))
      )}
    </>
  );
}
