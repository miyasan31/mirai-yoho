import { createFileRoute } from "@tanstack/react-router";
import ConsolePasswordResetPage from "@/pages/password-reset/page";

export const Route = createFileRoute("/password-reset")({
  component: ConsolePasswordResetPage,
});
