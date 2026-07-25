import { format, getDay, parse, startOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { useCallback, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type SlotInfo } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { usePublicBookingSettings } from "@mirai-yoho/console-core/hooks/use-booking-settings";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { BusinessHours } from "@mirai-yoho/shared/business-hours";
import {
  getSlotUnitMinutes,
  getSlotUnitMs,
  isAlignedToSlotBoundary,
  splitIntoSlotRanges,
} from "@mirai-yoho/shared/slot-availability";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { styled } from "styled-system/jsx";
import { useAuth } from "@/hooks/use-auth";
import { useGetConsoleSlots } from "@/hooks/use-console-slots";
import { useConsultantBookings } from "@/hooks/use-consultant-bookings";
import { useConsultantCalendarQueryParams } from "@/hooks/use-consultant-calendar-query-params";
import { useCreateSlot, useDeleteSlot } from "@/hooks/use-slots";

const locales = { "ja-JP": ja };
const SLOT_UNIT_MINUTES = getSlotUnitMinutes();
const SLOT_UNIT_MS = getSlotUnitMs();
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
  type: "available" | "booking" | "buffer";
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

function noonOf(date: Date): Date {
  const noon = new Date(date);
  noon.setHours(12, 0, 0, 0);
  return noon;
}

function hasBusinessHoursOnDate(
  date: Date,
  businessHours: BusinessHours,
): boolean {
  return businessHours.getEffectiveTimeRanges(noonOf(date)).length > 0;
}

function buildBusinessHourRangesFromAllDaySelection(
  start: Date,
  end: Date,
  businessHours: BusinessHours,
): Array<{ start: Date; end: Date }> {
  const ranges: Array<{ start: Date; end: Date }> = [];
  const currentDay = new Date(start);

  while (currentDay < end) {
    const timeRanges = businessHours.getEffectiveTimeRanges(noonOf(currentDay));
    for (const timeRange of timeRanges) {
      ranges.push(...splitIntoSlotRanges(timeRange.startsAt, timeRange.endsAt));
    }
    currentDay.setDate(currentDay.getDate() + 1);
  }

  return ranges;
}

export default function ConsultantSlotsPage() {
  const { user } = useAuth();
  const { organizationId } = useOrganizationRouting();
  const { view, date, setView, setDate, setViewAndDate } =
    useConsultantCalendarQueryParams();
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

  const { data, isLoading, refetch } = useGetConsoleSlots(
    { consultantId: user?.uid ?? "" },
    {
      query: { enabled: !!user?.uid },
    },
  );
  const { data: bookingsData } = useConsultantBookings({
    page: 1,
    pageSize: 100,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const { data: settingsData } = usePublicBookingSettings();
  const createSlot = useCreateSlot();
  const deleteSlot = useDeleteSlot();
  const businessHours = useMemo(
    () =>
      BusinessHours.reconstruct(
        settingsData?.data?.businessHours ??
          BusinessHours.createDefault().toJSON(),
      ),
    [settingsData?.data?.businessHours],
  );
  const calendarBounds = useMemo(
    () => businessHours.getCalendarBounds(),
    [businessHours],
  );

  const events: CalendarEvent[] = useMemo(() => {
    const slots = data?.data?.slots ?? [];
    const availableEvents: CalendarEvent[] = slots.map((slot) => ({
      id: slot.slotId,
      title: "予約可能",
      start: new Date(slot.startsAt),
      end: new Date(slot.endsAt),
      type: "available",
    }));

    const bookings = bookingsData?.data?.bookings ?? [];
    const bookingEvents: CalendarEvent[] = [];
    for (const booking of bookings) {
      if (booking.status === "cancelled") continue;
      const startsAt = new Date(booking.startsAt);
      const endsAt = new Date(booking.endsAt);
      const customerName = booking.customer?.name ?? null;
      bookingEvents.push({
        id: `booking-${booking.bookingId}`,
        title: customerName ? `予約: ${customerName}` : "予約",
        start: startsAt,
        end: endsAt,
        type: "booking",
      });
      const bufferMinutes = booking.bufferSlotIds.length * SLOT_UNIT_MINUTES;
      if (bufferMinutes > 0) {
        const bufferEnd = new Date(
          endsAt.getTime() + bufferMinutes * 60 * 1000,
        );
        bookingEvents.push({
          id: `buffer-${booking.bookingId}`,
          title: `バッファ (${bufferMinutes}分)`,
          start: endsAt,
          end: bufferEnd,
          type: "buffer",
        });
      }
    }

    return [...availableEvents, ...bookingEvents];
  }, [data, bookingsData]);

  const handleSelectSlot = useCallback(
    async (slotInfo: SlotInfo) => {
      if (view === "month") {
        if (
          isPastDay(slotInfo.start, new Date()) ||
          !hasBusinessHoursOnDate(slotInfo.start, businessHours)
        ) {
          toaster.create({
            type: "error",
            title: "選択した日は営業時間外のため選択できません",
          });
          return;
        }
        setViewAndDate("day", slotInfo.start);
        return;
      }

      if (!user) return;

      const start = slotInfo.start;
      const end =
        slotInfo.end > slotInfo.start
          ? slotInfo.end
          : new Date(slotInfo.start.getTime() + SLOT_UNIT_MS);
      const ranges = isAllDaySelection(start, end)
        ? buildBusinessHourRangesFromAllDaySelection(start, end, businessHours)
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
          title: `${SLOT_UNIT_MINUTES}分単位で選択してください`,
        });
        return;
      }
      if (ranges.length === 0) {
        toaster.create({
          type: "error",
          title: "選択した日には営業時間が設定されていません",
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
      const hasOutsideBusinessHours = ranges.some(
        (range) => !businessHours.containsRange(range.start, range.end),
      );
      if (hasOutsideBusinessHours) {
        toaster.create({
          type: "error",
          title: "営業時間外の時間は選択できません",
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
          title: "既存の予約可能枠または予約と重複しています",
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
                startsAt: range.start.toISOString(),
                endsAt: range.end.toISOString(),
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
    [
      businessHours,
      createSlot,
      events,
      organizationId,
      refetch,
      setViewAndDate,
      user,
      view,
    ],
  );

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    if (event.type !== "available") return;
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

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    if (event.type === "booking") {
      return {
        style: {
          backgroundColor: "#2f855a",
          borderColor: "#276749",
          color: "#fff",
          opacity: 0.9,
        },
      };
    }
    if (event.type === "buffer") {
      return {
        style: {
          backgroundColor: "#a0aec0",
          borderColor: "#718096",
          color: "#fff",
          opacity: 0.7,
        },
      };
    }
    return {
      style: {
        backgroundColor: "#2661cf",
        borderColor: "#2550a8",
        color: "#fff",
        opacity: 0.8,
      },
    };
  }, []);

  const dayPropGetter = useCallback(
    (day: Date) => {
      if (
        !isPastDay(day, new Date()) &&
        hasBusinessHoursOnDate(day, businessHours)
      ) {
        return {};
      }

      return { className: "rbc-day-unavailable" };
    },
    [businessHours],
  );

  const slotPropGetter = useCallback(
    (slotDate: Date) => {
      const slotEndDate = new Date(slotDate.getTime() + SLOT_UNIT_MS);
      if (
        slotDate.getTime() >= Date.now() &&
        businessHours.containsRange(slotDate, slotEndDate)
      ) {
        return {};
      }

      return { className: "rbc-slot-unavailable" };
    },
    [businessHours],
  );

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
          timeslots={60 / SLOT_UNIT_MINUTES}
          min={
            new Date(
              1970,
              0,
              1,
              calendarBounds.minHour,
              calendarBounds.minMinute,
            )
          }
          max={(() => {
            const totalMinutes =
              calendarBounds.maxHour * 60 + calendarBounds.maxMinute;
            const clamped = Math.min(totalMinutes, 24 * 60 - 1);
            return new Date(1970, 0, 1, Math.floor(clamped / 60), clamped % 60);
          })()}
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
