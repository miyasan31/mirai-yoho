import { useGetMyBookings } from "@mirai-yoho/api-client/api/customer/customer";
import type { MyBooking } from "@mirai-yoho/api-client/schemas";
import { useCustomerAuth } from "./use-customer-auth";

export interface VisitedOrganization {
  organizationId: string;
  organizationName: string | null;
  lastBookedAt: string;
}

function collectVisitedOrganizations(
  bookings: MyBooking[],
): VisitedOrganization[] {
  const byId = new Map<string, VisitedOrganization>();
  for (const booking of bookings) {
    const existing = byId.get(booking.organizationId);
    if (!existing || existing.lastBookedAt < booking.startsAt) {
      byId.set(booking.organizationId, {
        organizationId: booking.organizationId,
        organizationName: booking.organizationName ?? null,
        lastBookedAt: booking.startsAt,
      });
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.lastBookedAt < b.lastBookedAt ? 1 : -1,
  );
}

export function useVisitedOrganizations(): {
  organizations: VisitedOrganization[];
  isLoading: boolean;
} {
  const { isSignedUp } = useCustomerAuth();
  const { data, isLoading } = useGetMyBookings({
    query: { enabled: isSignedUp },
  });
  const organizations = collectVisitedOrganizations(data?.data?.bookings ?? []);
  return { organizations, isLoading };
}
