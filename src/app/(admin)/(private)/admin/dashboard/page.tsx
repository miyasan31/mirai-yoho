"use client";

import { useAdminDashboard } from "@/hooks/use-admin-dashboard";

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading) return <div>Loading...</div>;

  const dashboard = data?.data;
  if (!dashboard) return <div>データの取得に失敗しました</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 24 }}>
        ダッシュボード
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            padding: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280" }}>予約数</div>
          <div style={{ fontSize: 32, fontWeight: "bold" }}>
            {dashboard.totalBookings}
          </div>
        </div>
        <div
          style={{
            padding: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280" }}>売上</div>
          <div style={{ fontSize: 32, fontWeight: "bold" }}>
            {dashboard.totalRevenue.toLocaleString()}円
          </div>
        </div>
        <div
          style={{
            padding: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280" }}>クライアント数</div>
          <div style={{ fontSize: 32, fontWeight: "bold" }}>
            {dashboard.totalClients}
          </div>
        </div>
        <div
          style={{
            padding: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280" }}>相談員数</div>
          <div style={{ fontSize: 32, fontWeight: "bold" }}>
            {dashboard.totalConsultants}
          </div>
        </div>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
        予約ステータス
      </h2>
      <div style={{ display: "flex", gap: 16 }}>
        <div>保留中: {dashboard.bookingsByStatus.pending}</div>
        <div>確定: {dashboard.bookingsByStatus.confirmed}</div>
        <div>完了: {dashboard.bookingsByStatus.completed}</div>
        <div>キャンセル: {dashboard.bookingsByStatus.cancelled}</div>
      </div>
    </div>
  );
}
