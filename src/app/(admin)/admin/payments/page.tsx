"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

interface PaymentItem {
  paymentId: string;
  bookingId: string;
  clientId: string;
  amountJPY: number;
  taxAmountJPY: number;
  totalJPY: number;
  status: string;
  captureMethod: string | null;
}

export default function AdminPaymentsPage() {
  const { token } = useAuth();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/payments", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPayments(data.payments ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        決済管理
      </h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              予約ID
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              金額
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              税額
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              合計
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              ステータス
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              方式
            </th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.paymentId}>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {p.bookingId}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {p.amountJPY.toLocaleString()}円
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {p.taxAmountJPY.toLocaleString()}円
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {p.totalJPY.toLocaleString()}円
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {p.status}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {p.captureMethod ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {payments.length === 0 && (
        <p style={{ marginTop: 16 }}>決済はありません</p>
      )}
    </div>
  );
}
