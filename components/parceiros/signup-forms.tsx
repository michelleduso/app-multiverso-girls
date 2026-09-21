"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/common/submit-button";
import { EMPTY_STORE, StoreFields } from "@/components/parceiros/store-fields";
import { signUpMember, signUpPartner } from "@/features/parceiros/actions";
import { ESTADOS_BRASILEIROS } from "@/lib/constants/estados";

function Done({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-4 text-center">
      <CheckCircle2 className="size-10 text-emerald-300" />
      <p className="text-sm text-muted-foreground">{children}</p>
      <Link href="/entrar" className="text-sm font-medium text-primary hover:underline">
        Ir para o login
      </Link>
    </div>
  );
}

function Terms({ adult = false }: { adult?: boolean }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      {adult && (
        <label className="flex items-start gap-2">
          <input type="checkbox" name="adult" required className="mt-1" />
          <span>Tenho 18 anos ou mais e sou mulher motoqueira.</span>
        </label>
      )}
      <label className="flex items-start gap-2">
        <input type="checkbox" name="accepted_terms" required className="mt-1" />
        <span>
          Li e aceito os{" "}
          <Link href="/termos" target="_blank" className="text-primary underline">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" target="_blank" className="text-primary underline">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
    </div>
  );
}

export function PartnerSignupForm() {
  const [state, formAction] = useActionState(signUpPartner, undefined);

  if (state?.ok) {
    return (
      <Done>
        Recebemos o seu pedido de parceria! Se pedirmos confirmação por e-mail, confirme o endereço e depois entre para
        acompanhar a análise. Nossa equipe avalia o cadastro e libera a publicação após a aprovação.
      </Done>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <StoreFields v={EMPTY_STORE} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail de acesso</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres. Você envia o logo depois, em “Minha loja”.</p>
      </div>
      <Terms />
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <SubmitButton size="lg" pendingLabel="Enviando...">
        Enviar pedido de parceria
      </SubmitButton>
    </form>
  );
}

export function MemberSignupForm() {
  const [state, formAction] = useActionState(signUpMember, undefined);

  if (state?.ok) {
    return <Done>Cadastro recebido! Confirme seu e-mail (se solicitado) e entre. Sua entrada será liberada após a aprovação da nossa equipe.</Done>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_name">Nome</Label>
        <Input id="display_name" name="display_name" required minLength={2} maxLength={60} autoComplete="given-name" />
      </div>
      <div className="grid grid-cols-[1fr_5.5rem] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" name="city" required maxLength={80} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="state">Estado</Label>
          <Select id="state" name="state" required defaultValue="RS">
            {ESTADOS_BRASILEIROS.map((e) => (
              <option key={e.uf} value={e.uf}>
                {e.uf}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <Terms adult />
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <SubmitButton size="lg" pendingLabel="Enviando...">
        Criar minha conta
      </SubmitButton>
    </form>
  );
}
