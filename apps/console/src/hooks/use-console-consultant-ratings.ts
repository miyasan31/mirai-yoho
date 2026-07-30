import { useGetConsoleConsultantRatings } from "@mirai-yoho/api-client/api/console/console";
import type { GetConsoleConsultantRatingsParams } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

/**
 * 占い師に対する会員の評価一覧（運営のみ）。
 * 占い師詳細ページの一部として表示されるため、権限は console.consultants.read を共用する。
 */
export function useConsoleConsultantRatings(
  consultantId: string,
  params?: GetConsoleConsultantRatingsParams,
  options?: { enabled?: boolean },
) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const enabled = options?.enabled ?? true;
  return useGetConsoleConsultantRatings(
    organizationId ?? "",
    consultantId,
    params,
    {
      query: {
        ...cachePolicy.normal,
        enabled:
          !!token &&
          !!organizationId &&
          !!consultantId &&
          enabled &&
          hasPermission("console.consultants.read"),
      },
    },
  );
}
