import { createFileRoute } from "@tanstack/react-router";
import ConsultantPricePlansPage from "@/pages/price-plans/page";

export const Route = createFileRoute("/$organizationId/price-plans")({
  component: ConsultantPricePlansPage,
});
