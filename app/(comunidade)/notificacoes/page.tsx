import Link from "next/link";
import { PageHeader } from "@/components/common/page-header";
import { MarkReadButton } from "@/components/common/mark-read-button";
import { requireMember } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/types/domain";

export const metadata = { title: "Notificações" };

export default async function NotificacoesPage() {
  await requireMember();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const items = (data ?? []) as NotificationRow[];
  const hasUnread = items.some((n) => !n.read_at);

  return (
    <>
      <PageHeader title="Notificações" back="/inicio" action={hasUnread ? <MarkReadButton /> : undefined} />
      <div className="flex flex-col gap-2 p-4">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Você não tem notificações.
          </p>
        ) : (
          items.map((n) => {
            const body = (
              <div className={cn("rounded-lg border border-border p-3", !n.read_at && "border-primary/50 bg-primary/5")}>
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link}>
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })
        )}
      </div>
    </>
  );
}
