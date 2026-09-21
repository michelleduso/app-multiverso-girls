import { redirect } from "next/navigation";
import { Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/features/auth/actions";
import { getCurrentUser } from "@/lib/auth";

const MENSAGENS: Record<string, { titulo: string; texto: string }> = {
  pending: {
    titulo: "Cadastro em análise",
    texto: "Seu perfil está aguardando aprovação da nossa equipe. Assim que for aprovado, a comunidade abre para você.",
  },
  rejected: {
    titulo: "Cadastro não aprovado",
    texto: "Seu cadastro não foi aprovado. Se acredita que houve engano, fale com o suporte.",
  },
  suspended: {
    titulo: "Conta suspensa temporariamente",
    texto: "Sua conta foi suspensa por violar as regras da comunidade. O acesso volta automaticamente quando a suspensão terminar.",
  },
  banned: {
    titulo: "Conta banida",
    texto: "Sua conta foi banida por violar as regras da comunidade.",
  },
  deleted: {
    titulo: "Conta excluída",
    texto: "Esta conta foi encerrada a pedido da titular.",
  },
};

export default async function AguardandoPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/entrar");
  if (me.partner) redirect("/parceiro");
  if (me.active) redirect("/inicio");

  const info = MENSAGENS[me.profile?.status ?? "pending"] ?? MENSAGENS.pending;

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <Hourglass className="size-8 text-primary" />
        <CardTitle>{info.titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-center text-sm text-muted-foreground">{info.texto}</p>
        <form action={signOut}>
          <Button type="submit" variant="outline" className="w-full">
            Sair
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
