"use client";

import { ReasonAction } from "@/components/admin/reason-action";
import { moderateProfile, reviewProfile } from "@/features/admin/actions";

/** Ações sobre uma motoqueira, conforme o status atual. Tudo pede motivo e fica na auditoria. */
export function ProfileActions({ userId, status, mode }: { userId: string; status: string; mode: "pending" | "member" }) {
  if (mode === "pending") {
    return (
      <div className="flex flex-wrap gap-2">
        <ReasonAction label="Aprovar" variant="default" reasonOptional confirmLabel="Confirmar aprovação" action={(r) => reviewProfile(userId, "approved", r)} />
        <ReasonAction label="Recusar" variant="destructive" action={(r) => reviewProfile(userId, "rejected", r)} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "approved" && status !== "banned" && status !== "deleted" && (
        <ReasonAction label={status === "rejected" ? "Aprovar" : "Reativar"} reasonOptional variant="default" action={(r) => reviewProfile(userId, "approved", r)} />
      )}
      {status !== "banned" && status !== "deleted" && (
        <>
          <ReasonAction label="Suspender" askDays action={(r, d) => moderateProfile(userId, "suspend_user", r, d)} />
          <ReasonAction
            label="Banir"
            variant="destructive"
            warning="Banimento permanente. A conta perde o acesso e só a equipe pode reverter."
            action={(r) => moderateProfile(userId, "ban_user", r)}
          />
        </>
      )}
    </div>
  );
}
