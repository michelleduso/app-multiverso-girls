import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Formulário GET de busca + filtros (vira query string, então é linkável e sem JS). */
export function FilterBar({
  action,
  q,
  filters = [],
  placeholder = "Buscar...",
}: {
  action: string;
  q?: string;
  filters?: { name: string; value: string | undefined; label: string; options: { value: string; label: string }[] }[];
  placeholder?: string;
}) {
  return (
    <form action={action} method="get" className="flex flex-wrap items-end gap-2" role="search">
      <Input name="q" defaultValue={q} placeholder={placeholder} aria-label="Buscar" className="min-w-40 flex-1" />
      {filters.map((f) => (
        <Select key={f.name} name={f.name} defaultValue={f.value ?? ""} aria-label={f.label} className="w-auto">
          <option value="">{f.label}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ))}
      <Button type="submit" size="sm">
        Filtrar
      </Button>
      <Link href={action} className="text-sm text-muted-foreground hover:text-foreground">
        Limpar
      </Link>
    </form>
  );
}

const TONES = {
  ok: "bg-emerald-500/15 text-emerald-300",
  warn: "bg-amber-500/15 text-amber-300",
  bad: "bg-destructive/15 text-destructive",
  muted: "bg-muted text-muted-foreground",
} as const;

export function Pill({ tone = "muted", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone])}>{children}</span>;
}

export function PageTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold">{title}</h1>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </header>
  );
}

export function EmptyRow({ children = "Nada encontrado." }: { children?: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Escapa % e _ para uso seguro em ILIKE. */
export function like(term: string) {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Remove caracteres que quebrariam o filtro .or() do PostgREST. */
export function cleanTerm(term: string | undefined) {
  return (term ?? "").replace(/[,()*]/g, " ").trim().slice(0, 60);
}
