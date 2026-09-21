import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GroupCard } from "@/components/grupos/group-card";
import { requireMember } from "@/lib/auth";
import { cityKey } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { GroupRow } from "@/types/domain";

export const metadata = { title: "Grupos" };

const GROUP_SELECT =
  "id, name, description, cover_url, city, state, region, category, visibility, rules, status, member_count, created_by";

export default async function GruposPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  const tab = aba === "descobrir" ? "descobrir" : "meus";

  const me = await requireMember();
  const supabase = await createClient();

  let groups: GroupRow[] = [];
  if (tab === "meus") {
    const { data } = await supabase
      .from("group_members")
      .select(`group:groups(${GROUP_SELECT})`)
      .eq("user_id", me.id);
    groups = ((data ?? []) as unknown as { group: GroupRow | null }[]).map((r) => r.group).filter((g): g is GroupRow => !!g);
  } else {
    const { data } = await supabase
      .from("groups")
      .select(GROUP_SELECT)
      .eq("status", "active")
      .order("member_count", { ascending: false })
      .limit(60);
    const mine = cityKey(me.profile?.city);
    const all = (data ?? []) as unknown as GroupRow[];
    // mesma cidade primeiro; dentro de cada bloco mantém a ordem por nº de membros
    groups = mine
      ? [...all.filter((g) => cityKey(g.city) === mine), ...all.filter((g) => cityKey(g.city) !== mine)]
      : all;
  }

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-5">
        <h1 className="text-2xl font-bold">Grupos</h1>
        <Link href="/grupos/novo" className={buttonVariants({ size: "sm" })}>
          <Plus /> Criar grupo
        </Link>
      </header>

      <nav className="flex gap-2 px-4 py-2" aria-label="Grupos">
        {[
          { value: "meus", label: "Meus grupos" },
          { value: "descobrir", label: "Descobrir" },
        ].map((t) => (
          <Link
            key={t.value}
            href={t.value === "meus" ? "/grupos" : `/grupos?aba=${t.value}`}
            aria-current={t.value === tab ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium",
              t.value === tab ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-3 px-4 py-3">
        {groups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {tab === "meus" ? (
              <>
                Você ainda não está em nenhum grupo.{" "}
                <Link href="/grupos?aba=descobrir" className="text-primary underline">
                  Descobrir grupos
                </Link>
              </>
            ) : (
              "Nenhum grupo por aqui ainda. Crie o primeiro!"
            )}
          </p>
        ) : (
          groups.map((g) => <GroupCard key={g.id} group={g} />)
        )}
      </div>
    </div>
  );
}
