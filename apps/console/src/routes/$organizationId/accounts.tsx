import { createFileRoute } from "@tanstack/react-router";
import ConsoleAccountsPage from "@/pages/accounts/page";

export const Route = createFileRoute("/$organizationId/accounts")({
  component: ConsoleAccountsPage,
});
