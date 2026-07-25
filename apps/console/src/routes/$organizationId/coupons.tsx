import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleCouponsPage from "@/pages/coupons/page";

export const Route = createFileRoute("/$organizationId/coupons")({
  head: () => pageHead("クーポン管理"),
  component: ConsoleCouponsPage,
});
