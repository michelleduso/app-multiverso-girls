"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { friendlyError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS_BRASILEIROS } from "@/lib/constants/estados";
import { TIPOS_DE_ROLE } from "@/lib/constants/comunidade";
import { toStartsAt } from "@/lib/format";
import { isUuid, optionalStr, safeStorageUrl, str } from "@/lib/validation";
import type { ActionResult, FormState } from "@/lib/action-result";

function parseRideForm(formData: FormData) {
  const title = str(formData, "title");
  const description = optionalStr(formData, "description");
  const city = str(formData, "city");
  const state = str(formData, "state").toUpperCase();
  const date = str(formData, "date");
  const time = str(formData, "time");
  const rideType = str(formData, "ride_type");
  const maxRaw = str(formData, "max_participants");
  const visibility = str(formData, "visibility") === "private" ? "private" : "public";
  const groupId = str(formData, "group_id");

  if (title.length < 3 || title.length > 80) return { error: "O título deve ter de 3 a 80 caracteres." };
  if (description && description.length > 1000) return { error: "A descrição pode ter até 1000 caracteres." };
  if (city.length < 2 || city.length > 80) return { error: "Informe a cidade de saída." };
  if (!ESTADOS_BRASILEIROS.some((e) => e.uf === state)) return { error: "Escolha o estado." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Informe data e horário." };
  const startsAt = toStartsAt(date, time);
  if (Number.isNaN(startsAt.getTime())) return { error: "Data ou horário inválidos." };
  if (!TIPOS_DE_ROLE.some((t) => t.value === rideType)) return { error: "Escolha o tipo de rolê." };

  let max: number | null = null;
  if (maxRaw) {
    max = Number(maxRaw);
    if (!Number.isInteger(max) || max < 2 || max > 200) return { error: "O máximo de participantes deve ser de 2 a 200." };
  }

  return {
    values: {
      title,
      description,
      city,
      state,
      starts_at: startsAt.toISOString(),
      ride_type: rideType,
      max_participants: max,
      image_url: safeStorageUrl(optionalStr(formData, "image_url"), "ride-images"),
      visibility,
      // rolê privado sempre passa pela aprovação da organizadora
      requires_approval: visibility === "private" || formData.get("requires_approval") === "on",
      group_id: isUuid(groupId) ? groupId : null,
    },
  };
}

export async function createRide(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseRideForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  if (parsed.values.starts_at < new Date(Date.now() - 3_600_000).toISOString()) {
    return { error: "A data do rolê precisa estar no futuro." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data, error } = await supabase
    .from("rides")
    .insert({ ...parsed.values, organizer_id: user.id })
    .select("id")
    .single();
  if (error || !data) return { error: friendlyError(error, "Não foi possível criar o rolê.") };

  revalidatePath("/inicio");
  redirect(`/roles/${data.id}`);
}

export async function updateRide(rideId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseRideForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  // group_id não é editável depois de criado
  const { group_id: _groupId, ...values } = parsed.values;
  void _groupId;

  const supabase = await createClient();
  const { data, error } = await supabase.from("rides").update(values).eq("id", rideId).select("id");
  if (error) return { error: friendlyError(error, "Não foi possível salvar as alterações.") };
  if (!data?.length) return { error: "Só é possível editar rolês abertos que você organiza." };

  revalidatePath("/inicio");
  revalidatePath(`/roles/${rideId}`);
  redirect(`/roles/${rideId}`);
}

async function rpc(name: string, args: Record<string, unknown>, paths: string[]): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(name, args);
  if (error) return { error: friendlyError(error) };
  for (const p of paths) revalidatePath(p);
  return { ok: true };
}

const feedPaths = (rideId: string) => ["/inicio", `/roles/${rideId}`, "/mensagens"];

export async function joinRide(rideId: string) {
  return rpc("join_ride", { p_ride: rideId }, feedPaths(rideId));
}
export async function leaveRide(rideId: string) {
  return rpc("leave_ride", { p_ride: rideId }, feedPaths(rideId));
}
export async function respondParticipant(rideId: string, userId: string, accept: boolean) {
  return rpc("respond_ride_participant", { p_ride: rideId, p_user: userId, p_accept: accept }, feedPaths(rideId));
}
export async function removeParticipant(rideId: string, userId: string) {
  return rpc("remove_ride_participant", { p_ride: rideId, p_user: userId }, feedPaths(rideId));
}
export async function cancelRide(rideId: string) {
  return rpc("cancel_ride", { p_ride: rideId }, feedPaths(rideId));
}
export async function closeRide(rideId: string) {
  return rpc("close_ride", { p_ride: rideId }, feedPaths(rideId));
}

/** Ponto de encontro: só a organizadora grava; só participantes confirmadas leem (RLS). */
export async function saveMeetingPoint(rideId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const meetingPoint = str(formData, "meeting_point");
  const supabase = await createClient();

  if (!meetingPoint) {
    const { error } = await supabase.from("ride_private_details").delete().eq("ride_id", rideId);
    if (error) return { error: friendlyError(error) };
  } else {
    if (meetingPoint.length < 2 || meetingPoint.length > 300) {
      return { error: "O ponto de encontro deve ter até 300 caracteres." };
    }
    const { error } = await supabase
      .from("ride_private_details")
      .upsert({ ride_id: rideId, meeting_point: meetingPoint, updated_at: new Date().toISOString() });
    if (error) return { error: friendlyError(error, "Não foi possível salvar o ponto de encontro.") };
  }
  revalidatePath(`/roles/${rideId}`);
  return undefined;
}
