import { createFileRoute } from "@tanstack/react-router";
import ConsolePaymentsPage from "@/pages/payments/page";

export const Route = createFileRoute("/$organizationId/payments")({
  component: ConsolePaymentsPage,
});
