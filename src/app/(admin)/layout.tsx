"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, role, isLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (
      !isLoading &&
      (!user || (role !== "super_admin" && role !== "operator"))
    ) {
      router.push("/admin/login");
    }
  }, [user, role, isLoading, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user || (role !== "super_admin" && role !== "operator")) {
    return null;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          padding: 16,
          borderRight: "1px solid #e5e7eb",
          background: "#f9fafb",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
          管理メニュー
        </h2>
        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/admin/dashboard">ダッシュボード</Link>
          <Link href="/admin/bookings">予約管理</Link>
          <Link href="/admin/consultants">相談員管理</Link>
          <Link href="/admin/payments">決済管理</Link>
          <Link href="/admin/clients">クライアント管理</Link>
          {role === "super_admin" && (
            <Link href="/admin/users">ユーザー管理</Link>
          )}
          <Link href="/admin/settings">設定</Link>
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
