"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Signpost, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/inicio", label: "Início", icon: Home, also: ["/notificacoes", "/parceiros", "/membros"] },
  { href: "/roles", label: "Rolês", icon: Signpost, also: [] },
  { href: "/grupos", label: "Grupos", icon: Users, also: [] },
  { href: "/mensagens", label: "Conversas", icon: MessageCircle, also: [] },
  { href: "/perfil", label: "Perfil", icon: UserRound, also: [] },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon, also }) => {
          const active = [href, ...also].some((base) => pathname === base || pathname.startsWith(`${base}/`));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
