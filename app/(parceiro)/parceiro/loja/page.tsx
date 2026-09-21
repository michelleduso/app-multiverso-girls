import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StoreForm } from "@/components/parceiros/partner-forms";
import { getPartnerContext } from "@/features/parceiros/context";

export const metadata = { title: "Minha loja" };

export default async function MinhaLojaPage() {
  const { partner, user } = await getPartnerContext();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Minha loja</h1>
        <Link href="/parceiro/previa" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Ver como aparece
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        E-mail de acesso: <strong>{partner.email}</strong>. Estes dados (exceto razão social, CNPJ, telefone e responsável) aparecem na
        página pública da loja.
      </p>
      <StoreForm
        userId={user.id}
        logoUrl={partner.logo_url ?? ""}
        locked={partner.status === "suspended"}
        values={{
          legal_name: partner.legal_name,
          trade_name: partner.trade_name,
          cnpj: partner.cnpj ?? "",
          responsible: partner.responsible,
          phone: partner.phone ?? "",
          whatsapp: partner.whatsapp ?? "",
          instagram: partner.instagram ?? "",
          website: partner.website ?? "",
          city: partner.city,
          state: partner.state,
          description: partner.description ?? "",
          category: partner.category,
        }}
      />
    </>
  );
}
