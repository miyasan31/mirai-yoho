import type { PolicyRevision } from "@mirai-yoho/api-client/schemas";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { useEffect, useMemo, useState } from "react";
import { styled } from "styled-system/jsx";

interface PolicyPublishDialogProps {
  revision: PolicyRevision | null;
  onClose: () => void;
  onPublish: (revision: PolicyRevision, effectiveFrom: Date) => Promise<void>;
  isPending: boolean;
}

function defaultEffectiveFromLocal(): string {
  // datetime-local 用: YYYY-MM-DDTHH:mm 形式で明日の朝 9 時
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function PolicyPublishDialog({
  revision,
  onClose,
  onPublish,
  isPending,
}: PolicyPublishDialogProps) {
  const [effectiveFromLocal, setEffectiveFromLocal] = useState(
    defaultEffectiveFromLocal(),
  );

  useEffect(() => {
    if (revision) {
      setEffectiveFromLocal(defaultEffectiveFromLocal());
    }
  }, [revision]);

  const parsedEffectiveFrom = useMemo(() => {
    if (!effectiveFromLocal) return null;
    const parsed = new Date(effectiveFromLocal);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [effectiveFromLocal]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!revision || !parsedEffectiveFrom) return;
    await onPublish(revision, parsedEffectiveFrom);
  };

  return (
    <Dialog.Root
      open={revision !== null}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content asChild>
          <styled.form onSubmit={handleSubmit}>
            <Dialog.Header>
              <Dialog.Title>改版を公開する</Dialog.Title>
              <Dialog.Description>
                {revision && (
                  <>
                    <styled.span fontFamily="mono">
                      {revision.version}
                    </styled.span>{" "}
                    ({revision.title}) を公開します。既存の公開中の版は自動的に
                    アーカイブされます。
                  </>
                )}
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" gap="4">
              <Field.Root>
                <Field.Label>効力発生日時</Field.Label>
                <Input
                  type="datetime-local"
                  value={effectiveFromLocal}
                  onChange={(e) => setEffectiveFromLocal(e.target.value)}
                />
                <Text textStyle="xs" color="fg.muted" mt="1">
                  未来日時を指定すると、その時刻を過ぎた時点から新版として扱われます。
                </Text>
              </Field.Root>
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
                loadingText="公開中..."
                disabled={!parsedEffectiveFrom}
              >
                公開する
              </Button>
            </Dialog.Footer>
          </styled.form>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
