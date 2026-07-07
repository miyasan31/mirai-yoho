import { createFileRoute } from "@tanstack/react-router";
import AdminSettingsPage from "@/pages/admin/settings/page";

export const Route = createFileRoute("/$organizationId/admin/settings")({
  component: AdminSettingsPage,
});
