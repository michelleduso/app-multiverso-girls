"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Mantém a lista de conversas atualizada (última mensagem + não lidas): qualquer
 * mensagem nova em conversa que eu enxergo (a RLS filtra o Realtime) dispara um refresh.
 */
export function RefreshOnMessages() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("conversations-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 400);
      })
      .subscribe();
    return () => {
      clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
