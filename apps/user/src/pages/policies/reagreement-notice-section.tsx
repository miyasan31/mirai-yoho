import {
  getGetCustomerPolicyAgreementStatusQueryKey,
  useGetCustomerPolicyAgreementStatus,
  useRecordCustomerPolicyAgreement,
} from "@mirai-yoho/api-client/api/customer/customer";
import type {
  PolicyAgreementStatus,
  PolicyType,
} from "@mirai-yoho/api-client/schemas";
import { MarkdownView } from "@mirai-yoho/ui/components/markdown-view";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useState } from "react";
import { styled } from "styled-system/jsx";

interface ReagreementNoticeSectionProps {
  organizations: Array<{
    organizationId: string;
    organizationName?: string | null;
  }>;
}

/**
 * 訪問済み組織それぞれに対して同意状況をチェックし、
 * 未同意版があれば再同意ダイアログへ誘導する。
 */
export function ReagreementNoticeSection({
  organizations,
}: ReagreementNoticeSectionProps) {
  if (organizations.length === 0) return null;
  return (
    <styled.section display="flex" flexDir="column" gap="3">
      {organizations.map((org) => (
        <ReagreementRow
          key={org.organizationId}
          organizationId={org.organizationId}
          organizationName={org.organizationName ?? org.organizationId}
        />
      ))}
    </styled.section>
  );
}

interface ReagreementRowProps {
  organizationId: string;
  organizationName: string;
}

const TYPE_LABEL: Record<PolicyType, string> = {
  terms: "利用規約",
  cancellation_policy: "キャンセルポリシー",
  privacy_policy: "プライバシーポリシー",
};

function ReagreementRow({
  organizationId,
  organizationName,
}: ReagreementRowProps) {
  const { data } = useGetCustomerPolicyAgreementStatus(organizationId);
  const status = data?.data;
  const [openTarget, setOpenTarget] = useState<PolicyType | null>(null);

  if (!status || !status.needsReagreement) return null;

  const needsEntries = status.entries.filter(
    (entry) => entry.needsAgreement && entry.latestRevision,
  );

  return (
    <styled.div
      border="1px solid"
      borderColor="colorPalette.emphasized"
      colorPalette="orange"
      rounded="l3"
      p="4"
      bg="bg.subtle"
      display="flex"
      flexDir="column"
      gap="3"
    >
      <styled.div display="flex" alignItems="center" gap="2">
        <FileText size={18} color="var(--colors-fg-muted)" />
        <Text fontWeight="medium">
          {organizationName} のポリシーが更新されました
        </Text>
      </styled.div>
      <Text textStyle="sm" color="fg.muted">
        以下のポリシーの最新版に同意してください。
      </Text>
      <styled.div display="flex" flexDir="column" gap="2">
        {needsEntries.map((entry) => (
          <styled.div
            key={entry.type}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            gap="3"
            border="1px solid"
            borderColor="border"
            rounded="l2"
            p="3"
            bg="bg.canvas"
          >
            <styled.div>
              <Text textStyle="sm" fontWeight="medium">
                {TYPE_LABEL[entry.type]}
              </Text>
              <Text textStyle="xs" color="fg.muted">
                最新 version: {entry.latestRevision?.version}
              </Text>
            </styled.div>
            <Button size="sm" onClick={() => setOpenTarget(entry.type)}>
              内容を確認して同意
            </Button>
          </styled.div>
        ))}
      </styled.div>

      {needsEntries.map((entry) =>
        entry.latestRevision ? (
          <ReagreementDialog
            key={entry.type}
            open={openTarget === entry.type}
            onClose={() => setOpenTarget(null)}
            organizationId={organizationId}
            type={entry.type}
            revision={entry.latestRevision}
            status={status}
          />
        ) : null,
      )}
    </styled.div>
  );
}

interface ReagreementDialogProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  type: PolicyType;
  revision: NonNullable<
    PolicyAgreementStatus["entries"][number]["latestRevision"]
  >;
  status: PolicyAgreementStatus;
}

function ReagreementDialog({
  open,
  onClose,
  organizationId,
  type,
  revision,
  status,
}: ReagreementDialogProps) {
  const queryClient = useQueryClient();
  const mutation = useRecordCustomerPolicyAgreement();

  const handleAgree = async () => {
    try {
      await mutation.mutateAsync({
        organizationId,
        data: {
          agreedVia: "reagreement_modal",
          items: [{ type, revisionId: revision.revisionId }],
        },
      });
      toaster.success({ title: `${TYPE_LABEL[type]}に同意しました` });
      await queryClient.invalidateQueries({
        queryKey: getGetCustomerPolicyAgreementStatusQueryKey(organizationId),
      });
      onClose();
    } catch {
      // custom-fetch がエラー Toast を表示
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
      lazyMount
      unmountOnExit
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content asChild maxW={{ base: "95vw", lg: "3xl" }} w="full">
          <styled.div>
            <Dialog.Header>
              <Dialog.Title>
                {TYPE_LABEL[type]}（version {revision.version}）
              </Dialog.Title>
              <Dialog.Description>
                {status.entries.find((e) => e.type === type)
                  ?.latestAgreedVersion
                  ? `前回同意版: ${status.entries.find((e) => e.type === type)?.latestAgreedVersion}`
                  : "今回が初めての同意です。"}
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body
              maxH="60vh"
              overflow="auto"
              border="1px solid"
              borderColor="border"
              rounded="l2"
              p="4"
              m="4"
            >
              <MarkdownView body={revision.body} />
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant="outline" type="button">
                  あとで
                </Button>
              </Dialog.CloseTrigger>
              <Button
                loading={mutation.isPending}
                loadingText="同意中..."
                onClick={handleAgree}
              >
                同意する
              </Button>
            </Dialog.Footer>
          </styled.div>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
