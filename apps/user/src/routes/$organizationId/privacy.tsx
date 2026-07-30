import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import { PolicyPage } from "@/pages/policies/policy-page";

export const Route = createFileRoute("/$organizationId/privacy")({
  head: () => pageHead("プライバシーポリシー"),
  component: PrivacyRoute,
});

function PrivacyRoute() {
  const { organizationId } = Route.useParams();
  return (
    <PolicyPage
      organizationId={organizationId}
      type="user_privacy_policy"
      headingLabel="プライバシーポリシー"
    />
  );
}
