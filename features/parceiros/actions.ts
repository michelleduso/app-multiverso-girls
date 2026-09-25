"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { friendlyError } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORIAS_PARCEIRO } from "@/lib/constants/parceiros";
import { safeHttpUrl, whatsappDigits } from "@/lib/partners";
import { isUuid, optionalStr, safeStorageUrl, str } from "@/lib/validation";
import { parseStoreFields } from "@/features/parceiros/validation";
import type { ActionResult, FormState } from "@/lib/action-result";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "Quero ser parceiro": cria a conta de lojista (separada da comunidade) com status pending. */
export async function signUpPartner(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseStoreFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!EMAIL_RE.test(email)) return { error: "Informe um e-mail válido." };
  if (password.length < 8) return { error: "A senha deve ter pelo menos 8 caracteres." };
  if (formData.get("accepted_terms") !== "on") return { error: "Aceite os Termos de Uso e a Política de Privacidade." };

  if (!isSupabaseConfigured()) {
    return { error: "Projeto Supabase ainda não configurado (.env.local)." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { account_type: "partner", ...parsed.values } },
  });
  if (error) {
    return { error: /registered|already/i.test(error.message) ? "Este e-mail já tem cadastro. Tente entrar." : "Não foi possível criar a conta agora." };
  }
  // Com confirmação de e-mail ligada não há sessão ainda: o pedido já foi criado pelo banco.
  if (data.session) redirect("/parceiro");
  return { ok: true };
}

export async function signUpMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = str(formData, "display_name");
  const city = str(formData, "city");
  const state = str(formData, "state").toUpperCase();
  const email = str(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2 || name.length > 60) return { error: "Informe seu nome (2 a 60 caracteres)." };
  if (city.length < 2 || city.length > 80) return { error: "Informe sua cidade." };
  if (!/^[A-Z]{2}$/.test(state)) return { error: "Escolha o estado." };
  if (!EMAIL_RE.test(email)) return { error: "Informe um e-mail válido." };
  if (password.length < 8) return { error: "A senha deve ter pelo menos 8 caracteres." };
  if (formData.get("adult") !== "on") return { error: "A comunidade é exclusiva para maiores de 18 anos." };
  if (formData.get("accepted_terms") !== "on") return { error: "Aceite os Termos de Uso e a Política de Privacidade." };

  if (!isSupabaseConfigured()) {
    return { error: "Projeto Supabase ainda não configurado (.env.local)." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { account_type: "member", display_name: name, city, state, accepted_terms: "true" } },
  });
  if (error) {
    return { error: /registered|already/i.test(error.message) ? "Este e-mail já tem cadastro. Tente entrar." : "Não foi possível criar a conta agora." };
  }
  if (data.session) redirect("/aguardando");
  return { ok: true };
}

export async function updateStore(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseStoreFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  // o filtro é exigido pelo PostgREST (safeupdate); a RLS também restringe à própria loja
  const { data, error } = await supabase
    .from("partners")
    .update({ ...parsed.values, logo_url: safeStorageUrl(optionalStr(formData, "logo_url"), "partner-media") })
    .eq("owner_id", user.id)
    .select("id");
  if (error) return { error: friendlyError(error, "Não foi possível salvar a loja.") };
  if (!data?.length) return { error: "Sua conta não pode editar a loja no momento." };

  revalidatePath("/parceiro", "layout");
  return { ok: true };
}

export async function resubmitPartner(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("partner_resubmit");
  if (error) return { error: friendlyError(error) };
  revalidatePath("/parceiro", "layout");
  return { ok: true };
}

