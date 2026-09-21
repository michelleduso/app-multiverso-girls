import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ActionButton } from "@/components/common/action-button";
import { PageHeader } from "@/components/common/page-header";
import { UserAvatar } from "@/components/common/user-avatar";
import { removeGroupMember, respondGroupJoin, setGroupAdmin } from "@/features/grupos/actions";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { GroupMemberRow } from "@/types/domain";

export const metadata = { title: "Membros do grupo" };

export default async function MembrosGrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const me = await requireMember();
  const supabase = await createClient();

  const [{ data: group }, { data }] = await Promise.all([
    supabase.from("groups").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("group_members")
      .select("group_id, user_id, role, status, profile:profiles!user_id(id, display_name, avatar_url)")
      .eq("group_id", id)
      .order("joined_at", { ascending: true }),
  ]);
  if (!group) notFound();

  const members = (data ?? []) as unknown as GroupMemberRow[];
  const mine = members.find((m) => m.user_id === me.id);
  const isAdmin = mine?.status === "active" && mine.role === "admin";
  const pending = members.filter((m) => m.status === "pending");
  const active = members.filter((m) => m.status === "active");

  return (
    <>
      <PageHeader title={`Membros · ${group.name}`} back={`/grupos/${id}`} />
      <div className="flex flex-col gap-5 p-4">
        {isAdmin && pending.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Pedidos de entrada ({pending.length})</h2>
            {pending.map((m) => (
              <Card key={m.user_id} className="flex-row flex-wrap items-center gap-3 p-3">
                <UserAvatar name={m.profile?.display_name} src={m.profile?.avatar_url} />
                <Link href={`/membros/${m.user_id}`} className="flex-1 truncate text-sm font-medium hover:underline">
                  {m.profile?.display_name ?? "Motoqueira"}
                </Link>
                <ActionButton action={respondGroupJoin.bind(null, id, m.user_id, true)} size="sm" pendingLabel="...">
                  Aprovar
                </ActionButton>
                <ActionButton action={respondGroupJoin.bind(null, id, m.user_id, false)} size="sm" variant="outline" pendingLabel="...">
                  Recusar
                </ActionButton>
              </Card>
            ))}
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Membros ({active.length})</h2>
          {active.map((m) => (
            <div key={m.user_id} className="flex flex-wrap items-center gap-3">
              <UserAvatar name={m.profile?.display_name} src={m.profile?.avatar_url} />
              <Link href={`/membros/${m.user_id}`} className="flex-1 truncate text-sm hover:underline">
                {m.profile?.display_name ?? "Motoqueira"}
                {m.role === "admin" && <span className="ml-2 text-xs text-primary">administradora</span>}
              </Link>
              {isAdmin && m.user_id !== me.id && (
                <>
                  <ActionButton
                    action={setGroupAdmin.bind(null, id, m.user_id, m.role !== "admin")}
                    size="xs"
                    variant="outline"
                    pendingLabel="..."
                  >
                    {m.role === "admin" ? "Remover cargo" : "Tornar administradora"}
                  </ActionButton>
                  {m.role !== "admin" && (
                    <ActionButton
                      action={removeGroupMember.bind(null, id, m.user_id)}
                      size="xs"
                      variant="destructive"
                      confirmMessage={`Remover ${m.profile?.display_name ?? "esta pessoa"} do grupo?`}
                      pendingLabel="..."
                    >
                      Remover
                    </ActionButton>
                  )}
                </>
              )}
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
