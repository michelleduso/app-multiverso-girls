import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { RemoteImage } from "@/components/common/remote-image";
import { getPartnerContext } from "@/features/parceiros/context";
import { PRODUCT_SELECT } from "@/features/parceiros/queries";
import { categoriaParceiro, STATUS_PRODUTO } from "@/lib/constants/parceiros";
import { formatPrice } from "@/lib/partners";
import { createClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/types/domain";

export const metadata = { title: "Produtos" };

export default async function ProdutosPage() {
  const { partner, plan, live } = await getPartnerContext();
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("partner_id", partner.id).order("created_at", { ascending: false });
  const products = (data ?? []) as ProductRow[];
  const atLimit = plan ? products.length >= plan.max_products : true;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            {products.length}
            {plan ? ` de ${plan.max_products}` : ""} produtos cadastrados.
          </p>
        </div>
        {atLimit ? (
          <span className="text-xs text-muted-foreground">{plan ? "Limite do plano atingido" : "Aguardando ativação do plano"}</span>
        ) : (
          <Link href="/parceiro/produtos/novo" className={buttonVariants()}>
            <Plus /> Novo produto
          </Link>
        )}
      </div>

      {!live && products.some((p) => p.status === "active") && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-100">
          Seus produtos ativos estão fora do ar porque a loja ou o plano não está ativo. Nada foi apagado.
        </p>
      )}

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Você ainda não cadastrou produtos. Lembre: aqui é vitrine — sem carrinho nem pagamento.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {products.map((p) => (
            <li key={p.id}>
              <Link href={`/parceiro/produtos/${p.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-muted/40">
                {p.image_url ? (
                  <RemoteImage src={p.image_url} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted">🛍️</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoriaParceiro(p.category)}
                    {formatPrice(p.sale_price ?? p.price) ? ` · ${formatPrice(p.sale_price ?? p.price)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant={p.status === "active" ? "default" : p.status === "blocked" ? "destructive" : "secondary"}>
                    {STATUS_PRODUTO[p.status]}
                  </Badge>
                  {p.is_featured && <span className="text-[11px] text-amber-300">⭐ destaque</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
