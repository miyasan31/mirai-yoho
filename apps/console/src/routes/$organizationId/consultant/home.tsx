import { createFileRoute } from "@tanstack/react-router";
import ConsultantHomePage from "@/pages/consultant/home/page";

export const Route = createFileRoute("/$organizationId/consultant/home")({
  component: ConsultantHomePage,
});
