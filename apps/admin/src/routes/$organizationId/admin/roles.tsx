import { createFileRoute } from "@tanstack/react-router";
import AdminRolesPage from "@/pages/admin/roles/page";

export const Route = createFileRoute("/$organizationId/admin/roles")({
  component: AdminRolesPage,
});
