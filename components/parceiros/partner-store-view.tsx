import { Globe, AtSign, MapPin, MessageCircle, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RemoteImage } from "@/components/common/remote-image";
import { ProductCard } from "@/components/parceiros/product-card";
import { categoriaParceiro } from "@/lib/constants/parceiros";
import { APP_NAME, safeHttpUrl, whatsappDigits, whatsappLink } from "@/lib/partners";
import type { ProductRow, PublicPartner } from "@/types/domain";

/**
 * Página pública da loja — usada pelas motoqueiras (links rastreados por /go) e
 * pela prévia do próprio lojista (links diretos, sem contar métrica).
 */
export function PartnerStoreView({
  partner,
  products,
  preview = false,
}: {
  partner: PublicPartner;
  products: ProductRow[];
  preview?: boolean;
}) {
  const hasWhatsapp = whatsappDigits(partner.whatsapp).length >= 12;
  const site = safeHttpUrl(partner.website);
  const waHref = preview
    ? whatsappLink(partner.whatsapp, `Olá! Vi a loja ${partner.trade_name} através do ${APP_NAME} e gostaria de mais informações.`)
    : `/go/whatsapp-loja/${partner.id}`;
  const siteHref = preview ? site : `/go/site/${partner.id}`;
  const linkProps = { target: "_blank", rel: "noopener noreferrer sponsored" } as const;

  return (
    <div className="flex flex-col gap-5 p-4">
      <section className="flex flex-col items-center gap-2 text-center">
        {partner.logo_url ? (
          <RemoteImage src={partner.logo_url} alt={`Logo ${partner.trade_name}`} className="size-24 rounded-2xl border border-border object-cover" />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-2xl bg-muted text-3xl font-bold">
            {partner.trade_name[0]?.toUpperCase()}
          </div>
        )}
        <h2 className="text-2xl font-bold leading-tight">{partner.trade_name}</h2>
        <p className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
          <Star className="size-3" /> Parceiro {APP_NAME}
        </p>
        <p className="text-xs text-muted-foreground">{categoriaParceiro(partner.category)}</p>
        {partner.description && <p className="text-sm text-foreground/85">{partner.description}</p>}
        <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-4" /> {partner.city}/{partner.state}
        </p>
      </section>

      <section className="flex flex-wrap justify-center gap-2">
        {hasWhatsapp && waHref && (
          <a href={waHref} {...linkProps} className={buttonVariants({ size: "lg" })}>
            <MessageCircle /> WhatsApp
          </a>
        )}
        {partner.instagram && (
          <a
            href={`https://instagram.com/${partner.instagram}`}
            {...linkProps}
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            <AtSign /> Instagram
          </a>
        )}
        {site && siteHref && (
          <a href={siteHref} {...linkProps} className={buttonVariants({ size: "lg", variant: "outline" })}>
            <Globe /> Site
          </a>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Produtos e promoções</h3>
        {products.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Esta loja ainda não publicou produtos.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} partner={partner} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
