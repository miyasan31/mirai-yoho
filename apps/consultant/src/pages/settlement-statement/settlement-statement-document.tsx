import type { SettlementStatement } from "@mirai-yoho/api-client/schemas";
import * as Table from "@mirai-yoho/ui/components/ui/table";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { styled } from "styled-system/jsx";

function formatYen(value: number): string {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `${year}年${Number(monthNumber)}月分`;
}

function formatIssuedAt(isoString: string): string {
  return format(parseISO(isoString), "yyyy年M月d日", { locale: ja });
}

function formatItemDateTime(startsAtIso: string, endsAtIso: string): string {
  const startsAt = parseISO(startsAtIso);
  const endsAt = parseISO(endsAtIso);
  return `${format(startsAt, "M/d (E) HH:mm", { locale: ja })} 〜 ${format(endsAt, "HH:mm")}`;
}

function SummaryRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <styled.div
      display="flex"
      justifyContent="space-between"
      alignItems="baseline"
      gap="4"
      py="1.5"
    >
      <Text
        textStyle={emphasized ? "md" : "sm"}
        fontWeight={emphasized ? "bold" : "normal"}
      >
        {label}
      </Text>
      <Text
        textStyle={emphasized ? "xl" : "sm"}
        fontWeight={emphasized ? "bold" : "medium"}
        fontVariantNumeric="tabular-nums"
      >
        {value}
      </Text>
    </styled.div>
  );
}

export function SettlementStatementDocument({
  statement,
}: {
  statement: SettlementStatement;
}) {
  return (
    <styled.section
      data-print-area
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="l2"
      bg="bg.default"
      p="8"
    >
      <styled.div
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        mb="6"
      >
        <Text as="h2" textStyle="2xl" fontWeight="bold" letterSpacing="widest">
          精 算 書
        </Text>
        <styled.div textAlign="right">
          <Text textStyle="sm">{formatMonthLabel(statement.month)}</Text>
          <Text textStyle="sm" color="fg.muted">
            発行日: {formatIssuedAt(statement.issuedAt)}
          </Text>
        </styled.div>
      </styled.div>

      <styled.div
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }}
        gap="6"
        mb="6"
      >
        <styled.div>
          <Text textStyle="xs" color="fg.muted" mb="1">
            宛先
          </Text>
          <Text textStyle="md" fontWeight="semibold">
            {statement.issuedTo.companyName || "（未設定）"}
            {statement.issuedTo.companyName ? " 御中" : ""}
          </Text>
          {statement.issuedTo.address && (
            <Text textStyle="sm" color="fg.muted">
              {statement.issuedTo.address}
            </Text>
          )}
        </styled.div>
        <styled.div>
          <Text textStyle="xs" color="fg.muted" mb="1">
            発行者
          </Text>
          <Text textStyle="md" fontWeight="semibold">
            {statement.issuer.name}
          </Text>
          {statement.issuer.address && (
            <Text textStyle="sm" color="fg.muted">
              {statement.issuer.address}
            </Text>
          )}
        </styled.div>
      </styled.div>

      <styled.div mb="6">
        <Text textStyle="sm" fontWeight="semibold" mb="2">
          鑑定明細
        </Text>
        {statement.items.length === 0 ? (
          <Text textStyle="sm" color="fg.muted">
            対象月に精算対象の鑑定はありません。
          </Text>
        ) : (
          <Table.Root>
            <Table.Head>
              <Table.Row>
                <Table.Header>鑑定日時</Table.Header>
                <Table.Header>顧客</Table.Header>
                <Table.Header>料金プラン</Table.Header>
                <Table.Header textAlign="right">金額</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {statement.items.map((item) => (
                <Table.Row key={item.bookingId}>
                  <Table.Cell>
                    {formatItemDateTime(item.startsAt, item.endsAt)}
                  </Table.Cell>
                  <Table.Cell>{item.customerName ?? "-"}</Table.Cell>
                  <Table.Cell>{item.pricePlanName ?? "-"}</Table.Cell>
                  <Table.Cell
                    textAlign="right"
                    fontVariantNumeric="tabular-nums"
                  >
                    {formatYen(item.amountJPY)}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </styled.div>

      <styled.div maxW="400px" ml="auto">
        <SummaryRow label="借受金合計" value={formatYen(statement.grossJPY)} />
        <SummaryRow
          label={`システム利用料（${statement.systemFeeRatePercent}%）`}
          value={`− ${formatYen(statement.systemFeeJPY)}`}
        />
        <SummaryRow
          label="消費税（10%）"
          value={`− ${formatYen(statement.systemFeeTaxJPY)}`}
        />
        {statement.usesOfficeAddress && (
          <SummaryRow
            label="事務所利用料"
            value={`− ${formatYen(statement.officeFeeJPY)}`}
          />
        )}
        <styled.hr borderColor="border.default" my="2" />
        <SummaryRow
          label="精算料"
          value={formatYen(statement.settlementAmountJPY)}
          emphasized
        />
      </styled.div>
    </styled.section>
  );
}
