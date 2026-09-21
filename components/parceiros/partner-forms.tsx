"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/common/submit-button";
import { ImageUpload } from "@/components/common/image-upload";
import { StoreFields, type StoreValues } from "@/components/parceiros/store-fields";
import { deletePartnerAccount, savePromotion, saveProduct, updateStore } from "@/features/parceiros/actions";
import { CATEGORIAS_PARCEIRO } from "@/lib/constants/parceiros";

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
        ✓ Salvo com sucesso.
      </p>
    );
  return null;
}

export function StoreForm({ userId, values, logoUrl, locked }: { userId: string; values: StoreValues; logoUrl: string; locked: boolean }) {
  const [state, formAction] = useActionState(updateStore, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ImageUpload bucket="partner-media" userId={userId} name="logo_url" label="Logo" initialUrl={logoUrl} square />
      <StoreFields v={values} />
      <Feedback state={state} />
      <SubmitButton disabled={locked} className="w-fit">
        Salvar loja
      </SubmitButton>
      {locked && <p className="text-xs text-muted-foreground">Loja suspensa: edição bloqueada. Fale com a equipe.</p>}
    </form>
  );
}

export type ProductFormValues = {
  name: string;
  description: string;
  category: string;
  price: string;
  external_url: string;
  whatsapp: string;
  image_url: string;
  status: "draft" | "active" | "paused";
  campaign_start: string;
  campaign_end: string;
};

export function ProductForm({
  userId,
  partnerId,
  productId,
  values,
  canPublish,
}: {
  userId: string;
  partnerId: string;
  productId: string | null;
  values: ProductFormValues;
  canPublish: boolean;
}) {
  const [state, formAction] = useActionState(saveProduct.bind(null, productId, partnerId), undefined);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <ImageUpload bucket="partner-media" userId={userId} name="image_url" label="Foto do produto" initialUrl={values.image_url} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required minLength={2} maxLength={100} defaultValue={values.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" maxLength={1000} defaultValue={values.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Categoria</Label>
          <Select id="category" name="category" required defaultValue={values.category}>
            {CATEGORIAS_PARCEIRO.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Preço (opcional)</Label>
          <Input id="price" name="price" inputMode="decimal" defaultValue={values.price} placeholder="499,00" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="external_url">Link do produto (site oficial)</Label>
        <Input id="external_url" name="external_url" type="url" inputMode="url" maxLength={500} defaultValue={values.external_url} placeholder="https://sualoja.com.br/produto" />
        <p className="text-xs text-muted-foreground">O botão “Ver produto” abre este endereço. A compra acontece no seu site, não aqui.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="whatsapp">WhatsApp deste produto (opcional)</Label>
        <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={values.whatsapp} placeholder="Se vazio, usa o WhatsApp da loja" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="campaign_start">Início da campanha</Label>
          <Input id="campaign_start" name="campaign_start" type="date" defaultValue={values.campaign_start} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="campaign_end">Fim (opcional)</Label>
          <Input id="campaign_end" name="campaign_end" type="date" defaultValue={values.campaign_end} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="status">Situação</Label>
        <Select id="status" name="status" defaultValue={values.status}>
          <option value="draft">Rascunho (não aparece para ninguém)</option>
          <option value="active" disabled={!canPublish && values.status !== "active"}>
            Ativo (publicado){canPublish ? "" : " — exige loja aprovada e plano ativo"}
          </option>
          <option value="paused">Pausado</option>
        </Select>
      </div>
      <Feedback state={state} />
      <SubmitButton className="w-fit">{productId ? "Salvar produto" : "Criar produto"}</SubmitButton>
    </form>
  );
}

export function PromotionForm({
  productId,
  salePrice,
  campaignEnd,
  featured,
  canPromote,
  canFeature,
}: {
  productId: string;
  salePrice: string;
  campaignEnd: string;
  featured: boolean;
  canPromote: boolean;
  canFeature: boolean;
}) {
  const [state, formAction] = useActionState(savePromotion.bind(null, productId), undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`sale-${productId}`}>Preço promocional</Label>
          <Input id={`sale-${productId}`} name="sale_price" inputMode="decimal" defaultValue={salePrice} disabled={!canPromote} placeholder="399,00" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`end-${productId}`}>Fim da campanha</Label>
          <Input id={`end-${productId}`} name="campaign_end" type="date" defaultValue={campaignEnd} disabled={!canPromote} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_featured" defaultChecked={featured} disabled={!canFeature} />
        Produto em destaque (pode aparecer como “Patrocinado” na comunidade)
      </label>
      <Feedback state={state} />
      <SubmitButton size="sm" disabled={!canPromote && !canFeature} className="w-fit">
        Salvar promoção
      </SubmitButton>
    </form>
  );
}

export function DeletePartnerForm() {
  const [state, formAction] = useActionState(deletePartnerAccount, undefined);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm">Digite EXCLUIR para confirmar</Label>
        <Input id="confirm" name="confirm" autoComplete="off" required />
      </div>
      <Feedback state={state} />
      <SubmitButton variant="destructive" className="w-fit" pendingLabel="Excluindo...">
        Excluir minha conta de parceiro
      </SubmitButton>
    </form>
  );
}
