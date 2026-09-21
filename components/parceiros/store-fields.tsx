import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIAS_PARCEIRO } from "@/lib/constants/parceiros";
import { ESTADOS_BRASILEIROS } from "@/lib/constants/estados";

export type StoreValues = {
  legal_name: string;
  trade_name: string;
  cnpj: string;
  responsible: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  website: string;
  city: string;
  state: string;
  description: string;
  category: string;
};

export const EMPTY_STORE: StoreValues = {
  legal_name: "",
  trade_name: "",
  cnpj: "",
  responsible: "",
  phone: "",
  whatsapp: "",
  instagram: "",
  website: "",
  city: "",
  state: "RS",
  description: "",
  category: "acessorios",
};

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Campos da loja, compartilhados entre o cadastro de parceiro e a edição da loja. */
export function StoreFields({ v }: { v: StoreValues }) {
  return (
    <>
      <Field id="legal_name" label="Razão social / nome da empresa">
        <Input id="legal_name" name="legal_name" required minLength={2} maxLength={120} defaultValue={v.legal_name} />
      </Field>
      <Field id="trade_name" label="Nome fantasia (nome da loja)">
        <Input id="trade_name" name="trade_name" required minLength={2} maxLength={80} defaultValue={v.trade_name} />
      </Field>
      <Field id="category" label="Categoria">
        <Select id="category" name="category" required defaultValue={v.category}>
          {CATEGORIAS_PARCEIRO.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="cnpj" label="CNPJ (opcional por enquanto)">
        <Input id="cnpj" name="cnpj" inputMode="numeric" maxLength={18} defaultValue={v.cnpj} placeholder="00.000.000/0000-00" />
      </Field>
      <Field id="responsible" label="Nome do responsável">
        <Input id="responsible" name="responsible" required minLength={2} maxLength={80} autoComplete="name" defaultValue={v.responsible} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="phone" label="Telefone">
          <Input id="phone" name="phone" type="tel" required inputMode="tel" autoComplete="tel" defaultValue={v.phone} placeholder="(51) 3000-0000" />
        </Field>
        <Field id="whatsapp" label="WhatsApp comercial">
          <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={v.whatsapp} placeholder="(51) 99999-9999" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="instagram" label="Instagram">
          <Input id="instagram" name="instagram" maxLength={60} defaultValue={v.instagram} placeholder="@sualoja" />
        </Field>
        <Field id="website" label="Site">
          <Input id="website" name="website" type="url" inputMode="url" maxLength={300} defaultValue={v.website} placeholder="https://sualoja.com.br" />
        </Field>
      </div>
      <div className="grid grid-cols-[1fr_5.5rem] gap-3">
        <Field id="city" label="Cidade">
          <Input id="city" name="city" required maxLength={80} defaultValue={v.city} />
        </Field>
        <Field id="state" label="Estado">
          <Select id="state" name="state" required defaultValue={v.state}>
            {ESTADOS_BRASILEIROS.map((e) => (
              <option key={e.uf} value={e.uf}>
                {e.uf}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="description" label="Descrição da loja" hint="Aparece na página pública. Não é marketplace: aqui é só vitrine.">
        <Textarea id="description" name="description" maxLength={1000} defaultValue={v.description} />
      </Field>
    </>
  );
}
