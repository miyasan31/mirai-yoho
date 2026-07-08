import { createFileRoute } from "@tanstack/react-router";
import AdminPasswordResetPage from "@/pages/admin/password-reset/page";

export const Route = createFileRoute("/admin/password-reset")({
  component: AdminPasswordResetPage,
});
