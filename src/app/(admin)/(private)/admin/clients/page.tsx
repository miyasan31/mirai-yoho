"use client";

import { useAdminClients } from "@/hooks/use-admin-clients";

export default function AdminClientsPage() {
  const { data, isLoading } = useAdminClients();

  const clients = data?.data?.clients ?? [];

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        クライアント管理
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
              名前
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              メール
            </th>
            <th
              style={{
                textAlign: "left",
                padding: 8,
                borderBottom: "2px solid #e5e7eb",
              }}
            >
              電話
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
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.clientId}>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {c.name}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {c.email}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {c.phone}
              </td>
              <td style={{ padding: 8, borderBottom: "1px solid #e5e7eb" }}>
                {c.memo ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {clients.length === 0 && (
        <p style={{ marginTop: 16 }}>クライアントはいません</p>
      )}
    </div>
  );
}
