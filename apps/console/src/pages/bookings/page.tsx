import { useListQueryParams } from "@mirai-yoho/console-core/hooks/use-list-query-params";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { invalidateAfter } from "@mirai-yoho/console-core/query/invalidation-map";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { ListControls } from "@mirai-yoho/ui/components/list-controls";
import { BookingStatusBadge } from "@mirai-yoho/ui/components/status-badge";
import { TableSkeleton } from "@mirai-yoho/ui/components/table-skeleton";
import { TruncatedId } from "@mirai-yoho/ui/components/truncated-id";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { HoverCard } from "@mirai-yoho/ui/components/ui/hover-card";
import * as Table from "@mirai-yoho/ui/components/ui/table";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { styled } from "styled-system/jsx";
import { useChargePayment } from "@/hooks/use-booking";
import { useConsoleBookings } from "@/hooks/use-console-bookings";
import { useConsoleConsultants } from "@/hooks/use-console-consultants";
import { useConsoleCustomers } from "@/hooks/use-console-customers";

type CustomerSummary = {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  note?: string | null;
};

type ConsultantSummary = {
  consultantId: string;
  name: string;
  email?: string;
  specialties: string[];
  bio?: string;
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
              <Text textStyle="xs" color="fg.muted">
                メモ: {customer.note ?? "-"}
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

function ConsultantCell({
  consultantId,
  consultant,
}: {
  consultantId: string;
  consultant: ConsultantSummary | null;
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
          {consultant ? (
            <>
              <Text textStyle="sm" fontWeight="bold">
                {consultant.name}
              </Text>
              <Text textStyle="xs" color="fg.muted">
                メール: {consultant.email ?? "-"}
              </Text>
              <Text textStyle="xs" color="fg.muted">
                専門分野: {consultant.specialties.join(", ") || "-"}
              </Text>
              <Text textStyle="xs" color="fg.muted">
                自己紹介: {consultant.bio ?? "-"}
              </Text>
            </>
          ) : (
            <Text textStyle="sm">情報が見つかりません</Text>
          )}
        </styled.div>
      }
    >
      <styled.span cursor="default" display="inline-block">
        {consultant ? (
          <Text textStyle="sm">{consultant.name}</Text>
        ) : (
          <TruncatedId id={consultantId} />
        )}
      </styled.span>
    </HoverCard>
  );
}

