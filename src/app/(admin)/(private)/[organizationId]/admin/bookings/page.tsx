"use client";

import { AlertTriangle, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { ListControls } from "@/components/list-controls";
import { BookingStatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/table-skeleton";
import { TruncatedId } from "@/components/truncated-id";
import { Button } from "@/components/ui/button";
import { HoverCard } from "@/components/ui/hover-card";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { Tooltip } from "@/components/ui/tooltip";
import { useAdminBookings } from "@/hooks/use-admin-bookings";
import { useAdminClients } from "@/hooks/use-admin-clients";
import { useAdminConsultants } from "@/hooks/use-admin-consultants";
import { useChargePayment } from "@/hooks/use-booking";
import { useListQueryParams } from "@/hooks/use-list-query-params";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";

type ClientSummary = {
  clientId: string;
  name: string;
  email: string;
  phone: string;
  memo?: string | null;
};

type ConsultantSummary = {
  consultantId: string;
  displayName: string;
  email?: string;
  specialties: string[];
  bio?: string;
};

function ClientCell({
  clientId,
  client,
}: {
  clientId: string;
  client: ClientSummary | null;
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
          {client ? (
            <>
              <Text textStyle="sm" fontWeight="bold">
                {client.name}
              </Text>
              <Text textStyle="xs" color="fg.muted">
                メール: {client.email}
              </Text>
              <Text textStyle="xs" color="fg.muted">
                電話: {client.phone}
              </Text>
              <Text textStyle="xs" color="fg.muted">
                メモ: {client.memo ?? "-"}
              </Text>
            </>
          ) : (
            <Text textStyle="sm">情報が見つかりません</Text>
          )}
        </styled.div>
      }
    >
      <styled.span cursor="default" display="inline-block">
        {client ? (
          <Text textStyle="sm">{client.name}</Text>
        ) : (
          <TruncatedId id={clientId} />
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
                {consultant.displayName}
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
          <Text textStyle="sm">{consultant.displayName}</Text>
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

export default function AdminBookingsPage() {
  const { organizationId } = useOrganizationRouting();
  const { page, pageSize, sortBy, setPage, setPageSize, setSortBy } =
    useListQueryParams();
  const bookingsQuery = useAdminBookings({
    page,
    pageSize,
    sortBy,
    sortOrder: "desc",
  });
  const clientsQuery = useAdminClients(
    { page: 1, pageSize: 100, sortBy: "createdAt", sortOrder: "desc" },
    { enabled: true },
  );
  const consultantsQuery = useAdminConsultants(
    { page: 1, pageSize: 100, sortBy: "createdAt", sortOrder: "desc" },
    { enabled: true },
  );
  const chargePayment = useChargePayment();

  const bookings = bookingsQuery.data?.data?.bookings ?? [];
  const pagination = bookingsQuery.data?.data?.pagination ?? {
    page,
    pageSize,
    total: bookings.length,
    totalPages: 1,
  };
  const clients = clientsQuery.data?.data?.clients ?? [];
  const consultants = consultantsQuery.data?.data?.consultants ?? [];

  const clientsById = useMemo(
    () => new Map(clients.map((client) => [client.clientId, client])),
    [clients],
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
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示するため、ここでは何もしない
    }
  };

  const isLoading =
    bookingsQuery.isLoading ||
    clientsQuery.isLoading ||
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

  if (clientsQuery.error || consultantsQuery.error) {
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
              void clientsQuery.refetch();
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
                <Table.Header>クライアント</Table.Header>
                <Table.Header>相談員</Table.Header>
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

                const client = clientsById.get(b.clientId) ?? null;
                const consultant = consultantsById.get(b.consultantId) ?? null;

                return (
                  <Table.Row key={b.bookingId}>
                    <Table.Cell>
                      {formatBookingDatetime(b.startDatetime)}
                    </Table.Cell>
                    <Table.Cell>
                      <BookingStatusBadge status={b.status} />
                    </Table.Cell>
                    <Table.Cell>
                      <ClientCell clientId={b.clientId} client={client} />
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
