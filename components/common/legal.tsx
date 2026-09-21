import type { ReactNode } from "react";

export function LegalTitle({ children, updated }: { children: ReactNode; updated?: string }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold">{children}</h1>
      {updated && <p className="text-xs text-muted-foreground">Última atualização: {updated}</p>}
    </header>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-foreground/85 [&_li]:ml-4 [&_li]:list-disc">{children}</div>
    </section>
  );
}

export function LegalNotice({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">{children}</p>;
}
