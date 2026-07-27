import { useGetLatestPublishedPolicy } from "@mirai-yoho/api-client/api/public/public";
import type { PolicyType } from "@mirai-yoho/api-client/schemas";
import { MarkdownView } from "@mirai-yoho/ui/components/markdown-view";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { styled } from "styled-system/jsx";

interface PolicyPageProps {
  organizationId: string;
  type: PolicyType;
  headingLabel: string;
}

/**
 * 公開ポリシーページ（組織 × 種別）。
 * 現在有効な最新公開版を API から取得し MarkdownView でレンダリングする。
 */
export function PolicyPage({
  organizationId,
  type,
  headingLabel,
}: PolicyPageProps) {
  const { data, isLoading, isError, error } = useGetLatestPublishedPolicy(
    organizationId,
    type,
  );

  const revision = data?.data;

  return (
    <styled.article maxW="3xl" mx="auto" px="6" py="10">
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="2">
        {revision?.title ?? headingLabel}
      </Text>
      {revision && (
        <Text textStyle="xs" color="fg.muted" mb="6">
          version: {revision.version}
          {revision.effectiveFrom &&
            ` / 効力発生日: ${new Date(revision.effectiveFrom).toLocaleDateString("ja-JP")}`}
        </Text>
      )}

      {isLoading && (
        <Text textStyle="sm" color="fg.muted">
          読み込み中...
        </Text>
      )}
      {isError && (
        <Text textStyle="sm" color="fg.error">
          読み込みに失敗しました。しばらくしてから再度お試しください。
          {error instanceof Error ? `（${error.message}）` : null}
        </Text>
      )}
      {revision && <MarkdownView body={revision.body} />}
    </styled.article>
  );
}
