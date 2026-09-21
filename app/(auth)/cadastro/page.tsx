import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberSignupForm } from "@/components/parceiros/signup-forms";

export const metadata = { title: "Cadastro" };

export default function CadastroPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CardTitle>Quero fazer parte</CardTitle>
        <p className="text-sm text-muted-foreground">
          Comunidade exclusiva para mulheres motoqueiras. Todo cadastro é revisado pela nossa equipe.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <MemberSignupForm />
        <p className="text-center text-sm">
          Já tem uma conta?{" "}
          <Link href="/entrar" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
        <p className="text-center text-sm text-muted-foreground">
          Tem uma loja ou serviço?{" "}
          <Link href="/quero-ser-parceiro" className="font-medium text-primary hover:underline">
            Quero ser parceiro
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
