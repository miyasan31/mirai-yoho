import { createFileRoute } from "@tanstack/react-router";
import AdminRolesPage from "@/pages/roles/page";

export const Route = createFileRoute("/$organizationId/roles")({
  component: AdminRolesPage,
});
