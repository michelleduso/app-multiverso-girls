import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RIDE_STATE_LABEL, type RideState } from "@/lib/rides";

const STYLES: Record<RideState, string> = {
  aberto: "bg-emerald-500/15 text-emerald-300",
  lotado: "bg-amber-500/15 text-amber-300",
  encerrado: "bg-muted text-muted-foreground",
  cancelado: "bg-destructive/15 text-destructive",
};

export function RideStateBadge({ state, className }: { state: RideState; className?: string }) {
  return (
    <Badge variant="ghost" className={cn(STYLES[state], className)}>
      {RIDE_STATE_LABEL[state]}
    </Badge>
  );
}
