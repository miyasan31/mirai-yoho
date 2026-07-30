import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import { PolicyPage } from "@/pages/policies/policy-page";

export const Route = createFileRoute("/$organizationId/terms")({
  head: () => pageHead("利用規約"),
  component: TermsRoute,
});

function TermsRoute() {
  const { organizationId } = Route.useParams();
  return (
    <PolicyPage
      organizationId={organizationId}
      type="user_terms"
      headingLabel="利用規約"
    />
  );
}
