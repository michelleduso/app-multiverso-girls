"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { friendlyError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS_BRASILEIROS } from "@/lib/constants/estados";
import { CATEGORIAS_DE_GRUPO } from "@/lib/constants/comunidade";
import { optionalStr, safeStorageUrl, str } from "@/lib/validation";
import type { ActionResult, FormState } from "@/lib/action-result";

function parseGroupForm(formData: FormData) {
  const name = str(formData, "name");
  const description = optionalStr(formData, "description");
  const city = optionalStr(formData, "city");
  const state = optionalStr(formData, "state")?.toUpperCase() ?? null;
  const region = optionalStr(formData, "region");
  const category = str(formData, "category");
  const rules = optionalStr(formData, "rules");

  if (name.length < 3 || name.length > 60) return { error: "O nome deve ter de 3 a 60 caracteres." };
  if (description && description.length > 1000) return { error: "A descrição pode ter até 1000 caracteres." };
  if (rules && rules.length > 2000) return { error: "As regras podem ter até 2000 caracteres." };
  if (city && (city.length < 2 || city.length > 80)) return { error: "Cidade inválida." };
  if (region && region.length > 80) return { error: "Região inválida." };
  if (state && !ESTADOS_BRASILEIROS.some((e) => e.uf === state)) return { error: "Estado inválido." };
  if (!CATEGORIAS_DE_GRUPO.some((c) => c.value === category)) return { error: "Escolha a categoria." };

  return {
    values: {
      name,
      description,
      city,
      state,
      region,
      category,
      rules,
      cover_url: safeStorageUrl(optionalStr(formData, "cover_url"), "group-covers"),
      visibility: str(formData, "visibility") === "private" ? "private" : "public",
    },
  };
}

export async function createGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseGroupForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data, error } = await supabase
    .from("groups")
    .insert({ ...parsed.values, created_by: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: friendlyError(error, "Não foi possível criar o grupo.") };

  revalidatePath("/grupos");
  redirect(`/grupos/${data.id}`);
}

export async function updateGroup(groupId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseGroupForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase.from("groups").update(parsed.values).eq("id", groupId).select("id");
  if (error) return { error: friendlyError(error, "Não foi possível salvar o grupo.") };
  if (!data?.length) return { error: "Apenas administradoras podem editar o grupo." };

  revalidatePath("/grupos");
  revalidatePath(`/grupos/${groupId}`);
  redirect(`/grupos/${groupId}`);
}

async function rpc(name: string, args: Record<string, unknown>, groupId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(name, args);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/grupos");
  revalidatePath(`/grupos/${groupId}`);
  revalidatePath(`/grupos/${groupId}/membros`);
  revalidatePath("/mensagens");
  return { ok: true };
}

export async function joinGroup(groupId: string) {
  return rpc("join_group", { p_group: groupId }, groupId);
}
export async function leaveGroup(groupId: string) {
  return rpc("leave_group", { p_group: groupId }, groupId);
}
export async function respondGroupJoin(groupId: string, userId: string, accept: boolean) {
  return rpc("respond_group_join", { p_group: groupId, p_user: userId, p_accept: accept }, groupId);
}
export async function removeGroupMember(groupId: string, userId: string) {
  return rpc("remove_group_member", { p_group: groupId, p_user: userId }, groupId);
}
export async function setGroupAdmin(groupId: string, userId: string, makeAdmin: boolean) {
  return rpc("set_group_admin", { p_group: groupId, p_user: userId, p_make_admin: makeAdmin }, groupId);
}
