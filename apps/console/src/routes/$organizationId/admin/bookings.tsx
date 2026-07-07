import { createFileRoute } from "@tanstack/react-router";
import AdminBookingsPage from "@/pages/admin/bookings/page";

export const Route = createFileRoute("/$organizationId/admin/bookings")({
  component: AdminBookingsPage,
});
