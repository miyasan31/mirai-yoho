import {
  useArchiveConsoleCoupon,
  useCreateConsoleCoupon,
  useGetConsoleCoupons,
  useUpdateConsoleCoupon,
} from "@mirai-yoho/api-client/api/console/console";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { useAuth } from "@/hooks/use-auth";

export function useConsoleCoupons(options?: { enabled?: boolean }) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const enabled = options?.enabled ?? true;
  return useGetConsoleCoupons(organizationId ?? "", {
    query: {
      enabled:
        !!token &&
        !!organizationId &&
        enabled &&
        hasPermission("console.coupons.read"),
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export {
  useCreateConsoleCoupon,
  useUpdateConsoleCoupon,
  useArchiveConsoleCoupon,
};
