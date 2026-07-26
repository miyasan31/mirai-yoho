import { getGetConsultantsQueryOptions } from "@mirai-yoho/api-client/api/consultant/consultant";
import { createFileRoute } from "@tanstack/react-router";
import {
  ConsultantsPage,
  ConsultantsPageError,
  ConsultantsPagePending,
} from "@/components/consultants-page";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/$organizationId/consultants/")({
  head: () => pageHead("占い師一覧"),
  loader: ({ context: { queryClient }, params: { organizationId } }) =>
    queryClient.ensureQueryData(getGetConsultantsQueryOptions(organizationId)),
  pendingComponent: ConsultantsPagePending,
  errorComponent: ConsultantsPageError,
  component: ConsultantsRoute,
});

function ConsultantsRoute() {
  const { organizationId } = Route.useParams();
  return <ConsultantsPage organizationId={organizationId} />;
}
