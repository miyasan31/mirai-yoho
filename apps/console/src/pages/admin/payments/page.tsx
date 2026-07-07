import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { ListControls } from "@mirai-yoho/ui/components/list-controls";
import { PaymentStatusBadge } from "@mirai-yoho/ui/components/status-badge";
import { TableSkeleton } from "@mirai-yoho/ui/components/table-skeleton";
import { TruncatedId } from "@mirai-yoho/ui/components/truncated-id";
import * as Table from "@mirai-yoho/ui/components/ui/table";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { CreditCard } from "lucide-react";
import { styled } from "styled-system/jsx";
import { useAdminPayments } from "@/hooks/use-admin-payments";
import { useListQueryParams } from "@/hooks/use-list-query-params";

const PAYMENT_STRATEGY_LABEL_MAP: Record<string, string> = {
  deferred: "後払い",
  immediate: "即時決済",
};

const CHARGE_METHOD_LABEL_MAP: Record<string, string> = {
  manual: "手動",
  batch: "自動",
};

export default function AdminPaymentsPage() {
  const { page, pageSize, sortBy, setPage, setPageSize, setSortBy } =
    useListQueryParams();
  const { data, isLoading } = useAdminPayments({
    page,
    pageSize,
    sortBy,
    sortOrder: "desc",
  });

  const payments = data?.data?.payments ?? [];
  const pagination = data?.data?.pagination ?? {
    page,
    pageSize,
    total: payments.length,
    totalPages: 1,
  };

  if (isLoading) {
    return (
      <styled.div>
        <styled.div mb="4">
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            決済管理
          </Text>
          <Text textStyle="sm" color="fg.muted">
            決済履歴とステータスを確認し、請求処理の状況を把握する画面です。
          </Text>
        </styled.div>
        <TableSkeleton columns={7} rows={5} />
      </styled.div>
    );
  }

  return (
    <styled.div>
      <styled.div mb="4">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          決済管理
        </Text>
        <Text textStyle="sm" color="fg.muted">
          決済履歴とステータスを確認し、請求処理の状況を把握する画面です。
        </Text>
      </styled.div>
      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          message="決済はありません"
          hint="決済が発生するとここに表示されます"
        />
      ) : (
        <>
          <Table.Root>
            <Table.Head>
              <Table.Row>
                <Table.Header>予約ID</Table.Header>
                <Table.Header>金額</Table.Header>
                <Table.Header>税額</Table.Header>
                <Table.Header>合計</Table.Header>
                <Table.Header>ステータス</Table.Header>
                <Table.Header>決済タイミング</Table.Header>
                <Table.Header>課金実行</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {payments.map((p) => (
                <Table.Row key={p.paymentId}>
                  <Table.Cell>
                    <TruncatedId id={p.bookingId} />
                  </Table.Cell>
                  <Table.Cell>{p.amountJPY.toLocaleString()}円</Table.Cell>
                  <Table.Cell>{p.taxAmountJPY.toLocaleString()}円</Table.Cell>
                  <Table.Cell>{p.totalJPY.toLocaleString()}円</Table.Cell>
                  <Table.Cell>
                    <PaymentStatusBadge status={p.status} />
                  </Table.Cell>
                  <Table.Cell>
                    {PAYMENT_STRATEGY_LABEL_MAP[p.paymentStrategy] ??
                      p.paymentStrategy}
                  </Table.Cell>
                  <Table.Cell>
                    {p.chargeMethod
                      ? (CHARGE_METHOD_LABEL_MAP[p.chargeMethod] ??
                        p.chargeMethod)
                      : "-"}
                  </Table.Cell>
                </Table.Row>
              ))}
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
