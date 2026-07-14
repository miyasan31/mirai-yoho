import { createFileRoute } from "@tanstack/react-router";
import AdminAccountsPage from "@/pages/accounts/page";

export const Route = createFileRoute("/$organizationId/accounts")({
  component: AdminAccountsPage,
});
