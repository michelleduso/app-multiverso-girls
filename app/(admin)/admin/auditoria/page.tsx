import { Card } from "@/components/ui/card";
import { EmptyRow, PageTitle } from "@/components/admin/admin-ui";
import { ACOES_DE_MODERACAO } from "@/lib/constants/comunidade";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Auditoria" };

const LABELS: Record<string, string> = {
  profile_approved: "Cadastro aprovado",
  profile_rejected: "Cadastro recusado",
  partner_approved: "Parceiro aprovado",
  partner_rejected: "Parceiro recusado",
  partner_suspended: "Parceiro suspenso",
  partner_pending: "Parceiro voltou para análise",
  subscription_set: "Plano definido/alterado",
  product_paused: "Produto pausado",
  product_blocked: "Produto bloqueado",
  product_draft: "Produto liberado",
  setting_updated: "Configuração alterada",
};

type Entry = { key: string; at: string; who: string | null; what: string; detail: string };

export default async function AuditoriaPage() {
  const supabase = await createClient();
  const [{ data: audit }, { data: mod }] = await Promise.all([
    supabase.from("audit_log").select("id, admin_id, action, entity_type, entity_id, details, created_at").order("created_at", { ascending: false }).limit(60),
    supabase
      .from("moderation_actions")
      .select("id, action, reason, target_type, target_snapshot, created_at, admin:profiles!admin_id(display_name), affected:profiles!affected_user_id(display_name)")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const entries: Entry[] = [
    ...((audit ?? []) as { id: number; action: string; entity_type: string; entity_id: string | null; details: Record<string, unknown>; created_at: string }[]).map((a) => ({
      key: `a${a.id}`,
      at: a.created_at,
      who: null,
      what: LABELS[a.action] ?? a.action,
      detail: [a.entity_type, a.entity_id?.slice(0, 8), a.details?.reason, a.details?.plan && `plano ${a.details.plan}`, a.details?.status && `status ${a.details.status}`]
        .filter(Boolean)
        .join(" · "),
    })),
    ...((mod ?? []) as unknown as { id: string; action: string; reason: string; target_type: string | null; target_snapshot: string | null; created_at: string; admin: { display_name: string } | null; affected: { display_name: string } | null }[]).map((m) => ({
      key: `m${m.id}`,
      at: m.created_at,
      who: m.admin?.display_name ?? null,
      what: `Moderação: ${ACOES_DE_MODERACAO[m.action as keyof typeof ACOES_DE_MODERACAO] ?? m.action}`,
      detail: [m.affected?.display_name ?? m.target_snapshot, m.reason].filter(Boolean).join(" · "),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <PageTitle title="Auditoria" hint="Registro imutável de tudo que a administração fez (últimas 120 ações)." />
      {entries.length === 0 ? (
        <EmptyRow>Nenhuma ação registrada ainda.</EmptyRow>
      ) : (
        entries.slice(0, 120).map((e) => (
          <Card key={e.key} className="gap-0.5 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{e.what}</strong>
              <span className="text-xs text-muted-foreground">{formatDateTime(e.at)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {e.who ? `por ${e.who} · ` : ""}
              {e.detail}
            </p>
          </Card>
        ))
      )}
    </>
  );
}
