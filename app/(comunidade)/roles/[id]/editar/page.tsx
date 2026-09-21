import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/common/page-header";
import { RideForm } from "@/components/rides/ride-form";
import { RIDE_SELECT } from "@/features/roles/queries";
import { updateRide } from "@/features/roles/actions";
import { requireMember } from "@/lib/auth";
import { splitStartsAt } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { RideRow } from "@/types/domain";

export const metadata = { title: "Editar rolê" };

export default async function EditarRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const me = await requireMember();
  const supabase = await createClient();
  const { data } = await supabase.from("rides").select(RIDE_SELECT).eq("id", id).maybeSingle();
  const ride = data as unknown as RideRow | null;

  if (!ride) notFound();
  if (ride.organizer_id !== me.id || ride.status !== "open") redirect(`/roles/${id}`);

  const { date, time } = splitStartsAt(ride.starts_at);

  return (
    <>
      <PageHeader title="Editar rolê" back={`/roles/${id}`} />
      <p className="px-4 pt-3 text-xs text-muted-foreground">
        As participantes confirmadas serão avisadas sobre as alterações.
      </p>
      <RideForm
        action={updateRide.bind(null, id)}
        userId={me.id}
        submitLabel="Salvar alterações"
        initial={{
          title: ride.title,
          description: ride.description ?? "",
          city: ride.city,
          state: ride.state,
          date,
          time,
          ride_type: ride.ride_type,
          max_participants: ride.max_participants?.toString() ?? "",
          image_url: ride.image_url ?? "",
          visibility: ride.visibility,
          requires_approval: ride.requires_approval,
        }}
      />
    </>
  );
}
