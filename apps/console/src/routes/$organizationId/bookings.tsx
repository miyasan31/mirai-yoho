import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleBookingsPage from "@/pages/bookings/page";

export const Route = createFileRoute("/$organizationId/bookings")({
  head: () => pageHead("予約管理"),
  component: ConsoleBookingsPage,
});
