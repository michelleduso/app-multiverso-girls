"use client";

import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/common/action-button";
import { resubmitPartner } from "@/features/parceiros/actions";
import { APP_NAME } from "@/lib/partners";
import type { SubscriptionState } from "@/lib/partners";

/** Avisos de status da loja/plano no topo do painel do parceiro. */
export function StatusBanner({
  status,
  reviewNote,
  planState,
  supportContact,
}: {
  status: string;
  reviewNote: string | null;
  planState: SubscriptionState;
  supportContact: { email?: string; whatsapp?: string };
}) {
  const router = useRouter();
  const contact = [supportContact.email, supportContact.whatsapp].filter(Boolean).join(" · ");

  if (status === "pending") {
    return <Banner tone="info">Seu cadastro está em análise. Você já pode preparar a loja; a publicação só é liberada após a aprovação.</Banner>;
  }
  if (status === "rejected") {
    return (
      <Banner tone="danger">
        <p>Seu cadastro não foi aprovado.{reviewNote ? ` Motivo: ${reviewNote}` : ""} Ajuste os dados em “Minha loja” e reenvie para análise.</p>
        <ActionButton action={resubmitPartner} size="sm" className="mt-2" pendingLabel="Reenviando..." onDone={() => router.refresh()}>
          Reenviar para análise
        </ActionButton>
      </Banner>
    );
  }
  if (status === "suspended") {
    return (
      <Banner tone="danger">
        Sua loja está suspensa{reviewNote ? `: ${reviewNote}` : "."} Entre em contato com a equipe {APP_NAME}.{contact ? ` (${contact})` : ""}
      </Banner>
    );
  }
  if (planState === "expired") {
    return (
      <Banner tone="warn">
        Seu plano expirou. Entre em contato com a equipe {APP_NAME} para renovar.{contact ? ` (${contact})` : ""} Seus produtos foram
        mantidos e voltam ao ar assim que o plano for renovado.
      </Banner>
    );
  }
  if (planState === "suspended") {
    return <Banner tone="warn">Seu plano está suspenso. Entre em contato com a equipe {APP_NAME}.{contact ? ` (${contact})` : ""}</Banner>;
  }
  if (planState === "none" || planState === "scheduled") {
    return (
      <Banner tone="info">
        Sua loja foi aprovada! Falta a equipe {APP_NAME} ativar o seu plano para você publicar produtos.{contact ? ` Contato: ${contact}` : ""}
      </Banner>
    );
  }
  return null;
}

function Banner({ tone, children }: { tone: "info" | "warn" | "danger"; children: React.ReactNode }) {
  const styles = {
    info: "border-primary/40 bg-primary/10",
    warn: "border-amber-500/50 bg-amber-500/10 text-amber-100",
    danger: "border-destructive/50 bg-destructive/10",
  } as const;
  return (
    <div role="status" className={`mx-4 mt-4 rounded-lg border p-3 text-sm ${styles[tone]}`}>
      {children}
    </div>
  );
}
