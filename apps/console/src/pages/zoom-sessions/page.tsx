import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { BookingStatusBadge } from "@mirai-yoho/ui/components/status-badge";
import { TableSkeleton } from "@mirai-yoho/ui/components/table-skeleton";
import { TruncatedId } from "@mirai-yoho/ui/components/truncated-id";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import * as Table from "@mirai-yoho/ui/components/ui/table";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { AlertTriangle, Video } from "lucide-react";
import { useCallback } from "react";
import { styled } from "styled-system/jsx";
import { useConsoleZoomSession } from "@/hooks/use-console-zoom-session";

const PAGE_TITLE = "ブレイクアウトルーム";
const PAGE_DESCRIPTION =
  "当日の Zoom ミーティングに事前割り当てされているブレイクアウトルームを確認する画面です。ルームは予約 1 件につき 1 つ作成され、占い師が開始時刻に該当ルームへ移動します。";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function todayInJst(): string {
  return new Date()
    .toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "-");
}

function formatTimeRange(
  startsAt: string | null,
  endsAt: string | null,
): string {
  if (!startsAt || !endsAt) return "-";
  const format = (value: string) =>
    new Date(value).toLocaleTimeString("ja-JP", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  return `${format(startsAt)} - ${format(endsAt)}`;
}

function PageHeader() {
  return (
    <styled.div mb="4">
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
        {PAGE_TITLE}
      </Text>
      <Text textStyle="sm" color="fg.muted">
        {PAGE_DESCRIPTION}
      </Text>
    </styled.div>
  );
}

export default function ConsoleZoomSessionsPage() {
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();

  const rawDate = search.date;
  const date =
    typeof rawDate === "string" && DATE_PATTERN.test(rawDate)
      ? rawDate
      : todayInJst();

  const setDate = useCallback(
    (nextDate: string) => {
      void navigate({
        to: ".",
        search: (previous: Record<string, unknown>) => ({
          ...previous,
          date: nextDate,
        }),
        replace: true,
      });
    },
    [navigate],
  );

  const zoomSessionQuery = useConsoleZoomSession({ date });
  const session = zoomSessionQuery.data?.data;
  const breakoutRooms = session?.breakoutRooms ?? [];
  const staleCount = breakoutRooms.filter((room) => room.isStale).length;

  const dateControls = (
    <styled.div display="flex" alignItems="center" gap="2" mb="4">
      <Input
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        w="fit-content"
        aria-label="対象日"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDate(todayInJst())}
        disabled={date === todayInJst()}
      >
        今日
      </Button>
    </styled.div>
  );

  if (zoomSessionQuery.isLoading) {
    return (
      <styled.div>
        <PageHeader />
        {dateControls}
        <TableSkeleton columns={6} rows={5} />
      </styled.div>
    );
  }

  if (zoomSessionQuery.error) {
    return (
      <styled.div>
        <PageHeader />
        {dateControls}
        <EmptyState
          icon={AlertTriangle}
          message="ブレイクアウトルームの取得に失敗しました"
          hint="時間をおいて再試行してください"
        />
        <styled.div display="flex" justifyContent="center">
          <Button
            variant="outline"
            onClick={() => void zoomSessionQuery.refetch()}
          >
            再試行
          </Button>
        </styled.div>
      </styled.div>
    );
  }

  return (
    <styled.div>
      <PageHeader />
      {dateControls}

      {session?.zoomMeetingId && (
        <styled.div
          display="flex"
          flexWrap="wrap"
          alignItems="center"
          gap="3"
          mb="4"
          p="3"
          borderWidth="1px"
          borderRadius="l2"
        >
          <Text textStyle="sm" color="fg.muted">
            ミーティング ID
          </Text>
          <Text textStyle="sm" fontWeight="bold">
            {session.zoomMeetingId}
          </Text>
          {session.joinUrl && (
            <styled.a
              href={session.joinUrl}
              target="_blank"
              rel="noreferrer"
              textStyle="sm"
              color="colorPalette.text"
              textDecoration="underline"
            >
              参加 URL を開く
            </styled.a>
          )}
          {staleCount > 0 && (
            <Badge variant="subtle" size="sm" colorPalette="red">
              要確認 {staleCount} 件
            </Badge>
          )}
        </styled.div>
      )}

      {breakoutRooms.length === 0 ? (
        <EmptyState
          icon={Video}
          message="この日のブレイクアウトルームはありません"
          hint="予約が確定するとルームが作成されます"
        />
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>時間</Table.Header>
              <Table.Header>ルーム名</Table.Header>
              <Table.Header>占い師</Table.Header>
              <Table.Header>顧客</Table.Header>
              <Table.Header>割り当て済み Zoom アカウント</Table.Header>
              <Table.Header>予約ステータス</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {breakoutRooms.map((room) => (
              <Table.Row key={room.bookingId}>
                <Table.Cell>
                  {formatTimeRange(room.startsAt, room.endsAt)}
                </Table.Cell>
                <Table.Cell>
                  <styled.span
                    display="inline-flex"
                    alignItems="center"
                    gap="2"
                  >
                    <Text textStyle="sm">{room.roomName}</Text>
                    {room.isStale && (
                      <Tooltip
                        content="予約が確定状態ではないのにルームが残っています。予約作成・キャンセル時の Zoom 連携が失敗した可能性があります"
                        positioning={{ placement: "top-start" }}
                        showArrow
                      >
                        <styled.span display="inline-flex" color="red.default">
                          <AlertTriangle size={16} aria-label="要確認" />
                        </styled.span>
                      </Tooltip>
                    )}
                  </styled.span>
                </Table.Cell>
                <Table.Cell>
                  {room.consultantName ?? (
                    <TruncatedId id={room.consultantId} />
                  )}
                </Table.Cell>
                <Table.Cell>
                  {room.customerName ?? (
                    <Text textStyle="sm" color="fg.muted">
                      -
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text textStyle="sm">{room.customerEmail}</Text>
                </Table.Cell>
                <Table.Cell>
                  {room.bookingStatus ? (
                    <BookingStatusBadge status={room.bookingStatus} />
                  ) : (
                    <Badge variant="subtle" size="sm" colorPalette="red">
                      予約なし
                    </Badge>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </styled.div>
  );
}
