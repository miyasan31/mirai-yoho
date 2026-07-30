import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import SettlementStatementPage from "@/pages/settlement-statement/page";

export const Route = createFileRoute("/$organizationId/settlement-statement")({
  head: () => pageHead("精算書発行"),
  component: SettlementStatementPage,
});
