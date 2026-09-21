import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/admin/admin-ui";
import { SponsoredMaxForm, SupportContactForm } from "@/components/admin/settings-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key, value");
  const s = new Map((data ?? []).map((r) => [r.key as string, r.value]));
  const contact = (s.get("support_contact") ?? {}) as { email?: string; whatsapp?: string };
  const max = Number(s.get("sponsored_max") ?? 2);

  return (
    <>
      <PageTitle title="Configurações" hint="Somente valores não secretos. Chaves e credenciais ficam nas variáveis de ambiente." />
      <Card>
        <CardHeader>
          <CardTitle>Contato do suporte</CardTitle>
        </CardHeader>
        <CardContent>
          <SupportContactForm email={contact.email ?? ""} whatsapp={contact.whatsapp ?? ""} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Publicidade no feed</CardTitle>
        </CardHeader>
        <CardContent>
          <SponsoredMaxForm value={Number.isFinite(max) ? max : 2} />
        </CardContent>
      </Card>
    </>
  );
}
