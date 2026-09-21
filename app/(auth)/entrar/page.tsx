import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export default function EntrarPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SignInForm />
        <p className="text-center text-sm text-muted-foreground">
          Ainda não faz parte?{" "}
          <Link href="/cadastro" className="font-medium text-primary hover:underline">
            Quero fazer parte da comunidade
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
