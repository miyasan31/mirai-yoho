import { createFileRoute } from "@tanstack/react-router";
import ConsultantHomePage from "@/pages/home/page";

export const Route = createFileRoute("/$organizationId/home")({
  component: ConsultantHomePage,
});
