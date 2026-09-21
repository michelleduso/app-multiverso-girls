import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ProfileLite } from "@/types/domain";

export type CurrentUser = {
  id: string;
  email: string | undefined;
  profile: (ProfileLite & { status: string; bio: string | null }) | null;
  /** aprovada e sem suspensão em vigor */
  active: boolean;
  isAdmin: boolean;
  /** conta de parceiro/lojista — completamente separada da comunidade */
  partner: { id: string; status: string; trade_name: string } | null;
};

/** Sessão + perfil + papéis, calculado uma vez por requisição. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // páginas autenticadas nunca são prerenderizadas, mesmo sem Supabase configurado
  await connection();
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: active }, { data: isAdmin }, { data: partner }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, city, state, status, bio")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("is_active_member"),
    supabase.rpc("is_admin"),
    supabase.from("partners").select("id, status, trade_name").eq("owner_id", user.id).maybeSingle(),
  ]);

  return {
    id: user.id,
    email: user.email,
    profile: profile ?? null,
    active: Boolean(active),
    isAdmin: Boolean(isAdmin),
    partner: partner ?? null,
  };
});

/**
 * Uso em páginas da comunidade: layouts não bloqueiam a renderização das páginas
 * nem reexecutam em navegação client-side, então cada página valida a sessão.
 */
export async function requireMember(): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar");
  if (me.partner) redirect("/parceiro"); // lojista nunca acessa a comunidade
  if (!me.active) redirect("/aguardando");
  return me;
}

/** Páginas do painel do parceiro. */
export async function requirePartner(): Promise<CurrentUser & { partner: NonNullable<CurrentUser["partner"]> }> {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar");
  if (!me.partner) redirect(me.isAdmin ? "/admin" : "/inicio");
  return me as CurrentUser & { partner: NonNullable<CurrentUser["partner"]> };
}

/** Páginas do painel administrativo. */
export async function requireAdmin(): Promise<CurrentUser> {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar");
  if (!me.isAdmin) redirect(me.partner ? "/parceiro" : "/inicio");
  return me;
}

/** Mensagem de erro amigável a partir de uma exceção do Postgres/RPC. */
export function friendlyError(error: { message?: string } | null | undefined, fallback = "Algo deu errado. Tente de novo.") {
  const msg = error?.message ?? "";
  // mensagens escritas de propósito nas RPCs começam em maiúscula e terminam com ponto
  if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ].*[.!]$/.test(msg) && !/violates|permission denied|row-level/i.test(msg)) return msg;
  if (/row-level security|permission denied/i.test(msg)) return "Você não tem permissão para fazer isso.";
  return fallback;
}
