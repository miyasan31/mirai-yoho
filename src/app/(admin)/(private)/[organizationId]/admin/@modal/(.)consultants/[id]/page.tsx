"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Dialog from "@/components/ui/dialog";
import { ConsultantEditForm } from "../../../consultants/[id]/consultant-edit-form";

export default function AdminConsultantEditModalPage() {
  const params = useParams();
  const router = useRouter();
  const consultantId = params.id as string;

  const closeModal = useCallback(() => {
    router.back();
  }, [router]);

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
            <Dialog.Title>相談員編集</Dialog.Title>
            <Dialog.Description>
              相談員の表示名・自己紹介・専門分野を更新し、必要に応じて無効化を行います。
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
