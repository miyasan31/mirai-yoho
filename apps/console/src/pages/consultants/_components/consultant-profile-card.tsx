import type { ConsultantDetail } from "@mirai-yoho/api-client/schemas";
import { ActiveStatusBadge } from "@mirai-yoho/ui/components/status-badge";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { styled } from "styled-system/jsx";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <styled.div display="flex" flexDir="column" gap="0.5">
      <Text color="fg.muted" textStyle="xs">
        {label}
      </Text>
      <Text textStyle="sm">{value || "-"}</Text>
    </styled.div>
  );
}

export function ConsultantProfileCard({
  consultant,
}: {
  consultant: ConsultantDetail;
}) {
  return (
    <styled.div
      border="1px solid"
      borderColor="border"
      display="flex"
      flexDir="column"
      gap="4"
      p="4"
      rounded="l2"
    >
      <styled.div alignItems="center" display="flex" gap="3" flexWrap="wrap">
        <Text fontWeight="semibold" textStyle="lg">
          {consultant.name}
        </Text>
        <ActiveStatusBadge isActive={consultant.isActive} />
      </styled.div>

      <styled.div
        display="grid"
        gap="4"
        gridTemplateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
      >
        <Row label="メールアドレス" value={consultant.email ?? ""} />
        <Row label="電話番号" value={consultant.phone ?? ""} />
        <Row label="ステータス" value={consultant.status.name} />
        <Row label="専門分野" value={consultant.specialties.join(", ")} />
      </styled.div>

      {consultant.bio && (
        <styled.div display="flex" flexDir="column" gap="0.5">
          <Text color="fg.muted" textStyle="xs">
            自己紹介
          </Text>
          <Text textStyle="sm" whiteSpace="pre-wrap">
            {consultant.bio}
          </Text>
        </styled.div>
      )}
    </styled.div>
  );
}
