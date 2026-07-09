import { createFileRoute } from "@tanstack/react-router";
import AdminDashboardPage from "@/pages/dashboard/page";

export const Route = createFileRoute("/$organizationId/dashboard")({
  component: AdminDashboardPage,
});
