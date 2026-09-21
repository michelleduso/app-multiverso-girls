import Link from "next/link";
import {
  Ban,
  Bell,
  ChevronRight,
  FileText,
  HeartHandshake,
  Lock,
  Scale,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  UserCog,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/common/user-avatar";
import { signOut } from "@/features/auth/actions";
import { requireMember } from "@/lib/auth";

export const metadata = { title: "Perfil" };

function MenuLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40">
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{children}</span>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  );
}

export default async function PerfilPage() {
  const me = await requireMember();

  return (
    <div className="flex flex-col gap-5 p-4">
      <header className="flex items-center gap-3 pt-2">
        <UserAvatar name={me.profile?.display_name} src={me.profile?.avatar_url} size="lg" className="size-16" />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{me.profile?.display_name ?? "Motoqueira"}</h1>
          <p className="truncate text-sm text-muted-foreground">
            {me.profile?.city ? `📍 ${me.profile.city}${me.profile.state ? `/${me.profile.state}` : ""}` : me.email}
          </p>
        </div>
      </header>

      <Card className="gap-0 divide-y divide-border overflow-hidden py-0">
        <MenuLink href="/notificacoes" icon={<Bell className="size-4" />}>
          Notificações
        </MenuLink>
        <MenuLink href="/parceiros" icon={<ShoppingBag className="size-4" />}>
          Parceiros
        </MenuLink>
        <MenuLink href="/perfil/dados" icon={<UserCog className="size-4" />}>
          Meus dados e privacidade
        </MenuLink>
        <MenuLink href="/perfil/bloqueadas" icon={<Ban className="size-4" />}>
          Pessoas bloqueadas
        </MenuLink>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Segurança e regras</h2>
        <Card className="gap-0 divide-y divide-border overflow-hidden py-0">
          <MenuLink href="/regras" icon={<HeartHandshake className="size-4" />}>
            Regras da comunidade
          </MenuLink>
          <MenuLink href="/seguranca" icon={<ShieldAlert className="size-4" />}>
            Segurança em encontros presenciais
          </MenuLink>
          <MenuLink href="/termos" icon={<FileText className="size-4" />}>
            Termos de Uso
          </MenuLink>
          <MenuLink href="/privacidade" icon={<Lock className="size-4" />}>
            Política de Privacidade
          </MenuLink>
        </Card>
      </section>

      {me.isAdmin && (
        <Card className="gap-0 overflow-hidden py-0">
          <MenuLink href="/moderacao" icon={<ShieldCheck className="size-4" />}>
            Central de Moderação
          </MenuLink>
        </Card>
      )}

      <p className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
        <Scale className="mt-0.5 size-4 shrink-0" />
        Nunca divulgue seu endereço residencial aqui — nem em perfil, chat, grupo ou rolê.
      </p>

      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">
          Sair
        </Button>
      </form>
    </div>
  );
}
