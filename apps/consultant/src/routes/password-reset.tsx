import { createFileRoute } from "@tanstack/react-router";
import ConsultantPasswordResetPage from "@/pages/password-reset/page";

export const Route = createFileRoute("/password-reset")({
  component: ConsultantPasswordResetPage,
});
