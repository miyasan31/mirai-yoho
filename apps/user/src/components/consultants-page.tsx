import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as RadioGroup from "@mirai-yoho/ui/components/ui/radio-group";
import { Skeleton, SkeletonText } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Link, useNavigate } from "@tanstack/react-router";
import { CircleX, PackageSearch, Users } from "lucide-react";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { usePublicBookingSettings } from "@/hooks/use-booking-settings";
import { useGetConsultants } from "@/hooks/use-consultants";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import { usePricePlanOptions } from "@/hooks/use-price-plans";

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

function AggregatedPlansSkeleton() {
  return (
    <styled.div display="flex" flexDirection="column" gap="3">
      {[0, 1, 2].map((idx) => (
        <Skeleton key={idx} height="20" width="full" rounded="l2" />
      ))}
    </styled.div>
  );
}

export function ConsultantsPage() {
  const { organizationId } = useOrganizationRouting();
  const navigate = useNavigate();
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
    data: aggregatedPlansData,
    isLoading: isLoadingAggregatedPlans,
    error: aggregatedPlansError,
  } = usePricePlanOptions(
    {},
    isSettingsResolved && consultantSelectionEnabled === false,
  );

  const aggregatedPlans = aggregatedPlansData?.data?.pricePlans ?? [];
  const [selectionId, setSelectionId] = useState("");
  const selectedPlan =
    aggregatedPlans.find((plan) => plan.selectionId === selectionId) ?? null;

  const handleProceedAggregated = () => {
    if (!selectedPlan || !organizationId) return;
    navigate({
      to: "/$organizationId/slots",
      params: { organizationId },
      search: {
        selectionId: selectedPlan.selectionId,
        durationMinutes: selectedPlan.durationMinutes,
      },
    });
  };

  if (
    isLoadingSettings ||
    (!settingsError && !isSettingsResolved) ||
    (consultantSelectionEnabled === true && isLoading) ||
    (consultantSelectionEnabled === false && isLoadingAggregatedPlans)
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
          <AggregatedPlansSkeleton />
        )}
      </styled.div>
    );
  }

  if (
    settingsError ||
    (consultantSelectionEnabled === true && error) ||
    (consultantSelectionEnabled === false && aggregatedPlansError)
  ) {
    return (
      <EmptyState
        icon={CircleX}
        message={
          consultantSelectionEnabled === true
            ? "相談員情報の取得に失敗しました"
            : "料金プラン情報の取得に失敗しました"
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
          {consultantSelectionEnabled ? "相談員一覧" : "料金プランを選択"}
        </Text>
        <Text textStyle="sm" color="fg.muted">
          {consultantSelectionEnabled === true
            ? "みらい予報の相談員を選んで予約できます"
            : "ご希望の相談時間と料金プランを選ぶと、空き状況に応じて相談員を自動でご案内します"}
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
                <styled.div>
                  <Badge variant="subtle" size="sm">
                    {consultant.status?.name ?? ""}
                  </Badge>
                </styled.div>
                {consultant.imageUrl ? (
                  <styled.div
                    width="16"
                    height="16"
                    position="relative"
                    overflow="hidden"
                    rounded="full"
                  >
                    {/* biome-ignore lint/performance/noImgElement: Vite SPA のため next/image は使用しない */}
                    <styled.img
                      src={consultant.imageUrl}
                      alt={`${consultant.name} のアバター画像`}
                      width="full"
                      height="full"
                      objectFit="cover"
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
                    {/* biome-ignore lint/performance/noImgElement: Vite SPA のため next/image は使用しない */}
                    <styled.img
                      src="/default-avatar.png"
                      alt="デフォルトアバター画像"
                      width="full"
                      height="full"
                      objectFit="cover"
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
                    to="/$organizationId/consultants/$id/plans"
                    params={{
                      organizationId: organizationId ?? "",
                      id: consultant.consultantId,
                    }}
                  >
                    プランを選択
                  </Link>
                </Button>
              </styled.div>
            ))}
          </styled.div>
        )
      ) : aggregatedPlans.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          message="現在ご利用可能な料金プランがありません"
          hint="相談員が新しいプランを追加すると、ここに表示されます"
        />
      ) : (
        <styled.div display="flex" flexDirection="column" gap="6">
          <RadioGroup.Root
            name="selectionId"
            value={selectionId}
            onValueChange={(details) => setSelectionId(details.value ?? "")}
          >
            <styled.div display="flex" flexDirection="column" gap="3">
              {aggregatedPlans.map((plan) => (
                <RadioGroup.Item
                  key={plan.selectionId}
                  value={plan.selectionId}
                >
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemControl />
                  <RadioGroup.ItemText asChild>
                    <styled.div
                      display="flex"
                      flexDirection="column"
                      gap="1"
                      flex="1"
                    >
                      <styled.div
                        display="flex"
                        justifyContent="space-between"
                        alignItems="baseline"
                        gap="3"
                      >
                        <Text fontWeight="medium">{plan.name}</Text>
                        <Text
                          fontWeight="bold"
                          textStyle="lg"
                          color="colorPalette.default"
                        >
                          ¥{plan.totalJPY.toLocaleString()}
                        </Text>
                      </styled.div>
                      <Text textStyle="sm" color="fg.muted">
                        {plan.durationMinutes}分
                      </Text>
                    </styled.div>
                  </RadioGroup.ItemText>
                </RadioGroup.Item>
              ))}
            </styled.div>
          </RadioGroup.Root>

          <Button
            type="button"
            onClick={handleProceedAggregated}
            disabled={!selectedPlan}
          >
            予約枠の選択へ進む
          </Button>
        </styled.div>
      )}
    </styled.div>
  );
}
