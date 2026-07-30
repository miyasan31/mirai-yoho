import {
  useGetMyAppraisalReportSuspense,
  useGetMyAppraisalReportsSuspense,
} from "@mirai-yoho/api-client/api/customer/customer";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";

/**
 * 発行済み鑑定書の一覧（組織横断）。
 * 占い師が発行したタイミングで invalidateAfter.appraisalReportMutation により無効化される前提。
 */
export function useSuspenseMyAppraisalReports() {
  return useGetMyAppraisalReportsSuspense({
    query: {
      staleTime: cachePolicy.normal.staleTime,
      gcTime: cachePolicy.normal.gcTime,
    },
  });
}

/** 発行済み鑑定書は内容が確定しているため長めにキャッシュする */
export function useSuspenseMyAppraisalReport(reportId: string) {
  return useGetMyAppraisalReportSuspense(reportId, {
    query: {
      staleTime: cachePolicy.long.staleTime,
      gcTime: cachePolicy.long.gcTime,
    },
  });
}
