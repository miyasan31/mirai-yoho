"use client";

import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, CalendarX, CircleX } from "lucide-react";
import Link from "next/link";
import { use, useMemo } from "react";
import { css } from "styled-system/css";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useGetSlots } from "@/hooks/use-slots";

function formatDate(isoString: string): string {
  return format(parseISO(isoString), "yyyy/MM/dd (E)", { locale: ja });
}

function formatTime(isoString: string): string {
  return format(parseISO(isoString), "HH:mm");
}

function SlotsSkeleton() {
  return (
    <div
      className={css({
        display: "flex",
        flexDirection: "column",
        gap: "6",
      })}
    >
      {[0, 1, 2].map((groupIdx) => (
        <div key={groupIdx}>
          <Skeleton height="6" width="40%" mb="3" />
          <div
            className={css({
              display: "flex",
              flexDirection: "column",
              gap: "2",
            })}
          >
            {[0, 1, 2].map((slotIdx) => (
              <Skeleton key={slotIdx} height="14" width="full" rounded="l2" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SlotsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: consultantId } = use(params);
  const { data, isLoading, error } = useGetSlots({ consultantId });

  const slots = data?.data?.slots ?? [];

  const groupedSlots = useMemo(() => {
    const groups: Record<string, typeof slots> = {};
    for (const slot of slots) {
      const dateKey = formatDate(slot.startDatetime);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(slot);
    }
    return Object.entries(groups);
  }, [slots]);

  if (isLoading) {
    return (
      <div className={css({ maxW: "2xl", mx: "auto", p: "8" })}>
        <Skeleton height="4" width="30%" mb="4" />
        <Skeleton height="8" width="50%" mb="2" />
        <Skeleton height="4" width="60%" mb="8" />
        <SlotsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={css({
          display: "flex",
          flexDir: "column",
          alignItems: "center",
          gap: "3",
          py: "16",
          px: "8",
        })}
      >
        <CircleX size={48} className={css({ color: "fg.subtle" })} />
        <Text fontWeight="medium" color="fg.muted">
          空き枠情報の取得に失敗しました
        </Text>
        <Text textStyle="sm" color="fg.subtle">
          しばらくしてからもう一度お試しください
        </Text>
      </div>
    );
  }

  return (
    <div className={css({ maxW: "2xl", mx: "auto", p: "8" })}>
      <Link
        href="/consultants"
        className={css({
          display: "inline-flex",
          alignItems: "center",
          gap: "1",
          color: "fg.muted",
          textStyle: "sm",
          mb: "4",
          transition: "colors",
          transitionDuration: "normal",
          _hover: { color: "fg.default" },
        })}
      >
        <ArrowLeft size={16} />
        相談員一覧に戻る
      </Link>

      <div className={css({ mb: "8" })}>
        <Text
          as="h1"
          className={css({ textStyle: "2xl", fontWeight: "bold", mb: "1" })}
        >
          空き枠を選択
        </Text>
        <Text textStyle="sm" color="fg.muted">
          ご希望の日時を選んでください
        </Text>
      </div>

      {slots.length === 0 ? (
        <div
          className={css({
            display: "flex",
            flexDir: "column",
            alignItems: "center",
            gap: "3",
            py: "16",
          })}
        >
          <CalendarX size={48} className={css({ color: "fg.subtle" })} />
          <Text fontWeight="medium" color="fg.muted">
            現在利用可能な枠はありません
          </Text>
          <Text textStyle="sm" color="fg.subtle">
            相談員が新しい枠を追加すると、ここに表示されます
          </Text>
        </div>
      ) : (
        <div
          className={css({
            display: "flex",
            flexDirection: "column",
            gap: "6",
          })}
        >
          {groupedSlots.map(([dateLabel, dateSlots]) => (
            <div key={dateLabel}>
              <Text
                as="h2"
                className={css({
                  textStyle: "md",
                  fontWeight: "bold",
                  mb: "3",
                  pb: "2",
                  borderBottom: "1px solid",
                  borderColor: "border.default",
                })}
              >
                {dateLabel}
              </Text>
              <div
                className={css({
                  display: "flex",
                  flexDirection: "column",
                  gap: "2",
                })}
              >
                {dateSlots.map((slot) => (
                  <Link
                    key={slot.slotId}
                    href={`/booking?slotId=${slot.slotId}&consultantId=${consultantId}`}
                    className={css({
                      shadow: "xs",
                      border: "1px solid",
                      borderColor: "border.default",
                      rounded: "l2",
                      p: "4",
                      display: "block",
                      cursor: "pointer",
                      transition: "all",
                      transitionDuration: "normal",
                      _hover: {
                        borderColor: "blue.400",
                        bg: "gray.50",
                        shadow: "sm",
                      },
                      _active: {
                        bg: "gray.100",
                      },
                      _focusVisible: {
                        outline: "2px solid",
                        outlineColor: "blue.400",
                        outlineOffset: "2px",
                      },
                    })}
                  >
                    <Text fontWeight="medium">
                      {formatTime(slot.startDatetime)} 〜{" "}
                      {formatTime(slot.endDatetime)}
                    </Text>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
