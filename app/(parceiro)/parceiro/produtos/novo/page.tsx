import { redirect } from "next/navigation";
import { ProductForm } from "@/components/parceiros/partner-forms";
import { getPartnerContext } from "@/features/parceiros/context";
import { splitStartsAt } from "@/lib/format";

export const metadata = { title: "Novo produto" };

export default async function NovoProdutoPage() {
  const { partner, user, live, plan } = await getPartnerContext();
  if (!plan) redirect("/parceiro/produtos");

  return (
    <>
      <h1 className="text-xl font-bold">Novo produto</h1>
      <ProductForm
        userId={user.id}
        partnerId={partner.id}
        productId={null}
        canPublish={live}
        values={{
          name: "",
          description: "",
          category: partner.category,
          price: "",
          external_url: "",
          whatsapp: "",
          image_url: "",
          status: "draft",
          campaign_start: splitStartsAt(new Date().toISOString()).date,
          campaign_end: "",
        }}
      />
    </>
  );
}
