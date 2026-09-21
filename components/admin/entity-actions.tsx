"use client";

import { ReasonAction } from "@/components/admin/reason-action";
import { moderateGroupAdmin, moderateRideAdmin, reviewPartner, setProductStatus } from "@/features/admin/actions";

export function RideAdminActions({ rideId }: { rideId: string }) {
  return (
    <ReasonAction
      label="Cancelar rolê"
      variant="destructive"
      warning="As participantes serão avisadas do cancelamento."
      action={(r) => moderateRideAdmin(rideId, r)}
    />
  );
}

export function GroupAdminActions({ groupId, suspended }: { groupId: string; suspended: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {!suspended && <ReasonAction label="Suspender grupo" action={(r) => moderateGroupAdmin(groupId, "suspend_group", r)} />}
      <ReasonAction
        label="Excluir grupo"
        variant="destructive"
        warning="Exclusão definitiva: apaga o grupo, o chat e as participações. O registro fica na auditoria."
        action={(r) => moderateGroupAdmin(groupId, "delete_group", r)}
      />
    </div>
  );
}

export function PartnerReviewActions({ partnerId, status }: { partnerId: string; status: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "approved" && (
        <ReasonAction label={status === "suspended" ? "Reativar" : "Aprovar"} variant="default" reasonOptional action={(r) => reviewPartner(partnerId, "approved", r)} />
      )}
      {status === "pending" && <ReasonAction label="Recusar" variant="destructive" action={(r) => reviewPartner(partnerId, "rejected", r)} />}
      {status === "approved" && (
        <ReasonAction
          label="Suspender parceiro"
          variant="destructive"
          warning="A loja e todos os produtos saem do ar imediatamente (nada é apagado)."
          action={(r) => reviewPartner(partnerId, "suspended", r)}
        />
      )}
    </div>
  );
}

export function ProductAdminActions({ productId, status }: { productId: string; status: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {status === "active" && <ReasonAction label="Pausar" action={(r) => setProductStatus(productId, "paused", r)} />}
      {status !== "blocked" && (
        <ReasonAction label="Bloquear" variant="destructive" warning="O lojista não conseguirá reativar o produto." action={(r) => setProductStatus(productId, "blocked", r)} />
      )}
      {status === "blocked" && <ReasonAction label="Liberar (voltar a rascunho)" action={(r) => setProductStatus(productId, "draft", r)} />}
    </div>
  );
}
