import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ActionButton } from "@/components/common/action-button";
import { PageHeader } from "@/components/common/page-header";
import { UserAvatar } from "@/components/common/user-avatar";
import { BlockButton } from "@/components/moderacao/block-button";
import { ReportButton } from "@/components/moderacao/report-button";
import { requestChat } from "@/features/chat/actions";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { ProfileLite } from "@/types/domain";

export const metadata = { title: "Perfil" };

export default async function MembroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const me = await requireMember();
  if (id === me.id) redirect("/perfil");

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, display_name, avatar_url, city, state, bio").eq("id", id).maybeSingle();
  if (!data) notFound();
  const profile = data as ProfileLite & { bio: string | null };

  // mesma chave usada no banco: menor uuid ":" maior uuid
  const directKey = [me.id, id].sort().join(":");
  const [{ data: conv }, { data: pendingReq }, { data: blockRow }] = await Promise.all([
    supabase.from("conversations").select("id").eq("direct_key", directKey).maybeSingle(),
    supabase
      .from("chat_requests")
      .select("id, from_id")
      .eq("status", "pending")
      .or(`and(from_id.eq.${me.id},to_id.eq.${id}),and(from_id.eq.${id},to_id.eq.${me.id})`)
      .maybeSingle(),
    supabase.from("blocks").select("blocked_id").eq("blocker_id", me.id).eq("blocked_id", id).maybeSingle(),
  ]);

  const blocked = Boolean(blockRow);

  return (
    <>
      <PageHeader title="Perfil" back="/inicio" />
      <div className="flex flex-col gap-5 p-4">
        <section className="flex flex-col items-center gap-2 text-center">
          <UserAvatar name={profile.display_name} src={profile.avatar_url} size="lg" className="size-20" />
          <h2 className="text-xl font-bold">{profile.display_name}</h2>
          {profile.city && (
            <p className="text-sm text-muted-foreground">
              📍 {profile.city}
              {profile.state ? `/${profile.state}` : ""}
            </p>
          )}
          {profile.bio && <p className="text-sm text-foreground/85">{profile.bio}</p>}
        </section>

        <section className="flex flex-col items-center gap-2">
          {blocked ? (
            <p className="text-sm text-muted-foreground">Você bloqueou esta pessoa.</p>
          ) : conv?.id ? (
            <Link href={`/mensagens/${conv.id}`} className={buttonVariants({ size: "lg" })}>
              <MessageCircle /> Abrir conversa
            </Link>
          ) : pendingReq ? (
            pendingReq.from_id === me.id ? (
              <p className="text-sm text-muted-foreground">Solicitação enviada — aguardando resposta.</p>
            ) : (
              <Link href="/mensagens" className={buttonVariants({ size: "lg" })}>
                Responder solicitação de conversa
              </Link>
            )
          ) : (
            <ActionButton action={requestChat.bind(null, id)} size="lg" pendingLabel="Enviando...">
              <MessageCircle /> Pedir para conversar
            </ActionButton>
          )}
        </section>

        <section className="flex flex-col gap-2 border-t border-border pt-4">
          <BlockButton userId={id} name={profile.display_name} blocked={blocked} />
          <ReportButton targetType="profile" targetId={id} label="Denunciar perfil" />
          <ReportButton targetType="behavior" targetId={id} label="Denunciar comportamento" />
        </section>
      </div>
    </>
  );
}
