"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/common/submit-button";
import { ImageUpload } from "@/components/common/image-upload";
import { ESTADOS_BRASILEIROS } from "@/lib/constants/estados";
import { TIPOS_DE_ROLE } from "@/lib/constants/comunidade";
import type { FormState } from "@/lib/action-result";

export type RideFormValues = {
  title: string;
  description: string;
  city: string;
  state: string;
  date: string;
  time: string;
  ride_type: string;
  max_participants: string;
  image_url: string;
  visibility: "public" | "private";
  requires_approval: boolean;
};

export function RideForm({
  action,
  userId,
  initial,
  groupId,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  userId: string;
  initial: RideFormValues;
  groupId?: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4 p-4">
      {groupId && <input type="hidden" name="group_id" value={groupId} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" required minLength={3} maxLength={80} defaultValue={initial.title} placeholder="Serra domingo" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={1000}
          defaultValue={initial.description}
          placeholder="Quem pilha pegar a estrada, subir a serra e parar para tomar café?"
        />
        <p className="text-xs text-muted-foreground">
          Esta descrição é pública. Não escreva endereço nem ponto de encontro aqui — use o campo
          “Ponto de encontro” depois de criar, visível só para as confirmadas.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_5.5rem] gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Cidade de saída</Label>
          <Input id="city" name="city" required maxLength={80} defaultValue={initial.city} placeholder="Porto Alegre" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="state">Estado</Label>
          <Select id="state" name="state" required defaultValue={initial.state}>
            {ESTADOS_BRASILEIROS.map((e) => (
              <option key={e.uf} value={e.uf}>
                {e.uf}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date">Data</Label>
          <Input id="date" name="date" type="date" required defaultValue={initial.date} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="time">Horário de saída</Label>
          <Input id="time" name="time" type="time" required defaultValue={initial.time} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ride_type">Tipo de rolê</Label>
          <Select id="ride_type" name="ride_type" required defaultValue={initial.ride_type}>
            {TIPOS_DE_ROLE.map((t) => (
              <option key={t.value} value={t.value}>
                {t.emoji} {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="max_participants">Máx. de participantes</Label>
          <Input
            id="max_participants"
            name="max_participants"
            type="number"
            inputMode="numeric"
            min={2}
            max={200}
            defaultValue={initial.max_participants}
            placeholder="Sem limite"
          />
        </div>
      </div>

      <ImageUpload bucket="ride-images" userId={userId} name="image_url" label="Imagem" initialUrl={initial.image_url} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Quem pode ver</legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="visibility" value="public" defaultChecked={initial.visibility === "public"} className="mt-1" />
          <span>
            <strong>Público</strong> — aparece no feed (só a cidade é mostrada)
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="visibility" value="private" defaultChecked={initial.visibility === "private"} className="mt-1" />
          <span>
            <strong>Privado</strong> — só quem você aceitar (ou integrantes do grupo) vê; sempre com aprovação
          </span>
        </label>
      </fieldset>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="requires_approval" defaultChecked={initial.requires_approval} className="mt-1" />
        <span>Eu preciso aprovar quem quiser participar (rolês privados sempre exigem)</span>
      </label>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <SubmitButton size="lg">{submitLabel}</SubmitButton>
    </form>
  );
}
