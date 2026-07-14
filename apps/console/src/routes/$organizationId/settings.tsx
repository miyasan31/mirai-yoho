import { createFileRoute } from "@tanstack/react-router";
import ConsoleSettingsPage from "@/pages/settings/page";

export const Route = createFileRoute("/$organizationId/settings")({
  component: ConsoleSettingsPage,
});
