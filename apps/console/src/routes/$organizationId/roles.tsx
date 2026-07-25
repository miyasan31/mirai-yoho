import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleRolesPage from "@/pages/roles/page";

export const Route = createFileRoute("/$organizationId/roles")({
  head: () => pageHead("権限管理"),
  component: ConsoleRolesPage,
});
