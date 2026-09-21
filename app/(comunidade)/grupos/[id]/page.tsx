import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, MessageCircle, Pencil, Plus, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { RemoteImage } from "@/components/common/remote-image";
import { UserAvatar } from "@/components/common/user-avatar";
import { GroupMembershipButton, PlatformGroupControls } from "@/components/grupos/group-actions";
import { ReportButton } from "@/components/moderacao/report-button";
import { RideCard } from "@/components/rides/ride-card";
import { getMyParticipation, RIDE_SELECT } from "@/features/roles/queries";
import { requireMember } from "@/lib/auth";
import { categoriaDeGrupo } from "@/lib/constants/comunidade";
import { upcomingSince } from "@/lib/rides";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { GroupMemberRow, GroupRow, RideRow } from "@/types/domain";

export default async function GrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const me = await requireMember();
  const supabase = await createClient();

  const { data: groupData } = await supabase.from("groups").select("*").eq("id", id).maybeSingle();
  if (!groupData) notFound();
  const group = groupData as GroupRow;

  const since = upcomingSince();
  const [{ data: memberData }, { data: rideData }, { data: conv }] = await Promise.all([
    // a RLS devolve: minha linha + (se eu sou integrante) as ativas + (se admin) as pendentes
    supabase
      .from("group_members")
      .select("group_id, user_id, role, status, profile:profiles!user_id(id, display_name, avatar_url)")
      .eq("group_id", id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("rides")
      .select(RIDE_SELECT)
      .eq("group_id", id)
      .eq("status", "open")
      .gte("starts_at", since)
      .order("starts_at", { ascending: true })
      .limit(5),
    supabase.from("conversations").select("id").eq("group_id", id).maybeSingle(),
  ]);

  const members = (memberData ?? []) as unknown as GroupMemberRow[];
  const myRow = members.find((m) => m.user_id === me.id) ?? null;
  const isMember = myRow?.status === "active";
  const isGroupAdmin = isMember && myRow?.role === "admin";
  const active = members.filter((m) => m.status === "active");
  const admins = active.filter((m) => m.role === "admin");
  const pendingCount = members.filter((m) => m.status === "pending").length;

  const rides = (rideData ?? []) as unknown as RideRow[];
  const participation = await getMyParticipation(rides.map((r) => r.id), me.id);

  return (
    <>
      <PageHeader
        title={group.name}
        back="/grupos"
        action={
          isGroupAdmin ? (
            <Link href={`/grupos/${id}/editar`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <Pencil /> Editar
            </Link>
          ) : undefined
        }
      />

      {group.cover_url ? (
        <RemoteImage src={group.cover_url} className="aspect-[16/7] w-full object-cover" />
      ) : (
        <div className="flex aspect-[16/7] w-full items-center justify-center bg-muted text-5xl">🏍️</div>
      )}

      <div className="flex flex-col gap-5 p-4">
        {group.status === "suspended" && (
          <p role="status" className="rounded-lg bg-destructive/15 p-3 text-sm text-destructive">
            Este grupo está suspenso pela moderação.
          </p>
        )}

        <section className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold leading-tight">🏍️ {group.name}</h2>
          <p className="text-xs text-muted-foreground">
            {categoriaDeGrupo(group.category)}
            {group.city ? ` · ${group.city}${group.state ? `/${group.state}` : ""}` : ""}
            {group.region ? ` · ${group.region}` : ""}
          </p>
          <p className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="size-4" /> {group.member_count} {group.member_count === 1 ? "membro" : "membros"}
            </span>
            {group.visibility === "private" && (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-4" /> Privado
              </span>
            )}
          </p>
          {group.description && <p className="text-sm text-foreground/85">{group.description}</p>}
        </section>

        <section className="flex flex-wrap items-center gap-3">
          {group.status === "active" && (
            <GroupMembershipButton
              groupId={id}
              isPrivate={group.visibility === "private"}
              membership={myRow?.status ?? null}
            />
          )}
          {isMember && conv?.id && group.status === "active" && (
            <Link href={`/mensagens/${conv.id}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
              <MessageCircle /> Chat do grupo
            </Link>
          )}
        </section>

        {group.rules && (
          <section className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold">Regras</h3>
            <p className="whitespace-pre-line text-sm text-foreground/85">{group.rules}</p>
          </section>
        )}

        {isMember ? (
          <>
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Administradoras</h3>
              <div className="flex flex-wrap gap-3">
                {admins.map((a) => (
                  <Link key={a.user_id} href={`/membros/${a.user_id}`} className="flex items-center gap-2 text-sm hover:underline">
                    <UserAvatar name={a.profile?.display_name} src={a.profile?.avatar_url} size="sm" />
                    {a.profile?.display_name ?? "Motoqueira"}
                  </Link>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Próximos rolês</h3>
                {isGroupAdmin && group.status === "active" && (
                  <Link href={`/roles/novo?grupo=${id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <Plus /> Criar rolê
                  </Link>
                )}
              </div>
              {rides.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum rolê marcado neste grupo.</p>
              ) : (
                rides.map((r) => <RideCard key={r.id} ride={r} userId={me.id} participation={participation[r.id] ?? null} />)
              )}
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Membros ({active.length})</h3>
                <Link href={`/grupos/${id}/membros`} className="text-sm text-primary hover:underline">
                  {isGroupAdmin ? `Gerenciar${pendingCount ? ` · ${pendingCount} pedido(s)` : ""}` : "Ver todas"}
                </Link>
              </div>
              <div className="flex -space-x-2">
                {active.slice(0, 8).map((m) => (
                  <UserAvatar key={m.user_id} name={m.profile?.display_name} src={m.profile?.avatar_url} className="ring-2 ring-background" />
                ))}
              </div>
            </section>
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {group.visibility === "private"
              ? "Grupo privado: membros, chat e rolês ficam visíveis só depois que uma administradora aprovar seu pedido."
              : "Entre no grupo para ver os membros, o chat e os próximos rolês."}
          </p>
        )}

        {!isGroupAdmin && (
          <div className="border-t border-border pt-3">
            <ReportButton targetType="group" targetId={id} label="Denunciar grupo" />
          </div>
        )}

        {me.isAdmin && <PlatformGroupControls groupId={id} suspended={group.status === "suspended"} />}
      </div>
    </>
  );
}
