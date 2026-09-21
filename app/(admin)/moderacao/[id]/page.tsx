import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModerationForm } from "@/components/moderacao/moderation-form";
import { ACOES_DE_MODERACAO, motivoDeDenuncia, TIPOS_DE_DENUNCIA } from "@/lib/constants/comunidade";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { ModerationActionRow, ReportRow } from "@/types/domain";

export const metadata = { title: "Denúncia" };

type Detail = ReportRow & {
  reporter: { display_name: string } | null;
  reported: { display_name: string; status: string } | null;
};

export default async function DenunciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, reporter_id, reported_user_id, target_type, target_id, reason, description, snapshot, priority, status, created_at, resolved_at, reporter:profiles!reporter_id(display_name), reported:profiles!reported_user_id(display_name, status)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const report = data as unknown as Detail;

  // histórico da denunciada: outras denúncias + ações de moderação anteriores
  const [{ data: others }, { data: history }, { data: thisActions }] = report.reported_user_id
    ? await Promise.all([
        supabase
          .from("reports")
          .select("id, reason, target_type, status, created_at")
          .eq("reported_user_id", report.reported_user_id)
          .neq("id", id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("moderation_actions")
          .select("id, action, reason, created_at, suspended_until, admin:profiles!admin_id(display_name)")
          .eq("affected_user_id", report.reported_user_id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("moderation_actions")
          .select("id, action, reason, created_at, admin:profiles!admin_id(display_name)")
          .eq("report_id", id),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const hasUser = Boolean(report.reported_user_id);
  const availableActions: (keyof typeof ACOES_DE_MODERACAO)[] = ["ignore"];
  if (hasUser) availableActions.push("warn");
  if (["message", "ride", "profile"].includes(report.target_type)) availableActions.push("remove_content");
  if (report.target_type === "group") availableActions.push("suspend_group", "delete_group");
  if (hasUser) availableActions.push("suspend_user", "ban_user");

  type Act = (ModerationActionRow & { admin: { display_name: string } | null });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/moderacao" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Central de Moderação
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={report.priority === "alta" ? "destructive" : "secondary"}>Prioridade {report.priority}</Badge>
            <Badge variant="outline">{TIPOS_DE_DENUNCIA[report.target_type]}</Badge>
            <Badge variant="outline">
              {report.status === "open" ? "Aberta" : report.status === "resolved" ? "Resolvida" : "Ignorada"}
            </Badge>
          </div>
          <CardTitle>{motivoDeDenuncia(report.reason)}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {report.snapshot && (
            <p className="rounded-lg bg-muted/50 p-3">
              <span className="block text-xs text-muted-foreground">Conteúdo denunciado</span>“{report.snapshot}”
            </p>
          )}
          {report.description && (
            <p>
              <span className="block text-xs text-muted-foreground">Relato da denunciante</span>
              {report.description}
            </p>
          )}
          <p className="text-muted-foreground">
            Denunciada: <strong className="text-foreground">{report.reported?.display_name ?? "—"}</strong>
            {report.reported?.status && report.reported.status !== "approved" ? ` (${report.reported.status})` : ""}
          </p>
          <p className="text-muted-foreground">
            Denunciante: <strong className="text-foreground">{report.reporter?.display_name ?? "—"}</strong>
          </p>
          <p className="text-muted-foreground">Enviada em {formatDateTime(report.created_at)}</p>
        </CardContent>
      </Card>

      {report.status === "open" ? (
        <Card>
          <CardHeader>
            <CardTitle>Decisão</CardTitle>
          </CardHeader>
          <CardContent>
            <ModerationForm reportId={id} actions={availableActions} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Decisão registrada</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {((thisActions ?? []) as unknown as Act[]).map((a) => (
              <p key={a.id}>
                <strong>{ACOES_DE_MODERACAO[a.action as keyof typeof ACOES_DE_MODERACAO] ?? a.action}</strong> por{" "}
                {a.admin?.display_name ?? "—"} em {formatDateTime(a.created_at)} — {a.reason}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {hasUser && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico da denunciada</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Outras denúncias ({others?.length ?? 0})</p>
              {(others ?? []).length === 0 && <p className="text-muted-foreground">Nenhuma.</p>}
              {(others ?? []).map((o) => (
                <Link key={o.id as string} href={`/moderacao/${o.id}`} className="block hover:underline">
                  {formatDateTime(o.created_at as string)} · {motivoDeDenuncia(o.reason as string)} · {o.status as string}
                </Link>
              ))}
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Ações de moderação anteriores</p>
              {(history ?? []).length === 0 && <p className="text-muted-foreground">Nenhuma.</p>}
              {((history ?? []) as unknown as Act[]).map((a) => (
                <p key={a.id}>
                  {formatDateTime(a.created_at)} · <strong>{ACOES_DE_MODERACAO[a.action as keyof typeof ACOES_DE_MODERACAO] ?? a.action}</strong>{" "}
                  por {a.admin?.display_name ?? "—"} — {a.reason}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
