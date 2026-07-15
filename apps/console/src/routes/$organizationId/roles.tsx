import { createFileRoute } from "@tanstack/react-router";
import ConsoleRolesPage from "@/pages/roles/page";

export const Route = createFileRoute("/$organizationId/roles")({
  component: ConsoleRolesPage,
});
