import { useGetLatestPublishedPolicy } from "@mirai-yoho/api-client/api/public/public";
import type { PolicyType } from "@mirai-yoho/api-client/schemas";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Link } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { styled } from "styled-system/jsx";

const POLICY_ENTRIES: Array<{ type: PolicyType; label: string }> = [
  { type: "terms", label: "利用規約" },
  { type: "cancellation_policy", label: "キャンセルポリシー" },
  { type: "privacy_policy", label: "プライバシーポリシー" },
];

interface PoliciesNoticeProps {
  organizationId: string;
}

/**
 * この組織で現在有効なポリシーの version をコンパクトに表示する。
 * version が変化すれば見た目で気付けるので、更新の周知を兼ねる。
 */
export function PoliciesNotice({ organizationId }: PoliciesNoticeProps) {
  return (
    <styled.section
      border="1px solid"
      borderColor="border"
      rounded="l2"
      p="4"
      mb="6"
      bg="bg.subtle"
    >
      <styled.div display="flex" alignItems="center" gap="2" mb="3">
        <FileText size={16} color="var(--colors-fg-muted)" />
        <Text textStyle="sm" fontWeight="medium">
          現在有効な組織ポリシー
        </Text>
        <styled.span ml="auto">
          <Link
            to="/$organizationId/policies"
            params={{ organizationId }}
            style={{ textDecoration: "underline", fontSize: "0.75rem" }}
          >
            詳細を見る
          </Link>
        </styled.span>
      </styled.div>
      <styled.div
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
        gap="3"
      >
        {POLICY_ENTRIES.map((entry) => (
          <PolicyEntryRow
            key={entry.type}
            organizationId={organizationId}
            type={entry.type}
            label={entry.label}
          />
        ))}
      </styled.div>
    </styled.section>
  );
}

interface PolicyEntryRowProps {
  organizationId: string;
  type: PolicyType;
  label: string;
}

function PolicyEntryRow({ organizationId, type, label }: PolicyEntryRowProps) {
  const { data, isLoading, isError } = useGetLatestPublishedPolicy(
    organizationId,
    type,
  );
  const revision = data?.data;

  return (
    <styled.div
      border="1px solid"
      borderColor="border"
      rounded="l1"
      p="2"
      bg="bg.canvas"
    >
      <Text textStyle="xs" color="fg.muted">
        {label}
      </Text>
      {isLoading ? (
        <Text textStyle="sm">…</Text>
      ) : isError || !revision ? (
        <Text textStyle="sm" color="fg.muted">
          未公開
        </Text>
      ) : (
        <Text textStyle="sm" fontFamily="mono">
          {revision.version}
        </Text>
      )}
    </styled.div>
  );
}
