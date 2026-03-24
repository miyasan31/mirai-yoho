"use client";

import { useAdminBookings } from "@/hooks/use-admin-bookings";
import { useCapturePayment } from "@/hooks/use-booking";

export default function AdminBookingsPage() {
  const { data, isLoading } = useAdminBookings();
  const capturePayment = useCapturePayment();

  const bookings = data?.data?.bookings ?? [];

  const handleCapture = async (bookingId: string) => {
    try {
      await capturePayment.mutateAsync({
        bookingId,
        data: { method: "manual" },
      });
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? (err as { message: string }).message
          : "キャプチャに失敗しました";
      alert(message);
    }
  };

  if (isLoading) return <div>Loading...</div>;

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
                    disabled={
                      capturePayment.isPending &&
                      capturePayment.variables?.bookingId === b.bookingId
                    }
                    style={{
                      padding: "4px 8px",
                      background: "#16a34a",
                      color: "white",
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {capturePayment.isPending &&
                    capturePayment.variables?.bookingId === b.bookingId
                      ? "処理中..."
                      : "本決済"}
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
