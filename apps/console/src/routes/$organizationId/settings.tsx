import { createFileRoute } from "@tanstack/react-router";
import AdminSettingsPage from "@/pages/settings/page";

export const Route = createFileRoute("/$organizationId/settings")({
  component: AdminSettingsPage,
});
