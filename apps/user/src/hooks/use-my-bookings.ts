import { useGetMyBookingsSuspense } from "@mirai-yoho/api-client/api/customer/customer";
import { cachePolicy } from "@mirai-yoho/console-core/query/cache-policy";

/**
 * my-bookings は user 全体（横断）で共有される予約一覧。
 * 予約作成/キャンセル時に invalidateAfter.bookingCreate/bookingCancel で無効化される前提。
 */
export function useSuspenseMyBookings() {
  return useGetMyBookingsSuspense({
    query: {
      staleTime: cachePolicy.normal.staleTime,
      gcTime: cachePolicy.normal.gcTime,
    },
  });
}
