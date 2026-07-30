import { createListCollection } from "@ark-ui/react/select";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Checkbox from "@mirai-yoho/ui/components/ui/checkbox";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import * as Select from "@mirai-yoho/ui/components/ui/select";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { styled } from "styled-system/jsx";
import { useConsultantSettlementStatement } from "@/hooks/use-consultant-settlement-statement";
import { SettlementStatementDocument } from "./settlement-statement-document";

const SELECTABLE_MONTH_COUNT = 12;

function toMonthValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toMonthLabel(value: string): string {
  const [year, month] = value.split("-");
  return `${year}年${Number(month)}月`;
}

/** OS のファイル名として使えない文字を取り除く */
function sanitizeForFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "").trim();
}

/** 直近 12 ヶ月分の選択肢を新しい順に返す。既定は締めの済んだ先月 */
function buildMonthOptions(now: Date): string[] {
  return Array.from({ length: SELECTABLE_MONTH_COUNT }, (_, index) =>
    toMonthValue(new Date(now.getFullYear(), now.getMonth() - 1 - index, 1)),
  );
}

export default function SettlementStatementPage() {
  const monthOptions = useMemo(() => buildMonthOptions(new Date()), []);
  const [month, setMonth] = useState(monthOptions[0]);
  const [usesOfficeAddress, setUsesOfficeAddress] = useState(false);
  const [issuerName, setIssuerName] = useState("");
  const [issuerAddress, setIssuerAddress] = useState("");

  const monthCollection = useMemo(
    () =>
      createListCollection({
        items: monthOptions.map((value) => ({
          label: toMonthLabel(value),
          value,
        })),
      }),
    [monthOptions],
  );

  const { data, isLoading } = useConsultantSettlementStatement({
    month,
    "uses-office-address": usesOfficeAddress ? "true" : "false",
  });
  const statement = data?.data;

  useEffect(() => {
    if (!statement) return;
    setIssuerName((current) => current || statement.issuer.name);
  }, [statement]);

  const trimmedIssuerName = issuerName.trim();
  const trimmedIssuerAddress = issuerAddress.trim();
  const isIssuerInputValid =
    trimmedIssuerName.length > 0 &&
    (usesOfficeAddress || trimmedIssuerAddress.length > 0);

  const documentStatement = statement && {
    ...statement,
    issuer: {
      name: trimmedIssuerName,
      address: usesOfficeAddress
        ? statement.issuer.address
        : trimmedIssuerAddress || null,
    },
  };

  return (
    <styled.div>
      <styled.div data-print-hidden mb="4">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          精算書
        </Text>
        <Text textStyle="sm" color="fg.muted">
          対象月の借受金からシステム利用料と事務所利用料を控除した精算書を発行します。
        </Text>
      </styled.div>

      <styled.div
        data-print-hidden
        display="flex"
        flexWrap="wrap"
        alignItems="flex-end"
        gap="4"
        mb="6"
        p="4"
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="l2"
        bg="bg.subtle"
      >
        <styled.div minW="180px">
          <Select.Root
            collection={monthCollection}
            value={[month]}
            onValueChange={(details) => setMonth(details.value[0] ?? month)}
          >
            <Select.Label>対象月</Select.Label>
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="対象月を選択" />
                <Select.Indicator />
              </Select.Trigger>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                {monthCollection.items.map((item) => (
                  <Select.Item key={item.value} item={item}>
                    <Select.ItemText>{item.label}</Select.ItemText>
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </styled.div>

        <styled.div minW="200px">
          <Text textStyle="sm" mb="1">
            発行者名
          </Text>
          <Input
            value={issuerName}
            onChange={(event) => setIssuerName(event.target.value)}
            placeholder="発行者名を入力"
            aria-label="発行者名"
          />
        </styled.div>

        <styled.div minW="240px">
          <Text textStyle="sm" mb="1">
            住所
          </Text>
          <Input
            value={
              usesOfficeAddress
                ? (statement?.issuer.address ?? "")
                : issuerAddress
            }
            onChange={(event) => setIssuerAddress(event.target.value)}
            placeholder="住所を入力"
            aria-label="住所"
            disabled={usesOfficeAddress}
          />
        </styled.div>

        <Checkbox.Root
          checked={usesOfficeAddress}
          onCheckedChange={(details) =>
            setUsesOfficeAddress(details.checked === true)
          }
          mb="2"
        >
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>事務所を住所として利用する（500円）</Checkbox.Label>
          <Checkbox.HiddenInput />
        </Checkbox.Root>

        <Button
          type="button"
          onClick={() => {
            const originalTitle = document.title;
            document.title = sanitizeForFileName(
              `${toMonthLabel(month)}分_${trimmedIssuerName}`,
            );
            window.print();
            document.title = originalTitle;
          }}
          disabled={isLoading || !statement || !isIssuerInputValid}
          ml="auto"
        >
          <Printer size={16} />
          PDFとして保存
        </Button>
      </styled.div>

      <styled.div data-print-hidden mb="4">
        <Text textStyle="xs" color="fg.muted">
          印刷ダイアログの送信先で「PDFに保存」を選ぶと、この精算書が PDF
          として保存されます。保存した PDF
          はご自身で運営へメール送信してください。
        </Text>
      </styled.div>

      {isLoading || !documentStatement ? (
        <Skeleton h="480px" borderRadius="l2" />
      ) : (
        <SettlementStatementDocument statement={documentStatement} />
      )}
    </styled.div>
  );
}
