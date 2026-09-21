import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  back,
  action,
}: {
  title: ReactNode;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
      {back && (
        <Link href={back} aria-label="Voltar" className="-ml-1 rounded-md p-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-5" />
        </Link>
      )}
      <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
      {action}
    </header>
  );
}
