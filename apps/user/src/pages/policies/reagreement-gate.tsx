import { useGetCustomerPolicyAgreementStatus } from "@mirai-yoho/api-client/api/customer/customer";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import type { ReactNode } from "react";
import { styled } from "styled-system/jsx";
import { SingleOrgReagreementCard } from "./reagreement-notice-section";

interface ReagreementGateProps {
  organizationId: string;
  organizationName?: string;
  children: ReactNode;
}

/**
 * この組織で未同意版があるうちは children を表示せず、再同意 UI を全面表示する。
 * 予約フォームなど「操作前に必ず最新規約を承認させたい」箇所で使う。
 * 再同意されると（tanstack query の invalidate で needsReagreement が false になる）
 * children が表示されるようになる。
 */
export function ReagreementGate({
  organizationId,
  organizationName,
  children,
}: ReagreementGateProps) {
  const { data, isLoading } =
    useGetCustomerPolicyAgreementStatus(organizationId);
  const status = data?.data;

  if (isLoading) {
    return (
      <styled.div maxW="lg" mx="auto" p="8">
        <Skeleton height="120px" rounded="l2" />
      </styled.div>
    );
  }

  if (!status || !status.needsReagreement) {
    return <>{children}</>;
  }

  return (
    <styled.div maxW="lg" mx="auto" p="8">
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
        利用規約の再同意が必要です
      </Text>
      <Text textStyle="sm" color="fg.muted" mb="6">
        {organizationName ?? organizationId}{" "}
        の利用規約またはキャンセルポリシーが更新されています。予約を進めるには最新版の内容を確認して同意してください。
      </Text>
      <SingleOrgReagreementCard
        organizationId={organizationId}
        organizationName={organizationName ?? organizationId}
      />
    </styled.div>
  );
}
