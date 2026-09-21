"use client";

import { ActionButton } from "@/components/common/action-button";
import { markNotificationsRead } from "@/features/chat/actions";

export function MarkReadButton() {
  return (
    <ActionButton action={markNotificationsRead} variant="ghost" size="sm" pendingLabel="...">
      Marcar como lidas
    </ActionButton>
  );
}
