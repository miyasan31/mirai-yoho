import { useEffect } from "react";
import { savePendingOrganizationId } from "@/lib/pending-organization";
import { useOrganizationIdFromRoute } from "./use-organization-routing";

// /{organizationId}/... を訪問したら localStorage に保存し、
// 未登録ユーザーが会員登録した後に元の組織へ戻せるようにする
export function useCapturePendingOrganizationId(): void {
  const organizationId = useOrganizationIdFromRoute();

  useEffect(() => {
    if (organizationId) {
      savePendingOrganizationId(organizationId);
    }
  }, [organizationId]);
}
