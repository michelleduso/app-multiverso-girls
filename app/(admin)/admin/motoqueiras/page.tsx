import { Card } from "@/components/ui/card";
import { cleanTerm, EmptyRow, FilterBar, PageTitle, Pill } from "@/components/admin/admin-ui";
import { ProfileActions } from "@/components/admin/profile-actions";
import { Pagination, parsePage } from "@/components/common/pagination";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Motoqueiras" };

const PAGE_SIZE = 20;
const STATUS = [
  { value: "approved", label: "Aprovadas" },
  { value: "pending", label: "Pendentes" },
  { value: "suspended", label: "Suspensas" },
  { value: "banned", label: "Banidas" },
  { value: "rejected", label: "Recusadas" },
  { value: "deleted", label: "Excluídas" },
];
const TONE = { approved: "ok", pending: "warn", suspended: "warn", banned: "bad", rejected: "bad", deleted: "muted" } as const;

type Row = { id: string; display_name: string; city: string | null; state: string | null; status: string; suspended_until: string | null; created_at: string };

export default async function AdminMotoqueirasPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const q = cleanTerm(sp.q);
  const status = STATUS.find((s) => s.value === sp.status)?.value;
  const page = parsePage(sp.pagina);

  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, display_name, city, state, status, suspended_until, created_at", { count: "exact" });
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`display_name.ilike.%${q}%,city.ilike.%${q}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageTitle title="Motoqueiras" hint={`${count ?? 0} perfis encontrados`} />
      <FilterBar action="/admin/motoqueiras" q={q} placeholder="Nome ou cidade" filters={[{ name: "status", value: status, label: "Todos os status", options: STATUS }]} />
      {rows.length === 0 ? (
        <EmptyRow />
      ) : (
        rows.map((r) => (
          <Card key={r.id} className="gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{r.display_name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.city ? `${r.city}/${r.state ?? ""} · ` : ""}cadastro em {formatDateTime(r.created_at)}
                </p>
              </div>
              <Pill tone={TONE[r.status as keyof typeof TONE] ?? "muted"}>
                {STATUS.find((s) => s.value === r.status)?.label ?? r.status}
                {r.status === "suspended" && r.suspended_until ? ` até ${formatDateTime(r.suspended_until)}` : ""}
              </Pill>
            </div>
            <ProfileActions userId={r.id} status={r.status} mode="member" />
          </Card>
        ))
      )}
      <Pagination basePath="/admin/motoqueiras" params={{ q, status }} page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </>
  );
}
