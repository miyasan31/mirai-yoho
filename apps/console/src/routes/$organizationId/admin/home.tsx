import { createFileRoute } from "@tanstack/react-router";
import AdminHomePage from "@/pages/admin/home/page";

export const Route = createFileRoute("/$organizationId/admin/home")({
  component: AdminHomePage,
});
