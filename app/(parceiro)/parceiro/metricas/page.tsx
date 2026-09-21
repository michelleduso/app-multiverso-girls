import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SectionTitle, StatCard, StatGrid } from "@/components/common/stat-card";
import { getPartnerContext } from "@/features/parceiros/context";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata = { title: "Métricas" };

const PERIODS = [7, 30, 90];
const KINDS = [
  ["store_view", "Loja"],
  ["impression", "Exibições"],
  ["product_click", "Produto"],
  ["whatsapp_click", "WhatsApp"],
  ["site_click", "Site"],
] as const;

export default async function MetricasPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { dias } = await searchParams;
  const days = PERIODS.includes(Number(dias)) ? Number(dias) : 30;

  const { partner, plan } = await getPartnerContext();
  const supabase = await createClient();
  const full = Boolean(plan?.full_metrics);

  const [{ data: totals }, { data: byProduct }, { data: daily }, { data: products }] = await Promise.all([
    supabase.rpc("partner_metrics", { p_partner: partner.id, p_days: days }),
    full ? supabase.rpc("partner_product_metrics", { p_partner: partner.id, p_days: days }) : { data: [] },
    full ? supabase.rpc("partner_daily_metrics", { p_partner: partner.id, p_days: days }) : { data: [] },
    full ? supabase.from("products").select("id, name").eq("partner_id", partner.id) : { data: [] },
  ]);

  const t = new Map<string, number>(((totals ?? []) as { kind: string; total: number }[]).map((r) => [r.kind, Number(r.total)]));

  const names = new Map<string, string>(((products ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
  const perProduct = new Map<string, Map<string, number>>();
  for (const r of (byProduct ?? []) as { product_id: string; kind: string; total: number }[]) {
    if (!perProduct.has(r.product_id)) perProduct.set(r.product_id, new Map());
    perProduct.get(r.product_id)!.set(r.kind, Number(r.total));
  }

  const perDay = new Map<string, number>();
  for (const r of (daily ?? []) as { day: string; kind: string; total: number }[]) {
    if (["product_click", "whatsapp_click", "site_click"].includes(r.kind)) {
      perDay.set(r.day, (perDay.get(r.day) ?? 0) + Number(r.total));
    }
  }
  const maxDay = Math.max(1, ...perDay.values());

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Métricas</h1>
        <nav className="flex gap-1" aria-label="Período">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/parceiro/metricas?dias=${p}`}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                p === days ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
              )}
            >
              {p} dias
            </Link>
          ))}
        </nav>
      </div>
      <p className="text-sm text-muted-foreground">Contagens anônimas: não guardamos quem clicou.</p>

      <StatGrid>
        <StatCard label="Visualizações da loja" value={t.get("store_view") ?? 0} />
        <StatCard label="Exibições de produtos" value={t.get("impression") ?? 0} />
        <StatCard label="Cliques no produto" value={t.get("product_click") ?? 0} />
        <StatCard label="Cliques no WhatsApp" value={t.get("whatsapp_click") ?? 0} />
        <StatCard label="Cliques no site" value={t.get("site_click") ?? 0} />
      </StatGrid>

      {full ? (
        <>
          <SectionTitle>Por produto</SectionTitle>
          {perProduct.size === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados no período.</p>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-3 font-medium">Produto</th>
                    {KINDS.slice(1).map(([, label]) => (
                      <th key={label} className="p-3 text-right font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...perProduct.entries()].map(([id, kinds]) => (
                    <tr key={id} className="border-b border-border last:border-0">
                      <td className="max-w-[12rem] truncate p-3">{names.get(id) ?? "Produto removido"}</td>
                      {KINDS.slice(1).map(([kind]) => (
                        <td key={kind} className="p-3 text-right tabular-nums">
                          {kinds.get(kind) ?? 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <SectionTitle>Cliques por dia</SectionTitle>
          {perDay.size === 0 ? (
            <p className="text-sm text-muted-foreground">Sem cliques no período.</p>
          ) : (
            <ul className="flex flex-col gap-1.5" aria-label="Cliques por dia">
              {[...perDay.entries()].map(([day, n]) => (
                <li key={day} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0 text-muted-foreground">{day.split("-").reverse().slice(0, 2).join("/")}</span>
                  <span className="h-2 rounded bg-primary" style={{ width: `${Math.max(4, (n / maxDay) * 100)}%` }} />
                  <span className="tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          Métricas por produto e por dia fazem parte do Parceiro Destaque.
        </p>
      )}
    </>
  );
}
