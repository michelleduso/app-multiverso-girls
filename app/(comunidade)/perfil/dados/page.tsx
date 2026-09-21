import Link from "next/link";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountForm, MyDataForm } from "@/components/common/account-forms";
import { PageHeader } from "@/components/common/page-header";
import { requireMember } from "@/lib/auth";

export const metadata = { title: "Meus dados e privacidade" };

export default async function MeusDadosPage() {
  const me = await requireMember();
  const p = me.profile;

  return (
    <>
      <PageHeader title="Meus dados e privacidade" back="/perfil" />
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-muted-foreground">
          Conforme a LGPD, você pode consultar, corrigir e excluir seus dados pessoais a qualquer momento. Saiba como
          tratamos seus dados na{" "}
          <Link href="/privacidade" className="text-primary underline">
            Política de Privacidade
          </Link>
          .
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Alterar meus dados</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              E-mail da conta: <strong>{me.email}</strong>. Mostramos apenas cidade e estado — nunca endereço.
            </p>
            <MyDataForm
              displayName={p?.display_name ?? ""}
              city={p?.city ?? ""}
              state={p?.state ?? ""}
              bio={p?.bio ?? ""}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consultar meus dados</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Baixe uma cópia de tudo que guardamos sobre você: perfil, rolês, participações, grupos, mensagens
              enviadas, bloqueios e denúncias que você fez.
            </p>
            <a href="/api/lgpd/exportar" className={buttonVariants({ variant: "outline" })} download>
              <Download /> Baixar meus dados (JSON)
            </a>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Excluir minha conta</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Isso é permanente. Seu perfil é anonimizado, suas mensagens são apagadas, você sai de grupos e rolês, e
              os rolês abertos que você organiza são cancelados (as participantes são avisadas). Registros de
              denúncias e de moderação são mantidos sem identificação direta, para a segurança da comunidade.
            </p>
            <DeleteAccountForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
