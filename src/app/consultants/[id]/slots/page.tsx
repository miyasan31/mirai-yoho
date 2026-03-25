"use client";

import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import Link from "next/link";
import { use, useMemo } from "react";
import { css } from "styled-system/css";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useGetSlots } from "@/hooks/use-slots";

function formatDate(isoString: string): string {
  return format(parseISO(isoString), "yyyy/MM/dd (E)", { locale: ja });
}

function formatTime(isoString: string): string {
  return format(parseISO(isoString), "HH:mm");
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
      <div
        className={css({ display: "flex", justifyContent: "center", py: "20" })}
      >
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={css({ p: "8" })}>
        <Text color="fg.error">空き枠情報の取得に失敗しました</Text>
      </div>
    );
  }

  return (
    <div className={css({ maxW: "2xl", mx: "auto", p: "8" })}>
      <Link
        href="/consultants"
        className={css({
          color: "fg.muted",
          textDecoration: "underline",
          mb: "4",
          display: "inline-block",
        })}
      >
        相談員一覧に戻る
      </Link>

      <Text
        as="h1"
        className={css({ fontSize: "3xl", fontWeight: "bold", mb: "8" })}
      >
        空き枠を選択
      </Text>

      {slots.length === 0 ? (
        <Text color="fg.muted">現在利用可能な枠はありません</Text>
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
                  fontSize: "lg",
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
                      border: "1px solid",
                      borderColor: "border.default",
                      borderRadius: "md",
                      p: "4",
                      display: "block",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      _hover: {
                        borderColor: "blue.400",
                        bg: "gray.50",
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
