import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const VALID_TYPES: readonly EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Decide para onde mandar a usuária depois de confirmar — SEM confiar em
 * nenhum parâmetro da URL. O template "Confirm signup" é único e compartilhado
 * pelo Supabase (motoqueira e parceiro/lojista usam o mesmo e-mail), então o
 * destino só pode ser calculado aqui, consultando o tipo real da conta que
 * acabou de ser confirmada — a mesma checagem que `getCurrentUser()` faz em
 * todo o resto do app (`lib/auth.ts`).
 *
 * Devolve `/entrar` quando não há sessão válida (confirmação falhou de verdade).
 */
async function destinationForConfirmedUser(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "/entrar";

  const { data: partner } = await supabase.from("partners").select("id").eq("owner_id", user.id).maybeSingle();
  // Conta de parceiro/lojista: nunca a área da comunidade, mesmo pendente de aprovação
  // — só existe uma tela de espera para ela hoje, o próprio painel (`/parceiro`), que
  // mostra o aviso "cadastro em análise" enquanto `partners.status <> 'approved'`.
  if (partner) return "/parceiro";

  // Motoqueira: `profiles` nasce com status 'pending' pelo trigger de cadastro;
  // `/aguardando` é a tela existente que explica a aprovação pendente e barra
  // o acesso à comunidade até a administradora aprovar.
  return "/aguardando";
}

/**
 * Confirmação de e-mail (Supabase Auth SSR) — destino do link enviado em
 * `/cadastro` e `/quero-ser-parceiro`. O template "Confirm signup" do
 * Supabase precisa apontar para esta rota com `token_hash` e `type`
 * (ver README). `verifyOtp` grava a sessão em cookies via o client
 * server-side (`lib/supabase/server.ts`), que Route Handlers têm permissão
 * de escrever.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const type = typeParam && VALID_TYPES.includes(typeParam as EmailOtpType) ? (typeParam as EmailOtpType) : null;

  if (tokenHash && type) {
    const supabase = await createClient();
    // O erro de verifyOtp não decide sozinho: se o link já tiver sido consumido
    // antes (ex.: um app de e-mail "clica" nele automaticamente), pode já existir
    // uma sessão válida — por isso a checagem de destino é sempre feita depois,
    // por sessão real, nunca pelo retorno bruto de verifyOtp.
    await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    const destination = await destinationForConfirmedUser(supabase);
    if (destination !== "/entrar") {
      redirect(destination);
    }
  }

  redirect("/erro-confirmacao");
}
