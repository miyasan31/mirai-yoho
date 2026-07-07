import { createFileRoute } from "@tanstack/react-router";
import ConsultantPricePlansPage from "@/pages/consultant/price-plans/page";

export const Route = createFileRoute("/$organizationId/consultant/price-plans")(
  {
    component: ConsultantPricePlansPage,
  },
);
