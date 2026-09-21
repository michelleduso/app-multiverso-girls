import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { GroupForm } from "@/components/grupos/group-form";
import { updateGroup } from "@/features/grupos/actions";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { GroupRow } from "@/types/domain";

export const metadata = { title: "Editar grupo" };

export default async function EditarGrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const me = await requireMember();
  const supabase = await createClient();

  const [{ data: group }, { data: membership }] = await Promise.all([
    supabase.from("groups").select("*").eq("id", id).maybeSingle(),
    supabase.from("group_members").select("role, status").eq("group_id", id).eq("user_id", me.id).maybeSingle(),
  ]);
  if (!group) notFound();
  if (membership?.role !== "admin" || membership.status !== "active") redirect(`/grupos/${id}`);

  const g = group as GroupRow;

  return (
    <>
      <PageHeader title="Editar grupo" back={`/grupos/${id}`} />
      <GroupForm
        action={updateGroup.bind(null, id)}
        userId={me.id}
        submitLabel="Salvar alterações"
        initial={{
          name: g.name,
          description: g.description ?? "",
          cover_url: g.cover_url ?? "",
          city: g.city ?? "",
          state: g.state ?? "",
          region: g.region ?? "",
          category: g.category,
          visibility: g.visibility,
          rules: g.rules ?? "",
        }}
      />
    </>
  );
}
