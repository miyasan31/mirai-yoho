import type { QueryClient, QueryKey } from "@tanstack/react-query";

export interface OptimisticSnapshot<TData> {
  previous: TData | undefined;
}

/**
 * Cancel in-flight refetches, snapshot the cache, apply the updater.
 * Pair with rollbackOptimistic in a catch block to restore on failure.
 * The caller should always run the reconciling invalidateQueries in a finally block.
 */
export async function applyOptimistic<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (previous: TData) => TData,
): Promise<OptimisticSnapshot<TData>> {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<TData>(queryKey);
  if (previous !== undefined) {
    queryClient.setQueryData<TData>(queryKey, updater(previous));
  }
  return { previous };
}

export function rollbackOptimistic<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  snapshot: OptimisticSnapshot<TData> | undefined,
): void {
  if (snapshot && snapshot.previous !== undefined) {
    queryClient.setQueryData<TData>(queryKey, snapshot.previous);
  }
}
