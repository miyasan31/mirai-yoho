import type { ConsultantRating } from "@mirai-yoho/api-client/schemas";
import { StarRating } from "@mirai-yoho/ui/components/star-rating";
import * as Table from "@mirai-yoho/ui/components/ui/table";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { styled } from "styled-system/jsx";

function formatDateTime(iso: string): string {
  return format(parseISO(iso), "yyyy/MM/dd HH:mm", { locale: ja });
}

function CommentCell({ comment }: { comment: string | null | undefined }) {
  if (!comment) {
    return <Text color="fg.subtle">-</Text>;
  }

  return (
    <Tooltip content={comment} positioning={{ placement: "top-start" }}>
      <styled.span
        display="block"
        maxW="80"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        {comment}
      </styled.span>
    </Tooltip>
  );
}

export function ConsultantRatingTable({
  ratings,
}: {
  ratings: ConsultantRating[];
}) {
  return (
    <Table.Root>
      <Table.Head>
        <Table.Row>
          <Table.Header>評価</Table.Header>
          <Table.Header>コメント</Table.Header>
          <Table.Header>鑑定日時</Table.Header>
          <Table.Header>投稿日時</Table.Header>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {ratings.map((rating) => (
          <Table.Row key={rating.bookingId}>
            <Table.Cell>
              <styled.div alignItems="center" display="flex" gap="2">
                <StarRating readOnly size="sm" value={rating.score} />
                <Text textStyle="sm">{rating.score}</Text>
              </styled.div>
            </Table.Cell>
            <Table.Cell>
              <CommentCell comment={rating.comment} />
            </Table.Cell>
            <Table.Cell>{formatDateTime(rating.consultedAt)}</Table.Cell>
            <Table.Cell>{formatDateTime(rating.ratedAt)}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
