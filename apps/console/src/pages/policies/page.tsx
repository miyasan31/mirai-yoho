import type { PolicyType } from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { invalidateAfter } from "@mirai-yoho/console-core/query/invalidation-map";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { Tabs } from "@mirai-yoho/ui/components/ui";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { styled } from "styled-system/jsx";
import { useAuth } from "@/hooks/use-auth";
import { useConsolePolicyRevisions } from "@/hooks/use-console-policies";
import { PolicyRevisionsPanel } from "./_components/policy-revisions-panel";

type PoliciesTab = PolicyType;

function isPoliciesTab(value: string | null): value is PoliciesTab {
  return (
    value === "terms" ||
    value === "cancellation_policy" ||
    value === "privacy_policy"
  );
}

const TAB_LABEL: Record<PoliciesTab, string> = {
  terms: "利用規約",
  cancellation_policy: "キャンセルポリシー",
  privacy_policy: "プライバシーポリシー",
};

export default function ConsolePoliciesPage() {
  const { organizationId } = useOrganizationRouting();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const tabQueryValue = typeof search.tab === "string" ? search.tab : null;
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasPermission("console.policies.manage");
  const canRead = hasPermission("console.policies.read");

  const [currentTab, setCurrentTab] = useState<PoliciesTab>("terms");
  useEffect(() => {
    setCurrentTab(isPoliciesTab(tabQueryValue) ? tabQueryValue : "terms");
  }, [tabQueryValue]);

  const changeTab = (tab: PoliciesTab) => {
    setCurrentTab(tab);
    void navigate({
      to: ".",
      search: (previous: Record<string, unknown>) => ({ ...previous, tab }),
      replace: true,
    });
  };

  const invalidate = useCallback(
    async (type: PolicyType) => {
      if (!organizationId) return;
      await invalidateAfter.policyRevisionMutation(
        queryClient,
        organizationId,
        type,
      );
    },
    [organizationId, queryClient],
  );

  if (!canRead) {
    return (
      <EmptyState
        icon={FileText}
        message="権限がありません"
        hint="このロールでは利用規約・キャンセルポリシーを閲覧できません。"
      />
    );
  }

  return (
    <styled.div display="flex" flexDirection="column" gap="6">
      <styled.div>
        <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
          利用規約・キャンセルポリシー
        </Text>
        <Text textStyle="sm" color="fg.muted">
          組織ごとの利用規約とキャンセルポリシーを版管理します。ドラフトの作成・編集・公開、前版との差分表示が可能です。
        </Text>
        {!canManage && (
          <Text textStyle="sm" color="fg.muted" mt="2">
            このロールでは閲覧のみ可能です。編集には `console.policies.manage`
            権限が必要です。
          </Text>
        )}
      </styled.div>
      <Tabs.Root
        value={currentTab}
        onValueChange={({ value }) => {
          if (isPoliciesTab(value)) changeTab(value);
        }}
        variant="line"
      >
        <Tabs.List mb="4">
          <Tabs.Trigger value="terms">{TAB_LABEL.terms}</Tabs.Trigger>
          <Tabs.Trigger value="cancellation_policy">
            {TAB_LABEL.cancellation_policy}
          </Tabs.Trigger>
          <Tabs.Trigger value="privacy_policy">
            {TAB_LABEL.privacy_policy}
          </Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Content value="terms">
          <PoliciesTabContent
            type="terms"
            canManage={canManage}
            onInvalidate={invalidate}
          />
        </Tabs.Content>
        <Tabs.Content value="cancellation_policy">
          <PoliciesTabContent
            type="cancellation_policy"
            canManage={canManage}
            onInvalidate={invalidate}
          />
        </Tabs.Content>
        <Tabs.Content value="privacy_policy">
          <PoliciesTabContent
            type="privacy_policy"
            canManage={canManage}
            onInvalidate={invalidate}
          />
        </Tabs.Content>
      </Tabs.Root>
    </styled.div>
  );
}

interface PoliciesTabContentProps {
  type: PolicyType;
  canManage: boolean;
  onInvalidate: (type: PolicyType) => Promise<void>;
}

function PoliciesTabContent({
  type,
  canManage,
  onInvalidate,
}: PoliciesTabContentProps) {
  const { data, isLoading } = useConsolePolicyRevisions(type);
  const revisions = useMemo(() => data?.data?.revisions ?? [], [data]);
  return (
    <PolicyRevisionsPanel
      type={type}
      revisions={revisions}
      isLoading={isLoading}
      canManage={canManage}
      onInvalidate={onInvalidate}
    />
  );
}
