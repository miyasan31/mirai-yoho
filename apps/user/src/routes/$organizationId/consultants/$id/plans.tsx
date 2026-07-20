import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { IconButton } from "@mirai-yoho/ui/components/ui/icon-button";
import * as RadioGroup from "@mirai-yoho/ui/components/ui/radio-group";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Tooltip } from "@mirai-yoho/ui/components/ui/tooltip";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CircleX, PackageSearch } from "lucide-react";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { usePricePlanOptions } from "@/hooks/use-price-plans";

export const Route = createFileRoute("/$organizationId/consultants/$id/plans")({
  component: PlansPage,
});

function PlansPage() {
  const { organizationId, id: consultantId } = Route.useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = usePricePlanOptions({ consultantId });
  const pricePlans = data?.data?.pricePlans ?? [];
  const [selectionId, setSelectionId] = useState("");

  const selectedPlan =
    pricePlans.find((plan) => plan.selectionId === selectionId) ?? null;

  const handleProceed = () => {
    if (!selectedPlan) return;
    navigate({
      to: "/$organizationId/consultants/$id/slots",
      params: { organizationId, id: consultantId },
      search: {
        selectionId: selectedPlan.selectionId,
        durationMinutes: selectedPlan.durationMinutes,
      },
    });
  };

  if (isLoading) {
    return (
      <styled.div maxW="2xl" mx="auto" p="8">
        <Skeleton height="4" width="30%" mb="4" />
        <Skeleton height="8" width="50%" mb="2" />
        <Skeleton height="4" width="60%" mb="8" />
        <styled.div display="flex" flexDirection="column" gap="3">
          {[0, 1, 2].map((idx) => (
            <Skeleton key={idx} height="20" width="full" rounded="l2" />
          ))}
        </styled.div>
      </styled.div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={CircleX}
        message="料金プラン情報の取得に失敗しました"
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
          料金プランを選択
        </Text>
        <Text textStyle="sm" color="fg.muted">
          ご希望の相談時間と料金プランを選んでください（次の画面で開始時刻を決めます）
        </Text>
      </styled.div>

      {pricePlans.length === 0 ? (
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
              {pricePlans.map((plan) => (
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
            onClick={handleProceed}
            disabled={!selectedPlan}
          >
            予約枠の選択へ進む
          </Button>
        </styled.div>
      )}
    </styled.div>
  );
}
