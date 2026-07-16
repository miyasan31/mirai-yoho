import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { IconButton } from "@mirai-yoho/ui/components/ui/icon-button";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { createFileRoute, Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowLeft, CalendarX, CircleX } from "lucide-react";
import { useMemo } from "react";
import { styled } from "styled-system/jsx";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import { useGetSlots } from "@/hooks/use-slots";
import { collectBookableStartTimes } from "@/lib/continuous-slots";

export const Route = createFileRoute("/$organizationId/consultants/$id/slots")({
  component: SlotsPage,
});

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

function SlotsPage() {
  const { organizationId, id: consultantId } = Route.useParams();
  const { buildPath } = useOrganizationRouting();
  const { data, isLoading, error } = useGetSlots({ consultantId });

  const slots = data?.data?.slots ?? [];

  const bookableStarts = useMemo(
    () => collectBookableStartTimes(slots),
    [slots],
  );

  const groupedStarts = useMemo(() => {
    const groups: Record<string, typeof bookableStarts> = {};
    for (const candidate of bookableStarts) {
      const dateKey = formatDate(candidate.startsAt);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(candidate);
    }
    return Object.entries(groups);
  }, [bookableStarts]);

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
            <Link to="/$organizationId/consultants" params={{ organizationId }}>
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
          開始時刻を選択
        </Text>
        <Text textStyle="sm" color="fg.muted">
          ご希望の開始時刻を選んでください（次の画面で相談時間を決めます）
        </Text>
      </styled.div>

      {bookableStarts.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          message="現在利用可能な枠はありません"
          hint="相談員が新しい枠を追加すると、ここに表示されます"
        />
      ) : (
        <styled.div display="flex" flexDirection="column" gap="6">
          {groupedStarts.map(([dateLabel, candidates]) => (
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
                {candidates.map((candidate) => (
                  <styled.a
                    key={candidate.startsAt}
                    href={buildPath(
                      `/booking?consultantId=${consultantId}&startsAt=${encodeURIComponent(candidate.startsAt)}`,
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
                      {formatTime(candidate.startsAt)} 開始
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
