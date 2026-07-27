import type {
  PolicyRevision,
  PolicyType,
} from "@mirai-yoho/api-client/schemas";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { TableSkeleton } from "@mirai-yoho/ui/components/table-skeleton";
import { Badge } from "@mirai-yoho/ui/components/ui/badge";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Table from "@mirai-yoho/ui/components/ui/table";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { FileText, GitCompareArrows, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { styled } from "styled-system/jsx";
import {
  useCreatePolicyRevisionDraft,
  usePublishPolicyRevision,
  useUpdatePolicyRevisionDraft,
} from "@/hooks/use-console-policies";
import { PolicyDiffDialog } from "./policy-diff-dialog";
import { PolicyPublishDialog } from "./policy-publish-dialog";
import { PolicyRevisionEditorDialog } from "./policy-revision-editor-dialog";

interface PolicyRevisionsPanelProps {
  type: PolicyType;
  revisions: PolicyRevision[];
  isLoading: boolean;
  canManage: boolean;
  onInvalidate: (type: PolicyType) => Promise<void>;
}

const STATUS_LABEL: Record<PolicyRevision["status"], string> = {
  draft: "ドラフト",
  published: "公開中",
  archived: "アーカイブ",
};

const STATUS_COLOR: Record<
  PolicyRevision["status"],
  "gray" | "green" | "purple"
> = {
  draft: "gray",
  published: "green",
  archived: "purple",
};

const DEFAULT_TITLE: Record<PolicyType, string> = {
  terms: "利用規約",
  cancellation_policy: "キャンセルポリシー",
  privacy_policy: "プライバシーポリシー",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PolicyRevisionsPanel({
  type,
  revisions,
  isLoading,
  canManage,
  onInvalidate,
}: PolicyRevisionsPanelProps) {
  const { organizationId } = useOrganizationRouting();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<PolicyRevision | null>(null);
  const [publishing, setPublishing] = useState<PolicyRevision | null>(null);
  const [diffTarget, setDiffTarget] = useState<PolicyRevision | null>(null);

  const createMutation = useCreatePolicyRevisionDraft();
  const updateMutation = useUpdatePolicyRevisionDraft();
  const publishMutation = usePublishPolicyRevision();

  const latestPublished = useMemo(
    () =>
      revisions.find((r) => r.status === "published") ??
      revisions.find((r) => r.status === "archived") ??
      null,
    [revisions],
  );

  const createSeedBody = useMemo(() => {
    return latestPublished?.body ?? "";
  }, [latestPublished]);

  const handleCreate = async (values: {
    version: string;
    title: string;
    body: string;
  }) => {
    if (!organizationId) return;
    try {
      await createMutation.mutateAsync({
        organizationId,
        type,
        data: values,
      });
      toaster.success({ title: "ドラフトを作成しました" });
      setCreateOpen(false);
      await onInvalidate(type);
    } catch {
      // custom-fetch がエラー Toast を表示
    }
  };

  const handleUpdate = async (
    revision: PolicyRevision,
    values: { version?: string; title?: string; body?: string },
  ) => {
    try {
      await updateMutation.mutateAsync({
        organizationId: revision.organizationId,
        type,
        revisionId: revision.revisionId,
        data: values,
      });
      toaster.success({ title: "ドラフトを更新しました" });
      setEditing(null);
      await onInvalidate(type);
    } catch {
      // handled globally
    }
  };

  const handlePublish = async (
    revision: PolicyRevision,
    effectiveFrom: Date,
  ) => {
    try {
      await publishMutation.mutateAsync({
        organizationId: revision.organizationId,
        type,
        revisionId: revision.revisionId,
        data: { effectiveFrom: effectiveFrom.toISOString() },
      });
      toaster.success({ title: "改版を公開しました" });
      setPublishing(null);
      await onInvalidate(type);
    } catch {
      // handled globally
    }
  };

  if (isLoading) {
    return <TableSkeleton columns={5} rows={4} />;
  }

  const hasRevisions = revisions.length > 0;

  return (
    <styled.div display="flex" flexDirection="column" gap="4">
      <styled.div
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <styled.div />
        {canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={16} />
            新しい改版を作成
          </Button>
        )}
      </styled.div>

      {!hasRevisions ? (
        <EmptyState
          icon={FileText}
          message="改版がまだありません"
          hint={
            canManage
              ? "『新しい改版を作成』からドラフトを作成し、公開してください。"
              : "管理者による初期改版の投入を待ってください。"
          }
        />
      ) : (
        <Table.Root>
          <Table.Head>
            <Table.Row>
              <Table.Header>version</Table.Header>
              <Table.Header>title</Table.Header>
              <Table.Header>状態</Table.Header>
              <Table.Header>効力発生日</Table.Header>
              <Table.Header>公開日</Table.Header>
              <Table.Header>操作</Table.Header>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {revisions.map((revision) => {
              const canEdit = revision.status === "draft" && canManage;
              const canPublish = revision.status === "draft" && canManage;
              const canDiff = revision.status !== "draft" || canManage;
              return (
                <Table.Row key={revision.revisionId}>
                  <Table.Cell>
                    <styled.span fontFamily="mono">
                      {revision.version}
                    </styled.span>
                  </Table.Cell>
                  <Table.Cell>{revision.title}</Table.Cell>
                  <Table.Cell>
                    <Badge colorPalette={STATUS_COLOR[revision.status]}>
                      {STATUS_LABEL[revision.status]}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{formatDate(revision.effectiveFrom)}</Table.Cell>
                  <Table.Cell>{formatDate(revision.publishedAt)}</Table.Cell>
                  <Table.Cell>
                    <styled.div display="flex" gap="2">
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing(revision)}
                        >
                          <Pencil size={14} />
                          編集
                        </Button>
                      )}
                      {canPublish && (
                        <Button
                          size="sm"
                          onClick={() => setPublishing(revision)}
                        >
                          公開
                        </Button>
                      )}
                      {canDiff && (
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => setDiffTarget(revision)}
                        >
                          <GitCompareArrows size={14} />
                          差分
                        </Button>
                      )}
                    </styled.div>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}

      <PolicyRevisionEditorDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        type={type}
        initialValues={{
          version: "",
          title: DEFAULT_TITLE[type],
          body: createSeedBody,
        }}
        onSubmit={handleCreate}
        isPending={createMutation.isPending}
      />

      <PolicyRevisionEditorDialog
        mode="edit"
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        type={type}
        initialValues={
          editing
            ? {
                version: editing.version,
                title: editing.title,
                body: editing.body,
              }
            : { version: "", title: "", body: "" }
        }
        onSubmit={async (values) => {
          if (!editing) return;
          await handleUpdate(editing, values);
        }}
        isPending={updateMutation.isPending}
      />

      <PolicyPublishDialog
        revision={publishing}
        onClose={() => setPublishing(null)}
        onPublish={handlePublish}
        isPending={publishMutation.isPending}
      />

      <PolicyDiffDialog
        revision={diffTarget}
        revisions={revisions}
        type={type}
        onClose={() => setDiffTarget(null)}
      />
    </styled.div>
  );
}
