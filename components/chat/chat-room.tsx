"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, Loader2, Pin, PinOff, Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/common/user-avatar";
import { ReportButton } from "@/components/moderacao/report-button";
import { ChatImage } from "@/components/chat/chat-image";
import { blockUser } from "@/features/moderacao/actions";
import { formatMessageTime } from "@/lib/format";
import { compressImage, extensionFor } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { MessageRow, ProfileLite } from "@/types/domain";

const PAGE_SIZE = 30;
const EMOJIS = ["😀", "😂", "😍", "🥰", "👍", "🙌", "🔥", "🏍️", "💜", "🛣️", "☕", "🎉"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Kind = "direct" | "group" | "ride";

export function ChatRoom({
  conversationId,
  meId,
  kind,
  canModerate,
  canSend,
  initialMessages,
  initialHasMore,
  profiles: initialProfiles,
  otherLastReadAt: initialOtherRead,
  initialPinned,
}: {
  conversationId: string;
  meId: string;
  kind: Kind;
  /** organizadora do rolê / administradora do grupo: fixa e apaga mensagens alheias */
  canModerate: boolean;
  canSend: boolean;
  initialMessages: MessageRow[];
  initialHasMore: boolean;
  profiles: Record<string, ProfileLite>;
  otherLastReadAt: string | null;
  initialPinned: MessageRow | null;
}) {
  const [supabase] = useState(() => createClient());
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [otherRead, setOtherRead] = useState(initialOtherRead);
  const [pinned, setPinned] = useState<MessageRow | null>(initialPinned);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [error, setError] = useState<string>();

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const prevHeight = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const requestedProfiles = useRef(new Set(Object.keys(initialProfiles)));

  const markRead = useCallback(() => {
    void supabase.rpc("mark_conversation_read", { p_conversation: conversationId });
  }, [supabase, conversationId]);

  const upsertMessage = useCallback((m: MessageRow) => {
    setMessages((prev) => {
      const idx = prev.findIndex((x) => x.id === m.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = m;
        return next;
      }
      return [...prev, m].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }, []);

  const ensureProfile = useCallback(
    async (id: string | null) => {
      if (!id || requestedProfiles.current.has(id)) return;
      requestedProfiles.current.add(id);
      const { data } = await supabase.from("profiles").select("id, display_name, avatar_url").eq("id", id).maybeSingle();
      if (data) setProfiles((p) => ({ ...p, [id]: data as ProfileLite }));
    },
    [supabase]
  );

  // Marca como lida ao abrir.
  useEffect(() => {
    markRead();
  }, [markRead]);

  // Tempo real: RLS também vale para o Realtime — só chegam eventos de conversas às quais tenho acesso.
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as MessageRow;
          upsertMessage(m);
          if (payload.eventType === "INSERT" && m.sender_id !== meId) {
            void ensureProfile(m.sender_id);
            markRead();
          }
          if (payload.eventType === "UPDATE" && m.deleted_at) {
            setPinned((p) => (p?.id === m.id ? null : p));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_reads", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const r = payload.new as { user_id: string; last_read_at: string };
          if (r.user_id !== meId) setOtherRead(r.last_read_at);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${conversationId}` },
        async (payload) => {
          const pinnedId = (payload.new as { pinned_message_id: string | null }).pinned_message_id;
          if (!pinnedId) return setPinned(null);
          const { data } = await supabase.from("messages").select("*").eq("id", pinnedId).maybeSingle();
          setPinned((data as MessageRow | null) ?? null);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, meId, upsertMessage, ensureProfile, markRead]);

  // Rolagem: cola no fim para novas mensagens; preserva posição ao carregar antigas.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prevHeight.current != null) {
      el.scrollTop = el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  async function loadOlder() {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    const oldest = messages[0].created_at;
    const { data } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, image_path, created_at, deleted_at")
      .eq("conversation_id", conversationId)
      .lt("created_at", oldest)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1);
    const rows = (data ?? []) as MessageRow[];
    setHasMore(rows.length > PAGE_SIZE);
    const page = rows.slice(0, PAGE_SIZE).reverse();
    prevHeight.current = scrollRef.current?.scrollHeight ?? null;
    stickToBottom.current = false;
    setMessages((prev) => [...page, ...prev]);
    page.forEach((m) => void ensureProfile(m.sender_id));
    setLoadingOlder(false);
  }

  async function send(payload: { body?: string; image_path?: string }) {
    setSending(true);
    setError(undefined);
    const { data, error: err } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: meId, ...payload })
      .select("id, conversation_id, sender_id, body, image_path, created_at, deleted_at")
      .single();
    setSending(false);
    if (err || !data) {
      setError("Não foi possível enviar. Você pode ter sido bloqueada ou perdido o acesso a esta conversa.");
      return false;
    }
    stickToBottom.current = true;
    upsertMessage(data as MessageRow);
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    if (body.length > 2000) return setError("A mensagem pode ter até 2000 caracteres.");
    if (await send({ body })) {
      setText("");
      setShowEmoji(false);
    }
  }

  async function onImage(original: File | undefined) {
    if (!original) return;
    if (!IMAGE_TYPES.includes(original.type)) return setError("Use uma imagem JPG, PNG ou WebP.");
    setSending(true);
    setError(undefined);
    const file = await compressImage(original, 1400);
    if (file.size > 5 * 1024 * 1024) {
      setSending(false);
      return setError("A imagem deve ter até 5 MB.");
    }
    const path = `${conversationId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
    const { error: upErr } = await supabase.storage.from("chat-images").upload(path, file, { contentType: file.type });
    setSending(false);
    if (upErr) return setError("Não foi possível enviar a imagem.");
    await send({ image_path: path });
  }

  async function deleteMessage(id: string) {
    if (!window.confirm("Apagar esta mensagem?")) return;
    const { error: err } = await supabase.rpc("delete_message", { p_message: id });
    if (err) setError("Não foi possível apagar a mensagem.");
  }

  async function pin(id: string | null) {
    const { error: err } = await supabase.rpc("pin_message", { p_conversation: conversationId, p_message: id });
    if (err) return setError("Não foi possível fixar a mensagem.");
    if (id === null) return setPinned(null);
    const m = messages.find((x) => x.id === id);
    if (m) setPinned(m);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {pinned && !pinned.deleted_at && (
        <div className="flex items-start gap-2 border-b border-border bg-primary/10 px-4 py-2 text-sm">
          <Pin className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary">Mensagem fixada</p>
            <p className="whitespace-pre-line break-words">{pinned.body ?? "📷 Imagem"}</p>
          </div>
          {canModerate && (
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Desafixar" onClick={() => pin(null)}>
              <PinOff />
            </Button>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3"
      >
        {hasMore && (
          <Button type="button" variant="ghost" size="sm" className="mx-auto" disabled={loadingOlder} onClick={loadOlder}>
            {loadingOlder ? <Loader2 className="animate-spin" /> : null} Ver mensagens anteriores
          </Button>
        )}
        {messages.length === 0 && (
          <p className="m-auto text-center text-sm text-muted-foreground">Nenhuma mensagem ainda. Diga oi! 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          const sender = m.sender_id ? profiles[m.sender_id] : undefined;
          const read = mine && kind === "direct" && otherRead != null && otherRead >= m.created_at;
          return (
            <div key={m.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
              {!mine && kind !== "direct" && (
                <UserAvatar name={sender?.display_name} src={sender?.avatar_url} size="sm" />
              )}
              <div className={cn("group flex max-w-[80%] flex-col", mine ? "items-end" : "items-start")}>
                {!mine && kind !== "direct" && (
                  <Link href={m.sender_id ? `/membros/${m.sender_id}` : "#"} className="mb-0.5 text-xs text-muted-foreground hover:underline">
                    {sender?.display_name ?? "Motoqueira"}
                  </Link>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm",
                    mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-card",
                    m.deleted_at && "italic opacity-60"
                  )}
                >
                  {m.deleted_at ? (
                    "🚫 Mensagem apagada"
                  ) : (
                    <>
                      {m.image_path && <ChatImage path={m.image_path} />}
                      {m.body && <p className="whitespace-pre-line break-words">{m.body}</p>}
                    </>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{formatMessageTime(m.created_at)}</span>
                  {mine && kind === "direct" && !m.deleted_at && <span>{read ? "✓✓ Lida" : "✓ Enviada"}</span>}
                  {!m.deleted_at && (
                    <details className="relative">
                      <summary className="cursor-pointer list-none px-1 hover:text-foreground" aria-label="Opções da mensagem">
                        ⋯
                      </summary>
                      <div
                        className={cn(
                          "absolute bottom-full z-20 mb-1 flex w-52 flex-col gap-1 rounded-lg border border-border bg-popover p-2 shadow-lg",
                          mine ? "right-0" : "left-0"
                        )}
                      >
                        {(mine || canModerate) && (
                          <Button type="button" variant="ghost" size="sm" className="justify-start" onClick={() => deleteMessage(m.id)}>
                            Apagar
                          </Button>
                        )}
                        {canModerate && (
                          <Button type="button" variant="ghost" size="sm" className="justify-start" onClick={() => pin(m.id)}>
                            <Pin /> Fixar
                          </Button>
                        )}
                        {!mine && m.sender_id && (
                          <>
                            <ReportButton targetType="message" targetId={m.id} label="Denunciar mensagem" compact />
                            <BlockInline userId={m.sender_id} name={sender?.display_name} />
                          </>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {canSend ? (
        <form
          onSubmit={onSubmit}
          className="border-t border-border bg-background px-3 py-2"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          {showEmoji && (
            <div className="mb-2 flex flex-wrap gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="rounded-md p-1.5 text-xl hover:bg-muted"
                  onClick={() => setText((t) => t + e)}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          {error && (
            <p role="alert" className="mb-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="flex items-end gap-1">
            <Button type="button" variant="ghost" size="icon" aria-label="Emojis" onClick={() => setShowEmoji((v) => !v)}>
              <Smile />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label="Enviar imagem" disabled={sending} onClick={() => fileRef.current?.click()}>
              <ImagePlus />
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                void onImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder="Escreva uma mensagem"
              aria-label="Mensagem"
              className="max-h-28 min-h-8 flex-1 resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
            />
            <Button type="submit" size="icon" aria-label="Enviar" disabled={sending || !text.trim()}>
              <Send />
            </Button>
          </div>
        </form>
      ) : (
        <p className="border-t border-border px-4 py-3 text-center text-sm text-muted-foreground">
          Você não pode enviar mensagens nesta conversa.
        </p>
      )}
    </div>
  );
}

function BlockInline({ userId, name }: { userId: string; name?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="justify-start text-destructive"
      disabled={done}
      onClick={async () => {
        if (!window.confirm(`Bloquear ${name ?? "esta pessoa"}? Vocês não poderão mais trocar mensagens.`)) return;
        const res = await blockUser(userId);
        if (!res.error) setDone(true);
      }}
    >
      {done ? "Bloqueada" : "Bloquear"}
    </Button>
  );
}
