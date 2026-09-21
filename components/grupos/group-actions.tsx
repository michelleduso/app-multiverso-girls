"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/common/action-button";
import { joinGroup, leaveGroup } from "@/features/grupos/actions";
import { moderateGroup } from "@/features/moderacao/actions";

/** Entrar / pedir para entrar / sair do grupo. */
export function GroupMembershipButton({
  groupId,
  isPrivate,
  membership,
}: {
  groupId: string;
  isPrivate: boolean;
  membership: "active" | "pending" | null;
}) {
  if (membership === "active") {
    return (
      <ActionButton
        action={leaveGroup.bind(null, groupId)}
        variant="outline"
        confirmMessage="Sair deste grupo?"
        pendingLabel="Saindo..."
      >
        Sair do grupo
      </ActionButton>
    );
  }
  if (membership === "pending") {
    return (
      <ActionButton action={leaveGroup.bind(null, groupId)} variant="outline" pendingLabel="Cancelando...">
        Pedido enviado · cancelar
      </ActionButton>
    );
  }
  return (
    <ActionButton action={joinGroup.bind(null, groupId)} size="lg" pendingLabel="Enviando...">
      {isPrivate ? "Pedir para entrar" : "Entrar no grupo"}
    </ActionButton>
  );
}

/** Ferramentas da administração da PLATAFORMA: suspender ou excluir grupo que viole as regras. */
export function PlatformGroupControls({ groupId, suspended }: { groupId: string; suspended: boolean }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();

  function run(action: "suspend_group" | "delete_group") {
    if (reason.trim().length < 3) return setError("Informe o motivo (fica no histórico de moderação).");
    if (!window.confirm(action === "delete_group" ? "Excluir o grupo definitivamente?" : "Suspender o grupo?")) return;
    setError(undefined);
    start(async () => {
      const res = await moderateGroup(groupId, action, reason.trim());
      if (res.error) setError(res.error);
      else if (action === "delete_group") router.push("/grupos");
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 p-3">
      <p className="text-sm font-semibold text-destructive">Moderação da plataforma</p>
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo da ação" aria-label="Motivo" />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        {!suspended && (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run("suspend_group")}>
            Suspender grupo
          </Button>
        )}
        <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => run("delete_group")}>
          Excluir grupo
        </Button>
      </div>
    </div>
  );
}
