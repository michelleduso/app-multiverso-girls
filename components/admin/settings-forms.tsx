"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/common/submit-button";
import { setSetting } from "@/features/admin/actions";

function Feedback({ state }: { state: { error?: string; ok?: boolean } | undefined }) {
  if (state?.error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  if (state?.ok)
    return (
      <p role="status" className="text-sm text-emerald-300">
        ✓ Salvo.
      </p>
    );
  return null;
}

export function SupportContactForm({ email, whatsapp }: { email: string; whatsapp: string }) {
  const [state, formAction] = useActionState(setSetting.bind(null, "support_contact"), undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail de contato</Label>
        <Input id="email" name="email" type="email" defaultValue={email} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsapp">WhatsApp de contato</Label>
        <Input id="whatsapp" name="whatsapp" defaultValue={whatsapp} placeholder="(51) 99999-9999" />
      </div>
      <p className="text-xs text-muted-foreground">Aparece para o lojista na mensagem de plano vencido e em “Meu plano”.</p>
      <Feedback state={state} />
      <SubmitButton className="w-fit">Salvar contato</SubmitButton>
    </form>
  );
}

export function SponsoredMaxForm({ value }: { value: number }) {
  const [state, formAction] = useActionState(setSetting.bind(null, "sponsored_max"), undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="value">Máximo de cards patrocinados no feed (0 a 5)</Label>
        <Input id="value" name="value" type="number" min={0} max={5} defaultValue={value} className="w-28" />
      </div>
      <p className="text-xs text-muted-foreground">Evita propaganda excessiva. 0 desliga os cards patrocinados no feed.</p>
      <Feedback state={state} />
      <SubmitButton className="w-fit">Salvar limite</SubmitButton>
    </form>
  );
}
