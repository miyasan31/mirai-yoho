"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

interface ConsultantItem {
  consultantId: string;
  displayName: string;
  bio: string;
  specialties: string[];
  isActive: boolean;
}

export default function AdminConsultantsPage() {
  const { token } = useAuth();
  const [consultants, setConsultants] = useState<ConsultantItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/consultants", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setConsultants(data.consultants ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: "bold" }}>相談員管理</h1>
        <Link
          href="/admin/consultants/new"
          style={{
            padding: "8px 16px",
            background: "#2563eb",
            color: "white",
            borderRadius: 4,
            textDecoration: "none",
          }}
        >
          新規追加
        </Link>
      </div>
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
              名前
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              専門分野
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
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {consultants.map((c) => (
            <tr key={c.consultantId}>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {c.displayName}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {c.specialties.join(", ")}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {c.isActive ? "有効" : "無効"}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                <Link href={`/admin/consultants/${c.consultantId}`}>編集</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {consultants.length === 0 && (
        <p style={{ marginTop: 16 }}>相談員はいません</p>
      )}
    </div>
  );
}
