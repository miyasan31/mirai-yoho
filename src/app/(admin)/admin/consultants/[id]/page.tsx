"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  useAdminConsultants,
  useDeleteAdminConsultant,
  useUpdateAdminConsultant,
} from "@/hooks/use-admin-consultants";

export default function AdminConsultantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const consultantId = params.id as string;
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [error, setError] = useState("");

  const { data, isLoading } = useAdminConsultants();
  const updateConsultant = useUpdateAdminConsultant();
  const deleteConsultant = useDeleteAdminConsultant();

  useEffect(() => {
    const consultants = data?.data?.consultants ?? [];
    const c = consultants.find(
      (c: { consultantId: string }) => c.consultantId === consultantId,
    );
    if (c) {
      setDisplayName(c.displayName ?? "");
      setBio(c.bio ?? "");
      setSpecialties((c.specialties ?? []).join(", "));
    }
  }, [data, consultantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await updateConsultant.mutateAsync({
        id: consultantId,
        data: {
          displayName,
          bio,
          specialties: specialties
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      router.push("/admin/consultants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  const handleDeactivate = async () => {
    if (!confirm("この相談員を無効にしますか？")) return;
    try {
      await deleteConsultant.mutateAsync({ id: consultantId });
      router.push("/admin/consultants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "無効化に失敗しました");
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        相談員編集
      </h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div>
          <label htmlFor="displayName">表示名</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
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
          <label htmlFor="bio">自己紹介</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
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
          <label htmlFor="specialties">専門分野（カンマ区切り）</label>
          <input
            id="specialties"
            type="text"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
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
            disabled={updateConsultant.isPending}
            style={{
              padding: "8px 16px",
              background: "#2563eb",
              color: "white",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
            }}
          >
            {updateConsultant.isPending ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            onClick={handleDeactivate}
            style={{
              padding: "8px 16px",
              background: "#ef4444",
              color: "white",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
            }}
          >
            無効化
          </button>
        </div>
      </form>
    </div>
  );
}
