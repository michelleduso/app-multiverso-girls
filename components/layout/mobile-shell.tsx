import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
