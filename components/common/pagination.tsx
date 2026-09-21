import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Paginação por links (?pagina=N), preservando os demais filtros da URL. */
export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "pagina") qs.set(k, v);
    if (p > 1) qs.set("pagina", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const linkCls = "inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted";

  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-2 pt-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkCls}>
          <ChevronLeft className="size-4" /> Anterior
        </Link>
      ) : (
        <span className={cn(linkCls, "pointer-events-none opacity-40")}>
          <ChevronLeft className="size-4" /> Anterior
        </span>
      )}
      <span className="text-sm text-muted-foreground">
        Página {page} de {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={linkCls}>
          Próxima <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(linkCls, "pointer-events-none opacity-40")}>
          Próxima <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

export function parsePage(value: string | undefined) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 10_000 ? n : 1;
}
