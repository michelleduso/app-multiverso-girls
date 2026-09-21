"use client";

import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/common/action-button";
import { deleteProduct } from "@/features/parceiros/actions";

export function DeleteProductButton({ productId }: { productId: string }) {
  const router = useRouter();
  return (
    <ActionButton
      action={deleteProduct.bind(null, productId)}
      variant="destructive"
      confirmMessage="Excluir este produto definitivamente? Isso não pode ser desfeito. Para apenas tirar do ar, use “Pausado”."
      pendingLabel="Excluindo..."
      onDone={() => router.push("/parceiro/produtos")}
    >
      Excluir produto
    </ActionButton>
  );
}
