"use client";

import { useEffect, useState } from "react";
import {
  useConsultantProfile,
  useUpdateConsultantProfile,
} from "@/hooks/use-consultant-profile";

export default function ConsultantProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { data, isLoading } = useConsultantProfile();
  const updateProfile = useUpdateConsultantProfile();

  useEffect(() => {
    if (data?.data) {
      setDisplayName(data.data.displayName ?? "");
      setBio(data.data.bio ?? "");
      setSpecialties((data.data.specialties ?? []).join(", "));
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    try {
      await updateProfile.mutateAsync({
        data: {
          displayName,
          bio,
          specialties: specialties
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>
        プロフィール編集
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
        {success && <p style={{ color: "green" }}>保存しました</p>}
        <button
          type="submit"
          disabled={updateProfile.isPending}
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
          {updateProfile.isPending ? "保存中..." : "保存"}
        </button>
      </form>
    </div>
  );
}
