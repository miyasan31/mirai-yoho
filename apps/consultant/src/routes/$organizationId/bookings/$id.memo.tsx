import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsultantMemoEditPage from "@/pages/memo/page";

export const Route = createFileRoute("/$organizationId/bookings/$id/memo")({
  head: () => pageHead("鑑定メモ"),
  component: ConsultantMemoEditPage,
});
