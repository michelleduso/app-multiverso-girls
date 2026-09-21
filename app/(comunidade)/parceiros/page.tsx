import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { ImpressionTracker } from "@/components/parceiros/trackers";
import { ProductCard } from "@/components/parceiros/product-card";
import { Pagination, parsePage } from "@/components/common/pagination";
import { RemoteImage } from "@/components/common/remote-image";
import { getPartnersByIds, PARTNER_PUBLIC_SELECT, PRODUCT_SELECT } from "@/features/parceiros/queries";
import { requireMember } from "@/lib/auth";
import { CATEGORIAS_PARCEIRO, categoriaParceiro } from "@/lib/constants/parceiros";
import { daysFromNow } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ProductRow, PublicPartner } from "@/types/domain";

export const metadata = { title: "Parceiros" };

const PAGE_SIZE = 12;

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

type Search = { ver?: string; cidade?: string; cat?: string; promo?: string; novo?: string; pagina?: string };

export default async function ParceirosPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const me = await requireMember();
  const supabase = await createClient();

  const lojas = sp.ver === "lojas";
  const cat = CATEGORIAS_PARCEIRO.find((c) => c.value === sp.cat)?.value;
  const onlyMyCity = sp.cidade === "1" && Boolean(me.profile?.city);
  const promo = sp.promo === "1";
  const novo = sp.novo === "1";
  const page = parsePage(sp.pagina);
  const from = (page - 1) * PAGE_SIZE;

  const filterParams = { ver: sp.ver, cidade: sp.cidade, cat, promo: sp.promo, novo: sp.novo };
  const hrefWith = (patch: Partial<Search>) => {
    const merged: Record<string, string | undefined> = { ...filterParams, ...patch };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/parceiros?${s}` : "/parceiros";
  };

  let products: ProductRow[] = [];
  let partners: PublicPartner[] = [];
  let partnerMap = new Map<string, PublicPartner>();
  let total = 0;

  if (lojas) {
    let q = supabase.from("public_partners").select(PARTNER_PUBLIC_SELECT, { count: "exact" });
    if (cat) q = q.eq("category", cat);
    if (onlyMyCity && me.profile?.city) q = q.ilike("city", escapeLike(me.profile.city.trim()));
    const { data, count } = await q.order("trade_name").range(from, from + PAGE_SIZE - 1);
    partners = (data ?? []) as PublicPartner[];
    total = count ?? 0;
  } else {
    let q = supabase.from("products").select(PRODUCT_SELECT, { count: "exact" });
    if (cat) q = q.eq("category", cat);
    if (onlyMyCity && me.profile?.city) q = q.ilike("city", escapeLike(me.profile.city.trim()));
    if (promo) q = q.not("sale_price", "is", null);
    if (novo) q = q.gte("campaign_start", daysFromNow(-30));
    const { data, count } = await q.order("campaign_start", { ascending: false }).range(from, from + PAGE_SIZE - 1);
    products = (data ?? []) as ProductRow[];
    total = count ?? 0;
    partnerMap = await getPartnersByIds(products.map((p) => p.partner_id));
  }

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="flex flex-col">
      <header className="px-4 pb-1 pt-5">
        <h1 className="text-2xl font-bold">🛍️ Parceiros</h1>
        <p className="text-sm text-muted-foreground">
          Lojas e serviços que apoiam a comunidade. Aqui é só vitrine: você fecha direto com a loja.
        </p>
      </header>

      <nav className="flex gap-2 overflow-x-auto px-4 pt-3" aria-label="Tipo de listagem">
        <Link href={hrefWith({ ver: undefined, pagina: undefined })} className={chip(!lojas)}>
          Produtos
        </Link>
        <Link href={hrefWith({ ver: "lojas", promo: undefined, novo: undefined, pagina: undefined })} className={chip(lojas)}>
          Lojas
        </Link>
      </nav>

      <nav className="flex gap-2 overflow-x-auto px-4 py-3" aria-label="Filtros">
        {me.profile?.city && (
          <Link href={hrefWith({ cidade: onlyMyCity ? undefined : "1", pagina: undefined })} className={chip(onlyMyCity)}>
            📍 Minha cidade
          </Link>
        )}
        {!lojas && (
          <>
            <Link href={hrefWith({ promo: promo ? undefined : "1", pagina: undefined })} className={chip(promo)}>
              Promoções
            </Link>
            <Link href={hrefWith({ novo: novo ? undefined : "1", pagina: undefined })} className={chip(novo)}>
              Novidades
            </Link>
          </>
        )}
        {CATEGORIAS_PARCEIRO.map((c) => (
          <Link key={c.value} href={hrefWith({ cat: cat === c.value ? undefined : c.value, pagina: undefined })} className={chip(cat === c.value)}>
            {c.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-3 px-4 pb-4">
        {lojas ? (
          partners.length === 0 ? (
            <Empty />
          ) : (
            partners.map((p) => (
              <Link
                key={p.id}
                href={`/parceiros/${p.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40"
              >
                {p.logo_url ? (
                  <RemoteImage src={p.logo_url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted text-xl font-bold">
                    {p.trade_name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.trade_name}</p>
                  <p className="text-xs text-muted-foreground">{categoriaParceiro(p.category)}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {p.city}/{p.state}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <Star className="size-3" /> Parceiro
                </span>
              </Link>
            ))
          )
        ) : products.length === 0 ? (
          <Empty />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} partner={partnerMap.get(p.partner_id)} />
            ))}
          </div>
        )}

        <Pagination basePath="/parceiros" params={filterParams} page={page} pageSize={PAGE_SIZE} total={total} />
      </div>
      <ImpressionTracker productIds={products.map((p) => p.id)} />
    </div>
  );
}

function Empty() {
  return (
    <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      Nada por aqui com esses filtros. Tente outra categoria ou tire o filtro de cidade.
    </p>
  );
}
