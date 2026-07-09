import { createFileRoute } from "@tanstack/react-router";
import ConsultantLoginPage from "@/pages/login/page";

export const Route = createFileRoute("/login")({
  component: ConsultantLoginPage,
});
