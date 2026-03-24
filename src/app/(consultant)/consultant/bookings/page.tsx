"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

interface BookingItem {
  bookingId: string;
  clientId: string;
  startDatetime: string;
  status: string;
  zoomUrl: string | null;
  consultantMemo: string;
  consultationContent: string | null;
}

export default function ConsultantBookingsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/consultant/bookings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setBookings(data.bookings ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        予約一覧
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
              Zoom
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              メモ
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
                {b.zoomUrl ? (
                  <a href={b.zoomUrl} target="_blank" rel="noopener noreferrer">
                    参加
                  </a>
                ) : (
                  "-"
                )}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {b.consultantMemo || "-"}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                <Link href={`/consultant/bookings/${b.bookingId}/memo`}>
                  メモ編集
                </Link>
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
