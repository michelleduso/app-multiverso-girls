"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/parceiro", label: "Dashboard", exact: true },
  { href: "/parceiro/loja", label: "Minha loja" },
  { href: "/parceiro/produtos", label: "Produtos" },
  { href: "/parceiro/promocoes", label: "Promoções" },
  { href: "/parceiro/metricas", label: "Métricas" },
  { href: "/parceiro/plano", label: "Meu plano" },
  { href: "/parceiro/perfil", label: "Perfil" },
];

export function PartnerNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu do parceiro" className="flex gap-1 overflow-x-auto border-b border-border px-2">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
