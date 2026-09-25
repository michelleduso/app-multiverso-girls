/**
 * Antes do projeto Supabase existir (.env.local ainda não preenchido), a
 * aplicação não deve quebrar por inteiro — apenas as áreas que realmente
 * dependem de sessão ficam indisponíveis.
 */
export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
