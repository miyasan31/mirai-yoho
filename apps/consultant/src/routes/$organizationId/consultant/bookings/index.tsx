import { createFileRoute } from "@tanstack/react-router";
import ConsultantBookingsPage from "@/pages/consultant/bookings/page";

export const Route = createFileRoute("/$organizationId/consultant/bookings/")({
  component: ConsultantBookingsPage,
});
