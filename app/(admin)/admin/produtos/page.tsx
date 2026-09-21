import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cleanTerm, EmptyRow, FilterBar, PageTitle, Pill } from "@/components/admin/admin-ui";
import { ProductAdminActions } from "@/components/admin/entity-actions";
import { Pagination, parsePage } from "@/components/common/pagination";
import { CATEGORIAS_PARCEIRO, categoriaParceiro, STATUS_PRODUTO } from "@/lib/constants/parceiros";
import { formatPrice } from "@/lib/partners";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Produtos (admin)" };

const PAGE_SIZE = 20;
const STATUS = Object.entries(STATUS_PRODUTO).map(([value, label]) => ({ value, label }));

type Row = {
  id: string;
  partner_id: string;
  name: string;
  category: string;
  price: number | null;
  sale_price: number | null;
  status: keyof typeof STATUS_PRODUTO;
  is_featured: boolean;
  partner: { trade_name: string } | null;
};

export default async function AdminProdutosPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; cat?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const q = cleanTerm(sp.q);
  const status = STATUS.find((s) => s.value === sp.status)?.value;
  const cat = CATEGORIAS_PARCEIRO.find((c) => c.value === sp.cat)?.value;
  const page = parsePage(sp.pagina);

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("id, partner_id, name, category, price, sale_price, status, is_featured, partner:partners(trade_name)", { count: "exact" });
  if (status) query = query.eq("status", status);
  if (cat) query = query.eq("category", cat);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageTitle title="Produtos" hint={`${count ?? 0} produtos · bloquear tira do ar e impede o lojista de reativar`} />
      <FilterBar
        action="/admin/produtos"
        q={q}
        placeholder="Nome do produto"
        filters={[
          { name: "status", value: status, label: "Todos os status", options: STATUS },
          { name: "cat", value: cat, label: "Todas as categorias", options: CATEGORIAS_PARCEIRO.map((c) => ({ value: c.value, label: c.label })) },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyRow />
      ) : (
        rows.map((p) => (
          <Card key={p.id} className="gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  <Link href={`/admin/parceiros/${p.partner_id}`} className="underline">
                    {p.partner?.trade_name ?? "Loja"}
                  </Link>{" "}
                  · {categoriaParceiro(p.category)} · {formatPrice(p.sale_price ?? p.price) ?? "sem preço"}
                  {p.sale_price != null ? " · promoção" : ""}
                  {p.is_featured ? " · destaque" : ""}
                </p>
              </div>
              <Pill tone={p.status === "active" ? "ok" : p.status === "blocked" ? "bad" : "muted"}>{STATUS_PRODUTO[p.status]}</Pill>
            </div>
            <ProductAdminActions productId={p.id} status={p.status} />
          </Card>
        ))
      )}
      <Pagination basePath="/admin/produtos" params={{ q, status, cat }} page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </>
  );
}
