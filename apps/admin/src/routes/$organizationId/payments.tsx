import { createFileRoute } from "@tanstack/react-router";
import AdminPaymentsPage from "@/pages/payments/page";

export const Route = createFileRoute("/$organizationId/payments")({
  component: AdminPaymentsPage,
});
