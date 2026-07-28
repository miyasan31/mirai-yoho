import { isOrganizationSegment } from "@/hooks/use-organization-routing";

const STORAGE_KEY = "mirai-yoho:pending-organization-id";
// 直近に訪問した組織をどれくらいの期間有効なリダイレクト先とみなすか
const TTL_MS = 1000 * 60 * 60 * 24 * 30;

interface StoredEntry {
  organizationId: string;
  updatedAt: number;
}

function safeGetStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function savePendingOrganizationId(organizationId: string): void {
  const storage = safeGetStorage();
  if (!storage) return;
  const entry: StoredEntry = {
    organizationId,
    updatedAt: Date.now(),
  };
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {}
}

export function readPendingOrganizationId(): string | null {
  const storage = safeGetStorage();
  if (!storage) return null;
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as StoredEntry;
    if (
      typeof entry.organizationId !== "string" ||
      typeof entry.updatedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - entry.updatedAt > TTL_MS) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
    // 過去に /mypage などの静的ルート名を組織 ID として保存していた不正な値を捨てる
    if (!isOrganizationSegment(entry.organizationId)) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
    return entry.organizationId;
  } catch {
    return null;
  }
}

export function clearPendingOrganizationId(): void {
  const storage = safeGetStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {}
}
