import {
  useCreateConsultantAvatarUploadUrl,
  useGetConsultantProfile,
  usePublishConsultantAvatar,
  useUpdateConsultantProfile,
} from "@mirai-yoho/api-client/api/consultant/consultant";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsultantProfile() {
  const { token, isLoading, isConsultant } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsultantProfile(organizationId ?? "", {
    query: {
      ...cachePolicy.normal,
      enabled: !isLoading && isConsultant && !!token && !!organizationId,
    },
  });
}

export {
  useCreateConsultantAvatarUploadUrl,
  usePublishConsultantAvatar,
  useUpdateConsultantProfile,
};
