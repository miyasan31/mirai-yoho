import { createFileRoute } from "@tanstack/react-router";
import AdminBookingsPage from "@/pages/bookings/page";

export const Route = createFileRoute("/$organizationId/bookings")({
  component: AdminBookingsPage,
});
