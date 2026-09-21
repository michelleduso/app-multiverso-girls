import Link from "next/link";
import { PageTitle } from "@/components/admin/admin-ui";
import { SectionTitle, StatCard, StatGrid } from "@/components/common/stat-card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard admin" };

type Dash = {
  comunidade: { total: number; novos_30d: number; pendentes: number; suspensas: number; cidades: { cidade: string; total: number }[] };
  roles: { ativos: number; criados_mes: number; participantes: number; denunciados: number };
  grupos: { ativos: number; novos_30d: number; denunciados: number };
  seguranca: { abertas: number; resolvidas: number; suspensos: number; banidos: number };
  parceiros: {
    ativos: number;
    pendentes: number;
    produtos_ativos: number;
    campanhas_ativas: number;
    planos_vencendo: number;
    planos_vencidos: number;
    cliques_30d: number;
  };
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard");
  if (error || !data) {
    return <p role="alert" className="text-destructive">Não foi possível carregar o dashboard.</p>;
  }
  const d = data as Dash;

  return (
    <>
      <PageTitle title="Dashboard" hint="Visão geral da comunidade, segurança e parceiros." />

      <SectionTitle>Comunidade</SectionTitle>
      <StatGrid>
        <StatCard label="Motoqueiras (aprovadas)" value={d.comunidade.total} />
        <StatCard label="Novos cadastros (30 dias)" value={d.comunidade.novos_30d} />
        <StatCard label="Aguardando aprovação" value={d.comunidade.pendentes} tone={d.comunidade.pendentes > 0 ? "warn" : "default"} hint="ver Cadastros pendentes" />
        <StatCard label="Perfis suspensos" value={d.comunidade.suspensas} />
      </StatGrid>
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-2 text-xs text-muted-foreground">Cidades com mais usuárias</p>
        {d.comunidade.cidades.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
        ) : (
          <ol className="flex flex-col gap-1 text-sm">
            {d.comunidade.cidades.map((c) => (
              <li key={c.cidade} className="flex justify-between">
                <span>{c.cidade}</span>
                <span className="tabular-nums text-muted-foreground">{c.total}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <SectionTitle>Rolês</SectionTitle>
      <StatGrid>
        <StatCard label="Rolês ativos" value={d.roles.ativos} />
        <StatCard label="Criados no mês" value={d.roles.criados_mes} />
        <StatCard label="Participantes confirmadas" value={d.roles.participantes} hint="nos rolês ativos" />
        <StatCard label="Rolês denunciados" value={d.roles.denunciados} tone={d.roles.denunciados > 0 ? "warn" : "default"} />
      </StatGrid>

      <SectionTitle>Grupos</SectionTitle>
      <StatGrid>
        <StatCard label="Grupos ativos" value={d.grupos.ativos} />
        <StatCard label="Novos grupos (30 dias)" value={d.grupos.novos_30d} />
        <StatCard label="Grupos denunciados" value={d.grupos.denunciados} tone={d.grupos.denunciados > 0 ? "warn" : "default"} />
      </StatGrid>

      <SectionTitle>Segurança</SectionTitle>
      <StatGrid>
        <StatCard label="Denúncias abertas" value={d.seguranca.abertas} tone={d.seguranca.abertas > 0 ? "danger" : "default"} hint="ver Denúncias" />
        <StatCard label="Denúncias resolvidas" value={d.seguranca.resolvidas} />
        <StatCard label="Usuárias suspensas" value={d.seguranca.suspensos} />
        <StatCard label="Usuárias banidas" value={d.seguranca.banidos} />
      </StatGrid>

      <SectionTitle>Parceiros</SectionTitle>
      <StatGrid>
        <StatCard label="Parceiros ativos (no ar)" value={d.parceiros.ativos} />
        <StatCard label="Aguardando aprovação" value={d.parceiros.pendentes} tone={d.parceiros.pendentes > 0 ? "warn" : "default"} />
        <StatCard label="Produtos ativos" value={d.parceiros.produtos_ativos} />
        <StatCard label="Campanhas ativas" value={d.parceiros.campanhas_ativas} hint="promoções e destaques no ar" />
        <StatCard label="Planos vencendo (7 dias)" value={d.parceiros.planos_vencendo} tone={d.parceiros.planos_vencendo > 0 ? "warn" : "default"} />
        <StatCard label="Planos vencidos" value={d.parceiros.planos_vencidos} tone={d.parceiros.planos_vencidos > 0 ? "danger" : "default"} />
        <StatCard label="Cliques comerciais (30 dias)" value={d.parceiros.cliques_30d} />
      </StatGrid>
      <p className="text-xs text-muted-foreground">
        <Link href="/admin/planos" className="underline">
          Gerenciar planos
        </Link>{" "}
        ·{" "}
        <Link href="/admin/parceiros" className="underline">
          Parceiros
        </Link>
      </p>
    </>
  );
}
