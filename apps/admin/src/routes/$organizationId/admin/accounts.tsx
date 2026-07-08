import { createFileRoute } from "@tanstack/react-router";
import AdminAccountsPage from "@/pages/admin/accounts/page";

export const Route = createFileRoute("/$organizationId/admin/accounts")({
  component: AdminAccountsPage,
});
