import { notFound } from "next/navigation";
import { ProductForm } from "@/components/parceiros/partner-forms";
import { DeleteProductButton } from "@/components/parceiros/delete-product-button";
import { getPartnerContext } from "@/features/parceiros/context";
import { PRODUCT_SELECT } from "@/features/parceiros/queries";
import { splitStartsAt } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { ProductRow } from "@/types/domain";

export const metadata = { title: "Editar produto" };

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const { partner, user, live } = await getPartnerContext();
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", id).eq("partner_id", partner.id).maybeSingle();
  if (!data) notFound();
  const p = data as ProductRow;

  return (
    <>
      <h1 className="text-xl font-bold">Editar produto</h1>
      {p.status === "blocked" ? (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          Este produto foi bloqueado pela moderação e não pode ser editado. Fale com a equipe.
        </p>
      ) : (
        <ProductForm
          userId={user.id}
          partnerId={partner.id}
          productId={p.id}
          canPublish={live}
          values={{
            name: p.name,
            description: p.description ?? "",
            category: p.category,
            price: p.price != null ? String(p.price).replace(".", ",") : "",
            external_url: p.external_url ?? "",
            whatsapp: p.whatsapp ?? "",
            image_url: p.image_url ?? "",
            status: p.status as "draft" | "active" | "paused",
            campaign_start: splitStartsAt(p.campaign_start).date,
            campaign_end: p.campaign_end ? splitStartsAt(p.campaign_end).date : "",
          }}
        />
      )}
      <div className="border-t border-border pt-4">
        <DeleteProductButton productId={p.id} />
      </div>
    </>
  );
}
