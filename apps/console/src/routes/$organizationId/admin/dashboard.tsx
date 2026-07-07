import { createFileRoute } from "@tanstack/react-router";
import AdminDashboardPage from "@/pages/admin/dashboard/page";

export const Route = createFileRoute("/$organizationId/admin/dashboard")({
  component: AdminDashboardPage,
});
