import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/admin/admin-ui";
import { PartnerReviewActions, ProductAdminActions } from "@/components/admin/entity-actions";
import { SubscriptionForm } from "@/components/admin/subscription-form";
import { SectionTitle, StatCard, StatGrid } from "@/components/common/stat-card";
import { PRODUCT_SELECT } from "@/features/parceiros/queries";
import { categoriaParceiro, STATUS_ASSINATURA, STATUS_PARCEIRO, STATUS_PRODUTO } from "@/lib/constants/parceiros";
import { formatDateTime, splitStartsAt } from "@/lib/format";
import { formatPrice, subscriptionState } from "@/lib/partners";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";
import type { PartnerRow, PlanRow, ProductRow, SubscriptionRow } from "@/types/domain";

export const metadata = { title: "Parceiro (admin)" };

export default async function AdminParceiroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("partners").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const p = data as PartnerRow;

  const [{ data: sub }, { data: plans }, { data: notes }, { data: products }, { data: metrics }] = await Promise.all([
    supabase.from("partner_subscriptions").select("partner_id, plan_id, status, starts_at, ends_at").eq("partner_id", id).maybeSingle(),
    supabase.from("plans").select("*").order("sort"),
    supabase.from("partner_admin_notes").select("notes").eq("partner_id", id).maybeSingle(),
    supabase.from("products").select(PRODUCT_SELECT).eq("partner_id", id).order("created_at", { ascending: false }),
    supabase.rpc("partner_metrics", { p_partner: id, p_days: 30 }),
  ]);
  const subscription = (sub as SubscriptionRow | null) ?? null;
  const st = subscriptionState(subscription);
  const m = new Map<string, number>(((metrics ?? []) as { kind: string; total: number }[]).map((r) => [r.kind, Number(r.total)]));

  return (
    <>
      <Link href="/admin/parceiros" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Parceiros
      </Link>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={p.status === "approved" ? "ok" : p.status === "pending" ? "warn" : "bad"}>{STATUS_PARCEIRO[p.status]}</Pill>
            <Pill tone={st.inForce ? "ok" : "warn"}>Plano: {STATUS_ASSINATURA[st.state]}</Pill>
          </div>
          <CardTitle>{p.trade_name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {(
              [
                ["Razão social", p.legal_name],
                ["CNPJ", p.cnpj ?? "não informado"],
                ["Responsável", p.responsible],
                ["E-mail", p.email],
                ["Telefone", p.phone ?? "—"],
                ["WhatsApp", p.whatsapp ?? "—"],
                ["Instagram", p.instagram ? `@${p.instagram}` : "—"],
                ["Site", p.website ?? "—"],
                ["Categoria", categoriaParceiro(p.category)],
                ["Cidade", `${p.city}/${p.state}`],
                ["Cadastro", formatDateTime(p.created_at)],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">{k}</dt>
                <dd className="min-w-0 break-words">{v}</dd>
              </div>
            ))}
          </dl>
          {p.description && <p className="text-muted-foreground">{p.description}</p>}
          {p.review_note && <p className="text-xs text-muted-foreground">Última decisão: {p.review_note}</p>}
          <PartnerReviewActions partnerId={p.id} status={p.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plano e vencimento</CardTitle>
        </CardHeader>
        <CardContent>
          <SubscriptionForm
            partnerId={p.id}
            plans={(plans ?? []) as PlanRow[]}
            initial={{
              plan_id: subscription?.plan_id ?? "basic",
              status: subscription?.status ?? "active",
              starts_at: subscription ? splitStartsAt(subscription.starts_at).date : "",
              ends_at: subscription?.ends_at ? splitStartsAt(subscription.ends_at).date : "",
              notes: (notes?.notes as string | undefined) ?? "",
            }}
          />
        </CardContent>
      </Card>

      <SectionTitle>Métricas (30 dias)</SectionTitle>
      <StatGrid>
        <StatCard label="Visualizações da loja" value={m.get("store_view") ?? 0} />
        <StatCard label="Cliques no produto" value={m.get("product_click") ?? 0} />
        <StatCard label="Cliques no WhatsApp" value={m.get("whatsapp_click") ?? 0} />
        <StatCard label="Cliques no site" value={m.get("site_click") ?? 0} />
      </StatGrid>

      <SectionTitle>Produtos ({(products ?? []).length})</SectionTitle>
      {((products ?? []) as ProductRow[]).map((pr) => (
        <Card key={pr.id} className="gap-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{pr.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatPrice(pr.sale_price ?? pr.price) ?? "sem preço"}
                {pr.is_featured ? " · destaque" : ""}
                {pr.external_url ? ` · ${pr.external_url}` : ""}
              </p>
            </div>
            <Pill tone={pr.status === "active" ? "ok" : pr.status === "blocked" ? "bad" : "muted"}>{STATUS_PRODUTO[pr.status]}</Pill>
          </div>
          <ProductAdminActions productId={pr.id} status={pr.status} />
        </Card>
      ))}
    </>
  );
}
