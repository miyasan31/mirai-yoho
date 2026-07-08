import { createFileRoute } from "@tanstack/react-router";
import ConsultantMemoEditPage from "@/pages/consultant/memo/page";

export const Route = createFileRoute(
  "/$organizationId/consultant/bookings/$id/memo",
)({
  component: ConsultantMemoEditPage,
});
