/**
 * Tipos do banco Supabase.
 *
 * Os clientes (`lib/supabase/*`) ainda não usam este tipo genérico: as linhas
 * são tipadas à mão em `types/domain.ts`. Depois de aplicar as migrations em
 * `supabase/migrations`, rode `supabase gen types typescript` para substituir
 * este arquivo e passar `<Database>` aos clientes.
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
