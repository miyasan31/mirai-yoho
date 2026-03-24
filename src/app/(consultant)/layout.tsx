"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function ConsultantLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, role, isLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || role !== "consultant")) {
      router.push("/consultant/login");
    }
  }, [user, role, isLoading, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user || role !== "consultant") {
    return null;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{ width: 240, padding: 16, borderRight: "1px solid #e5e7eb" }}
      >
        <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
          相談員メニュー
        </h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/consultant/bookings">予約一覧</Link>
          <Link href="/consultant/profile">プロフィール</Link>
        </nav>
        <button
          type="button"
          onClick={() => signOut()}
          style={{ marginTop: 32 }}
        >
          ログアウト
        </button>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
