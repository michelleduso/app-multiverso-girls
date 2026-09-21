"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { friendlyError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MOTIVOS_DE_DENUNCIA, TIPOS_DE_DENUNCIA } from "@/lib/constants/comunidade";
import { isUuid, optionalStr, str } from "@/lib/validation";
import type { ActionResult, FormState } from "@/lib/action-result";

/** Denúncia de perfil, mensagem, grupo, rolê ou comportamento. */
export async function createReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const targetType = str(formData, "target_type");
  const targetId = str(formData, "target_id");
  const reason = str(formData, "reason");
  const description = optionalStr(formData, "description");

  if (!(targetType in TIPOS_DE_DENUNCIA) || !isUuid(targetId)) return { error: "Denúncia inválida." };
  if (!MOTIVOS_DE_DENUNCIA.some((m) => m.value === reason)) return { error: "Escolha o motivo da denúncia." };
  if (description && description.length > 1000) return { error: "A descrição pode ter até 1000 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_report", {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
    p_description: description,
  });
  if (error) return { error: friendlyError(error, "Não foi possível enviar a denúncia.") };
  return { ok: true };
}

export async function blockUser(userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("block_user", { p_target: userId });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function unblockUser(userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("unblock_user", { p_target: userId });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true };
}

const ACTIONS = ["ignore", "warn", "remove_content", "suspend_user", "ban_user", "suspend_group", "delete_group"];

/** Central de Moderação: toda ação passa pela RPC `moderate`, que valida admin e grava o histórico. */
export async function moderateReport(reportId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const action = str(formData, "action");
  const reason = str(formData, "reason");
  const days = Number(str(formData, "days") || 0) || null;

  if (!ACTIONS.includes(action)) return { error: "Escolha uma ação." };
  if (reason.length < 3) return { error: "Informe o motivo da ação (fica registrado no histórico)." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate", {
    p_report: reportId,
    p_action: action,
    p_reason: reason,
    p_days: days,
    p_target_type: null,
    p_target_id: null,
  });
  if (error) return { error: friendlyError(error) };

  revalidatePath("/moderacao");
  redirect("/moderacao");
}

/** Suspender/excluir um grupo diretamente (fora de uma denúncia). */
export async function moderateGroup(groupId: string, action: "suspend_group" | "delete_group", reason: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate", {
    p_report: null,
    p_action: action,
    p_reason: reason,
    p_days: null,
    p_target_type: "group",
    p_target_id: groupId,
  });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/grupos");
  revalidatePath("/moderacao/historico");
  return { ok: true };
}
