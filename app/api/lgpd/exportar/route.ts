import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/** LGPD · direito de acesso: baixa todos os dados pessoais da própria usuária em JSON. */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticada." }, { status: 401 });

  const { data, error } = await supabase.rpc("export_my_data");
  if (error) return NextResponse.json({ error: "Não foi possível gerar a exportação." }, { status: 500 });

  const payload = { conta: { id: user.id, email: user.email }, ...(data as Record<string, unknown>) };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados-multiverso-girls.json"',
      "Cache-Control": "no-store",
    },
  });
}
