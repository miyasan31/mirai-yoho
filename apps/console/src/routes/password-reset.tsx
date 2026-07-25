import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsolePasswordResetPage from "@/pages/password-reset/page";

export const Route = createFileRoute("/password-reset")({
  head: () => pageHead("パスワード再設定"),
  component: ConsolePasswordResetPage,
});
