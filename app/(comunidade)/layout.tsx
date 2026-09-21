import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { getCurrentUser } from "@/lib/auth";

/**
 * Área da comunidade: exige sessão ativa E perfil aprovado (sem suspensão em
 * vigor). Pendente, recusada, suspensa ou banida caem em /aguardando. A RLS do
 * banco aplica a mesma regra (is_active_member) — este gate é só a experiência.
 */
export default async function ComunidadeLayout({ children }: { children: ReactNode }) {
  const me = await getCurrentUser();

  if (!me) redirect("/entrar");
  if (me.partner) redirect("/parceiro");
  if (!me.active) redirect("/aguardando");

  return <MobileShell>{children}</MobileShell>;
}
