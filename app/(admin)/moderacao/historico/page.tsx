import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ACOES_DE_MODERACAO } from "@/lib/constants/comunidade";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ModerationActionRow } from "@/types/domain";

export const metadata = { title: "Histórico de moderação" };

type Row = ModerationActionRow & {
  admin: { display_name: string } | null;
  affected: { display_name: string } | null;
};

export default async function HistoricoModeracaoPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("moderation_actions")
    .select(
      "id, admin_id, action, affected_user_id, report_id, target_type, target_snapshot, reason, suspended_until, created_at, admin:profiles!admin_id(display_name), affected:profiles!affected_user_id(display_name)"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  const actions = (data ?? []) as unknown as Row[];

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">Histórico de moderação</h1>
        <p className="text-sm text-muted-foreground">
          Registro imutável: administradora, ação, usuária afetada, motivo e data/hora.
        </p>
      </header>

      {actions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma ação registrada.
        </p>
      ) : (
        actions.map((a) => (
          <Card key={a.id} className="gap-1 p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <strong>{ACOES_DE_MODERACAO[a.action as keyof typeof ACOES_DE_MODERACAO] ?? a.action}</strong>
              <span className="text-xs text-muted-foreground">{formatDateTime(a.created_at)}</span>
            </div>
            <p className="text-muted-foreground">
              Administradora: <span className="text-foreground">{a.admin?.display_name ?? "—"}</span> · Afetada:{" "}
              <span className="text-foreground">{a.affected?.display_name ?? a.target_snapshot ?? "—"}</span>
            </p>
            {a.suspended_until && <p className="text-muted-foreground">Suspensa até {formatDateTime(a.suspended_until)}</p>}
            <p>Motivo: {a.reason}</p>
            {a.report_id && (
              <Link href={`/moderacao/${a.report_id}`} className="text-xs text-primary hover:underline">
                Ver denúncia
              </Link>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
