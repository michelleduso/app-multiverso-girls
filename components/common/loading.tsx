import { Loader2 } from "lucide-react";

/** Estado de carregamento padrão das rotas (loading.tsx). */
export function PageLoading({ label = "Carregando..." }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}
