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
const BUSINESS_START_HOUR = 10;
const BUSINESS_END_HOUR = 17;
const DAY_MS = 24 * 60 * 60 * 1000;

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

function startOfDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isPastDay(date: Date, now: Date): boolean {
  return startOfDate(date) < startOfDate(now);
}

function isStartOfDay(date: Date): boolean {
  return (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  );
}

function isAllDaySelection(start: Date, end: Date): boolean {
  if (end <= start) return false;
  if (!isStartOfDay(start) || !isStartOfDay(end)) return false;
  return (end.getTime() - start.getTime()) % DAY_MS === 0;
}

function buildBusinessHourRangesFromAllDaySelection(
  start: Date,
  end: Date,
): Array<{ start: Date; end: Date }> {
  const ranges: Array<{ start: Date; end: Date }> = [];
  const currentDay = new Date(start);

  while (currentDay < end) {
    const dayStart = new Date(currentDay);
    dayStart.setHours(BUSINESS_START_HOUR, 0, 0, 0);
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(BUSINESS_END_HOUR, 0, 0, 0);
    ranges.push(...splitIntoSlotRanges(dayStart, dayEnd));
    currentDay.setDate(currentDay.getDate() + 1);
  }

  return ranges;
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
      if (view === "month") {
        setDate(slotInfo.start);
        setView("day");
        return;
      }

      if (!user) return;

      const start = slotInfo.start;
      const end =
        slotInfo.end > slotInfo.start
          ? slotInfo.end
          : new Date(slotInfo.start.getTime() + SLOT_UNIT_MS);
      const ranges = isAllDaySelection(start, end)
        ? buildBusinessHourRangesFromAllDaySelection(start, end)
        : (() => {
            if (
              start >= end ||
              !isAlignedToSlotBoundary(start) ||
              !isAlignedToSlotBoundary(end) ||
              (end.getTime() - start.getTime()) % SLOT_UNIT_MS !== 0
            ) {
              return null;
            }
            return splitIntoSlotRanges(start, end);
          })();

      if (!ranges) {
        toaster.create({
          type: "error",
          title: "30分単位で選択してください",
        });
        return;
      }

      const hasPastRange = ranges.some((range) => range.start < new Date());
      if (hasPastRange) {
        toaster.create({
          type: "error",
          title: "過去の時間は選択できません",
        });
        return;
      }

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
    [createSlot, events, organizationId, refetch, user, view],
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

  const dayPropGetter = useCallback((day: Date) => {
    if (!isPastDay(day, new Date())) {
      return {};
    }

    return {
      style: {
        backgroundImage:
          "repeating-linear-gradient(-45deg, rgba(148,163,184,0.22) 0, rgba(148,163,184,0.22) 6px, rgba(148,163,184,0.1) 6px, rgba(148,163,184,0.1) 12px)",
        backgroundColor: "rgba(248,250,252,0.8)",
        pointerEvents: "none" as const,
        cursor: "not-allowed",
      },
    };
  }, []);

  const slotPropGetter = useCallback((slotDate: Date) => {
    if (slotDate.getTime() >= Date.now()) {
      return {};
    }

    return {
      style: {
        backgroundImage:
          "repeating-linear-gradient(-45deg, rgba(148,163,184,0.18) 0, rgba(148,163,184,0.18) 5px, rgba(148,163,184,0.07) 5px, rgba(148,163,184,0.07) 10px)",
        pointerEvents: "none" as const,
        cursor: "not-allowed",
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
          dayPropGetter={dayPropGetter}
          slotPropGetter={slotPropGetter}
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
