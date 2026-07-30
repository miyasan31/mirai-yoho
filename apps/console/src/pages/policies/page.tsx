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

type PolicyAudience = "user" | "consultant";

const AUDIENCE_GROUPS: Array<{
  audience: PolicyAudience;
  label: string;
  types: Array<{ type: PolicyType; label: string }>;
}> = [
  {
    audience: "user",
    label: "ユーザー向け",
    types: [
      { type: "user_terms", label: "利用規約" },
      { type: "user_cancellation_policy", label: "キャンセルポリシー" },
      { type: "user_privacy_policy", label: "プライバシーポリシー" },
    ],
  },
  {
    audience: "consultant",
    label: "占い師向け",
    types: [
      { type: "consultant_terms", label: "利用規約" },
      { type: "consultant_privacy_policy", label: "プライバシーポリシー" },
    ],
  },
];

const DEFAULT_TYPE: PolicyType = "user_terms";

const ALL_TYPES: readonly PolicyType[] = AUDIENCE_GROUPS.flatMap((group) =>
  group.types.map((entry) => entry.type),
);

function isPolicyType(value: string | null): value is PolicyType {
  return value !== null && ALL_TYPES.includes(value as PolicyType);
}

function audienceOf(type: PolicyType): PolicyAudience {
  return type.startsWith("consultant_") ? "consultant" : "user";
}

function defaultTypeOf(audience: PolicyAudience): PolicyType {
  const group = AUDIENCE_GROUPS.find((g) => g.audience === audience);
  return group ? group.types[0].type : DEFAULT_TYPE;
}

export default function ConsolePoliciesPage() {
  const { organizationId } = useOrganizationRouting();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const tabQueryValue = typeof search.tab === "string" ? search.tab : null;
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasPermission("console.policies.manage");
  const canRead = hasPermission("console.policies.read");

  // 種別（tab search param）を単一の真実とし、読者区分はそこから導出する
  const [currentType, setCurrentType] = useState<PolicyType>(DEFAULT_TYPE);
  useEffect(() => {
    setCurrentType(isPolicyType(tabQueryValue) ? tabQueryValue : DEFAULT_TYPE);
  }, [tabQueryValue]);

  const currentAudience = audienceOf(currentType);

  const changeType = (tab: PolicyType) => {
    setCurrentType(tab);
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
        hint="このロールでは文書管理を閲覧できません。"
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
          組織ごとの規約類を、ユーザー向け・占い師向けに分けて版管理します。ドラフトの作成・編集・公開、前版との差分表示が可能です。
        </Text>
        {!canManage && (
          <Text textStyle="sm" color="fg.muted" mt="2">
            このロールでは閲覧のみ可能です。編集には `console.policies.manage`
            権限が必要です。
          </Text>
        )}
      </styled.div>

      <Tabs.Root
        value={currentAudience}
        onValueChange={({ value }) => {
          const audience = value as PolicyAudience;
          if (audience === currentAudience) return;
          changeType(defaultTypeOf(audience));
        }}
        variant="enclosed"
      >
        <Tabs.List mb="4">
          {AUDIENCE_GROUPS.map((group) => (
            <Tabs.Trigger key={group.audience} value={group.audience}>
              {group.label}
            </Tabs.Trigger>
          ))}
          <Tabs.Indicator />
        </Tabs.List>
        {AUDIENCE_GROUPS.map((group) => (
          <Tabs.Content key={group.audience} value={group.audience}>
            <Tabs.Root
              value={currentType}
              onValueChange={({ value }) => {
                if (isPolicyType(value)) changeType(value);
              }}
              variant="line"
            >
              <Tabs.List mb="4">
                {group.types.map((entry) => (
                  <Tabs.Trigger key={entry.type} value={entry.type}>
                    {entry.label}
                  </Tabs.Trigger>
                ))}
                <Tabs.Indicator />
              </Tabs.List>
              {group.types.map((entry) => (
                <Tabs.Content key={entry.type} value={entry.type}>
                  <PoliciesTabContent
                    type={entry.type}
                    canManage={canManage}
                    onInvalidate={invalidate}
                  />
                </Tabs.Content>
              ))}
            </Tabs.Root>
          </Tabs.Content>
        ))}
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
