import type { FetchQueryOptions, QueryClient } from "@tanstack/react-query";

/**
 * hover / focus 時にクエリを prefetch する onMouseEnter / onFocus ハンドラを返す。
 * useCallback で参照安定にしたい場合は呼び出し側でメモ化する。
 */
export function prefetchOnHover<TData = unknown, TError = unknown>(
  queryClient: QueryClient,
  options: FetchQueryOptions<TData, TError>,
) {
  return () => {
    void queryClient.prefetchQuery(options);
  };
}
