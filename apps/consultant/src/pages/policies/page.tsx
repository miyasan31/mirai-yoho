import { useGetLatestPublishedPolicy } from "@mirai-yoho/api-client/api/public/public";
import type { PolicyType } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { MarkdownView } from "@mirai-yoho/ui/components/markdown-view";
import { Tabs } from "@mirai-yoho/ui/components/ui";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { FileText } from "lucide-react";
import { useState } from "react";
import { styled } from "styled-system/jsx";

const TABS: Array<{ type: PolicyType; label: string }> = [
  { type: "terms", label: "利用規約" },
  { type: "cancellation_policy", label: "キャンセルポリシー" },
  { type: "privacy_policy", label: "プライバシーポリシー" },
];

export default function ConsultantPoliciesPage() {
  const { organizationId } = useOrganizationRouting();
  const [currentTab, setCurrentTab] = useState<PolicyType>("terms");

  if (!organizationId) {
    return (
      <EmptyState
        icon={FileText}
        message="組織が指定されていません"
        hint="URL の組織 ID をご確認ください。"
      />
    );
  }

  return (
    <styled.div display="flex" flexDirection="column" gap="6">
      <styled.div>
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          文書管理
        </Text>
        <Text textStyle="sm" color="fg.muted">
          この組織で現在有効な利用規約、キャンセルポリシー、プライバシーポリシーを閲覧できます。改版は
          console から行います。
        </Text>
      </styled.div>
      <Tabs.Root
        value={currentTab}
        onValueChange={({ value }) => setCurrentTab(value as PolicyType)}
        variant="line"
      >
        <Tabs.List mb="4">
          {TABS.map((tab) => (
            <Tabs.Trigger key={tab.type} value={tab.type}>
              {tab.label}
            </Tabs.Trigger>
          ))}
          <Tabs.Indicator />
        </Tabs.List>
        {TABS.map((tab) => (
          <Tabs.Content key={tab.type} value={tab.type}>
            <PolicyTabContent
              organizationId={organizationId}
              type={tab.type}
              headingLabel={tab.label}
            />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </styled.div>
  );
}

interface PolicyTabContentProps {
  organizationId: string;
  type: PolicyType;
  headingLabel: string;
}

function PolicyTabContent({
  organizationId,
  type,
  headingLabel,
}: PolicyTabContentProps) {
  const { data, isLoading, isError } = useGetLatestPublishedPolicy(
    organizationId,
    type,
  );
  const revision = data?.data?.revision ?? null;

  if (isLoading) {
    return (
      <Text textStyle="sm" color="fg.muted">
        読み込み中...
      </Text>
    );
  }
  if (isError || !revision) {
    return (
      <EmptyState
        icon={FileText}
        message={`${headingLabel}はまだ公開されていません`}
        hint="console の文書管理から初期版を公開してください。"
      />
    );
  }
  return (
    <styled.div display="flex" flexDirection="column" gap="4">
      <Text textStyle="xs" color="fg.muted">
        version: {revision.version}
        {revision.effectiveFrom &&
          ` / 効力発生日: ${new Date(revision.effectiveFrom).toLocaleDateString("ja-JP")}`}
      </Text>
      <styled.div
        border="1px solid"
        borderColor="border"
        rounded="l2"
        p="4"
        maxH="70vh"
        overflow="auto"
      >
        <MarkdownView body={revision.body} />
      </styled.div>
    </styled.div>
  );
}
