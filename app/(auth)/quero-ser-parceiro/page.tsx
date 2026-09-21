import Link from "next/link";
import { Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartnerSignupForm } from "@/components/parceiros/signup-forms";

export const metadata = { title: "Quero ser parceiro" };

export default function QueroSerParceiroPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <Store className="size-8 text-primary" />
        <CardTitle>Quero ser parceiro</CardTitle>
        <p className="text-sm text-muted-foreground">
          Divulgue sua marca, produtos e promoções para a comunidade. A conta de parceiro é separada da comunidade:
          não dá acesso a grupos, rolês nem conversas.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PartnerSignupForm />
        <p className="text-center text-sm text-muted-foreground">
          Já é parceiro?{" "}
          <Link href="/entrar" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
