import type { LinkProps } from "@tanstack/react-router";

/**
 * 実行時に組み立てたパス文字列（例: `/${organizationId}/admin/home`）を
 * TanStack Router の `<Link to>` / `navigate({ to })` に渡すための型。
 * ルーターは解決済みのパス文字列も実行時に受け付けるが、型は登録済み
 * ルートのリテラルに制限されているため、この型へ assertion して橋渡しする。
 */
export type AppPath = NonNullable<LinkProps["to"]>;

export function toAppPath(path: string): AppPath {
  return path as AppPath;
}
