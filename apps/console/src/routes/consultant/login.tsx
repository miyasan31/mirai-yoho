import { createFileRoute } from "@tanstack/react-router";
import ConsultantLoginPage from "@/pages/consultant/login/page";

export const Route = createFileRoute("/consultant/login")({
  component: ConsultantLoginPage,
});
