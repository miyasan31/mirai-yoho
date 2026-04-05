import { redirect } from "next/navigation";

export default async function OrganizationHome({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  redirect(`/${organizationId}/consultants`);
}
