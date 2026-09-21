"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/motoqueiras", label: "Motoqueiras" },
  { href: "/admin/pendentes", label: "Cadastros pendentes" },
  { href: "/admin/roles", label: "Rolês" },
  { href: "/admin/grupos", label: "Grupos" },
  { href: "/moderacao", label: "Denúncias" },
  { href: "/admin/parceiros", label: "Parceiros" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/planos", label: "Planos" },
  { href: "/admin/configuracoes", label: "Configurações" },
  { href: "/admin/auditoria", label: "Auditoria" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Menu administrativo" className="mt-2 flex gap-1 overflow-x-auto border-b border-border px-2">
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
