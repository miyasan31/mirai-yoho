"use client";

import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, CalendarX, CircleX } from "lucide-react";
import Link from "next/link";
import { use, useMemo } from "react";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Tooltip } from "@/components/ui/tooltip";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import { useGetSlots } from "@/hooks/use-slots";

function formatDate(isoString: string): string {
  return format(parseISO(isoString), "yyyy/MM/dd (E)", { locale: ja });
}

function formatTime(isoString: string): string {
  return format(parseISO(isoString), "HH:mm");
}

function SlotsSkeleton() {
  return (
    <styled.div display="flex" flexDirection="column" gap="6">
      {[0, 1, 2].map((groupIdx) => (
        <div key={groupIdx}>
          <Skeleton height="6" width="40%" mb="3" />
          <styled.div display="flex" flexDirection="column" gap="2">
            {[0, 1, 2].map((slotIdx) => (
              <Skeleton key={slotIdx} height="14" width="full" rounded="l2" />
            ))}
          </styled.div>
        </div>
      ))}
    </styled.div>
  );
}

export default function SlotsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: consultantId } = use(params);
  const { buildPath } = useOrganizationRouting();
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
      <styled.div maxW="2xl" mx="auto" p="8">
        <Skeleton height="4" width="30%" mb="4" />
        <Skeleton height="8" width="50%" mb="2" />
        <Skeleton height="4" width="60%" mb="8" />
        <SlotsSkeleton />
      </styled.div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={CircleX}
        message="空き枠情報の取得に失敗しました"
        hint="しばらくしてからもう一度お試しください"
      />
    );
  }

  return (
    <styled.div maxW="2xl" mx="auto" p="8">
      <styled.div display="flex" alignItems="center" gap="2" mb="4">
        <Tooltip content="相談員一覧に戻る" showArrow>
          <IconButton variant="subtle" size="sm" asChild>
            <Link href={buildPath("/consultants")}>
              <ArrowLeft size={18} />
            </Link>
          </IconButton>
        </Tooltip>
        <Text textStyle="sm" color="fg.muted">
          相談員一覧に戻る
        </Text>
      </styled.div>

      <styled.div mb="8">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          空き枠を選択
        </Text>
        <Text textStyle="sm" color="fg.muted">
          ご希望の日時を選んでください
        </Text>
      </styled.div>

      {slots.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          message="現在利用可能な枠はありません"
          hint="相談員が新しい枠を追加すると、ここに表示されます"
        />
      ) : (
        <styled.div display="flex" flexDirection="column" gap="6">
          {groupedSlots.map(([dateLabel, dateSlots]) => (
            <div key={dateLabel}>
              <Text
                as="h2"
                textStyle="md"
                fontWeight="bold"
                mb="3"
                pb="2"
                borderBottom="1px solid"
                borderColor="border"
              >
                {dateLabel}
              </Text>
              <styled.div display="flex" flexDirection="column" gap="2">
                {dateSlots.map((slot) => (
                  <styled.a
                    key={slot.slotId}
                    href={buildPath(
                      `/booking?slotId=${slot.slotId}&consultantId=${consultantId}&startDatetime=${encodeURIComponent(slot.startDatetime)}&endDatetime=${encodeURIComponent(slot.endDatetime)}`,
                    )}
                    shadow="xs"
                    border="1px solid"
                    borderColor="border"
                    rounded="l2"
                    p="4"
                    display="block"
                    cursor="pointer"
                    transition="all"
                    transitionDuration="normal"
                    textDecoration="none"
                    color="fg.default"
                    _hover={{
                      borderColor: "colorPalette.default",
                      shadow: "sm",
                    }}
                    _active={{
                      bg: "bg.subtle",
                    }}
                    _focusVisible={{
                      outline: "2px solid",
                      outlineColor: "colorPalette.default",
                      outlineOffset: "2px",
                    }}
                  >
                    <Text fontWeight="medium">
                      {formatTime(slot.startDatetime)} 〜{" "}
                      {formatTime(slot.endDatetime)}
                    </Text>
                  </styled.a>
                ))}
              </styled.div>
            </div>
          ))}
        </styled.div>
      )}
    </styled.div>
  );
}
