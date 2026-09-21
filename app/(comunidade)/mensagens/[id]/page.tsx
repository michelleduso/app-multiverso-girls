import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatRoom } from "@/components/chat/chat-room";
import { PageHeader } from "@/components/common/page-header";
import { BlockButton } from "@/components/moderacao/block-button";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { MessageRow, ProfileLite } from "@/types/domain";

const PAGE_SIZE = 30;
const MESSAGE_COLUMNS = "id, conversation_id, sender_id, body, image_path, created_at, deleted_at";

export const metadata = { title: "Conversa" };

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const me = await requireMember();
  const supabase = await createClient();

  // A RLS já garante: se eu não faço parte da conversa, a linha simplesmente não volta.
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, type, group_id, ride_id, pinned_message_id")
    .eq("id", id)
    .maybeSingle();
  if (!conv) notFound();

  const kind = conv.type as "direct" | "group" | "ride";

  const [{ data: rows }, { data: canSendData }] = await Promise.all([
    supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1),
    supabase.rpc("can_send_message", { cid: id }),
  ]);
  const fetched = (rows ?? []) as MessageRow[];
  const hasMore = fetched.length > PAGE_SIZE;
  const messages = fetched.slice(0, PAGE_SIZE).reverse();

  // título, permissões de moderação e "outra pessoa" (chat privado)
  let title = "Conversa";
  let backTab = "pessoas";
  let subtitle: string | null = null;
  let href: string | null = null;
  let canModerate = false;
  let other: ProfileLite | null = null;
  let otherLastReadAt: string | null = null;

  if (kind === "direct") {
    const { data: parts } = await supabase.from("conversation_participants").select("user_id").eq("conversation_id", id);
    const otherId = (parts ?? []).map((p) => p.user_id as string).find((u) => u !== me.id);
    if (otherId) {
      const [{ data: prof }, { data: read }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url").eq("id", otherId).maybeSingle(),
        supabase.from("conversation_reads").select("last_read_at").eq("conversation_id", id).eq("user_id", otherId).maybeSingle(),
      ]);
      other = (prof as ProfileLite | null) ?? { id: otherId, display_name: "Usuária", avatar_url: null };
      otherLastReadAt = (read?.last_read_at as string | undefined) ?? null;
      title = other.display_name;
      href = `/membros/${otherId}`;
    }
  } else if (kind === "group") {
    backTab = "grupos";
    const [{ data: g }, { data: mem }] = await Promise.all([
      supabase.from("groups").select("name").eq("id", conv.group_id).maybeSingle(),
      supabase.from("group_members").select("role").eq("group_id", conv.group_id).eq("user_id", me.id).maybeSingle(),
    ]);
    title = g?.name ?? "Grupo";
    subtitle = "Chat do grupo";
    href = `/grupos/${conv.group_id}`;
    canModerate = mem?.role === "admin";
  } else {
    backTab = "roles";
    const { data: r } = await supabase.from("rides").select("title, organizer_id").eq("id", conv.ride_id).maybeSingle();
    title = r?.title ?? "Rolê";
    subtitle = "Chat do rolê";
    href = `/roles/${conv.ride_id}`;
    canModerate = r?.organizer_id === me.id;
  }

  // perfis dos remetentes visíveis + mensagem fixada
  const senderIds = [...new Set(messages.map((m) => m.sender_id).filter((s): s is string => !!s))];
  const profiles: Record<string, ProfileLite> = {};
  if (senderIds.length) {
    const { data } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", senderIds);
    for (const p of (data ?? []) as ProfileLite[]) profiles[p.id] = p;
  }
  if (other) profiles[other.id] = other;

  let pinned: MessageRow | null = null;
  if (conv.pinned_message_id) {
    const { data } = await supabase.from("messages").select(MESSAGE_COLUMNS).eq("id", conv.pinned_message_id).maybeSingle();
    pinned = (data as MessageRow | null) ?? null;
  }

  return (
    <div className="flex h-[calc(100svh-5rem)] flex-col">
      <PageHeader
        back={`/mensagens?aba=${backTab}`}
        title={
          href ? (
            <Link href={href} className="hover:underline">
              {title}
              {subtitle && <span className="block text-xs font-normal text-muted-foreground">{subtitle}</span>}
            </Link>
          ) : (
            title
          )
        }
        action={kind === "direct" && other ? <BlockButton userId={other.id} name={other.display_name} redirectTo="/mensagens" /> : undefined}
      />
      <ChatRoom
        conversationId={id}
        meId={me.id}
        kind={kind}
        canModerate={canModerate}
        canSend={Boolean(canSendData)}
        initialMessages={messages}
        initialHasMore={hasMore}
        profiles={profiles}
        otherLastReadAt={otherLastReadAt}
        initialPinned={pinned}
      />
    </div>
  );
}
