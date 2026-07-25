import {
  useArchiveConsoleCoupon,
  useCreateConsoleCoupon,
  useGetConsoleCoupons,
  useUpdateConsoleCoupon,
} from "@mirai-yoho/api-client/api/console/console";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsoleCoupons(options?: { enabled?: boolean }) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const enabled = options?.enabled ?? true;
  return useGetConsoleCoupons(organizationId ?? "", {
    query: {
      ...cachePolicy.normal,
      enabled:
        !!token &&
        !!organizationId &&
        enabled &&
        hasPermission("console.coupons.read"),
    },
  });
}

export {
  useCreateConsoleCoupon,
  useUpdateConsoleCoupon,
  useArchiveConsoleCoupon,
};
