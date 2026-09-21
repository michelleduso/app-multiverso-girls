import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "warn" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4",
        tone === "warn" && "border-amber-500/40",
        tone === "danger" && "border-destructive/40"
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mt-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>;
}
