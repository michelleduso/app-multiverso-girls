"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/common/submit-button";
import { ImageUpload } from "@/components/common/image-upload";
import { CATEGORIAS_DE_GRUPO } from "@/lib/constants/comunidade";
import { ESTADOS_BRASILEIROS } from "@/lib/constants/estados";
import type { FormState } from "@/lib/action-result";

export type GroupFormValues = {
  name: string;
  description: string;
  cover_url: string;
  city: string;
  state: string;
  region: string;
  category: string;
  visibility: "public" | "private";
  rules: string;
};

export function GroupForm({
  action,
  userId,
  initial,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  userId: string;
  initial: GroupFormValues;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 p-4">
      <ImageUpload bucket="group-covers" userId={userId} name="cover_url" label="Foto de capa" initialUrl={initial.cover_url} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome do grupo</Label>
        <Input id="name" name="name" required minLength={3} maxLength={60} defaultValue={initial.name} placeholder="Gurias de POA" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" maxLength={1000} defaultValue={initial.description} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Categoria</Label>
        <Select id="category" name="category" required defaultValue={initial.category}>
          {CATEGORIAS_DE_GRUPO.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-[1fr_5.5rem] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" name="city" maxLength={80} defaultValue={initial.city} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="state">Estado</Label>
          <Select id="state" name="state" defaultValue={initial.state}>
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
        <Label htmlFor="region">Região (opcional)</Label>
        <Input id="region" name="region" maxLength={80} defaultValue={initial.region} placeholder="Serra gaúcha, Vale do Sinos..." />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Entrada no grupo</legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="visibility" value="public" defaultChecked={initial.visibility === "public"} className="mt-1" />
          <span>
            <strong>Público</strong> — qualquer aprovada entra direto
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="visibility" value="private" defaultChecked={initial.visibility === "private"} className="mt-1" />
          <span>
            <strong>Privado</strong> — quem quiser entrar pede e uma administradora aprova
          </span>
        </label>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rules">Regras do grupo</Label>
        <Textarea
          id="rules"
          name="rules"
          maxLength={2000}
          defaultValue={initial.rules}
          placeholder="Respeito, sem spam, sem divulgar endereço de ninguém..."
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <SubmitButton size="lg">{submitLabel}</SubmitButton>
    </form>
  );
}
