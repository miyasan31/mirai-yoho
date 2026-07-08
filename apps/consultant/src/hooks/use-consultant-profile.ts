import {
  useCreateConsultantAvatarUploadUrl,
  useGetConsultantProfile,
  usePublishConsultantAvatar,
  useUpdateConsultantProfile,
} from "@mirai-yoho/api-client/api/consultant/consultant";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";

export function useConsultantProfile() {
  const { token, isLoading, role } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsultantProfile(organizationId ?? "", {
    query: {
      enabled:
        !isLoading && role === "consultant" && !!token && !!organizationId,
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export {
  useCreateConsultantAvatarUploadUrl,
  usePublishConsultantAvatar,
  useUpdateConsultantProfile,
};
