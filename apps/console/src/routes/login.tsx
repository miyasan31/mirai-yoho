import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleLoginPage from "@/pages/login/page";

export const Route = createFileRoute("/login")({
  head: () => pageHead("ログイン"),
  component: ConsoleLoginPage,
});
