import {
  useGetConsultantAppraisalReport,
  useGetConsultantAppraisalReports,
  usePublishConsultantAppraisalReport,
  useSaveConsultantAppraisalReportDraft,
} from "@mirai-yoho/api-client/api/consultant/consultant";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";
import { useAuth } from "@/hooks/use-auth";

export function useConsultantAppraisalReports() {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsultantAppraisalReports(organizationId ?? "", {
    query: {
      ...cachePolicy.short,
      enabled: !!token && !!organizationId,
    },
  });
}

export function useConsultantAppraisalReport(bookingId: string) {
  const { token } = useAuth();
  const { organizationId } = useOrganizationRouting();
  return useGetConsultantAppraisalReport(organizationId ?? "", bookingId, {
    query: {
      ...cachePolicy.short,
      enabled: !!token && !!organizationId && !!bookingId,
    },
  });
}

export {
  usePublishConsultantAppraisalReport,
  useSaveConsultantAppraisalReportDraft,
};
