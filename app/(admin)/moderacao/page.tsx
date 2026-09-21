import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { motivoDeDenuncia, TIPOS_DE_DENUNCIA } from "@/lib/constants/comunidade";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ReportRow } from "@/types/domain";

export const metadata = { title: "Central de Moderação" };

type ReportListRow = ReportRow & {
  reporter: { display_name: string } | null;
  reported: { display_name: string } | null;
};

const PRIORITY_RANK = { alta: 0, media: 1, baixa: 2 } as const;
const PRIORITY_STYLE = {
  alta: "bg-destructive/15 text-destructive",
  media: "bg-amber-500/15 text-amber-300",
  baixa: "bg-muted text-muted-foreground",
} as const;

const FILTERS = [
  { value: "open", label: "Abertas" },
  { value: "resolved", label: "Resolvidas" },
  { value: "dismissed", label: "Ignoradas" },
] as const;

export default async function CentralModeracaoPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = FILTERS.find((f) => f.value === status)?.value ?? "open";

  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(
      "id, reporter_id, reported_user_id, target_type, target_id, reason, description, snapshot, priority, status, created_at, resolved_at, reporter:profiles!reporter_id(display_name), reported:profiles!reported_user_id(display_name)"
    )
    .eq("status", filter)
    .order("created_at", { ascending: filter === "open" })
    .limit(100);

  const reports = ((data ?? []) as unknown as ReportListRow[]).sort(
    (a, b) => (filter === "open" ? PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] : 0)
  );

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold">🛡️ Central de Moderação</h1>
        <p className="text-sm text-muted-foreground">Denúncias ordenadas por prioridade e depois pelas mais antigas.</p>
      </header>

      <nav className="flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/moderacao?status=${f.value}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium",
              f.value === filter ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {reports.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma denúncia {FILTERS.find((f) => f.value === filter)?.label.toLowerCase()}.
        </p>
      ) : (
        reports.map((r) => (
          <Link key={r.id} href={`/moderacao/${r.id}`}>
            <Card className="gap-2 p-4 transition-colors hover:bg-muted/40">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="ghost" className={PRIORITY_STYLE[r.priority]}>
                    Prioridade {r.priority}
                  </Badge>
                  <Badge variant="outline">{TIPOS_DE_DENUNCIA[r.target_type]}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span>
              </div>
              <p className="text-sm font-semibold">{motivoDeDenuncia(r.reason)}</p>
              {r.snapshot && <p className="line-clamp-2 text-sm text-muted-foreground">“{r.snapshot}”</p>}
              <p className="text-xs text-muted-foreground">
                Denunciada: <strong className="text-foreground">{r.reported?.display_name ?? "—"}</strong> · Denunciante:{" "}
                {r.reporter?.display_name ?? "—"}
              </p>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
