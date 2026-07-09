import { createFileRoute } from "@tanstack/react-router";
import ConsultantMemoEditPage from "@/pages/memo/page";

export const Route = createFileRoute("/$organizationId/bookings/$id/memo")({
  component: ConsultantMemoEditPage,
});
