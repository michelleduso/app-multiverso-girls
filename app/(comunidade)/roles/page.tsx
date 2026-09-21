import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RideCard } from "@/components/rides/ride-card";
import { getFeed } from "@/features/roles/queries";
import { requireMember } from "@/lib/auth";

export const metadata = { title: "Rolês" };

/** Central dos rolês da usuária (organizados por ela e em que confirmou/pediu participação). */
export default async function RolesPage() {
  const me = await requireMember();
  const { rides, participation } = await getFeed("meus", { id: me.id, city: me.profile?.city ?? null });

  return (
    <div className="flex flex-col gap-3 px-4 py-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">🏍️ Meus rolês</h1>
        <Link href="/roles/novo" className={buttonVariants({ size: "sm" })}>
          <Plus /> Criar rolê
        </Link>
      </header>
      {rides.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Você ainda não está em nenhum rolê.{" "}
          <Link href="/inicio" className="text-primary underline">
            Veja quem pilha um rolê
          </Link>
        </p>
      ) : (
        rides.map((r) => <RideCard key={r.id} ride={r} userId={me.id} participation={participation[r.id] ?? null} />)
      )}
    </div>
  );
}
