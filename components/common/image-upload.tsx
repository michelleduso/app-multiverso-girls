"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/common/remote-image";
import { compressImage, extensionFor, IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Envia a imagem (já reduzida no navegador) direto para o Storage, na pasta da
 * usuária (exigida pela policy), e guarda a URL pública em um input hidden.
 */
export function ImageUpload({
  bucket,
  userId,
  name,
  label,
  initialUrl,
  square = false,
}: {
  bucket: "ride-images" | "group-covers" | "partner-media";
  userId: string;
  name: string;
  label: string;
  initialUrl?: string | null;
  /** logo: prévia quadrada */
  square?: boolean;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(original: File | undefined) {
    if (!original) return;
    setError(undefined);
    if (!IMAGE_TYPES.includes(original.type)) return setError("Use uma imagem JPG, PNG ou WebP.");

    setBusy(true);
    const file = await compressImage(original, square ? 800 : 1600);
    if (file.size > IMAGE_MAX_BYTES) {
      setBusy(false);
      return setError("A imagem deve ter até 5 MB.");
    }
    const supabase = createClient();
    const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
    setBusy(false);
    if (upErr) return setError("Não foi possível enviar a imagem.");
    setUrl(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={url} />
      {url ? (
        <div className={cn("relative overflow-hidden rounded-lg border border-border", square && "size-32")}>
          <RemoteImage src={url} className={cn("w-full object-cover", square ? "size-32" : "aspect-video")} />
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="absolute right-2 top-2"
            aria-label="Remover imagem"
            onClick={() => setUrl("")}
          >
            <X />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cn("border-dashed", square ? "size-32 flex-col" : "h-16")}
        >
          <ImagePlus />
          {busy ? "Enviando..." : square ? "Enviar logo" : "Adicionar imagem (opcional)"}
        </Button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
