import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/common/brand-logo";

/** Páginas institucionais públicas (acessíveis logada ou não). */
export default function InstitucionalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
      <nav className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href="/" aria-label="Multiverso Girls — início">
          <BrandLogo size={48} />
        </Link>
        <Link href="/regras" className="text-muted-foreground hover:text-foreground">
          Regras
        </Link>
        <Link href="/seguranca" className="text-muted-foreground hover:text-foreground">
          Segurança
        </Link>
        <Link href="/termos" className="text-muted-foreground hover:text-foreground">
          Termos
        </Link>
        <Link href="/privacidade" className="text-muted-foreground hover:text-foreground">
          Privacidade
        </Link>
      </nav>
      <article className="flex flex-col gap-4 pb-10">{children}</article>
    </div>
  );
}
