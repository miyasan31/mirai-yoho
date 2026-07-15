import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { CircleAlert } from "lucide-react";
import { styled } from "styled-system/jsx";
import { useConsoleDashboard } from "@/hooks/use-console-dashboard";

const BOOKING_STATUS_CONFIG: Record<
  string,
  { label: string; colorPalette: string }
> = {
  pending: { label: "保留中", colorPalette: "yellow" },
  confirmed: { label: "確定", colorPalette: "blue" },
  completed: { label: "完了", colorPalette: "green" },
  cancelled: { label: "キャンセル", colorPalette: "red" },
};

export default function ConsoleDashboardPage() {
  const { data, isLoading } = useConsoleDashboard();

  if (isLoading) {
    return (
      <styled.div>
        <styled.div mb="6">
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            ダッシュボード
          </Text>
          <Text textStyle="sm" color="fg.muted">
            予約・売上・アカウント状況など、運用状況の全体を確認する画面です。
          </Text>
        </styled.div>
        <styled.div
          display="grid"
          gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))"
          gap="4"
          mb="8"
        >
          <Skeleton height="100px" rounded="l2" />
          <Skeleton height="100px" rounded="l2" />
          <Skeleton height="100px" rounded="l2" />
          <Skeleton height="100px" rounded="l2" />
        </styled.div>
        <Skeleton height="6" width="160px" mb="3" />
        <styled.div display="flex" gap="3">
          <Skeleton height="6" width="80px" rounded="l2" />
          <Skeleton height="6" width="80px" rounded="l2" />
          <Skeleton height="6" width="80px" rounded="l2" />
          <Skeleton height="6" width="80px" rounded="l2" />
        </styled.div>
      </styled.div>
    );
  }

  const dashboard = data?.data;
  if (!dashboard) {
    return (
      <EmptyState
        icon={CircleAlert}
        message="データの取得に失敗しました"
        hint="しばらく経ってから再度お試しください"
      />
    );
  }

  return (
    <styled.div>
      <styled.div mb="6">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          ダッシュボード
        </Text>
        <Text textStyle="sm" color="fg.muted">
          予約・売上・アカウント状況など、運用状況の全体を確認する画面です。
        </Text>
      </styled.div>
      <styled.div
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))"
        gap="4"
        mb="8"
      >
        <styled.div
          p="6"
          rounded="l2"
          shadow="sm"
          border="1px solid"
          borderColor="border"
          transition="all"
          transitionDuration="normal"
          _hover={{ shadow: "md" }}
        >
          <Text
            textStyle="xs"
            fontWeight="medium"
            textTransform="uppercase"
            letterSpacing="wide"
            color="fg.muted"
          >
            予約数
          </Text>
          <Text textStyle="4xl" fontWeight="bold">
            {dashboard.totalBookings}
          </Text>
        </styled.div>
        <styled.div
          p="6"
          rounded="l2"
          shadow="sm"
          border="1px solid"
          borderColor="border"
          transition="all"
          transitionDuration="normal"
          _hover={{ shadow: "md" }}
        >
          <Text
            textStyle="xs"
            fontWeight="medium"
            textTransform="uppercase"
            letterSpacing="wide"
            color="fg.muted"
          >
            売上
          </Text>
          <Text textStyle="4xl" fontWeight="bold">
            {dashboard.totalRevenue.toLocaleString()}円
          </Text>
        </styled.div>
        <styled.div
          p="6"
          rounded="l2"
          shadow="sm"
          border="1px solid"
          borderColor="border"
          transition="all"
          transitionDuration="normal"
          _hover={{ shadow: "md" }}
        >
          <Text
            textStyle="xs"
            fontWeight="medium"
            textTransform="uppercase"
            letterSpacing="wide"
            color="fg.muted"
          >
            顧客数
          </Text>
          <Text textStyle="4xl" fontWeight="bold">
            {dashboard.totalCustomers}
          </Text>
        </styled.div>
        <styled.div
          p="6"
          rounded="l2"
          shadow="sm"
          border="1px solid"
          borderColor="border"
          transition="all"
          transitionDuration="normal"
          _hover={{ shadow: "md" }}
        >
          <Text
            textStyle="xs"
            fontWeight="medium"
            textTransform="uppercase"
            letterSpacing="wide"
            color="fg.muted"
          >
            相談員数
          </Text>
          <Text textStyle="4xl" fontWeight="bold">
            {dashboard.totalConsultants}
          </Text>
        </styled.div>
      </styled.div>
      <Text as="h2" textStyle="lg" fontWeight="bold" mb="3">
        予約ステータス
      </Text>
      <styled.div display="flex" gap="3" flexWrap="wrap">
        {Object.entries(dashboard.bookingsByStatus).map(([status, count]) => {
          const config = BOOKING_STATUS_CONFIG[status] ?? {
            label: status,
            colorPalette: "gray",
          };
          return (
            <Badge
              key={status}
              variant="subtle"
              size="lg"
              colorPalette={config.colorPalette}
            >
              {config.label}: {count as number}
            </Badge>
          );
        })}
      </styled.div>
    </styled.div>
  );
}
