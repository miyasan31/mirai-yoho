import { createFileRoute } from "@tanstack/react-router";
import ConsoleCustomersPage from "@/pages/customers/page";

export const Route = createFileRoute("/$organizationId/customers")({
  component: ConsoleCustomersPage,
});
