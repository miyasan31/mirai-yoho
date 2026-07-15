import { createFileRoute } from "@tanstack/react-router";
import ConsoleDashboardPage from "@/pages/dashboard/page";

export const Route = createFileRoute("/$organizationId/dashboard")({
  component: ConsoleDashboardPage,
});
