import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyRow, FilterBar, PageTitle, Pill } from "@/components/admin/admin-ui";
import { Pagination, parsePage } from "@/components/common/pagination";
import { STATUS_ASSINATURA } from "@/lib/constants/parceiros";
import { daysFromNow, formatDateTime } from "@/lib/format";
import { daysUntil, subscriptionState } from "@/lib/partners";
import { createClient } from "@/lib/supabase/server";
import type { PlanRow, SubscriptionRow } from "@/types/domain";

export const metadata = { title: "Planos (admin)" };

const PAGE_SIZE = 25;
const FILTERS = [
  { value: "vencendo", label: "Vencendo em 7 dias" },
  { value: "vencidos", label: "Vencidos" },
  { value: "ativos", label: "Em vigor" },
  { value: "suspensos", label: "Suspensos" },
];

type Row = SubscriptionRow & { partner: { id: string; trade_name: string; status: string } | null };

export default async function AdminPlanosPage({ searchParams }: { searchParams: Promise<{ filtro?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const filtro = FILTERS.find((f) => f.value === sp.filtro)?.value;
  const page = parsePage(sp.pagina);

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const in7 = daysFromNow(7);

  let query = supabase
    .from("partner_subscriptions")
    .select("partner_id, plan_id, status, starts_at, ends_at, partner:partners(id, trade_name, status)", { count: "exact" });
  if (filtro === "vencendo") query = query.in("status", ["trial", "active"]).gt("ends_at", nowIso).lte("ends_at", in7);
  if (filtro === "vencidos") query = query.or(`status.eq.expired,and(status.in.(trial,active),ends_at.lte.${nowIso})`);
  if (filtro === "ativos") query = query.in("status", ["trial", "active"]).lte("starts_at", nowIso).or(`ends_at.is.null,ends_at.gt.${nowIso}`);
  if (filtro === "suspensos") query = query.eq("status", "suspended");
  const [{ data, count }, { data: plans }] = await Promise.all([
    query.order("ends_at", { ascending: true, nullsFirst: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("plans").select("*").order("sort"),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const planName = new Map(((plans ?? []) as PlanRow[]).map((p) => [p.id, p.name]));

  return (
    <>
      <PageTitle title="Planos" hint="Pagamentos são feitos fora do app; aqui você ativa, altera, renova ou suspende. Plano vencido só tira a loja do ar." />

      <div className="grid gap-2 sm:grid-cols-3">
        {((plans ?? []) as PlanRow[]).map((p) => (
          <Card key={p.id} className="gap-1 p-3 text-sm">
            <p className="font-semibold">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.description}</p>
          </Card>
        ))}
      </div>

      <FilterBar
        action="/admin/planos"
        filters={[{ name: "filtro", value: filtro, label: "Todos", options: FILTERS }]}
        placeholder="(busque pelo nome em Parceiros)"
      />

      {rows.length === 0 ? (
        <EmptyRow>Nenhuma assinatura neste filtro. Ative planos pela página de cada parceiro.</EmptyRow>
      ) : (
        rows.map((r) => {
          const st = subscriptionState(r);
          const left = daysUntil(r.ends_at);
          return (
            <Link key={r.partner_id} href={`/admin/parceiros/${r.partner_id}`}>
              <Card className="gap-1 p-4 transition-colors hover:bg-muted/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{r.partner?.trade_name ?? "Parceiro"}</p>
                  <Pill tone={st.inForce ? (left != null && left <= 7 ? "warn" : "ok") : "bad"}>{STATUS_ASSINATURA[st.state]}</Pill>
                </div>
                <p className="text-xs text-muted-foreground">
                  {planName.get(r.plan_id)} · {r.ends_at ? `vence em ${formatDateTime(r.ends_at)}` : "sem vencimento"}
                  {st.inForce && left != null && left <= 7 ? ` (${left} dia(s))` : ""}
                </p>
              </Card>
            </Link>
          );
        })
      )}
      <Pagination basePath="/admin/planos" params={{ filtro }} page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </>
  );
}
