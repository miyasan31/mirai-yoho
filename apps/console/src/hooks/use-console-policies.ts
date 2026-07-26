import {
  useCreatePolicyRevisionDraft,
  useGetConsolePolicyRevision,
  useGetConsolePolicyRevisions,
  useGetPolicyRevisionDiff,
  usePublishPolicyRevision,
  useUpdatePolicyRevisionDraft,
} from "@mirai-yoho/api-client/api/console/console";
import type { PolicyType } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsolePolicyRevisions(
  type: PolicyType,
  options?: { enabled?: boolean },
) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const enabled = options?.enabled ?? true;
  return useGetConsolePolicyRevisions(organizationId ?? "", type, {
    query: {
      ...cachePolicy.normal,
      enabled:
        !!token &&
        !!organizationId &&
        enabled &&
        hasPermission("console.policies.read"),
    },
  });
}

export function useConsolePolicyRevision(
  type: PolicyType,
  revisionId: string | null,
) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsolePolicyRevision(
    organizationId ?? "",
    type,
    revisionId ?? "",
    {
      query: {
        ...cachePolicy.normal,
        enabled:
          !!token &&
          !!organizationId &&
          !!revisionId &&
          hasPermission("console.policies.read"),
      },
    },
  );
}

export function useConsolePolicyRevisionDiff(
  type: PolicyType,
  toRevisionId: string | null,
  fromRevisionId: string | null,
) {
  const { token, hasPermission } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetPolicyRevisionDiff(
    organizationId ?? "",
    type,
    { to: toRevisionId ?? "", from: fromRevisionId ?? undefined },
    {
      query: {
        ...cachePolicy.normal,
        enabled:
          !!token &&
          !!organizationId &&
          !!toRevisionId &&
          hasPermission("console.policies.read"),
      },
    },
  );
}

export {
  useCreatePolicyRevisionDraft,
  useUpdatePolicyRevisionDraft,
  usePublishPolicyRevision,
};
