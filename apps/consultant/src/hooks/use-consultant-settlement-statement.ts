import { useGetConsultantSettlementStatement } from "@mirai-yoho/api-client/api/consultant/consultant";
import type { GetConsultantSettlementStatementParams } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsultantSettlementStatement(
  params: GetConsultantSettlementStatementParams,
) {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsultantSettlementStatement(organizationId ?? "", params, {
    query: {
      ...cachePolicy.short,
      enabled: !!token && !!organizationId,
    },
  });
}
