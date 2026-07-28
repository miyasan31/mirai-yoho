import type { ConsultantRatingSummary } from "@mirai-yoho/api-client/schemas";
import { StarRating } from "@mirai-yoho/ui/components/star-rating";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { styled } from "styled-system/jsx";
import {
  formatAverageScore,
  toHalfStep,
  toScoreDistributionRows,
} from "../rating-view-model";

export function ConsultantRatingSummaryCard({
  summary,
}: {
  summary: ConsultantRatingSummary;
}) {
  const rows = toScoreDistributionRows(summary.distribution, summary.count);

  return (
    <styled.div
      alignItems={{ base: "stretch", md: "center" }}
      border="1px solid"
      borderColor="border"
      display="flex"
      flexDir={{ base: "column", md: "row" }}
      gap="6"
      p="4"
      rounded="l2"
    >
      <styled.div
        alignItems="center"
        display="flex"
        flexDir="column"
        gap="1"
        minW="32"
      >
        <Text fontWeight="bold" textStyle="3xl">
          {formatAverageScore(summary.averageScore)}
        </Text>
        <StarRating
          allowHalf
          readOnly
          size="sm"
          value={toHalfStep(summary.averageScore)}
        />
        <Text color="fg.muted" textStyle="xs">
          {summary.count} 件の評価
        </Text>
      </styled.div>

      <styled.div display="flex" flex="1" flexDir="column" gap="1.5">
        {rows.map((row) => (
          <styled.div
            alignItems="center"
            display="flex"
            gap="3"
            key={row.score}
          >
            <Text color="fg.muted" minW="6" textStyle="xs">
              {row.score}
            </Text>
            <styled.div
              bg="gray.subtle.bg"
              flex="1"
              h="2"
              overflow="hidden"
              rounded="full"
            >
              <styled.div
                bg="amber.9"
                h="full"
                style={{ width: `${row.percentage}%` }}
              />
            </styled.div>
            <Text color="fg.muted" minW="8" textAlign="right" textStyle="xs">
              {row.count}
            </Text>
          </styled.div>
        ))}
      </styled.div>
    </styled.div>
  );
}
