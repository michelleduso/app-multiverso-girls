import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/common/brand-logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { getCurrentUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/partners";

/**
 * Painel administrativo — exige vínculo com `admin_users` (não basta estar
 * logada). Cada RPC/consulta revalida o papel no banco (RLS + is_admin()).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await getCurrentUser();

  if (!me) redirect("/entrar");
  if (!me.isAdmin) redirect(me.partner ? "/parceiro" : "/inicio");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <p className="flex items-center gap-2 font-semibold">
          <BrandLogo size={36} /> {APP_NAME} · Admin
        </p>
        <a href="/inicio" className="text-sm text-muted-foreground hover:text-foreground">
          Ver o app
        </a>
      </header>
      <AdminNav />
      <div className="flex flex-1 flex-col gap-4 p-4 pb-10">{children}</div>
    </div>
  );
}
