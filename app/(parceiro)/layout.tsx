import type { ReactNode } from "react";
import { BrandLogo } from "@/components/common/brand-logo";
import { PartnerNav } from "@/components/parceiros/partner-nav";
import { StatusBanner } from "@/components/parceiros/status-banner";
import { getPartnerContext } from "@/features/parceiros/context";
import { APP_NAME } from "@/lib/partners";

/**
 * Área do lojista — isolada da comunidade: sem chats, grupos, rolês ou perfis de
 * motoqueiras. O acesso exige uma linha em `partners` ligada ao usuário (as
 * policies do banco garantem o isolamento também na API).
 */
export default async function ParceiroLayout({ children }: { children: ReactNode }) {
  const { partner, planState, support } = await getPartnerContext();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <header className="flex items-center gap-3 px-4 pt-4">
        <BrandLogo size={44} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{APP_NAME} · Painel do parceiro</p>
          <p className="truncate text-lg font-semibold">{partner.trade_name}</p>
        </div>
      </header>
      <PartnerNav />
      <StatusBanner status={partner.status} reviewNote={partner.review_note} planState={planState} supportContact={support} />
      <main className="flex flex-1 flex-col gap-4 p-4 pb-10">{children}</main>
    </div>
  );
}
