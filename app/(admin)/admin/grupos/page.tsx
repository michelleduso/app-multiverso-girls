import { Card } from "@/components/ui/card";
import { cleanTerm, EmptyRow, FilterBar, PageTitle, Pill } from "@/components/admin/admin-ui";
import { GroupAdminActions } from "@/components/admin/entity-actions";
import { Pagination, parsePage } from "@/components/common/pagination";
import { categoriaDeGrupo } from "@/lib/constants/comunidade";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Grupos (admin)" };

const PAGE_SIZE = 20;
const STATUS = [
  { value: "active", label: "Ativos" },
  { value: "suspended", label: "Suspensos" },
];
type Row = { id: string; name: string; city: string | null; state: string | null; category: string; visibility: string; status: string; member_count: number };

export default async function AdminGruposPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; pagina?: string }> }) {
  const sp = await searchParams;
  const q = cleanTerm(sp.q);
  const status = STATUS.find((s) => s.value === sp.status)?.value;
  const page = parsePage(sp.pagina);

  const supabase = await createClient();
  let query = supabase.from("groups").select("id, name, city, state, category, visibility, status, member_count", { count: "exact" });
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%`);
  const { data, count } = await query.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageTitle title="Grupos" hint={`${count ?? 0} encontrados`} />
      <FilterBar action="/admin/grupos" q={q} placeholder="Nome ou cidade" filters={[{ name: "status", value: status, label: "Todos os status", options: STATUS }]} />
      {rows.length === 0 ? (
        <EmptyRow />
      ) : (
        rows.map((g) => (
          <Card key={g.id} className="gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-muted-foreground">
                  {categoriaDeGrupo(g.category)}
                  {g.city ? ` · ${g.city}/${g.state ?? ""}` : ""} · {g.member_count} membros · {g.visibility === "private" ? "privado" : "público"}
                </p>
              </div>
              <Pill tone={g.status === "active" ? "ok" : "bad"}>{g.status === "active" ? "Ativo" : "Suspenso"}</Pill>
            </div>
            <GroupAdminActions groupId={g.id} suspended={g.status === "suspended"} />
          </Card>
        ))
      )}
      <Pagination basePath="/admin/grupos" params={{ q, status }} page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </>
  );
}
