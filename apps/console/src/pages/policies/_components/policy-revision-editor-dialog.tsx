import type { PolicyType } from "@mirai-yoho/api-client/schemas";
import { MarkdownView } from "@mirai-yoho/ui/components/markdown-view";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { Textarea } from "@mirai-yoho/ui/components/ui/textarea";
import { Eye, PenLine } from "lucide-react";
import { useEffect, useState } from "react";
import { styled } from "styled-system/jsx";

interface EditorValues {
  version: string;
  title: string;
  body: string;
}

interface PolicyRevisionEditorDialogProps {
  mode: "create" | "edit";
  type: PolicyType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: EditorValues;
  onSubmit: (values: EditorValues) => Promise<void>;
  isPending: boolean;
}

const DIALOG_TITLE: Record<"create" | "edit", string> = {
  create: "新しい改版を作成",
  edit: "ドラフトを編集",
};

export function PolicyRevisionEditorDialog({
  mode,
  type: _type,
  open,
  onOpenChange,
  initialValues,
  onSubmit,
  isPending,
}: PolicyRevisionEditorDialogProps) {
  const [version, setVersion] = useState(initialValues.version);
  const [title, setTitle] = useState(initialValues.title);
  const [body, setBody] = useState(initialValues.body);
  const [previewOn, setPreviewOn] = useState(false);

  useEffect(() => {
    if (open) {
      setVersion(initialValues.version);
      setTitle(initialValues.title);
      setBody(initialValues.body);
      setPreviewOn(false);
    }
  }, [open, initialValues.version, initialValues.title, initialValues.body]);

  const canSubmit =
    version.trim().length > 0 &&
    title.trim().length > 0 &&
    body.trim().length > 0;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    await onSubmit({ version, title, body });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      lazyMount
      unmountOnExit
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content asChild maxW={{ base: "95vw", lg: "5xl" }} w="full">
          <styled.form onSubmit={handleSubmit}>
            <Dialog.Header>
              <Dialog.Title>{DIALOG_TITLE[mode]}</Dialog.Title>
              <Dialog.Description>
                version は組織 × 種別内で一意です。公開前に body
                を空でない状態にしてください。
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" gap="4">
              <styled.div
                display="grid"
                gridTemplateColumns={{ base: "1fr", md: "1fr 2fr" }}
                gap="3"
              >
                <Field.Root>
                  <Field.Label>version</Field.Label>
                  <Input
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="2026-08-01"
                    maxLength={40}
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>title</Field.Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                  />
                </Field.Root>
              </styled.div>

              <styled.div
                display="flex"
                alignItems="center"
                justifyContent="space-between"
              >
                <Text textStyle="sm" fontWeight="medium">
                  本文（Markdown）
                </Text>
                <Button
                  variant="subtle"
                  size="sm"
                  type="button"
                  onClick={() => setPreviewOn((prev) => !prev)}
                >
                  {previewOn ? (
                    <>
                      <PenLine size={14} />
                      編集に戻る
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      プレビュー
                    </>
                  )}
                </Button>
              </styled.div>

              {previewOn ? (
                <styled.div
                  minH="60vh"
                  border="1px solid"
                  borderColor="border"
                  rounded="l2"
                  p="4"
                  overflow="auto"
                >
                  <MarkdownView body={body} />
                </styled.div>
              ) : (
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={24}
                  fontFamily="mono"
                  fontSize="sm"
                  placeholder={"# 見出し\n\n本文をここに書きます。"}
                />
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant="outline" type="button">
                  キャンセル
                </Button>
              </Dialog.CloseTrigger>
              <Button
                type="submit"
                loading={isPending}
                loadingText="保存中..."
                disabled={!canSubmit}
              >
                {mode === "create" ? "ドラフトを作成" : "変更を保存"}
              </Button>
            </Dialog.Footer>
          </styled.form>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