function formatJoinedAt(value: string): string {
  return new Date(value).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConsoleBookingsPage() {
  const { organizationId } = useOrganizationRouting();
  const { page, pageSize, sortBy, setPage, setPageSize, setSortBy } =
    useListQueryParams();
  const bookingsQuery = useConsoleBookings({
    page,
    pageSize,
    sortBy,
    sortOrder: "desc",
  });
  const customersQuery = useConsoleCustomers(
    { page: 1, pageSize: 100, sortBy: "createdAt", sortOrder: "desc" },
    { enabled: true },
  );
  const consultantsQuery = useConsoleConsultants(
    { page: 1, pageSize: 100, sortBy: "createdAt", sortOrder: "desc" },
    { enabled: true },
  );
  const chargePayment = useChargePayment();
  const queryClient = useQueryClient();

  const bookings = bookingsQuery.data?.data?.bookings ?? [];
  const pagination = bookingsQuery.data?.data?.pagination ?? {
    page,
    pageSize,
    total: bookings.length,
    totalPages: 1,
  };
  const customers = customersQuery.data?.data?.customers ?? [];
  const consultants = consultantsQuery.data?.data?.consultants ?? [];

  const customersById = useMemo(
    () => new Map(customers.map((customer) => [customer.customerId, customer])),
    [customers],
  );
  const consultantsById = useMemo(
    () =>
      new Map(
        consultants.map((consultant) => [consultant.consultantId, consultant]),
      ),
    [consultants],
  );

  const formatBookingDatetime = (value: string) =>
    new Date(value).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleCharge = async (bookingId: string) => {
    if (!organizationId) return;
    try {
      await chargePayment.mutateAsync({
        organizationId,
        bookingId,
        data: { method: "manual" },
      });
      await invalidateAfter.paymentChargeMutation(queryClient, organizationId);
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示するため、ここでは何もしない
    }
  };

  const isLoading =
    bookingsQuery.isLoading ||
    customersQuery.isLoading ||
    consultantsQuery.isLoading;

  if (isLoading) {
    return (
      <styled.div>
        <styled.div mb="4">
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            予約管理
          </Text>
          <Text textStyle="sm" color="fg.muted">
            予約の状況を確認し、必要に応じて手動課金を実行する画面です。
          </Text>
        </styled.div>
        <TableSkeleton columns={5} rows={5} />
      </styled.div>
    );
  }

  if (customersQuery.error || consultantsQuery.error) {
    return (
      <styled.div>
        <styled.div mb="4">
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            予約管理
          </Text>
          <Text textStyle="sm" color="fg.muted">
            予約の状況を確認し、必要に応じて手動課金を実行する画面です。
          </Text>
        </styled.div>
        <EmptyState
          icon={AlertTriangle}
          message="予約情報の表示に必要なデータ取得に失敗しました"
          hint="時間をおいて再試行してください"
        />
        <styled.div display="flex" justifyContent="center">
          <Button
            variant="outline"
            onClick={() => {
              void bookingsQuery.refetch();
              void customersQuery.refetch();
              void consultantsQuery.refetch();
            }}
          >
            再試行
          </Button>
        </styled.div>
      </styled.div>
    );
  }

  return (
    <styled.div>
      <styled.div mb="4">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          予約管理
        </Text>
        <Text textStyle="sm" color="fg.muted">
          予約の状況を確認し、必要に応じて手動課金を実行する画面です。
        </Text>
      </styled.div>
      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          message="予約はありません"
          hint="予約が作成されるとここに表示されます"
        />
      ) : (
        <>
          <Table.Root>
            <Table.Head>
              <Table.Row>
                <Table.Header>日時</Table.Header>
                <Table.Header>ステータス</Table.Header>
                <Table.Header>顧客</Table.Header>
                <Table.Header>占い師</Table.Header>
                <Table.Header>入室確認</Table.Header>
                <Table.Header>操作</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {bookings.map((b) => {
                const chargeable =
                  "chargeable" in b
                    ? Boolean(
                        (b as typeof b & { chargeable?: boolean }).chargeable,
                      )
                    : false;
                const chargeDisabledReason =
                  "chargeDisabledReason" in b
                    ? (
                        b as typeof b & {
                          chargeDisabledReason?: string | null;
                        }
                      ).chargeDisabledReason
                    : null;

                const customer = customersById.get(b.customerId) ?? null;
                const consultant = consultantsById.get(b.consultantId) ?? null;

                return (
                  <Table.Row key={b.bookingId}>
                    <Table.Cell>{formatBookingDatetime(b.startsAt)}</Table.Cell>
                    <Table.Cell>
                      <BookingStatusBadge status={b.status} />
                    </Table.Cell>
                    <Table.Cell>
                      <CustomerCell
                        customerId={b.customerId}
                        customer={customer}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <ConsultantCell
                        consultantId={b.consultantId}
                        consultant={consultant}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      {b.consultantJoinedAt ? (
                        <Text textStyle="sm">
                          {formatJoinedAt(b.consultantJoinedAt)}
                        </Text>
                      ) : (
                        <Text textStyle="sm" color="fg.muted">
                          未確認
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {b.status === "confirmed" && (
                        <Tooltip
                          content={chargeDisabledReason ?? ""}
                          disabled={chargeable || !chargeDisabledReason}
                          positioning={{ placement: "top-start" }}
                          showArrow
                        >
                          <styled.span display="inline-flex">
                            <Button
                              size="sm"
                              disabled={!chargeable}
                              onClick={() => handleCharge(b.bookingId)}
                              loading={
                                chargePayment.isPending &&
                                chargePayment.variables?.bookingId ===
                                  b.bookingId
                              }
                              loadingText="処理中..."
                              w="fit-content"
                            >
                              課金
                            </Button>
                          </styled.span>
                        </Tooltip>
                      )}
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
