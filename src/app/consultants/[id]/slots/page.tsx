"use client";

import Link from "next/link";
import { use } from "react";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useGetSlots } from "@/hooks/use-slots";

function formatSlotDatetime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SlotsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: consultantId } = use(params);
  const { data, isLoading, error } = useGetSlots({ consultantId });

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

  const slots = data?.data?.slots ?? [];

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
            gap: "3",
          })}
        >
          {slots.map((slot) => (
            <div
              key={slot.slotId}
              className={css({
                border: "1px solid",
                borderColor: "border.default",
                borderRadius: "md",
                p: "4",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              })}
            >
              <div>
                <Text fontWeight="medium">
                  {formatSlotDatetime(slot.startDatetime)}
                </Text>
                <Text className={css({ fontSize: "sm", color: "fg.muted" })}>
                  〜 {formatSlotDatetime(slot.endDatetime)}
                </Text>
              </div>

              <Button asChild size="sm">
                <Link
                  href={`/booking?slotId=${slot.slotId}&consultantId=${consultantId}`}
                >
                  予約する
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
