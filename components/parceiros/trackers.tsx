"use client";

import { useEffect } from "react";
import { trackImpressions, trackStoreView } from "@/features/parceiros/track";

/** Uma impressão por produto por sessão do navegador (evita inflar métricas ao navegar). */
export function ImpressionTracker({ productIds }: { productIds: string[] }) {
  const key = productIds.join(",");
  useEffect(() => {
    if (!key) return;
    try {
      const seen = new Set<string>(JSON.parse(sessionStorage.getItem("mg-imp") ?? "[]"));
      const fresh = key.split(",").filter((id) => !seen.has(id));
      if (fresh.length === 0) return;
      fresh.forEach((id) => seen.add(id));
      sessionStorage.setItem("mg-imp", JSON.stringify([...seen].slice(-500)));
      void trackImpressions(fresh);
    } catch {
      void trackImpressions(key.split(","));
    }
  }, [key]);
  return null;
}

export function StoreViewTracker({ partnerId }: { partnerId: string }) {
  useEffect(() => {
    try {
      const k = `mg-store-${partnerId}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch {
      /* segue e registra */
    }
    void trackStoreView(partnerId);
  }, [partnerId]);
  return null;
}
