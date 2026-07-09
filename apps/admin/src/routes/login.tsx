import { createFileRoute } from "@tanstack/react-router";
import AdminLoginPage from "@/pages/login/page";

export const Route = createFileRoute("/login")({
  component: AdminLoginPage,
});
