import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { APP_NAME, safeHttpUrl, whatsappLink } from "@/lib/partners";
import { isUuid } from "@/lib/validation";

/**
 * Redirecionador de cliques comerciais. Registra a métrica (anônima) e manda a
 * usuária para o destino que o LOJISTA cadastrou — o destino vem sempre do banco,
 * nunca da URL, então não é um open redirect.
 *
 *   /go/produto/{productId}          → link do produto
 *   /go/whatsapp-produto/{productId} → WhatsApp com mensagem pré-preenchida
 *   /go/whatsapp-loja/{partnerId}    → WhatsApp da loja
 *   /go/site/{partnerId}             → site oficial da loja
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const origin = request.nextUrl.origin;
  const back = NextResponse.redirect(new URL("/parceiros", origin), 302);

  if (!isSupabaseConfigured() || !isUuid(id)) return back;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/entrar", origin), 302);

  if (kind === "produto" || kind === "whatsapp-produto") {
    // a RLS só devolve produto no ar para quem é membro ativa
    const { data: product } = await supabase
      .from("products")
      .select("id, partner_id, name, external_url, whatsapp")
      .eq("id", id)
      .maybeSingle();
    if (!product) return back;

    if (kind === "produto") {
      const url = safeHttpUrl(product.external_url);
      if (!url) return back;
      await supabase.rpc("track_commercial_event", { p_kind: "product_click", p_partner: product.partner_id, p_product: product.id });
      return NextResponse.redirect(url, 302);
    }

    const { data: partner } = await supabase.from("public_partners").select("whatsapp").eq("id", product.partner_id).maybeSingle();
    const link = whatsappLink(
      product.whatsapp ?? partner?.whatsapp,
      `Olá! Vi o produto ${product.name} através do ${APP_NAME} e gostaria de mais informações.`
    );
    if (!link) return back;
    await supabase.rpc("track_commercial_event", { p_kind: "whatsapp_click", p_partner: product.partner_id, p_product: product.id });
    return NextResponse.redirect(link, 302);
  }

  if (kind === "whatsapp-loja" || kind === "site") {
    const { data: partner } = await supabase
      .from("public_partners")
      .select("id, trade_name, whatsapp, website")
      .eq("id", id)
      .maybeSingle();
    if (!partner) return back;

    const target =
      kind === "site"
        ? safeHttpUrl(partner.website)
        : whatsappLink(partner.whatsapp, `Olá! Vi a loja ${partner.trade_name} através do ${APP_NAME} e gostaria de mais informações.`);
    if (!target) return back;
    await supabase.rpc("track_commercial_event", {
      p_kind: kind === "site" ? "site_click" : "whatsapp_click",
      p_partner: partner.id,
      p_product: null,
    });
    return NextResponse.redirect(target, 302);
  }

  return back;
}
