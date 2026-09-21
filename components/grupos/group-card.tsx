import Link from "next/link";
import { Lock, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RemoteImage } from "@/components/common/remote-image";
import { categoriaDeGrupo } from "@/lib/constants/comunidade";
import type { GroupRow } from "@/types/domain";

export function GroupCard({ group }: { group: GroupRow }) {
  return (
    <Link href={`/grupos/${group.id}`}>
      <Card className="flex-row items-center gap-3 p-3 transition-colors hover:bg-muted/40">
        {group.cover_url ? (
          <RemoteImage src={group.cover_url} className="size-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">🏍️</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{group.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {categoriaDeGrupo(group.category)}
            {group.city ? ` · ${group.city}${group.state ? `/${group.state}` : ""}` : ""}
          </p>
          <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3" /> {group.member_count}
            </span>
            {group.visibility === "private" && (
              <span className="inline-flex items-center gap-1">
                <Lock className="size-3" /> Privado
              </span>
            )}
            {group.status === "suspended" && <span className="text-destructive">Suspenso</span>}
          </p>
        </div>
      </Card>
    </Link>
  );
}
