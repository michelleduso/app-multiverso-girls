import { PageHeader } from "@/components/common/page-header";
import { UserAvatar } from "@/components/common/user-avatar";
import { BlockButton } from "@/components/moderacao/block-button";
import { requireMember } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Pessoas bloqueadas" };

type Blocked = { user_id: string; display_name: string; avatar_url: string | null; blocked_at: string };

export default async function BloqueadasPage() {
  await requireMember();
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_blocked");
  const blocked = (data ?? []) as Blocked[];

  return (
    <>
      <PageHeader title="Pessoas bloqueadas" back="/perfil" />
      <div className="flex flex-col gap-3 p-4">
        <p className="text-sm text-muted-foreground">
          Pessoas bloqueadas não conseguem te enviar mensagens nem solicitações, e você não vê as mensagens delas.
        </p>
        {blocked.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Você não bloqueou ninguém.
          </p>
        ) : (
          blocked.map((b) => (
            <div key={b.user_id} className="flex items-center gap-3">
              <UserAvatar name={b.display_name} src={b.avatar_url} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{b.display_name}</p>
                <p className="text-xs text-muted-foreground">desde {formatDateTime(b.blocked_at)}</p>
              </div>
              <BlockButton userId={b.user_id} blocked />
            </div>
          ))
        )}
      </div>
    </>
  );
}
