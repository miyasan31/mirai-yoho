"use client";

import { useState } from "react";
import type { UpdateUserRoleBodyRole } from "@/generated/schemas";
import { useUpdateUserRole } from "@/hooks/use-admin-users";
import { useAuth } from "@/hooks/use-auth";

export default function AdminUsersPage() {
  const { role } = useAuth();
  const [uid, setUid] = useState("");
  const [selectedRole, setSelectedRole] =
    useState<UpdateUserRoleBodyRole>("consultant");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const updateUserRole = useUpdateUserRole();

  if (role !== "super_admin") {
    return <div>権限がありません</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      await updateUserRole.mutateAsync({
        uid,
        data: { role: selectedRole },
      });
      setMessage(`ユーザー ${uid} のロールを ${selectedRole} に設定しました`);
      setUid("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ロール更新に失敗しました");
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        ユーザー管理
      </h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label htmlFor="uid">ユーザーUID</label>
          <input
            id="uid"
            type="text"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            required
            style={{
              display: "block",
              width: "100%",
              padding: 8,
              border: "1px solid #d1d5db",
              borderRadius: 4,
            }}
          />
        </div>
        <div>
          <label htmlFor="role">ロール</label>
          <select
            id="role"
            value={selectedRole}
            onChange={(e) =>
              setSelectedRole(e.target.value as UpdateUserRoleBodyRole)
            }
            style={{
              display: "block",
              width: "100%",
              padding: 8,
              border: "1px solid #d1d5db",
              borderRadius: 4,
            }}
          >
            <option value="consultant">consultant</option>
            <option value="operator">operator</option>
            <option value="super_admin">super_admin</option>
          </select>
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        {message && <p style={{ color: "green" }}>{message}</p>}
        <button
          type="submit"
          style={{
            padding: "8px 16px",
            background: "#2563eb",
            color: "white",
            borderRadius: 4,
            border: "none",
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          ロール設定
        </button>
      </form>
    </div>
  );
}
