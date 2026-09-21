import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ActionButton } from "@/components/common/action-button";
import { UserAvatar } from "@/components/common/user-avatar";
import { RefreshOnMessages } from "@/components/chat/refresh-on-messages";
import { respondChatRequest } from "@/features/chat/actions";
import { requireMember } from "@/lib/auth";
import { formatMessageTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ConversationSummary, ProfileLite } from "@/types/domain";

export const metadata = { title: "Conversas" };

const TABS = [
  { value: "pessoas", label: "Pessoas", type: "direct" },
  { value: "grupos", label: "Grupos", type: "group" },
  { value: "roles", label: "Rolês", type: "ride" },
] as const;

type RequestRow = { id: string; message: string | null; from: ProfileLite | null; to: ProfileLite | null };

function preview(c: ConversationSummary) {
  if (c.last_at == null) return "Nenhuma mensagem ainda";
  if (c.last_deleted) return "🚫 Mensagem apagada";
  if (c.last_has_image && !c.last_body) return "📷 Imagem";
  return c.last_body ?? "";
}

export default async function ConversasPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  const tab = TABS.find((t) => t.value === aba) ?? TABS[0];

  const me = await requireMember();
  const supabase = await createClient();

  const [{ data: convData }, { data: reqData }] = await Promise.all([
    supabase.rpc("list_conversations"),
    supabase
      .from("chat_requests")
      .select("id, message, from:profiles!from_id(id, display_name, avatar_url), to:profiles!to_id(id, display_name, avatar_url)")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const conversations = (convData ?? []) as ConversationSummary[];
  const requests = (reqData ?? []) as unknown as (RequestRow & { from: ProfileLite | null; to: ProfileLite | null })[];
  const incoming = requests.filter((r) => r.to?.id === me.id);
  const outgoing = requests.filter((r) => r.from?.id === me.id);

  const unreadByType = (type: string) =>
    conversations.filter((c) => c.type === type).reduce((sum, c) => sum + c.unread_count, 0);
  const list = conversations.filter((c) => c.type === tab.type);

  return (
    <div className="flex flex-col">
      <RefreshOnMessages />
      <header className="px-4 pb-2 pt-5">
        <h1 className="text-2xl font-bold">💬 Conversas</h1>
      </header>

      <nav className="flex gap-2 px-4 py-2" aria-label="Tipos de conversa">
        {TABS.map((t) => {
          const unread = unreadByType(t.type) + (t.type === "direct" ? incoming.length : 0);
          return (
            <Link
              key={t.value}
              href={t.value === "pessoas" ? "/mensagens" : `/mensagens?aba=${t.value}`}
              aria-current={t.value === tab.value ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
                t.value === tab.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
              )}
            >
              {t.label}
              {unread > 0 && (
                <span className="rounded-full bg-foreground px-1.5 text-[10px] font-semibold text-background">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 px-4 py-3">
        {tab.type === "direct" && incoming.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Solicitações de conversa ({incoming.length})</h2>
            {incoming.map((r) => (
              <Card key={r.id} className="flex-row flex-wrap items-center gap-3 p-3">
                <UserAvatar name={r.from?.display_name} src={r.from?.avatar_url} />
                <div className="min-w-0 flex-1">
                  <Link href={`/membros/${r.from?.id}`} className="block truncate text-sm font-medium hover:underline">
                    {r.from?.display_name ?? "Motoqueira"}
                  </Link>
                  <p className="text-xs text-muted-foreground">quer conversar com você</p>
                </div>
                <ActionButton action={respondChatRequest.bind(null, r.id, true)} size="sm" pendingLabel="...">
                  Aceitar
                </ActionButton>
                <ActionButton action={respondChatRequest.bind(null, r.id, false)} size="sm" variant="outline" pendingLabel="...">
                  Recusar
                </ActionButton>
              </Card>
            ))}
          </section>
        )}

        {list.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {tab.type === "direct"
              ? "Nenhuma conversa privada ainda. Peça para conversar pelo perfil de uma motoqueira — a conversa só abre depois que ela aceitar."
              : tab.type === "group"
                ? "Entre em um grupo para conversar com as integrantes."
                : "Confirme presença em um rolê para entrar no chat dele."}
          </p>
        ) : (
          list.map((c) => (
            <Link key={c.id} href={`/mensagens/${c.id}`}>
              <Card className="flex-row items-center gap-3 p-3 transition-colors hover:bg-muted/40">
                <UserAvatar name={c.title} src={c.avatar_url} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={cn("truncate text-sm", c.unread_count > 0 ? "font-semibold" : "font-medium")}>{c.title}</p>
                    {c.last_at && <span className="shrink-0 text-[11px] text-muted-foreground">{formatMessageTime(c.last_at)}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn("truncate text-xs", c.unread_count > 0 ? "text-foreground" : "text-muted-foreground")}>{preview(c)}</p>
                    {c.unread_count > 0 && (
                      <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        {c.unread_count >= 100 ? "99+" : c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}

        {tab.type === "direct" && outgoing.length > 0 && (
          <section className="mt-2 flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-muted-foreground">Aguardando resposta</h2>
            {outgoing.map((r) => (
              <p key={r.id} className="text-sm text-muted-foreground">
                Solicitação enviada para {r.to?.display_name ?? "motoqueira"}
              </p>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
