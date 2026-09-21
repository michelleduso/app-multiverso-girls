import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, MessageCircle, Pencil } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ActionButton } from "@/components/common/action-button";
import { PageHeader } from "@/components/common/page-header";
import { RemoteImage } from "@/components/common/remote-image";
import { UserAvatar } from "@/components/common/user-avatar";
import { ReportButton } from "@/components/moderacao/report-button";
import { JoinButton } from "@/components/rides/join-button";
import { MeetingPointForm } from "@/components/rides/meeting-point-form";
import { RideStateBadge } from "@/components/rides/ride-state-badge";
import { RIDE_SELECT } from "@/features/roles/queries";
import {
  cancelRide,
  closeRide,
  removeParticipant,
  respondParticipant,
} from "@/features/roles/actions";
import { requireMember } from "@/lib/auth";
import { tipoDeRole } from "@/lib/constants/comunidade";
import { formatDay, formatHour } from "@/lib/format";
import { getRideState } from "@/lib/rides";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { ParticipationStatus, ProfileLite, RideRow } from "@/types/domain";

type ParticipantRow = { user_id: string; status: ParticipationStatus; profile: ProfileLite | null };

export default async function RoleDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const me = await requireMember();
  const supabase = await createClient();

  const { data } = await supabase.from("rides").select(RIDE_SELECT).eq("id", id).maybeSingle();
  const ride = data as unknown as RideRow | null;
  if (!ride) notFound();

  const isOrganizer = ride.organizer_id === me.id;

  // A RLS decide o que volta: organizadora vê todas; confirmadas veem só confirmadas;
  // quem não participa vê apenas a própria linha (ou nada).
  const [{ data: parts }, { data: details }, { data: conv }] = await Promise.all([
    supabase
      .from("ride_participants")
      .select("user_id, status, profile:profiles!user_id(id, display_name, avatar_url)")
      .eq("ride_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("ride_private_details").select("meeting_point").eq("ride_id", id).maybeSingle(),
    supabase.from("conversations").select("id").eq("ride_id", id).maybeSingle(),
  ]);

  const participants = (parts ?? []) as unknown as ParticipantRow[];
  const mine = participants.find((p) => p.user_id === me.id)?.status ?? null;
  const confirmed = participants.filter((p) => p.status === "confirmed");
  const pending = participants.filter((p) => p.status === "pending");
  const state = getRideState(ride);
  const tipo = tipoDeRole(ride.ride_type);
  const isMember = isOrganizer || mine === "confirmed";
  const meetingPoint = (details?.meeting_point as string | undefined) ?? "";
  const canManage = isOrganizer && ride.status === "open";

  return (
    <>
      <PageHeader
        title="Rolê"
        back="/inicio"
        action={
          canManage ? (
            <Link href={`/roles/${id}/editar`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <Pencil /> Editar
            </Link>
          ) : undefined
        }
      />

      {ride.image_url && <RemoteImage src={ride.image_url} className="aspect-[16/8] w-full object-cover" />}

      <div className="flex flex-col gap-5 p-4">
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {tipo.emoji} {tipo.label}
              {ride.visibility === "private" && (
                <span className="ml-2 inline-flex items-center gap-0.5">
                  <Lock className="size-3" /> Privado
                </span>
              )}
            </span>
            <RideStateBadge state={state} />
          </div>
          <h2 className="text-2xl font-bold leading-tight">🏍️ {ride.title}</h2>
          <p className="text-sm text-muted-foreground">
            📍 {ride.city}/{ride.state}
          </p>
          <p className="text-sm text-muted-foreground">
            🕗 {formatDay(ride.starts_at)} · Saída {formatHour(ride.starts_at)}
          </p>
          {ride.description && <p className="mt-1 text-sm italic text-foreground/85">“{ride.description}”</p>}
          <p className="mt-1 text-sm">
            👩 {ride.confirmed_count} {ride.confirmed_count === 1 ? "confirmada" : "confirmadas"}
            {ride.max_participants ? <span className="text-muted-foreground"> · limite {ride.max_participants}</span> : null}
          </p>
          {ride.organizer && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserAvatar name={ride.organizer.display_name} src={ride.organizer.avatar_url} size="sm" />
              Organizado por{" "}
              <Link href={`/membros/${ride.organizer.id}`} className="font-medium text-foreground hover:underline">
                {ride.organizer.display_name}
              </Link>
            </p>
          )}
        </section>

        <section className="flex flex-wrap items-center gap-3">
          <JoinButton
            rideId={id}
            state={state}
            isOrganizer={isOrganizer}
            participation={mine}
            requiresApproval={ride.requires_approval}
          />
          {isMember && conv?.id && (
            <Link href={`/mensagens/${conv.id}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
              <MessageCircle /> Chat do rolê
            </Link>
          )}
        </section>

        {/* Ponto de encontro: restrito. Para quem não é confirmada, só o aviso. */}
        <Card className="gap-2 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <Lock className="size-4" /> Ponto de encontro
          </h3>
          {isMember ? (
            meetingPoint ? (
              <p className="text-sm">{meetingPoint}</p>
            ) : (
              <p className="text-sm text-muted-foreground">A organizadora ainda não definiu o ponto de encontro.</p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              O ponto de encontro é divulgado só para as participantes confirmadas.
            </p>
          )}
          {isOrganizer && ride.status !== "cancelled" && (
            <div className="mt-2 border-t border-border pt-3">
              <MeetingPointForm rideId={id} current={meetingPoint} />
            </div>
          )}
        </Card>

        {isOrganizer && pending.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Pedidos para participar ({pending.length})</h3>
            {pending.map((p) => (
              <Card key={p.user_id} className="flex-row flex-wrap items-center gap-3 p-3">
                <UserAvatar name={p.profile?.display_name} src={p.profile?.avatar_url} />
                <Link href={`/membros/${p.user_id}`} className="flex-1 truncate text-sm font-medium hover:underline">
                  {p.profile?.display_name ?? "Motoqueira"}
                </Link>
                <ActionButton action={respondParticipant.bind(null, id, p.user_id, true)} size="sm" pendingLabel="...">
                  Aceitar
                </ActionButton>
                <ActionButton action={respondParticipant.bind(null, id, p.user_id, false)} size="sm" variant="outline" pendingLabel="...">
                  Recusar
                </ActionButton>
              </Card>
            ))}
          </section>
        )}

        {isMember && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Confirmadas ({confirmed.length})</h3>
            {confirmed.map((p) => (
              <div key={p.user_id} className="flex items-center gap-3">
                <UserAvatar name={p.profile?.display_name} src={p.profile?.avatar_url} />
                <Link href={`/membros/${p.user_id}`} className="flex-1 truncate text-sm hover:underline">
                  {p.profile?.display_name ?? "Motoqueira"}
                  {p.user_id === ride.organizer_id && <span className="ml-2 text-xs text-muted-foreground">organizadora</span>}
                </Link>
                {canManage && p.user_id !== ride.organizer_id && (
                  <ActionButton
                    action={removeParticipant.bind(null, id, p.user_id)}
                    size="xs"
                    variant="ghost"
                    confirmMessage={`Remover ${p.profile?.display_name ?? "esta participante"} do rolê?`}
                    pendingLabel="..."
                  >
                    Remover
                  </ActionButton>
                )}
              </div>
            ))}
          </section>
        )}

        {canManage && (
          <section className="flex flex-wrap gap-2 border-t border-border pt-4">
            <ActionButton
              action={closeRide.bind(null, id)}
              variant="outline"
              confirmMessage="Encerrar este rolê? Ele deixa de receber novas participantes."
              pendingLabel="Encerrando..."
            >
              Encerrar rolê
            </ActionButton>
            <ActionButton
              action={cancelRide.bind(null, id)}
              variant="destructive"
              confirmMessage="Cancelar este rolê? Todas as participantes serão avisadas."
              pendingLabel="Cancelando..."
            >
              Cancelar rolê
            </ActionButton>
          </section>
        )}

        {!isOrganizer && (
          <div className="border-t border-border pt-3">
            <ReportButton targetType="ride" targetId={id} label="Denunciar rolê" />
          </div>
        )}
      </div>
    </>
  );
}
