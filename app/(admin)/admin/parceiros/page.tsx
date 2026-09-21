import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cleanTerm, EmptyRow, FilterBar, PageTitle, Pill } from "@/components/admin/admin-ui";
import { Pagination, parsePage } from "@/components/common/pagination";
import { CATEGORIAS_PARCEIRO, categoriaParceiro, STATUS_ASSINATURA, STATUS_PARCEIRO } from "@/lib/constants/parceiros";
import { formatDateTime } from "@/lib/format";
import { subscriptionState } from "@/lib/partners";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionRow } from "@/types/domain";

export const metadata = { title: "Parceiros (admin)" };

const PAGE_SIZE = 20;
const STATUS = Object.entries(STATUS_PARCEIRO).map(([value, label]) => ({ value, label }));
const TONE = { pending: "warn", approved: "ok", rejected: "bad", suspended: "bad" } as const;

type Row = {
  id: string;
  trade_name: string;
  category: string;
  city: string;
  state: string;
  status: keyof typeof STATUS_PARCEIRO;
  created_at: string;
  sub: SubscriptionRow[] | SubscriptionRow | null;
};

export default async function AdminParceirosPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; cat?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const q = cleanTerm(sp.q);
  const status = STATUS.find((s) => s.value === sp.status)?.value;
  const cat = CATEGORIAS_PARCEIRO.find((c) => c.value === sp.cat)?.value;
  const page = parsePage(sp.pagina);

  const supabase = await createClient();
  let query = supabase
    .from("partners")
    .select("id, trade_name, category, city, state, status, created_at, sub:partner_subscriptions(partner_id, plan_id, status, starts_at, ends_at)", { count: "exact" });
  if (status) query = query.eq("status", status);
  if (cat) query = query.eq("category", cat);
  if (q) query = query.or(`trade_name.ilike.%${q}%,legal_name.ilike.%${q}%,city.ilike.%${q}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageTitle title="Parceiros" hint={`${count ?? 0} lojas encontradas`} />
      <FilterBar
        action="/admin/parceiros"
        q={q}
        placeholder="Nome, razão social ou cidade"
        filters={[
          { name: "status", value: status, label: "Todos os status", options: STATUS },
          { name: "cat", value: cat, label: "Todas as categorias", options: CATEGORIAS_PARCEIRO.map((c) => ({ value: c.value, label: c.label })) },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyRow />
      ) : (
        rows.map((p) => {
          const sub = Array.isArray(p.sub) ? (p.sub[0] ?? null) : p.sub;
          const st = subscriptionState(sub);
          return (
            <Link key={p.id} href={`/admin/parceiros/${p.id}`}>
              <Card className="gap-1 p-4 transition-colors hover:bg-muted/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{p.trade_name}</p>
                  <div className="flex gap-2">
                    <Pill tone={TONE[p.status]}>{STATUS_PARCEIRO[p.status]}</Pill>
                    <Pill tone={st.inForce ? "ok" : st.state === "none" ? "muted" : "warn"}>{STATUS_ASSINATURA[st.state]}</Pill>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {categoriaParceiro(p.category)} · {p.city}/{p.state} · cadastro em {formatDateTime(p.created_at)}
                </p>
              </Card>
            </Link>
          );
        })
      )}
      <Pagination basePath="/admin/parceiros" params={{ q, status, cat }} page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </>
  );
}
