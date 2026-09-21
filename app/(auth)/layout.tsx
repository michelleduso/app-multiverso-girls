import type { ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/common/brand-logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <Link href="/" aria-label="Multiverso Girls — início" className="mb-6 flex items-center justify-center">
          <BrandLogo size={132} priority />
        </Link>
        {children}
      </div>
    </div>
  );
}
