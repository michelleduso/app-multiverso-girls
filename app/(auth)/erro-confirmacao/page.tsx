import Link from "next/link";
import { MailWarning } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Não foi possível confirmar" };

export default function ErroConfirmacaoPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <MailWarning className="size-8 text-destructive" />
        <CardTitle>Não foi possível confirmar seu e-mail</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-center text-sm text-muted-foreground">
          Este link de confirmação é inválido ou já expirou. Isso acontece quando o link já foi usado, quando
          passaram mais de algumas horas desde o cadastro, ou quando o próprio aplicativo de e-mail abre o link
          automaticamente antes de você clicar.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Faça o cadastro novamente com o mesmo e-mail para receber um novo link de confirmação.
        </p>
        <Link href="/cadastro" className={buttonVariants({ size: "lg" })}>
          Fazer cadastro novamente
        </Link>
        <Link href="/entrar" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Já confirmei — entrar
        </Link>
      </CardContent>
    </Card>
  );
}
