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
  getSlotUnitMinutes,
  getSlotUnitMs,
  isAlignedToSlotBoundary,
  splitIntoSlotRanges,
} from "@/domain/slot/slot-availability";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import { useCreateSlot, useDeleteSlot, useGetSlots } from "@/hooks/use-slots";

const locales = { "ja-JP": ja };
const SLOT_UNIT_MINUTES = getSlotUnitMinutes();
const SLOT_UNIT_MS = getSlotUnitMs();

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
  type: "available";
}

export default function ConsultantSlotsPage() {
  const { user } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

  const { data, isLoading, refetch } = useGetSlots(
    { consultantId: user?.uid ?? "" },
    {
      query: { enabled: !!user?.uid },
    },
  );
  const createSlot = useCreateSlot();
  const deleteSlot = useDeleteSlot();

  const events: CalendarEvent[] = useMemo(() => {
    const slots = data?.data?.slots ?? [];
    return slots.map((slot) => ({
      id: slot.slotId,
      title: "予約可能",
      start: new Date(slot.startDatetime),
      end: new Date(slot.endDatetime),
      type: "available" as const,
    }));
  }, [data]);

  const handleSelectSlot = useCallback(
    async (slotInfo: SlotInfo) => {
      if (!user) return;

      const { start, end } = slotInfo;
      if (
        start >= end ||
        !isAlignedToSlotBoundary(start) ||
        !isAlignedToSlotBoundary(end) ||
        (end.getTime() - start.getTime()) % SLOT_UNIT_MS !== 0
      ) {
        toaster.create({
          type: "error",
          title: "30分単位で選択してください",
        });
        return;
      }

      const ranges = splitIntoSlotRanges(start, end);
      const hasOverlap = ranges.some((range) =>
        events.some(
          (event) =>
            event.start.getTime() < range.end.getTime() &&
            range.start.getTime() < event.end.getTime(),
        ),
      );

      if (hasOverlap) {
        toaster.create({
          type: "error",
          title: "既存の予約可能枠と重複しています",
        });
        return;
      }

      try {
        await Promise.all(
          ranges.map((range) =>
            createSlot.mutateAsync({
              organizationId: organizationId ?? "",
              data: {
                consultantId: user.uid,
                startDatetime: range.start.toISOString(),
                endDatetime: range.end.toISOString(),
              },
            }),
          ),
        );
        refetch();
        toaster.create({
          type: "success",
          title: "予約可能枠を追加しました",
        });
      } catch {
        // エラーは custom-fetch の toaster で表示される
      }
    },
    [createSlot, events, organizationId, refetch, user],
  );

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setDeleteTarget(event);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteSlot.mutateAsync({
        organizationId: organizationId ?? "",
        slotId: deleteTarget.id,
      });
      refetch();
      setDeleteTarget(null);
      toaster.create({
        type: "success",
        title: "予約可能枠を削除しました",
      });
    } catch {
      // エラーは custom-fetch の toaster で表示される
    }
  }, [deleteSlot, deleteTarget, organizationId, refetch]);

  const eventStyleGetter = useCallback(() => {
    return {
      style: {
        backgroundColor: "#2563eb",
        borderColor: "#1d4ed8",
        color: "#fff",
        opacity: 0.8,
      },
    };
  }, []);

  if (isLoading) {
    return (
      <styled.div>
        <styled.div mb="6">
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            スケジュール管理
          </Text>
          <Text textStyle="sm" color="fg.muted">
            カレンダー上で予約可能枠の追加・削除を行う画面です。
          </Text>
        </styled.div>
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
          カレンダー上で予約可能枠の追加・削除を行う画面です。
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
          step={SLOT_UNIT_MINUTES}
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
              <Dialog.Title>予約可能枠を削除しますか？</Dialog.Title>
              <Dialog.Description>
                この時間帯は利用者から予約できなくなります。
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer display="flex" justifyContent="flex-end" gap="2">
              <Dialog.CloseTrigger asChild>
                <Button variant="outline">キャンセル</Button>
              </Dialog.CloseTrigger>
              <Button
                colorPalette="red"
                onClick={handleDelete}
                loading={deleteSlot.isPending}
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
