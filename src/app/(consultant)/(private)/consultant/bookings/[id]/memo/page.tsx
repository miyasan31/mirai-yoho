"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  useConsultantBookings,
  useUpdateConsultantMemo,
} from "@/hooks/use-consultant-bookings";

export default function ConsultantMemoEditPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useConsultantBookings();
  const updateMemo = useUpdateConsultantMemo();

  useEffect(() => {
    const bookings = data?.data?.bookings ?? [];
    const booking = bookings.find((b) => b.bookingId === bookingId);
    if (booking) {
      setMemo(booking.consultantMemo ?? "");
    }
  }, [data, bookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await updateMemo.mutateAsync({
        bookingId,
        data: { memo },
      });
      router.push("/consultant/bookings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        メモ編集
      </h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label htmlFor="memo">相談員メモ</label>
          <textarea
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={6}
            style={{
              display: "block",
              width: "100%",
              padding: 8,
              border: "1px solid #d1d5db",
              borderRadius: 4,
            }}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            disabled={updateMemo.isPending}
            style={{
              padding: "8px 16px",
              background: "#2563eb",
              color: "white",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
            }}
          >
            {updateMemo.isPending ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/consultant/bookings")}
            style={{
              padding: "8px 16px",
              background: "#e5e7eb",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
            }}
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
