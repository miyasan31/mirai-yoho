import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import { PolicyPage } from "@/pages/policies/policy-page";

export const Route = createFileRoute("/$organizationId/cancellation-policy")({
  head: () => pageHead("キャンセルポリシー"),
  component: CancellationPolicyRoute,
});

function CancellationPolicyRoute() {
  const { organizationId } = Route.useParams();
  return (
    <PolicyPage
      organizationId={organizationId}
      type="user_cancellation_policy"
      headingLabel="キャンセルポリシー"
    />
  );
}
