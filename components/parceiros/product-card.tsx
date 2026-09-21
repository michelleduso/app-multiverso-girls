import { ExternalLink, Megaphone, MessageCircle, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RemoteImage } from "@/components/common/remote-image";
import { formatPrice, whatsappDigits } from "@/lib/partners";
import { cn } from "@/lib/utils";
import type { ProductRow, PublicPartner } from "@/types/domain";

/**
 * Card de vitrine. SEMPRE identificado como "Parceiro" ou "Patrocinado" e com
 * visual próprio — nunca pode parecer uma publicação de outra motoqueira.
 * Não é checkout: os botões levam ao site do lojista ou ao WhatsApp.
 */
export function ProductCard({
  product,
  partner,
  sponsored = false,
}: {
  product: ProductRow;
  partner: Pick<PublicPartner, "id" | "trade_name" | "whatsapp"> | undefined;
  sponsored?: boolean;
}) {
  const price = formatPrice(product.price);
  const sale = formatPrice(product.sale_price);
  const hasWhatsapp = whatsappDigits(product.whatsapp ?? partner?.whatsapp).length >= 12;

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card",
        sponsored ? "border-dashed border-amber-400/50 bg-amber-500/[0.04]" : "border-border"
      )}
      aria-label={`${sponsored ? "Patrocinado" : "Parceiro"}: ${product.name}`}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-3 text-[11px] font-semibold uppercase tracking-wide">
        {sponsored ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-amber-300">
            <Megaphone className="size-3" /> Patrocinado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-primary">
            <Star className="size-3" /> Parceiro
          </span>
        )}
        {sale && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">Promoção</span>}
      </div>

      {product.image_url && <RemoteImage src={product.image_url} alt={product.name} className="mt-3 aspect-[4/3] w-full object-cover" />}

      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="text-base font-semibold leading-snug">{product.name}</h3>
        {(price || sale) && (
          <p className="text-lg font-bold">
            {sale ? (
              <>
                {sale} <span className="text-sm font-normal text-muted-foreground line-through">{price}</span>
              </>
            ) : (
              price
            )}
          </p>
        )}
        {product.description && <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>}
        <p className="text-xs text-muted-foreground">
          {partner?.trade_name ?? "Loja parceira"}
          {product.city ? ` · 📍 ${product.city}${product.state ? `/${product.state}` : ""}` : ""}
        </p>

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {product.external_url && (
            <a
              href={`/go/produto/${product.id}`}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={buttonVariants({ size: "sm" })}
            >
              <ExternalLink /> Ver produto
            </a>
          )}
          {hasWhatsapp && (
            <a
              href={`/go/whatsapp-produto/${product.id}`}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              <MessageCircle /> Falar no WhatsApp
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
