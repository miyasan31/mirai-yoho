import { getGetPricePlansQueryOptions } from "@mirai-yoho/api-client/api/booking/booking";
import { getGetSlotsQueryOptions } from "@mirai-yoho/api-client/api/slot/slot";
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
import { useSuspensePricePlanOptions } from "@/hooks/use-price-plans";
import { useSuspenseSlots } from "@/hooks/use-slots";
import { collectBookableStartTimesForDuration } from "@/lib/continuous-slots";
import { pageHead } from "@/lib/head";

interface SlotsSearch {
  selectionId: string;
  durationMinutes: number;
}

export const Route = createFileRoute("/$organizationId/consultants/$id/slots")({
  head: () => pageHead("開始時刻を選択"),
  validateSearch: (search: Record<string, unknown>): SlotsSearch => {
    const durationRaw = search.durationMinutes;
    const duration =
      typeof durationRaw === "number"
        ? durationRaw
        : typeof durationRaw === "string"
          ? Number(durationRaw)
          : Number.NaN;
    return {
      selectionId:
        typeof search.selectionId === "string" ? search.selectionId : "",
      durationMinutes: Number.isFinite(duration) ? duration : Number.NaN,
    };
  },
  loader: ({
    context: { queryClient },
    params: { organizationId, id: consultantId },
  }) =>
    Promise.all([
      queryClient.ensureQueryData(
        getGetSlotsQueryOptions(organizationId, { consultantId }),
      ),
      queryClient.ensureQueryData(
        getGetPricePlansQueryOptions(organizationId, { consultantId }),
      ),
    ]),
  pendingComponent: SlotsPagePending,
  errorComponent: SlotsPageError,
  component: SlotsPage,
});

function formatDate(isoString: string): string {
  return format(parseISO(isoString), "yyyy/MM/dd (E)", { locale: ja });
}

function formatTime(isoString: string): string {
  return format(parseISO(isoString), "HH:mm");
}

function SlotsPagePending() {
  return (
    <styled.div maxW="2xl" mx="auto" p="8">
      <Skeleton height="4" width="30%" mb="4" />
      <Skeleton height="8" width="50%" mb="2" />
      <Skeleton height="4" width="60%" mb="8" />
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
    </styled.div>
  );
}

function SlotsPageError() {
  return (
    <EmptyState
      icon={CircleX}
      message="空き枠情報の取得に失敗しました"
      hint="しばらくしてからもう一度お試しください"
    />
  );
}

function SlotsPage() {
  const { organizationId, id: consultantId } = Route.useParams();
  const { selectionId, durationMinutes } = Route.useSearch();
  const { buildPath } = useOrganizationRouting();
  const { data } = useSuspenseSlots(organizationId, { consultantId });
  const pricePlansQuery = useSuspensePricePlanOptions(organizationId, {
    consultantId,
  });
  const selectedPlan =
    pricePlansQuery.data.data.pricePlans.find(
      (plan) => plan.selectionId === selectionId,
    ) ?? null;

  const slots = data.data.slots;

  const bookableStarts = useMemo(
    () =>
      Number.isFinite(durationMinutes)
        ? collectBookableStartTimesForDuration(slots, durationMinutes)
        : [],
    [slots, durationMinutes],
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

  if (!selectionId || !Number.isFinite(durationMinutes)) {
    return (
      <styled.div maxW="2xl" mx="auto" p="8">
        <EmptyState
          icon={CalendarX}
          message="料金プランが選択されていません"
          hint="料金プランを選び直してください"
        />
        <styled.div display="flex" justifyContent="center" mt="4">
          <Link
            to="/$organizationId/consultants/$id/plans"
            params={{ organizationId, id: consultantId }}
          >
            <styled.span
              color="colorPalette.default"
              textDecoration="underline"
            >
              料金プラン選択へ
            </styled.span>
          </Link>
        </styled.div>
      </styled.div>
    );
  }

  return (
    <styled.div maxW="2xl" mx="auto" p="8">
      <styled.div display="flex" alignItems="center" gap="2" mb="4">
        <Tooltip content="料金プラン選択に戻る" showArrow>
          <IconButton variant="subtle" size="sm" asChild>
            <Link
              to="/$organizationId/consultants/$id/plans"
              params={{ organizationId, id: consultantId }}
            >
              <ArrowLeft size={18} />
            </Link>
          </IconButton>
        </Tooltip>
        <Text textStyle="sm" color="fg.muted">
          料金プラン選択に戻る
        </Text>
      </styled.div>

      <styled.div mb="6">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          開始時刻を選択
        </Text>
        <Text textStyle="sm" color="fg.muted">
          ご希望の開始時刻を選んでください
        </Text>
      </styled.div>

      {selectedPlan && (
        <styled.div
          rounded="l2"
          bg="bg.subtle"
          p="3"
          mb="6"
          display="flex"
          flexDirection="column"
          gap="1"
        >
          <Text textStyle="sm" color="fg.muted">
            選択中のプラン
          </Text>
          <styled.div
            display="flex"
            justifyContent="space-between"
            alignItems="baseline"
            gap="3"
          >
            <Text fontWeight="medium">
              {selectedPlan.name}（{selectedPlan.durationMinutes}分）
            </Text>
            <Text fontWeight="bold" color="colorPalette.default">
              ¥{selectedPlan.totalJPY.toLocaleString()}
            </Text>
          </styled.div>
        </styled.div>
      )}

      {bookableStarts.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          message="このプランで予約可能な枠はありません"
          hint="別のプランを選ぶか、時間をおいて再度お試しください"
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
                      `/booking?consultantId=${consultantId}&startsAt=${encodeURIComponent(candidate.startsAt)}&selectionId=${encodeURIComponent(selectionId)}&durationMinutes=${durationMinutes}`,
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
