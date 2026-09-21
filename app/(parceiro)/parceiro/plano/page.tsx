import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPartnerContext } from "@/features/parceiros/context";
import { STATUS_ASSINATURA } from "@/lib/constants/parceiros";
import { formatDateTime } from "@/lib/format";
import { APP_NAME, daysUntil } from "@/lib/partners";

export const metadata = { title: "Meu plano" };

export default async function MeuPlanoPage() {
  const { plan, plans, subscription, planState, support } = await getPartnerContext();
  const left = daysUntil(subscription?.ends_at);
  const contact = [support.email, support.whatsapp].filter(Boolean).join(" · ");

  return (
    <>
      <h1 className="text-xl font-bold">Meu plano</h1>

      <Card className="gap-2 p-4">
        {plan && subscription ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg font-semibold">{plan.name}</p>
              <Badge variant={planState === "active" || planState === "trial" ? "default" : "destructive"}>
                {STATUS_ASSINATURA[planState]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Início: {formatDateTime(subscription.starts_at)}</p>
            <p className="text-sm text-muted-foreground">
              Vencimento: {subscription.ends_at ? formatDateTime(subscription.ends_at) : "sem data de vencimento"}
              {left != null && left > 0 && left <= 15 ? ` · vence em ${left} dia(s)` : ""}
            </p>
            {planState === "expired" && (
              <p className="text-sm text-amber-200">
                Seu plano expirou. Entre em contato com a equipe {APP_NAME} para renovar. Seus produtos não foram excluídos.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Você ainda não tem um plano ativo. A equipe {APP_NAME} ativa o plano após combinar com você.</p>
        )}
        <p className="text-xs text-muted-foreground">
          Pagamentos são combinados diretamente com a equipe — não há cobrança automática no app.
          {contact ? ` Contato: ${contact}` : ""}
        </p>
      </Card>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Planos disponíveis</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className={p.id === plan?.id ? "gap-2 border-primary p-4" : "gap-2 p-4"}>
            <p className="font-semibold">{p.name}</p>
            <ul className="flex flex-col gap-1 text-sm">
              <li className="flex items-center gap-1.5">
                <Check className="size-4 text-emerald-300" /> Até {p.max_products} produtos
              </li>
              {(
                [
                  [true, "Página da loja, WhatsApp e site"],
                  [p.can_feature, "Produtos em destaque"],
                  [p.can_promote, "Promoções"],
                  [p.in_spotlight, "Seção “Parceiros em destaque”"],
                  [p.full_metrics, "Métricas completas"],
                ] as const
              ).map(([on, label]) => (
                <li key={label} className={on ? "flex items-center gap-1.5" : "flex items-center gap-1.5 text-muted-foreground"}>
                  {on ? <Check className="size-4 text-emerald-300" /> : <X className="size-4" />} {label}
                </li>
              ))}
            </ul>
            {p.id === "premium" && <p className="text-xs text-muted-foreground">Benefícios finais em definição.</p>}
          </Card>
        ))}
      </div>
    </>
  );
}
