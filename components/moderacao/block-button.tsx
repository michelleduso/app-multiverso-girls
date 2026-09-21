"use client";

import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { ActionButton } from "@/components/common/action-button";
import { blockUser, unblockUser } from "@/features/moderacao/actions";

/** Bloquear/desbloquear. Bloquear impede mensagens, solicitações e novas conexões. */
export function BlockButton({
  userId,
  name,
  blocked = false,
  redirectTo,
}: {
  userId: string;
  name?: string | null;
  blocked?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();

  if (blocked) {
    return (
      <ActionButton action={unblockUser.bind(null, userId)} variant="outline" size="sm" pendingLabel="..." onDone={() => router.refresh()}>
        Desbloquear
      </ActionButton>
    );
  }

  return (
    <ActionButton
      action={blockUser.bind(null, userId)}
      variant="ghost"
      size="sm"
      className="text-destructive"
      confirmMessage={`Bloquear ${name ?? "esta pessoa"}? Vocês não poderão mais trocar mensagens nem enviar solicitações.`}
      pendingLabel="Bloqueando..."
      onDone={() => (redirectTo ? router.push(redirectTo) : router.refresh())}
    >
      <Ban /> Bloquear
    </ActionButton>
  );
}
