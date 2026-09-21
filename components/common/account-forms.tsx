"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/common/submit-button";
import { deleteMyAccount, updateMyData } from "@/features/conta/actions";
import { ESTADOS_BRASILEIROS } from "@/lib/constants/estados";

export function MyDataForm({
  displayName,
  city,
  state,
  bio,
}: {
  displayName: string;
  city: string;
  state: string;
  bio: string;
}) {
  const [result, formAction] = useActionState(updateMyData, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="display_name">Nome de exibição</Label>
        <Input id="display_name" name="display_name" required minLength={2} maxLength={60} defaultValue={displayName} />
      </div>
      <div className="grid grid-cols-[1fr_5.5rem] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" name="city" maxLength={80} defaultValue={city} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="state">Estado</Label>
          <Select id="state" name="state" defaultValue={state}>
            <option value="">—</option>
            {ESTADOS_BRASILEIROS.map((e) => (
              <option key={e.uf} value={e.uf}>
                {e.uf}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Sobre você</Label>
        <Textarea id="bio" name="bio" maxLength={300} defaultValue={bio} />
      </div>
      {result?.error && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <p role="status" className="text-sm text-emerald-300">
          Dados atualizados.
        </p>
      )}
      <SubmitButton className="w-fit">Salvar alterações</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [result, formAction] = useActionState(deleteMyAccount, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Digite EXCLUIR para confirmar</Label>
        <Input id="confirm" name="confirm" autoComplete="off" required />
      </div>
      {result?.error && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
      <SubmitButton variant="destructive" className="w-fit" pendingLabel="Excluindo...">
        Excluir minha conta
      </SubmitButton>
    </form>
  );
}
