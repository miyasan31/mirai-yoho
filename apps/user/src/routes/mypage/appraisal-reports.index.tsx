import type { MyAppraisalReportSummary } from "@mirai-yoho/api-client/schemas";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Skeleton, SkeletonText } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { CircleX, ScrollText } from "lucide-react";
import { Suspense } from "react";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { useSuspenseMyAppraisalReports } from "@/hooks/use-my-appraisal-reports";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/mypage/appraisal-reports/")({
  head: () => pageHead("鑑定書"),
  errorComponent: MyAppraisalReportsError,
  component: MypageAppraisalReportsPage,
});

function formatPublishedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return format(parseISO(iso), "yyyy/MM/dd (E)", { locale: ja });
}

function ReportCardSkeleton() {
  return (
    <styled.div
      border="1px solid"
      borderColor="border"
      rounded="l2"
      p="4"
      display="flex"
      flexDir="column"
      gap="2"
    >
      <Skeleton height="6" width="60%" />
      <SkeletonText noOfLines={2} />
    </styled.div>
  );
}

function MyAppraisalReportsPending() {
  return (
    <styled.div display="flex" flexDir="column" gap="3">
      <ReportCardSkeleton />
      <ReportCardSkeleton />
    </styled.div>
  );
}

function MyAppraisalReportsError() {
  return (
    <EmptyState
      icon={CircleX}
      message="鑑定書の取得に失敗しました"
      hint="時間をおいて再度お試しください"
    />
  );
}

function MypageAppraisalReportsPage() {
  const { isSignedUp } = useCustomerAuth();
  return (
    <styled.div display="flex" flexDir="column" gap="6">
      <Text as="h1" textStyle="2xl" fontWeight="bold">
        鑑定書
      </Text>
      {isSignedUp ? (
        <Suspense fallback={<MyAppraisalReportsPending />}>
          <MyAppraisalReportsList />
        </Suspense>
      ) : (
        <EmptyState
          icon={ScrollText}
          message="鑑定書はありません"
          hint="鑑定後に占い師が発行すると、ここに表示されます"
        />
      )}
    </styled.div>
  );
}

function MyAppraisalReportsList() {
  const { data } = useSuspenseMyAppraisalReports();
  const reports = data.data.reports;

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        message="鑑定書はありません"
        hint="鑑定後に占い師が発行すると、ここに表示されます"
      />
    );
  }

  return (
    <styled.ul display="flex" flexDir="column" gap="3" listStyle="none">
      {reports.map((report) => (
        <ReportCard key={report.reportId} report={report} />
      ))}
    </styled.ul>
  );
}

function ReportCard({ report }: { report: MyAppraisalReportSummary }) {
  const publishedAt = formatPublishedAt(report.publishedAt);

  return (
    <styled.li
      border="1px solid"
      borderColor="border"
      rounded="l2"
      p="4"
      display="flex"
      flexDir="column"
      gap="2"
      shadow="sm"
    >
      <Text fontWeight="semibold" textStyle="md">
        {report.title || "鑑定書"}
      </Text>
      {report.appraisalDate && (
        <Text textStyle="sm" color="fg.muted">
          鑑定日: {report.appraisalDate}
        </Text>
      )}
      {report.consultantName && (
        <Text textStyle="sm" color="fg.muted">
          担当: {report.consultantName}
        </Text>
      )}
      {report.organizationName && (
        <Text textStyle="sm" color="fg.muted">
          店舗: {report.organizationName}
        </Text>
      )}
      {publishedAt && (
        <Text textStyle="xs" color="fg.subtle">
          発行日: {publishedAt}
        </Text>
      )}
      <styled.div mt="1">
        <Button asChild variant="outline" size="sm">
          <Link
            to="/mypage/appraisal-reports/$reportId"
            params={{ reportId: report.reportId }}
          >
            <ScrollText size={16} />
            鑑定書を見る
          </Link>
        </Button>
      </styled.div>
    </styled.li>
  );
}
