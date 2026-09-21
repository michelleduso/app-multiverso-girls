import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <Compass className="size-12 text-primary" aria-hidden />
      <h1 className="text-2xl font-bold">Essa estrada não leva a lugar nenhum</h1>
      <p className="text-sm text-muted-foreground">
        A página que você procura não existe, foi removida ou você não tem acesso a ela.
      </p>
      <Link href="/inicio" className={buttonVariants({ size: "lg" })}>
        Voltar ao início
      </Link>
    </div>
  );
}
