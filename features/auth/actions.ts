"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_prevState: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  if (!isSupabaseConfigured()) {
    return { error: "Projeto Supabase ainda não configurado (.env.local)." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error?.code === "email_not_confirmed") {
    return { error: "Confirme seu e-mail (link enviado no cadastro) antes de entrar." };
  }
  if (error || !data.user) {
    return { error: "E-mail ou senha inválidos." };
  }

  // Cada tipo de conta cai na sua própria área: lojista → /parceiro, admin sem perfil → /admin.
  const [{ data: partner }, { data: isAdmin }, { data: active }] = await Promise.all([
    supabase.from("partners").select("id").eq("owner_id", data.user.id).maybeSingle(),
    supabase.rpc("is_admin"),
    supabase.rpc("is_active_member"),
  ]);
  if (partner) redirect("/parceiro");
  if (isAdmin && !active) redirect("/admin");
  redirect("/inicio");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
