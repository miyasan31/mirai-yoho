import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useCallback } from "react";
import { styled } from "styled-system/jsx";
import { ConsultantEditForm } from "./consultant-edit-form";

export default function ConsoleConsultantEditModalPage() {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const consultantId = params.id ?? "";
  const organizationId = params.organizationId ?? "";

  const closeModal = useCallback(() => {
    void navigate({
      to: "/$organizationId/consultants/$id",
      params: { organizationId, id: consultantId },
    });
  }, [navigate, organizationId, consultantId]);

  return (
    <Dialog.Root
      open
      onOpenChange={(details) => {
        if (!details.open) {
          closeModal();
        }
      }}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>占い師編集</Dialog.Title>
            <Dialog.Description>
              占い師の表示名・自己紹介・専門分野を更新し、必要に応じて無効化を行います。
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            <ConsultantEditForm
              consultantId={consultantId}
              onCompleted={closeModal}
              onNotFound={closeModal}
            />
          </Dialog.Body>
          <Dialog.Footer>
            <styled.div width="full" display="flex" justifyContent="flex-end">
              <Dialog.CloseTrigger asChild>
                <Button variant="outline">閉じる</Button>
              </Dialog.CloseTrigger>
            </styled.div>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
