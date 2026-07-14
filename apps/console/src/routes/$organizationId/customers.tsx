import { createFileRoute } from "@tanstack/react-router";
import AdminCustomersPage from "@/pages/customers/page";

export const Route = createFileRoute("/$organizationId/customers")({
  component: AdminCustomersPage,
});