function parseProduct(formData: FormData) {
  const name = str(formData, "name");
  const description = optionalStr(formData, "description");
  const category = str(formData, "category");
  const priceRaw = str(formData, "price").replace(/\./g, "").replace(",", ".");
  const externalRaw = str(formData, "external_url");
  const waRaw = str(formData, "whatsapp");
  const status = str(formData, "status");
  const startRaw = str(formData, "campaign_start");
  const endRaw = str(formData, "campaign_end");

  if (name.length < 2 || name.length > 100) return { error: "O nome deve ter de 2 a 100 caracteres." };
  if (description && description.length > 1000) return { error: "A descrição pode ter até 1000 caracteres." };
  if (!CATEGORIAS_PARCEIRO.some((c) => c.value === category)) return { error: "Escolha a categoria." };
  let price: number | null = null;
  if (priceRaw) {
    price = Number(priceRaw);
    if (!Number.isFinite(price) || price < 0 || price > 9_999_999) return { error: "Preço inválido." };
  }
  const externalUrl = externalRaw ? safeHttpUrl(externalRaw) : null;
  if (externalRaw && (!externalUrl || externalUrl.length > 500)) return { error: "Link do produto inválido. Use um endereço http(s)." };
  const whatsapp = waRaw ? whatsappDigits(waRaw) : null;
  if (whatsapp && !/^\d{12,13}$/.test(whatsapp)) return { error: "WhatsApp inválido. Use DDD + número." };
  if (!["draft", "active", "paused"].includes(status)) return { error: "Status inválido." };

  const campaignStart = startRaw ? new Date(`${startRaw}T00:00:00-03:00`) : new Date();
  const campaignEnd = endRaw ? new Date(`${endRaw}T23:59:59-03:00`) : null;
  if (Number.isNaN(campaignStart.getTime()) || (campaignEnd && Number.isNaN(campaignEnd.getTime()))) return { error: "Datas inválidas." };
  if (campaignEnd && campaignEnd <= campaignStart) return { error: "A data final deve ser depois da inicial." };

  return {
    values: {
      name,
      description,
      category,
      price,
      image_url: safeStorageUrl(optionalStr(formData, "image_url"), "partner-media"),
      external_url: externalUrl,
      whatsapp,
      status,
      campaign_start: campaignStart.toISOString(),
      campaign_end: campaignEnd ? campaignEnd.toISOString() : null,
    },
  };
}

export async function saveProduct(productId: string | null, partnerId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseProduct(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  if (productId) {
    const { data, error } = await supabase.from("products").update(parsed.values).eq("id", productId).select("id");
    if (error) return { error: friendlyError(error, "Não foi possível salvar o produto.") };
    if (!data?.length) return { error: "Este produto não pode ser editado (pode estar bloqueado pela moderação)." };
  } else {
    const { error } = await supabase.from("products").insert({ ...parsed.values, partner_id: partnerId });
    if (error) return { error: friendlyError(error, "Não foi possível criar o produto.") };
  }
  revalidatePath("/parceiro", "layout");
  redirect("/parceiro/produtos");
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  if (!isUuid(productId)) return { error: "Produto inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { error: friendlyError(error, "Não foi possível excluir o produto.") };
  revalidatePath("/parceiro", "layout");
  return { ok: true };
}

/** Promoção = preço promocional + destaque + fim da campanha de um produto existente. */
export async function savePromotion(productId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const saleRaw = str(formData, "sale_price").replace(/\./g, "").replace(",", ".");
  const endRaw = str(formData, "campaign_end");
  const sale = saleRaw ? Number(saleRaw) : null;
  if (sale != null && (!Number.isFinite(sale) || sale < 0)) return { error: "Preço promocional inválido." };
  const end = endRaw ? new Date(`${endRaw}T23:59:59-03:00`) : null;
  if (end && Number.isNaN(end.getTime())) return { error: "Data final inválida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({
      sale_price: sale,
      is_featured: formData.get("is_featured") === "on",
      campaign_end: end ? end.toISOString() : null,
    })
    .eq("id", productId)
    .select("id");
  if (error) return { error: friendlyError(error, "Não foi possível salvar a promoção.") };
  if (!data?.length) return { error: "Produto não encontrado." };
  revalidatePath("/parceiro", "layout");
  return { ok: true };
}

/** LGPD: exclui a conta de parceiro (loja, produtos e métricas são apagados em cascata). */
export async function deletePartnerAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  if (str(formData, "confirm").toUpperCase() !== "EXCLUIR") return { error: "Digite EXCLUIR para confirmar." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: partner } = await supabase.from("partners").select("id").eq("owner_id", user.id).maybeSingle();
  if (!partner) return { error: "Conta de parceiro não encontrada." };

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) return { error: "Não foi possível excluir a conta agora. Fale com a equipe." };
  await supabase.auth.signOut();
  redirect("/entrar?conta=excluida");
}
