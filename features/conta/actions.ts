"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { friendlyError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ESTADOS_BRASILEIROS } from "@/lib/constants/estados";
import { optionalStr, str } from "@/lib/validation";
import type { FormState } from "@/lib/action-result";

/** LGPD · direito de correção: a titular altera seus dados de perfil. */
export async function updateMyData(_prev: FormState, formData: FormData): Promise<FormState> {
  const displayName = str(formData, "display_name");
  const city = optionalStr(formData, "city");
  const state = optionalStr(formData, "state")?.toUpperCase() ?? null;
  const bio = optionalStr(formData, "bio");

  if (displayName.length < 2 || displayName.length > 60) return { error: "O nome deve ter de 2 a 60 caracteres." };
  if (city && (city.length < 2 || city.length > 80)) return { error: "Cidade inválida." };
  if (state && !ESTADOS_BRASILEIROS.some((e) => e.uf === state)) return { error: "Estado inválido." };
  if (bio && bio.length > 300) return { error: "A bio pode ter até 300 caracteres." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, city, state, bio })
    .eq("id", user.id);
  if (error) return { error: friendlyError(error, "Não foi possível salvar seus dados.") };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * LGPD · direito de eliminação. Exige digitar "EXCLUIR" para evitar toque acidental.
 * 1) RPC anonymize_my_account limpa/anonimiza tudo que identifica a usuária;
 * 2) o usuário é removido do Auth com a service role (apaga a linha de `profiles`).
 */
export async function deleteMyAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  if (str(formData, "confirm").toUpperCase() !== "EXCLUIR") {
    return { error: "Digite EXCLUIR para confirmar." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { error } = await supabase.rpc("anonymize_my_account");
  if (error) return { error: friendlyError(error, "Não foi possível excluir a conta agora.") };

  try {
    const { error: delError } = await createAdminClient().auth.admin.deleteUser(user.id);
    if (delError) throw delError;
  } catch {
    // Os dados pessoais já foram anonimizados; o acesso é encerrado mesmo assim.
    await supabase.auth.signOut();
    redirect("/entrar?conta=anonimizada");
  }

  await supabase.auth.signOut();
  redirect("/entrar?conta=excluida");
}
