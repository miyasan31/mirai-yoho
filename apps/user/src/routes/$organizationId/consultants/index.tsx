import { getGetConsultantsQueryOptions } from "@mirai-yoho/api-client/api/consultant/consultant";
import { createFileRoute } from "@tanstack/react-router";
import { ConsultantsPage } from "@/components/consultants-page";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/$organizationId/consultants/")({
  head: () => pageHead("占い師一覧"),
  loader: ({ context: { queryClient }, params: { organizationId } }) =>
    queryClient.ensureQueryData(getGetConsultantsQueryOptions(organizationId)),
  component: ConsultantsPage,
});
