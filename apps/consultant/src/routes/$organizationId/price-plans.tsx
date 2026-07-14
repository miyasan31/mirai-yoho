import { createFileRoute } from "@tanstack/react-router";
import PricePlansPage from "@/pages/price-plans/page";

export const Route = createFileRoute("/$organizationId/price-plans")({
  component: PricePlansPage,
});
