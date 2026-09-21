import Link from "next/link";
import { ShieldCheck, Signpost, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BrandLogo } from "@/components/common/brand-logo";

const DESTAQUES = [
  {
    icon: Users,
    title: "Amizades de verdade",
    description: "Conheça motoqueiras da sua cidade e crie conexões reais, sem pressa.",
  },
  {
    icon: Signpost,
    title: "Rolês combinados",
    description: "Organize e participe de passeios com quem compartilha o seu estilo.",
  },
  {
    icon: ShieldCheck,
    title: "Comunidade segura",
    description: "Cadastro moderado manualmente e nunca exibimos sua localização exata.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <main className="flex flex-1 flex-col gap-10 px-6 pb-12 pt-16">
        <section className="flex flex-col items-center gap-4 text-center">
          <BrandLogo size={260} priority />
          <h1 className="sr-only">Multiverso Girls</h1>
          <p className="text-balance text-muted-foreground">
            A comunidade de motoqueiras do Rio Grande do Sul. Encontre outras
            mulheres que andam de moto na sua região, crie amizades, grupos e
            combine rolês.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <Link href="/cadastro" className={buttonVariants({ size: "lg", className: "w-full" })}>
            Quero fazer parte da comunidade
          </Link>
          <Link
            href="/entrar"
            className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}
          >
            Já tenho conta
          </Link>
          <Link href="/quero-ser-parceiro" className="text-center text-sm text-muted-foreground hover:text-foreground">
            Tem uma loja ou serviço? <span className="font-medium text-primary">Quero ser parceiro</span>
          </Link>
        </section>

        <section className="flex flex-col gap-3">
          {DESTAQUES.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardContent className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="px-6 pb-8 text-center text-xs text-muted-foreground">
        Comunidade exclusiva para mulheres maiores de 18 anos. Sem mapas, sem
        endereço exato — só cidade e estado.
      </footer>
    </div>
  );
}
