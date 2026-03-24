"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

interface BookingItem {
  bookingId: string;
  clientId: string;
  consultantId: string;
  startDatetime: string;
  status: string;
  stripePaymentIntentId: string | null;
}

export default function AdminBookingsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState<string | null>(null);

  const fetchBookings = useCallback(() => {
    if (!token) return;
    fetch("/api/admin/bookings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setBookings(data.bookings ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleCapture = async (bookingId: string) => {
    setCapturing(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ method: "manual" }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message ?? "キャプチャに失敗しました");
      } else {
        fetchBookings();
      }
    } finally {
      setCapturing(null);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        予約管理
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
              日時
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
              クライアントID
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              相談員ID
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.bookingId}>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {new Date(b.startDatetime).toLocaleString("ja-JP")}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {b.status}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {b.clientId}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {b.consultantId}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {b.status === "confirmed" && (
                  <button
                    type="button"
                    onClick={() => handleCapture(b.bookingId)}
                    disabled={capturing === b.bookingId}
                    style={{
                      padding: "4px 8px",
                      background: "#16a34a",
                      color: "white",
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {capturing === b.bookingId ? "処理中..." : "本決済"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {bookings.length === 0 && (
        <p style={{ marginTop: 16 }}>予約はありません</p>
      )}
    </div>
  );
}
