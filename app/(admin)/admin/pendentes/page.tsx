import { Card } from "@/components/ui/card";
import { EmptyRow, PageTitle } from "@/components/admin/admin-ui";
import { ProfileActions } from "@/components/admin/profile-actions";
import { Pagination, parsePage } from "@/components/common/pagination";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Cadastros pendentes" };

const PAGE_SIZE = 20;

export default async function PendentesPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const page = parsePage((await searchParams).pagina);
  const supabase = await createClient();

  // contas de parceiro nunca têm profile; mesmo assim ficam fora desta fila por definição
  const { data, count } = await supabase
    .from("profiles")
    .select("id, display_name, city, state, created_at, terms_accepted_at", { count: "exact" })
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = (data ?? []) as { id: string; display_name: string; city: string | null; state: string | null; created_at: string; terms_accepted_at: string | null }[];

  return (
    <>
      <PageTitle title="Cadastros pendentes" hint={`${count ?? 0} aguardando aprovação · os mais antigos primeiro`} />
      {rows.length === 0 ? (
        <EmptyRow>Nenhum cadastro pendente. 🎉</EmptyRow>
      ) : (
        rows.map((r) => (
          <Card key={r.id} className="gap-2 p-4">
            <div>
              <p className="font-medium">{r.display_name}</p>
              <p className="text-xs text-muted-foreground">
                {r.city ? `${r.city}/${r.state ?? ""} · ` : "Sem cidade informada · "}
                enviado em {formatDateTime(r.created_at)}
                {r.terms_accepted_at ? " · aceitou os termos" : ""}
              </p>
            </div>
            <ProfileActions userId={r.id} status="pending" mode="pending" />
          </Card>
        ))
      )}
      <Pagination basePath="/admin/pendentes" params={{}} page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
    </>
  );
}
