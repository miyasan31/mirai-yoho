import {
  useCreateConsultantAvatarUploadUrl,
  useGetConsultantProfile,
  usePublishConsultantAvatar,
  useUpdateConsultantProfile,
} from "@mirai-yoho/api-client/api/consultant/consultant";
import { QUERY_STALE_TIME } from "@mirai-yoho/console-core/hooks/query-cache-policy";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { useAuth } from "@/hooks/use-auth";

export function useConsultantProfile() {
  const { token, isLoading, isConsultant } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsultantProfile(organizationId ?? "", {
    query: {
      enabled: !isLoading && isConsultant && !!token && !!organizationId,
      staleTime: QUERY_STALE_TIME.normal,
    },
  });
}

export {
  useCreateConsultantAvatarUploadUrl,
  usePublishConsultantAvatar,
  useUpdateConsultantProfile,
};
