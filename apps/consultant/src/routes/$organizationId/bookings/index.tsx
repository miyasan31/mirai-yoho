import { createFileRoute } from "@tanstack/react-router";
import ConsultantBookingsPage from "@/pages/bookings/page";

export const Route = createFileRoute("/$organizationId/bookings/")({
  component: ConsultantBookingsPage,
});
