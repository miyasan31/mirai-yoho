import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import PricePlansPage from "@/pages/price-plans/page";

export const Route = createFileRoute("/$organizationId/price-plans")({
  head: () => pageHead("料金プラン"),
  component: PricePlansPage,
});
