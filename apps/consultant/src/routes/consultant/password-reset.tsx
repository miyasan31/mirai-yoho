import { createFileRoute } from "@tanstack/react-router";
import ConsultantPasswordResetPage from "@/pages/consultant/password-reset/page";

export const Route = createFileRoute("/consultant/password-reset")({
  component: ConsultantPasswordResetPage,
});
