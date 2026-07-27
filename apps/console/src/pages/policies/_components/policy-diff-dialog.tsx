import type {
  PolicyDiffChunk,
  PolicyRevision,
  PolicyType,
} from "@mirai-yoho/api-client/schemas";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { useEffect, useMemo, useState } from "react";
import { styled } from "styled-system/jsx";
import { useConsolePolicyRevisionDiff } from "@/hooks/use-console-policies";

interface PolicyDiffDialogProps {
  revision: PolicyRevision | null;
  revisions: PolicyRevision[];
  type: PolicyType;
  onClose: () => void;
}

/**
 * 差分ダイアログ。対象 revision と、比較元 (前版 default) を選んで、
 * 行単位の diff を色分け表示する。前版がない初版の場合は追加行のみ表示。
 */
export function PolicyDiffDialog({
  revision,
  revisions,
  type,
  onClose,
}: PolicyDiffDialogProps) {
  const [fromRevisionId, setFromRevisionId] = useState<string | "">("");

  // 対象 revision より古い（createdAt が古い）候補
  const candidates = useMemo(() => {
    if (!revision) return [];
    const targetCreatedAt = new Date(revision.createdAt).getTime();
    return revisions
      .filter(
        (r) =>
          r.revisionId !== revision.revisionId &&
          new Date(r.createdAt).getTime() < targetCreatedAt,
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [revision, revisions]);

  useEffect(() => {
    if (!revision) return;
    // 直前の版を default で選択（無ければ初版扱い）
    setFromRevisionId(candidates[0]?.revisionId ?? "");
  }, [revision, candidates]);

  const { data, isLoading, isError } = useConsolePolicyRevisionDiff(
    type,
    revision?.revisionId ?? null,
    fromRevisionId || null,
  );

  const diff = data?.data;

  return (
    <Dialog.Root
      open={revision !== null}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
      lazyMount
      unmountOnExit
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content asChild maxW={{ base: "95vw", lg: "5xl" }} w="full">
          <styled.div>
            <Dialog.Header>
              <Dialog.Title>差分ビュー</Dialog.Title>
              <Dialog.Description>
                {revision && (
                  <>
                    比較先:{" "}
                    <styled.span fontFamily="mono">
                      {revision.version}
                    </styled.span>
                  </>
                )}
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" gap="4">
              <Field.Root>
                <Field.Label>比較元（version）</Field.Label>
                <styled.select
                  value={fromRevisionId}
                  onChange={(e) => setFromRevisionId(e.target.value)}
                  rounded="l2"
                  p="2"
                  borderWidth="1"
                  borderColor="border"
                >
                  <option value="">（なし: 初版として全て新規扱い）</option>
                  {candidates.map((c) => (
                    <option key={c.revisionId} value={c.revisionId}>
                      {c.version}（{c.status}）
                    </option>
                  ))}
                </styled.select>
              </Field.Root>

              {isLoading && (
                <Text textStyle="sm" color="fg.muted">
                  差分を計算中...
                </Text>
              )}
              {isError && (
                <Text textStyle="sm" color="fg.error">
                  差分の取得に失敗しました。
                </Text>
              )}
              {diff && <DiffPanel chunks={diff.chunks} />}
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant="outline">閉じる</Button>
              </Dialog.CloseTrigger>
            </Dialog.Footer>
          </styled.div>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

// ---------- GitHub 風の line-by-line diff ----------

type DiffLineKind = "context" | "add" | "remove";

interface DiffLine {
  oldLine: number | null;
  newLine: number | null;
  kind: DiffLineKind;
  content: string;
}

function flattenChunksToLines(chunks: PolicyDiffChunk[]): DiffLine[] {
  let oldNum = 0;
  let newNum = 0;
  const lines: DiffLine[] = [];
  for (const chunk of chunks) {
    const raw = chunk.value.split("\n");
    // 末尾が改行で終わっている場合は空要素を落として重複行を防ぐ
    if (raw.length > 0 && raw[raw.length - 1] === "") raw.pop();
    for (const line of raw) {
      if (chunk.added) {
        newNum += 1;
        lines.push({
          oldLine: null,
          newLine: newNum,
          kind: "add",
          content: line,
        });
      } else if (chunk.removed) {
        oldNum += 1;
        lines.push({
          oldLine: oldNum,
          newLine: null,
          kind: "remove",
          content: line,
        });
      } else {
        oldNum += 1;
        newNum += 1;
        lines.push({
          oldLine: oldNum,
          newLine: newNum,
          kind: "context",
          content: line,
        });
      }
    }
  }
  return lines;
}

function DiffPanel({ chunks }: { chunks: PolicyDiffChunk[] }) {
  const lines = useMemo(() => flattenChunksToLines(chunks), [chunks]);

  if (lines.length === 0) {
    return (
      <styled.div
        w="full"
        alignSelf="stretch"
        border="1px solid"
        borderColor="border"
        rounded="l2"
        p="4"
        bg="bg.canvas"
      >
        <Text textStyle="sm" color="fg.muted">
          差分はありません。
        </Text>
      </styled.div>
    );
  }

  return (
    <styled.div
      w="full"
      alignSelf="stretch"
      border="1px solid"
      borderColor="border"
      rounded="l2"
      overflow="auto"
      maxH="60vh"
      bg="bg.canvas"
    >
      <styled.table
        w="full"
        borderCollapse="collapse"
        fontFamily="mono"
        fontSize="xs"
        lineHeight="1.6"
      >
        <styled.tbody>
          {lines.map((line, index) => (
            <DiffRow
              // biome-ignore lint/suspicious/noArrayIndexKey: diff lines are positional
              key={index}
              line={line}
            />
          ))}
        </styled.tbody>
      </styled.table>
    </styled.div>
  );
}

function DiffRow({ line }: { line: DiffLine }) {
  const isAdd = line.kind === "add";
  const isRemove = line.kind === "remove";
  const rowBg = isAdd
    ? "green.subtle"
    : isRemove
      ? "red.subtle"
      : "transparent";
  const gutterBg = isAdd ? "green.muted" : isRemove ? "red.muted" : "bg.subtle";
  const sign = isAdd ? "+" : isRemove ? "-" : " ";
  const contentColor = isAdd ? "green.fg" : isRemove ? "red.fg" : "fg.default";

  return (
    <styled.tr bg={rowBg}>
      <styled.td
        bg={gutterBg}
        color="fg.muted"
        textAlign="right"
        px="2"
        minW="12"
        userSelect="none"
        borderRightWidth="1px"
        borderRightColor="border"
        verticalAlign="top"
      >
        {line.oldLine ?? ""}
      </styled.td>
      <styled.td
        bg={gutterBg}
        color="fg.muted"
        textAlign="right"
        px="2"
        minW="12"
        userSelect="none"
        borderRightWidth="1px"
        borderRightColor="border"
        verticalAlign="top"
      >
        {line.newLine ?? ""}
      </styled.td>
      <styled.td
        color={contentColor}
        textAlign="center"
        px="2"
        userSelect="none"
        verticalAlign="top"
        w="6"
      >
        {sign}
      </styled.td>
      <styled.td
        color={contentColor}
        px="2"
        w="full"
        whiteSpace="pre-wrap"
        wordBreak="break-word"
      >
        {line.content || " "}
      </styled.td>
    </styled.tr>
  );
}
