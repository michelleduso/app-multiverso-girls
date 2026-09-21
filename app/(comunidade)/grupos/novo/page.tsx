import { PageHeader } from "@/components/common/page-header";
import { GroupForm } from "@/components/grupos/group-form";
import { createGroup } from "@/features/grupos/actions";
import { requireMember } from "@/lib/auth";

export const metadata = { title: "Criar grupo" };

export default async function NovoGrupoPage() {
  const me = await requireMember();

  return (
    <>
      <PageHeader title="Criar grupo" back="/grupos" />
      <GroupForm
        action={createGroup}
        userId={me.id}
        submitLabel="Criar grupo"
        initial={{
          name: "",
          description: "",
          cover_url: "",
          city: me.profile?.city ?? "",
          state: me.profile?.state ?? "RS",
          region: "",
          category: "cidade_regiao",
          visibility: "public",
          rules: "",
        }}
      />
    </>
  );
}
