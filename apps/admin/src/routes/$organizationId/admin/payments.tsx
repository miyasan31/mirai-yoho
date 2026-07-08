import { createFileRoute } from "@tanstack/react-router";
import AdminPaymentsPage from "@/pages/admin/payments/page";

export const Route = createFileRoute("/$organizationId/admin/payments")({
  component: AdminPaymentsPage,
});
