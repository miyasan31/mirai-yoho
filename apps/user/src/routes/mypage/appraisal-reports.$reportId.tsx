import type { MyAppraisalReport } from "@mirai-yoho/api-client/schemas";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Skeleton, SkeletonText } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, CircleX } from "lucide-react";
import { Suspense } from "react";
import { styled } from "styled-system/jsx";
import { useSuspenseMyAppraisalReport } from "@/hooks/use-my-appraisal-reports";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/mypage/appraisal-reports/$reportId")({
  head: () => pageHead("鑑定書"),
  errorComponent: MyAppraisalReportError,
  component: MypageAppraisalReportPage,
});

const SECTIONS = [
  { key: "theme", label: "鑑定テーマ" },
  { key: "currentSituation", label: "現状" },
  { key: "result", label: "鑑定結果" },
  { key: "luckyAction", label: "開運アクション" },
  { key: "summary", label: "総括" },
] as const satisfies ReadonlyArray<{
  key: keyof MyAppraisalReport;
  label: string;
}>;

function BackLink() {
  return (
    <Button asChild variant="plain" size="sm" alignSelf="flex-start">
      <Link to="/mypage/appraisal-reports">
        <ArrowLeft size={16} />
        鑑定書一覧に戻る
      </Link>
    </Button>
  );
}

function MyAppraisalReportError() {
  return (
    <styled.div display="flex" flexDir="column" gap="4">
      <BackLink />
      <EmptyState
        icon={CircleX}
        message="鑑定書が見つかりませんでした"
        hint="URL をご確認のうえ、鑑定書一覧からお進みください"
      />
    </styled.div>
  );
}

function MyAppraisalReportPending() {
  return (
    <styled.div display="flex" flexDir="column" gap="4">
      <Skeleton height="8" width="60%" />
      <SkeletonText noOfLines={3} />
      <SkeletonText noOfLines={6} />
    </styled.div>
  );
}

function MypageAppraisalReportPage() {
  const { reportId } = Route.useParams();
  return (
    <styled.div display="flex" flexDir="column" gap="4">
      <BackLink />
      <Suspense fallback={<MyAppraisalReportPending />}>
        <AppraisalReportDetail reportId={reportId} />
      </Suspense>
    </styled.div>
  );
}

function AppraisalReportDetail({ reportId }: { reportId: string }) {
  const { data } = useSuspenseMyAppraisalReport(reportId);
  const report = data.data;
  const publishedAt = report.publishedAt
    ? format(parseISO(report.publishedAt), "yyyy/MM/dd (E)", { locale: ja })
    : null;

  return (
    <styled.article
      border="1px solid"
      borderColor="border"
      rounded="l2"
      p={{ base: "4", md: "6" }}
      display="flex"
      flexDir="column"
      gap="6"
      shadow="sm"
    >
      <styled.header display="flex" flexDir="column" gap="2">
        <Text as="h1" textStyle="2xl" fontWeight="bold">
          {report.title || "鑑定書"}
        </Text>
        <styled.dl
          display="grid"
          gridTemplateColumns={{ base: "1fr", sm: "auto 1fr" }}
          columnGap="4"
          rowGap="1"
        >
          <MetaRow label="お名前" value={report.customerName} />
          <MetaRow label="生年月日" value={report.birthDate} />
          <MetaRow label="鑑定日" value={report.appraisalDate} />
          <MetaRow label="店舗" value={report.organizationName} />
          <MetaRow label="担当" value={report.consultantName} />
          <MetaRow label="発行日" value={publishedAt} />
        </styled.dl>
      </styled.header>

      {SECTIONS.map((section) => {
        const body = report[section.key];
        if (typeof body !== "string" || !body.trim()) return null;
        return (
          <styled.section
            key={section.key}
            display="flex"
            flexDir="column"
            gap="2"
          >
            <Text as="h2" textStyle="lg" fontWeight="semibold">
              {section.label}
            </Text>
            <Text whiteSpace="pre-wrap">{body}</Text>
          </styled.section>
        );
      })}
    </styled.article>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <>
      <styled.dt textStyle="sm" color="fg.muted">
        {label}
      </styled.dt>
      <styled.dd textStyle="sm">{value}</styled.dd>
    </>
  );
}
