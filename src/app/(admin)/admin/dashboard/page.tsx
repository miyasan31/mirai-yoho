"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

interface DashboardData {
  totalBookings: number;
  totalPayments: number;
  totalClients: number;
  totalConsultants: number;
  totalRevenue: number;
  bookingsByStatus: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
}

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>データの取得に失敗しました</div>;

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
            {data.totalBookings}
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
            {data.totalRevenue.toLocaleString()}円
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
            {data.totalClients}
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
            {data.totalConsultants}
          </div>
        </div>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12 }}>
        予約ステータス
      </h2>
      <div style={{ display: "flex", gap: 16 }}>
        <div>保留中: {data.bookingsByStatus.pending}</div>
        <div>確定: {data.bookingsByStatus.confirmed}</div>
        <div>完了: {data.bookingsByStatus.completed}</div>
        <div>キャンセル: {data.bookingsByStatus.cancelled}</div>
      </div>
    </div>
  );
}
