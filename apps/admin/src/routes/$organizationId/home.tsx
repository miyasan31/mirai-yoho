import { createFileRoute } from "@tanstack/react-router";
import AdminHomePage from "@/pages/home/page";

export const Route = createFileRoute("/$organizationId/home")({
  component: AdminHomePage,
});
