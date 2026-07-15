import { createFileRoute } from "@tanstack/react-router";
import ConsoleHomePage from "@/pages/home/page";

export const Route = createFileRoute("/$organizationId/home")({
  component: ConsoleHomePage,
});
