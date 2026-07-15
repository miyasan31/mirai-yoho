import { createFileRoute } from "@tanstack/react-router";
import ConsoleLoginPage from "@/pages/login/page";

export const Route = createFileRoute("/login")({
  component: ConsoleLoginPage,
});
