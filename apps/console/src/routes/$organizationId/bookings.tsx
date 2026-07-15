import { createFileRoute } from "@tanstack/react-router";
import ConsoleBookingsPage from "@/pages/bookings/page";

export const Route = createFileRoute("/$organizationId/bookings")({
  component: ConsoleBookingsPage,
});
