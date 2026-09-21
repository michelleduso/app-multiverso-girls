import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SectionTitle, StatCard, StatGrid } from "@/components/common/stat-card";
import { getPartnerContext } from "@/features/parceiros/context";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard do parceiro" };

export default async function ParceiroDashboardPage() {
  const { partner, live, plan } = await getPartnerContext();
  const supabase = await createClient();

  const [{ data: metrics }, { count: activeProducts }] = await Promise.all([
    supabase.rpc("partner_metrics", { p_partner: partner.id, p_days: 30 }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("partner_id", partner.id).eq("status", "active"),
  ]);
  const m = new Map<string, number>(((metrics ?? []) as { kind: string; total: number }[]).map((r) => [r.kind, Number(r.total)]));

  return (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Últimos 30 dias · dados anônimos, sem identificar as motoqueiras.</p>
        </div>
        <p className={live ? "text-sm text-emerald-300" : "text-sm text-amber-300"}>{live ? "● Loja no ar" : "● Loja fora do ar"}</p>
      </div>

      <StatGrid>
        <StatCard label="Visualizações da loja" value={m.get("store_view") ?? 0} />
        <StatCard label="Visualizações dos produtos" value={m.get("impression") ?? 0} />
        <StatCard label="Cliques no produto" value={m.get("product_click") ?? 0} />
        <StatCard label="Cliques no WhatsApp" value={m.get("whatsapp_click") ?? 0} />
        <StatCard label="Cliques no site" value={m.get("site_click") ?? 0} />
        <StatCard label="Produtos ativos" value={activeProducts ?? 0} hint={plan ? `limite do plano: ${plan.max_products}` : "sem plano ativo"} />
      </StatGrid>

      <SectionTitle>Atalhos</SectionTitle>
      <div className="flex flex-wrap gap-2">
        <Link href="/parceiro/produtos/novo" className={buttonVariants()}>
          Novo produto
        </Link>
        <Link href="/parceiro/previa" className={buttonVariants({ variant: "outline" })}>
          Ver minha página pública
        </Link>
        <Link href="/parceiro/loja" className={buttonVariants({ variant: "outline" })}>
          Editar loja
        </Link>
      </div>
    </>
  );
}
