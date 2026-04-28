"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Dialog from "@/components/ui/dialog";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { getGetAdminConsultantsQueryKey } from "@/generated/api/admin/admin";
import {
  useAdminConsultants,
  useDeleteAdminConsultant,
  useUpdateAdminConsultant,
} from "@/hooks/use-admin-consultants";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import {
  type ConsultantFormValues,
  consultantFormSchema,
} from "./consultant-form-schema";

type ConsultantEditFormProps = {
  consultantId: string;
  onCompleted: () => void;
  onNotFound: () => void;
};

export function ConsultantEditForm({
  consultantId,
  onCompleted,
  onNotFound,
}: ConsultantEditFormProps) {
  const { organizationId } = useOrganizationRouting();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConsultantFormValues>({
    resolver: valibotResolver(consultantFormSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      specialties: "",
    },
  });

  const { data, isLoading } = useAdminConsultants({
    page: 1,
    pageSize: 100,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const updateConsultant = useUpdateAdminConsultant();
  const deleteConsultant = useDeleteAdminConsultant();
  const consultants = data?.data?.consultants ?? [];
  const consultant = consultants.find(
    (item: { consultantId: string }) => item.consultantId === consultantId,
  );

  useEffect(() => {
    if (consultant) {
      reset({
        displayName: consultant.displayName ?? "",
        bio: consultant.bio ?? "",
        specialties: (consultant.specialties ?? []).join(", "),
      });
    }
  }, [consultant, reset]);

  useEffect(() => {
    if (!isLoading && data && !consultant) {
      onNotFound();
    }
  }, [consultant, data, isLoading, onNotFound]);

  const invalidateConsultants = async () => {
    if (!organizationId) {
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: getGetAdminConsultantsQueryKey(organizationId),
    });
  };

  const onSubmit = async (values: ConsultantFormValues) => {
    setError("");
    try {
      await updateConsultant.mutateAsync({
        organizationId: organizationId ?? "",
        id: consultantId,
        data: {
          displayName: values.displayName,
          bio: values.bio?.trim() ?? "",
          specialties: (values.specialties ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      await invalidateConsultants();
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    }
  };

  const handleDeactivate = async () => {
    try {
      await deleteConsultant.mutateAsync({
        organizationId: organizationId ?? "",
        id: consultantId,
      });
      await invalidateConsultants();
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "無効化に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <styled.div display="flex" flexDir="column" gap="4">
        <styled.div>
          <Skeleton height="4" width="80px" mb="2" />
          <Skeleton height="10" rounded="l2" />
        </styled.div>
        <styled.div>
          <Skeleton height="4" width="80px" mb="2" />
          <Skeleton height="24" rounded="l2" />
        </styled.div>
        <styled.div>
          <Skeleton height="4" width="120px" mb="2" />
          <Skeleton height="10" rounded="l2" />
        </styled.div>
        <styled.div display="flex" gap="2">
          <Skeleton height="10" width="80px" rounded="l2" />
          <Skeleton height="10" width="80px" rounded="l2" />
        </styled.div>
      </styled.div>
    );
  }

  return (
    <styled.form
      onSubmit={handleSubmit(onSubmit)}
      display="flex"
      flexDir="column"
      gap="4"
    >
      <Field.Root invalid={!!errors.displayName}>
        <Field.Label>表示名</Field.Label>
        <Input id="displayName" type="text" {...register("displayName")} />
        {errors.displayName && (
          <Field.ErrorText>{errors.displayName.message}</Field.ErrorText>
        )}
      </Field.Root>
      <Field.Root>
        <Field.Label>自己紹介</Field.Label>
        <Textarea id="bio" {...register("bio")} rows={4} />
      </Field.Root>
      <Field.Root>
        <Field.Label>専門分野（カンマ区切り）</Field.Label>
        <Input id="specialties" type="text" {...register("specialties")} />
      </Field.Root>
      {error && <Text color="fg.error">{error}</Text>}
      <styled.div display="flex" gap="2">
        <Button
          type="submit"
          loading={updateConsultant.isPending}
          loadingText="保存中..."
        >
          保存
        </Button>
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <Button type="button" variant="outline" colorPalette="red">
              無効化
            </Button>
          </Dialog.Trigger>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>相談員の無効化</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Dialog.Description>
                  この相談員を無効にしますか？この操作は取り消せます。
                </Dialog.Description>
              </Dialog.Body>
              <Dialog.Footer>
                <styled.div display="flex" gap="2" justifyContent="flex-end">
                  <Dialog.CloseTrigger asChild>
                    <Button variant="outline">キャンセル</Button>
                  </Dialog.CloseTrigger>
                  <Button
                    colorPalette="red"
                    onClick={handleDeactivate}
                    loading={deleteConsultant.isPending}
                    loadingText="処理中..."
                  >
                    無効化する
                  </Button>
                </styled.div>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Dialog.Root>
      </styled.div>
    </styled.form>
  );
}
