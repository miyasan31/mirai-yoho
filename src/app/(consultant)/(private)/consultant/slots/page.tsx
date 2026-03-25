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
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
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

  const handleSelectEvent = useCallback(
    async (event: CalendarEvent) => {
      if (confirm("このブロック時間を削除しますか？")) {
        try {
          await deleteBlockedTime.mutateAsync({
            blockedTimeId: event.id,
          });
          refetch();
        } catch {
          // エラーは custom-fetch の toaster で表示される
        }
      }
    },
    [deleteBlockedTime, refetch],
  );

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

  if (isLoading) return <Spinner />;

  return (
    <styled.div>
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="2">
        スケジュール管理
      </Text>
      <Text color="fg.muted" mb="4">
        カレンダー上でドラッグして予約不可の時間帯を設定できます。クリックで削除できます。
      </Text>
      <styled.div h="calc(100vh - 160px)">
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
    </styled.div>
  );
}
