import Link from "next/link";
import { Bell, Megaphone, Plus, ShoppingBag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { RemoteImage } from "@/components/common/remote-image";
import { ProductCard } from "@/components/parceiros/product-card";
import { ImpressionTracker } from "@/components/parceiros/trackers";
import { RideCard } from "@/components/rides/ride-card";
import { getSpotlightPartners, getSponsoredProducts } from "@/features/parceiros/queries";
import { getFeed, FEED_TABS, type FeedTab } from "@/features/roles/queries";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const EMPTY: Record<FeedTab, string> = {
  hoje: "Nenhum rolê marcado para hoje. Que tal puxar um?",
  proximos: "Ainda não há rolês por aqui. Seja a primeira a chamar a galera!",
  cidade: "Nenhum rolê saindo da sua cidade por enquanto.",
  meus: "Você ainda não está em nenhum rolê. Toque em “Eu topo!” num rolê do feed.",
};

export default async function InicioPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba } = await searchParams;
  const tab = (FEED_TABS.find((t) => t.value === aba)?.value ?? "proximos") as FeedTab;

  const me = await requireMember();
  const supabase = await createClient();

  // Publicidade só no feed geral ("Próximos") e sempre em pequena quantidade.
  const showAds = tab === "proximos";
  const [{ rides, participation }, { count: unread }, sponsored, spotlight] = await Promise.all([
    getFeed(tab, { id: me.id, city: me.profile?.city ?? null }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    showAds ? getSponsoredProducts(me.profile?.city ?? null) : null,
    showAds ? getSpotlightPartners(me.profile?.city ?? null) : [],
  ]);
  // cards patrocinados entram DEPOIS do 3º e do 8º rolê — nunca no topo e só com conteúdo suficiente
  const AD_SLOTS = [3, 8];
  const adsAt = new Map<number, number>();
  if (sponsored && rides.length >= 3) {
    sponsored.products.slice(0, AD_SLOTS.length).forEach((_, i) => adsAt.set(Math.min(AD_SLOTS[i], rides.length), i));
  }

  return (
    <div className="flex flex-col">
      <header className="flex items-start justify-between gap-3 px-4 pb-2 pt-5">
        <div>
          <h1 className="text-2xl font-bold leading-tight text-balance">🏍️ Quem pilha um rolê?</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {me.profile?.city ? `Rolês perto de ${me.profile.city} primeiro.` : "Os rolês mais próximos primeiro."}
          </p>
        </div>
        <div className="mt-1 flex shrink-0 gap-2">
        <Link
          href="/parceiros"
          aria-label="Parceiros"
          className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
        >
          <ShoppingBag className="size-5" />
        </Link>
        <Link
          href="/notificacoes"
          aria-label={unread ? `Notificações (${unread} novas)` : "Notificações"}
          className="relative rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
        >
          <Bell className="size-5" />
          {unread ? (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Link>
        </div>
      </header>

      {spotlight.length > 0 && (
        <section aria-label="Parceiros em destaque" className="px-4 pb-1 pt-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <Megaphone className="size-4 text-amber-300" /> Parceiros em destaque
              <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
                Patrocinado
              </span>
            </h2>
            <Link href="/parceiros" className="text-xs text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {spotlight.map((p) => (
              <Link
                key={p.id}
                href={`/parceiros/${p.id}`}
                className="flex w-40 shrink-0 items-center gap-2 rounded-xl border border-dashed border-amber-400/40 bg-amber-500/[0.04] p-2"
              >
                {p.logo_url ? (
                  <RemoteImage src={p.logo_url} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted font-bold">
                    {p.trade_name[0]?.toUpperCase()}
                  </div>
                )}
                <span className="line-clamp-2 text-xs font-medium">{p.trade_name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <nav aria-label="Feeds de rolês" className="sticky top-0 z-10 flex gap-2 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur">
        {FEED_TABS.map((t) => (
          <Link
            key={t.value}
            href={t.value === "proximos" ? "/inicio" : `/inicio?aba=${t.value}`}
            aria-current={t.value === tab ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              t.value === tab
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-3 px-4 py-3">
        {tab === "cidade" && !me.profile?.city ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Informe sua cidade em{" "}
            <Link href="/perfil/dados" className="text-primary underline">
              Meus dados
            </Link>{" "}
            para ver os rolês da sua cidade.
          </p>
        ) : rides.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {EMPTY[tab]}
          </p>
        ) : (
          rides.flatMap((ride, i) => {
            const items = [<RideCard key={ride.id} ride={ride} userId={me.id} participation={participation[ride.id] ?? null} />];
            const adIndex = adsAt.get(i + 1);
            const product = adIndex != null ? sponsored?.products[adIndex] : undefined;
            if (product) {
              items.push(
                <ProductCard key={`ad-${product.id}`} product={product} partner={sponsored?.partners.get(product.partner_id)} sponsored />
              );
            }
            return items;
          })
        )}
      </div>

      {sponsored && <ImpressionTracker productIds={sponsored.products.map((p) => p.id)} />}

      <Link
        href="/roles/novo"
        className={cn(buttonVariants({ size: "lg" }), "fixed bottom-20 right-4 z-40 h-11 rounded-full px-4 shadow-lg")}
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Plus /> Criar rolê
      </Link>
    </div>
  );
}
