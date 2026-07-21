import { useListQueryParams } from "@mirai-yoho/console-core/hooks/use-list-query-params";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { ListControls } from "@mirai-yoho/ui/components/list-controls";
import { BookingStatusBadge } from "@mirai-yoho/ui/components/status-badge";
import { TableSkeleton } from "@mirai-yoho/ui/components/table-skeleton";
import { TruncatedId } from "@mirai-yoho/ui/components/truncated-id";
import { HoverCard } from "@mirai-yoho/ui/components/ui/hover-card";
import { IconButton } from "@mirai-yoho/ui/components/ui/icon-button";
import * as Table from "@mirai-yoho/ui/components/ui/table";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarX, ExternalLink, Pencil } from "lucide-react";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { useConsultantBookings } from "@/hooks/use-consultant-bookings";
import { ConsultantJoinControl } from "./consultant-join-control";

function formatDateTimeRange(startsAtIso: string, endsAtIso: string): string {
  const startsAt = parseISO(startsAtIso);
  const endsAt = parseISO(endsAtIso);
  const startLabel = format(startsAt, "yyyy/MM/dd (E) HH:mm", { locale: ja });
  const endLabel = format(endsAt, "HH:mm");
  return `${startLabel} 〜 ${endLabel}`;
}

function formatPricePlan(
  name: string | null | undefined,
  totalJPY: number | null | undefined,
): string | null {
  if (!name && totalJPY == null) return null;
  if (name && totalJPY != null) {
    return `${name}（¥${totalJPY.toLocaleString("ja-JP")}）`;
  }
  if (name) return name;
  return `¥${(totalJPY ?? 0).toLocaleString("ja-JP")}`;
}

type CustomerSummary = {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  memo?: string | null;
};

function CustomerCell({
  customerId,
  customer,
}: {
  customerId: string;
  customer: CustomerSummary | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <HoverCard
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      openDelay={150}
      closeDelay={100}
      positioning={{ placement: "top-start" }}
      showArrow
      content={
        <styled.div display="flex" flexDir="column" gap="1" minW="240px">
          {customer ? (
            <>
              <Text textStyle="sm" fontWeight="bold">
                {customer.name}
              </Text>
              <Text textStyle="xs" color="fg.muted">
                メール: {customer.email}
              </Text>
              <Text textStyle="xs" color="fg.muted">
                電話: {customer.phone}
              </Text>
            </>
          ) : (
            <Text textStyle="sm">情報が見つかりません</Text>
          )}
        </styled.div>
      }
    >
      <styled.span cursor="default" display="inline-block">
        {customer ? (
          <Text textStyle="sm">{customer.name}</Text>
        ) : (
          <TruncatedId id={customerId} />
        )}
      </styled.span>
    </HoverCard>
  );
}

export default function ConsultantBookingsPage() {
  const { buildPath } = useOrganizationRouting();
  const { page, pageSize, sortBy, setPage, setPageSize, setSortBy } =
    useListQueryParams();
  const { data, isLoading, refetch } = useConsultantBookings({
    page,
    pageSize,
    sortBy,
    sortOrder: "desc",
  });
  const bookings = data?.data?.bookings ?? [];
  const pagination = data?.data?.pagination ?? {
    page,
    pageSize,
    total: bookings.length,
    totalPages: 1,
  };

  if (isLoading) {
    return (
      <styled.div>
        <styled.div mb="4">
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            予約一覧
          </Text>
          <Text textStyle="sm" color="fg.muted">
            担当予約の日時・ステータスを確認し、Zoom参加や鑑定メモ編集へ進む画面です。
          </Text>
        </styled.div>
        <TableSkeleton columns={8} rows={5} />
      </styled.div>
    );
  }

  return (
    <styled.div>
      <styled.div mb="4">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          予約一覧
        </Text>
        <Text textStyle="sm" color="fg.muted">
          担当予約の日時・ステータスを確認し、Zoom参加や鑑定メモ編集へ進む画面です。
        </Text>
      </styled.div>

      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          message="予約はありません"
          hint="予約が入ると、ここに表示されます"
        />
      ) : (
        <>
          <Table.Root>
            <Table.Head>
              <Table.Row>
                <Table.Header>日時</Table.Header>
                <Table.Header>ステータス</Table.Header>
                <Table.Header>顧客</Table.Header>
                <Table.Header>料金プラン</Table.Header>
                <Table.Header>Zoom</Table.Header>
                <Table.Header>メモ</Table.Header>
                <Table.Header>入室確認</Table.Header>
                <Table.Header>操作</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {bookings.map((b) => {
                const pricePlanLabel = formatPricePlan(
                  b.pricePlanName,
                  b.pricePlanTotalJPY,
                );
                return (
                  <Table.Row key={b.bookingId}>
                    <Table.Cell>
                      {formatDateTimeRange(b.startsAt, b.endsAt)}
                    </Table.Cell>
                    <Table.Cell>
                      <BookingStatusBadge status={b.status} />
                    </Table.Cell>
                    <Table.Cell>
                      <CustomerCell
                        customerId={b.customerId}
                        customer={b.customer ?? null}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      {pricePlanLabel ? (
                        <Text textStyle="sm">{pricePlanLabel}</Text>
                      ) : (
                        <Text color="fg.subtle">-</Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {b.joinUrl ? (
                        <Tooltip content="Zoom に参加" showArrow>
                          <IconButton variant="subtle" size="sm" asChild>
                            <a
                              href={b.joinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink size={16} />
                            </a>
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Text color="fg.subtle">-</Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Text
                        color={b.consultantMemo ? "fg.default" : "fg.subtle"}
                        truncate
                        maxW="200px"
                      >
                        {b.consultantMemo || "-"}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <ConsultantJoinControl
                        bookingId={b.bookingId}
                        startsAt={b.startsAt}
                        status={b.status}
                        consultantJoinedAt={b.consultantJoinedAt ?? null}
                        onJoined={() => {
                          void refetch();
                        }}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <Tooltip content="鑑定メモ編集" showArrow>
                        <IconButton variant="subtle" size="sm" asChild>
                          <Link to={buildPath(`/bookings/${b.bookingId}/memo`)}>
                            <Pencil size={16} />
                          </Link>
                        </IconButton>
                      </Tooltip>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
          <ListControls
            page={pagination.page}
            pageSize={pagination.pageSize}
            sortBy={sortBy}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortByChange={setSortBy}
          />
        </>
      )}
    </styled.div>
  );
}
