"use client";

import { format, getDay, parse, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { useCallback, useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type SlotInfo,
  type View,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Dialog from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { toaster } from "@/components/ui/toast";
import {
  useCreateConsultantBlockedTime,
  useDeleteConsultantBlockedTime,
  useGetConsultantBlockedTimes,
} from "@/generated/api/consultant/consultant";
import { useAuth } from "@/hooks/use-auth";

const locales = { "ja-JP": ja };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "blocked";
}

export default function ConsultantSlotsPage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

  const { data, isLoading, refetch } = useGetConsultantBlockedTimes({
    query: { enabled: !!user },
  });
  const createBlockedTime = useCreateConsultantBlockedTime();
  const deleteBlockedTime = useDeleteConsultantBlockedTime();

  const events: CalendarEvent[] = useMemo(() => {
    const blockedTimes = data?.data?.blockedTimes ?? [];
    return blockedTimes.map((bt) => ({
      id: bt.blockedTimeId,
      title: "予約不可",
      start: new Date(bt.startDatetime),
      end: new Date(bt.endDatetime),
      type: "blocked" as const,
    }));
  }, [data]);

  const handleSelectSlot = useCallback(
    async (slotInfo: SlotInfo) => {
      try {
        await createBlockedTime.mutateAsync({
          data: {
            startDatetime: slotInfo.start.toISOString(),
            endDatetime: slotInfo.end.toISOString(),
          },
        });
        refetch();
      } catch {
        // エラーは custom-fetch の toaster で表示される
      }
    },
    [createBlockedTime, refetch],
  );

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setDeleteTarget(event);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteBlockedTime.mutateAsync({
        blockedTimeId: deleteTarget.id,
      });
      refetch();
      setDeleteTarget(null);
      toaster.create({
        type: "success",
        title: "ブロック時間を削除しました",
      });
    } catch {
      // エラーは custom-fetch の toaster で表示される
    }
  }, [deleteTarget, deleteBlockedTime, refetch]);

  const eventStyleGetter = useCallback(() => {
    return {
      style: {
        backgroundColor: "#ef4444",
        borderColor: "#dc2626",
        color: "#fff",
        opacity: 0.8,
      },
    };
  }, []);

  if (isLoading) {
    return (
      <styled.div>
        <Skeleton height="8" width="200px" mb="2" />
        <Skeleton height="4" width="400px" mb="6" />
        <Skeleton height="calc(100vh - 200px)" rounded="l2" />
      </styled.div>
    );
  }

  return (
    <styled.div>
      <styled.div mb="6">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          スケジュール管理
        </Text>
        <Text textStyle="sm" color="fg.muted">
          カレンダー上でドラッグして予約不可の時間帯を設定できます。クリックで削除できます。
        </Text>
      </styled.div>

      <styled.div h="calc(100vh - 200px)" shadow="xs" rounded="l2" p="4">
        <Calendar<CalendarEvent>
          localizer={localizer}
          culture="ja-JP"
          events={events}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          selectable
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          step={30}
          timeslots={2}
          min={new Date(1970, 0, 1, 10, 0)}
          max={new Date(1970, 0, 1, 17, 0)}
          messages={{
            today: "今日",
            previous: "前",
            next: "次",
            month: "月",
            week: "週",
            day: "日",
            agenda: "予定",
            noEventsInRange: "この期間にイベントはありません",
          }}
        />
      </styled.div>

      <Dialog.Root
        open={!!deleteTarget}
        onOpenChange={({ open }) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>予約不可枠を削除しますか？</Dialog.Title>
              <Dialog.Description>
                この時間帯のブロックが解除され、予約可能になります。
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer display="flex" justifyContent="flex-end" gap="2">
              <Dialog.CloseTrigger asChild>
                <Button variant="outline">キャンセル</Button>
              </Dialog.CloseTrigger>
              <Button
                colorPalette="red"
                onClick={handleDelete}
                loading={deleteBlockedTime.isPending}
                loadingText="削除中..."
              >
                削除
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </styled.div>
  );
}
