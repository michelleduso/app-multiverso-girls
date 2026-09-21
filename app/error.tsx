"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Erro inesperado em qualquer rota: mensagem em português, sem detalhes técnicos. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // o digest permite achar o erro nos logs do servidor sem expor detalhes ao usuário
    console.error("Erro na página", error.digest ?? "");
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex min-h-svh w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <TriangleAlert className="size-12 text-amber-300" aria-hidden />
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="text-sm text-muted-foreground">Tivemos um problema ao carregar esta tela. Tente novamente em instantes.</p>
      <Button size="lg" onClick={reset}>
        Tentar de novo
      </Button>
    </div>
  );
}
