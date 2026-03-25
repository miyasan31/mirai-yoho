"use client";

import { styled } from "styled-system/jsx";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading) return <Spinner />;

  const dashboard = data?.data;
  if (!dashboard) return <Text>データの取得に失敗しました</Text>;

  return (
    <styled.div>
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="6">
        ダッシュボード
      </Text>
      <styled.div
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))"
        gap="4"
        mb="8"
      >
        <styled.div p="4" border="1px solid" borderColor="border" rounded="l2">
          <Text textStyle="sm" color="fg.muted">
            予約数
          </Text>
          <Text textStyle="4xl" fontWeight="bold">
            {dashboard.totalBookings}
          </Text>
        </styled.div>
        <styled.div p="4" border="1px solid" borderColor="border" rounded="l2">
          <Text textStyle="sm" color="fg.muted">
            売上
          </Text>
          <Text textStyle="4xl" fontWeight="bold">
            {dashboard.totalRevenue.toLocaleString()}円
          </Text>
        </styled.div>
        <styled.div p="4" border="1px solid" borderColor="border" rounded="l2">
          <Text textStyle="sm" color="fg.muted">
            クライアント数
          </Text>
          <Text textStyle="4xl" fontWeight="bold">
            {dashboard.totalClients}
          </Text>
        </styled.div>
        <styled.div p="4" border="1px solid" borderColor="border" rounded="l2">
          <Text textStyle="sm" color="fg.muted">
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
      <styled.div display="flex" gap="4">
        <Text>保留中: {dashboard.bookingsByStatus.pending}</Text>
        <Text>確定: {dashboard.bookingsByStatus.confirmed}</Text>
        <Text>完了: {dashboard.bookingsByStatus.completed}</Text>
        <Text>キャンセル: {dashboard.bookingsByStatus.cancelled}</Text>
      </styled.div>
    </styled.div>
  );
}
