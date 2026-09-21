"use server";

import { revalidatePath } from "next/cache";
import { friendlyError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";

/** Solicita conversa privada — só vira chat depois que a outra pessoa aceitar. */
export async function requestChat(userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_chat", { p_target: userId, p_message: null });
  if (error) return { error: friendlyError(error, "Não foi possível enviar a solicitação.") };
  revalidatePath(`/membros/${userId}`);
  revalidatePath("/mensagens");
  return { ok: true };
}

export async function respondChatRequest(requestId: string, accept: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_chat_request", { p_request: requestId, p_accept: accept });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/mensagens");
  return { ok: true };
}

export async function markNotificationsRead(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/notificacoes");
  revalidatePath("/inicio");
  return { ok: true };
}
