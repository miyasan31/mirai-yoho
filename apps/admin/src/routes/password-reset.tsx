import { createFileRoute } from "@tanstack/react-router";
import AdminPasswordResetPage from "@/pages/password-reset/page";

export const Route = createFileRoute("/password-reset")({
  component: AdminPasswordResetPage,
});
