import { Card } from "@/components/ui/card";
import { cleanTerm, EmptyRow, FilterBar, PageTitle, Pill } from "@/components/admin/admin-ui";
import { RideAdminActions } from "@/components/admin/entity-actions";
import { Pagination, parsePage } from "@/components/common/pagination";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Rolês (admin)" };

const PAGE_SIZE = 20;
const STATUS = [
  { value: "open", label: "Abertos" },
  { value: "closed", label: "Encerrados" },
  { value: "cancelled", label: "Cancelados" },
];
type Row = {
  id: string;
  title: string;
  city: string;
  state: string;
  starts_at: string;
  status: string;
  visibility: string;
  confirmed_count: number;
  organizer: { display_name: string } | null;
};

export default async function AdminRolesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const q = cleanTerm(sp.q);
  const status = STATUS.find((s) => s.value === sp.status)?.value;
  const page = parsePage(sp.pagina);

  const supabase = await createClient();
  let query = supabase
    .from("rides")
    .select("id, title, city, state, starts_at, status, visibility, confirmed_count, organizer:profiles!organizer_id(display_name)", { count: "exact" });
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`title.ilike.%${q}%,city.ilike.%${q}%`);
  const { data, count } = await query.order("starts_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageTitle title="Rolês" hint={`${count ?? 0} encontrados · o ponto de encontro nunca é exibido aqui`} />
      <FilterBar action="/admin/roles" q={q} placeholder="Título ou cidade" filters={[{ name: "status", value: status, label: "Todos os status", options: STATUS }]} />
      {rows.length === 0 ? (
        <EmptyRow />
      ) : (
        rows.map((r) => (
          <Card key={r.id} className="gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.city}/{r.state} · {formatDateTime(r.starts_at)} · por {r.organizer?.display_name ?? "—"} · {r.confirmed_count} confirmadas
                  {r.visibility === "private" ? " · privado" : ""}
                </p>
              </div>
              <Pill tone={r.status === "open" ? "ok" : r.status === "cancelled" ? "bad" : "muted"}>
                {STATUS.find((s) => s.value === r.status)?.label}
              </Pill>
            </div>
            {r.status === "open" && <RideAdminActions rideId={r.id} />}
          </Card>
        ))
      )}
      <Pagination basePath="/admin/roles" params={{ q, status }} page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </>
  );
}
