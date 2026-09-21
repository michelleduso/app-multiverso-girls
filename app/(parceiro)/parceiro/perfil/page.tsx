import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeletePartnerForm } from "@/components/parceiros/partner-forms";
import { signOut } from "@/features/auth/actions";
import { getPartnerContext } from "@/features/parceiros/context";
import { STATUS_PARCEIRO } from "@/lib/constants/parceiros";

export const metadata = { title: "Perfil do parceiro" };

export default async function PerfilParceiroPage() {
  const { partner } = await getPartnerContext();

  return (
    <>
      <h1 className="text-xl font-bold">Perfil</h1>
      <Card className="gap-1 p-4 text-sm">
        <p>
          <span className="text-muted-foreground">Responsável:</span> {partner.responsible}
        </p>
        <p>
          <span className="text-muted-foreground">E-mail de acesso:</span> {partner.email}
        </p>
        <p>
          <span className="text-muted-foreground">Telefone:</span> {partner.phone ?? "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Situação do cadastro:</span> {STATUS_PARCEIRO[partner.status]}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Para alterar responsável ou telefone, use “Minha loja”.</p>
      </Card>

      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sair
        </Button>
      </form>

      <Card className="gap-3 border-destructive/40 p-4">
        <p className="font-semibold text-destructive">Excluir conta de parceiro</p>
        <p className="text-sm text-muted-foreground">
          Apaga a loja, os produtos e as métricas de forma permanente (LGPD). Se quiser apenas sair do ar, pause os produtos.
        </p>
        <DeletePartnerForm />
      </Card>
    </>
  );
}
