"use client";

import { useEffect, useState } from "react";
import { RemoteImage } from "@/components/common/remote-image";
import { createClient } from "@/lib/supabase/client";

/** Imagens de chat vivem num bucket privado: cada exibição usa uma URL assinada de curta duração. */
export function ChatImage({ path }: { path: string }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    createClient()
      .storage.from("chat-images")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) setFailed(true);
        else setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);

  if (failed) return <p className="text-xs italic">Imagem indisponível</p>;
  if (!url) return <div className="h-32 w-48 animate-pulse rounded-lg bg-muted" />;
  return <RemoteImage src={url} alt="Imagem enviada" className="mb-1 max-h-72 rounded-lg object-cover" />;
}
