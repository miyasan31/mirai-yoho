import { useListQueryParams } from "@mirai-yoho/console-core/hooks/use-list-query-params";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { ListControls } from "@mirai-yoho/ui/components/list-controls";
import { TableSkeleton } from "@mirai-yoho/ui/components/table-skeleton";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Star, UserX } from "lucide-react";
import { styled } from "styled-system/jsx";
import { useAuth } from "@/hooks/use-auth";
import { useConsoleConsultantRatings } from "@/hooks/use-console-consultant-ratings";
import { useConsoleConsultant } from "@/hooks/use-console-consultants";
import { ConsultantProfileCard } from "./_components/consultant-profile-card";
import { ConsultantRatingSummaryCard } from "./_components/consultant-rating-summary";
import { ConsultantRatingTable } from "./_components/consultant-rating-table";

export default function ConsoleConsultantDetailPage() {
  const { buildPath } = useOrganizationRouting();
  const params = useParams({ strict: false });
  const consultantId = params.id ?? "";
  const { roleId } = useAuth();
  const isAdmin = roleId === "admin";

  const { data: consultantData, isLoading: isConsultantLoading } =
    useConsoleConsultant(consultantId);
  const { page, pageSize, sortBy, setPage, setPageSize, setSortBy } =
    useListQueryParams();
  const { data: ratingData, isLoading: isRatingLoading } =
    useConsoleConsultantRatings(consultantId, {
      page,
      pageSize,
      sortBy,
      sortOrder: "desc",
    });

  const consultant = consultantData?.data?.consultant;
  const ratings = ratingData?.data?.ratings ?? [];
  const summary = ratingData?.data?.summary;
  const pagination = ratingData?.data?.pagination ?? {
    page,
    pageSize,
    total: ratings.length,
    totalPages: 1,
  };

  return (
    <styled.div display="flex" flexDir="column" gap="6">
      <styled.div
        alignItems="flex-start"
        display="flex"
        gap="3"
        justifyContent="space-between"
      >
        <Button asChild variant="outline" size="sm">
          <Link to={buildPath("/consultants")}>
            <ArrowLeft size={16} />
            占い師一覧に戻る
          </Link>
        </Button>
        {isAdmin && consultant && (
          <Button asChild size="sm">
            <Link to={buildPath(`/consultants/${consultantId}/edit`)}>
              <Pencil size={16} />
              編集
            </Link>
          </Button>
        )}
      </styled.div>

      <styled.div>
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          占い師詳細
        </Text>
        <Text textStyle="sm" color="fg.muted">
          プロフィールと、会員から寄せられた評価を確認できます。評価は占い師本人には公開されません。
        </Text>
      </styled.div>

      {isConsultantLoading ? (
        <Skeleton height="40" />
      ) : consultant ? (
        <ConsultantProfileCard consultant={consultant} />
      ) : (
        <EmptyState
          icon={UserX}
          message="占い師が見つかりません"
          hint="一覧から選び直してください"
        />
      )}

      <styled.section display="flex" flexDir="column" gap="3">
        <Text as="h2" textStyle="lg" fontWeight="semibold">
          評価
        </Text>
        {isRatingLoading ? (
          <TableSkeleton columns={4} rows={5} />
        ) : !summary || summary.count === 0 ? (
          <EmptyState
            icon={Star}
            message="評価はまだありません"
            hint="鑑定終了後に会員が評価すると、ここに表示されます"
          />
        ) : (
          <>
            <ConsultantRatingSummaryCard summary={summary} />
            <ConsultantRatingTable ratings={ratings} />
            <ListControls
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              onSortByChange={setSortBy}
              page={pagination.page}
              pageSize={pagination.pageSize}
              sortBy={sortBy}
              total={pagination.total}
              totalPages={pagination.totalPages}
            />
          </>
        )}
      </styled.section>
    </styled.div>
  );
}
