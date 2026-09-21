import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service role — ignora RLS. Uso restrito a rotinas server-side
 * que o usuário comum não pode fazer (ex.: remover a conta do Auth na
 * exclusão LGPD). Nunca importar em Client Components.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
