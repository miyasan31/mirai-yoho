import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsultantBookingsPage from "@/pages/bookings/page";

export const Route = createFileRoute("/$organizationId/bookings/")({
  head: () => pageHead("予約一覧"),
  component: ConsultantBookingsPage,
});
