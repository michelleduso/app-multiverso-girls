import { PageHeader } from "@/components/common/page-header";
import { RideForm } from "@/components/rides/ride-form";
import { createRide } from "@/features/roles/actions";
import { requireMember } from "@/lib/auth";
import { isUuid } from "@/lib/validation";

export const metadata = { title: "Criar rolê" };

export default async function NovoRolePage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string }>;
}) {
  const { grupo } = await searchParams;
  const me = await requireMember();
  const groupId = grupo && isUuid(grupo) ? grupo : undefined;

  return (
    <>
      <PageHeader title={groupId ? "Novo rolê do grupo" : "Criar rolê"} back={groupId ? `/grupos/${groupId}` : "/inicio"} />
      <RideForm
        action={createRide}
        userId={me.id}
        groupId={groupId}
        submitLabel="Publicar rolê"
        initial={{
          title: "",
          description: "",
          city: me.profile?.city ?? "",
          state: me.profile?.state ?? "RS",
          date: "",
          time: "",
          ride_type: "passeio",
          max_participants: "",
          image_url: "",
          visibility: "public",
          requires_approval: false,
        }}
      />
    </>
  );
}
