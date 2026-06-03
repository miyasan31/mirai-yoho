"use client";

import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { CircleX, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { usePublicBookingSettings } from "@/hooks/use-booking-settings";
import { useGetConsultants } from "@/hooks/use-consultants";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import { useGetSlots } from "@/hooks/use-slots";

function formatDate(isoString: string): string {
  return format(parseISO(isoString), "yyyy/MM/dd (E)", { locale: ja });
}

function formatTime(isoString: string): string {
  return format(parseISO(isoString), "HH:mm");
}

function AggregatedSlotSkeleton() {
  return (
    <styled.div display="flex" flexDirection="column" gap="6">
      {[0, 1, 2].map((groupIdx) => (
        <div key={groupIdx}>
          <Skeleton height="6" width="40%" mb="3" />
          <styled.div display="flex" flexDirection="column" gap="2">
            {[0, 1, 2].map((slotIdx) => (
              <Skeleton key={slotIdx} height="16" width="full" rounded="l2" />
            ))}
          </styled.div>
        </div>
      ))}
    </styled.div>
  );
}

function ConsultantCardSkeleton() {
  return (
    <styled.div
      shadow="sm"
      border="1px solid"
      borderColor="border"
      rounded="l2"
      p="6"
      display="flex"
      flexDirection="column"
      gap="4"
    >
      <Skeleton height="6" width="40%" />
      <SkeletonText noOfLines={2} />
      <styled.div display="flex" gap="2">
        <Skeleton height="5" width="16" />
        <Skeleton height="5" width="20" />
        <Skeleton height="5" width="14" />
      </styled.div>
      <Skeleton height="10" width="full" mt="auto" />
    </styled.div>
  );
}

export default function ConsultantsPage() {
  const { buildPath } = useOrganizationRouting();
  const {
    data: settingsData,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = usePublicBookingSettings();
  const consultantSelectionEnabled =
    settingsData?.data?.consultantSelectionEnabled;
  const isSettingsResolved = !isLoadingSettings && !!settingsData?.data;
  const { data, isLoading, error } = useGetConsultants(
    isSettingsResolved && consultantSelectionEnabled === true,
  );
  const {
    data: aggregatedData,
    isLoading: isLoadingAggregatedSlots,
    error: aggregatedError,
  } = useGetSlots(
    {},
    {
      query: {
        enabled: isSettingsResolved && consultantSelectionEnabled === false,
      },
    },
  );

  const aggregatedSlots = aggregatedData?.data?.aggregatedSlots ?? [];
  const groupedAggregatedSlots = useMemo(() => {
    const groups: Record<string, typeof aggregatedSlots> = {};
    for (const slot of aggregatedSlots) {
      const dateKey = formatDate(slot.startDatetime);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(slot);
    }
    return Object.entries(groups);
  }, [aggregatedSlots]);

  if (
    isLoadingSettings ||
    (!settingsError && !isSettingsResolved) ||
    (consultantSelectionEnabled === true && isLoading) ||
    (consultantSelectionEnabled === false && isLoadingAggregatedSlots)
  ) {
    return (
      <styled.div maxW="4xl" mx="auto" p="8">
        <Skeleton height="8" width="40%" mb="2" />
        <Skeleton height="4" width="60%" mb="8" />
        {consultantSelectionEnabled === true ? (
          <styled.div
            display="grid"
            gridTemplateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
            gap="6"
          >
            <ConsultantCardSkeleton />
            <ConsultantCardSkeleton />
            <ConsultantCardSkeleton />
            <ConsultantCardSkeleton />
          </styled.div>
        ) : (
          <AggregatedSlotSkeleton />
        )}
      </styled.div>
    );
  }

  if (
    settingsError ||
    (consultantSelectionEnabled === true && error) ||
    (consultantSelectionEnabled === false && aggregatedError)
  ) {
    return (
      <EmptyState
        icon={CircleX}
        message={
          consultantSelectionEnabled === true
            ? "相談員情報の取得に失敗しました"
            : "空き枠情報の取得に失敗しました"
        }
        hint="しばらくしてからもう一度お試しください"
      />
    );
  }

  const consultants = data?.data?.consultants ?? [];

  return (
    <styled.div maxW="4xl" mx="auto" p="8">
      <styled.div mb="8">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          {consultantSelectionEnabled ? "相談員一覧" : "予約可能な日時"}
        </Text>
        <Text textStyle="sm" color="fg.muted">
          {consultantSelectionEnabled === true
            ? "未来予報の相談員を選んで予約できます"
            : "日時を選ぶと、空き状況に応じて相談員を自動でご案内します"}
        </Text>
      </styled.div>

      {consultantSelectionEnabled === true ? (
        consultants.length === 0 ? (
          <EmptyState
            icon={Users}
            message="現在利用可能な相談員はいません"
            hint="新しい相談員が登録されるとここに表示されます"
          />
        ) : (
          <styled.div
            display="grid"
            gridTemplateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
            gap="6"
          >
            {consultants.map((consultant) => (
              <styled.div
                key={consultant.consultantId}
                shadow="sm"
                border="1px solid"
                borderColor="border"
                rounded="l2"
                p="6"
                display="flex"
                flexDirection="column"
                gap="4"
                transition="all"
                transitionDuration="normal"
                _hover={{ shadow: "md" }}
              >
                <Text as="h2" textStyle="lg" fontWeight="semibold">
                  {consultant.name}
                </Text>
                {consultant.imageUrl ? (
                  <styled.div
                    width="16"
                    height="16"
                    position="relative"
                    overflow="hidden"
                    rounded="full"
                  >
                    <Image
                      src={consultant.imageUrl}
                      alt={`${consultant.name} のアバター画像`}
                      fill
                      sizes="64px"
                      style={{ objectFit: "cover" }}
                    />
                  </styled.div>
                ) : (
                  <styled.div
                    width="16"
                    height="16"
                    position="relative"
                    overflow="hidden"
                    rounded="full"
                  >
                    <Image
                      src="/default-avatar.png"
                      alt="デフォルトアバター画像"
                      fill
                      sizes="64px"
                      style={{ objectFit: "cover" }}
                    />
                  </styled.div>
                )}

                {consultant.bio && (
                  <Text textStyle="sm" color="fg.muted">
                    {consultant.bio}
                  </Text>
                )}

                <styled.div display="flex" flexWrap="wrap" gap="2">
                  {consultant.specialties.map((specialty) => (
                    <Badge key={specialty} variant="outline" size="sm">
                      {specialty}
                    </Badge>
                  ))}
                </styled.div>

                <Button asChild mt="auto">
                  <Link
                    href={buildPath(
                      `/consultants/${consultant.consultantId}/slots`,
                    )}
                  >
                    空き枠を見る
                  </Link>
                </Button>
              </styled.div>
            ))}
          </styled.div>
        )
      ) : aggregatedSlots.length === 0 ? (
        <EmptyState
          icon={Users}
          message="現在利用可能な枠はありません"
          hint="相談員が新しい枠を追加すると、ここに表示されます"
        />
      ) : (
        <styled.div display="flex" flexDirection="column" gap="6">
          {groupedAggregatedSlots.map(([dateLabel, dateSlots]) => (
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
                    key={`${slot.startDatetime}_${slot.endDatetime}`}
                    href={buildPath(
                      `/booking?startDatetime=${encodeURIComponent(slot.startDatetime)}&endDatetime=${encodeURIComponent(slot.endDatetime)}`,
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
                  >
                    <Text fontWeight="medium" mb="1">
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
