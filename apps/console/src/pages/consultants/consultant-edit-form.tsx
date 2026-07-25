import { createListCollection } from "@ark-ui/react/select";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useOrganizationRouting } from "@mirai-yoho/console-core/hooks/use-organization-routing";
import { invalidateAfter } from "@mirai-yoho/console-core/query/invalidation-map";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Dialog from "@mirai-yoho/ui/components/ui/dialog";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import * as Select from "@mirai-yoho/ui/components/ui/select";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Textarea } from "@mirai-yoho/ui/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { useConsoleConsultantStatuses } from "@/hooks/use-console-booking-settings";
import {
  useConsoleConsultants,
  useDeleteConsoleConsultant,
  useUpdateConsoleConsultant,
} from "@/hooks/use-console-consultants";
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
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ConsultantFormValues>({
    resolver: valibotResolver(consultantFormSchema),
    defaultValues: {
      name: "",
      bio: "",
      phone: "",
      specialties: "",
      statusId: "",
    },
  });

  const { data, isLoading } = useConsoleConsultants({
    page: 1,
    pageSize: 100,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const { data: statusData, isLoading: isLoadingStatuses } =
    useConsoleConsultantStatuses();
  const updateConsultant = useUpdateConsoleConsultant();
  const deleteConsultant = useDeleteConsoleConsultant();
  const consultants = data?.data?.consultants ?? [];
  const statuses = statusData?.data?.consultantStatuses ?? [];
  const statusCollection = createListCollection({
    items: statuses.map((status) => ({
      label: status.name,
      value: status.statusId,
    })),
  });
  const statusId = watch("statusId");
  const consultant = consultants.find(
    (item: { consultantId: string }) => item.consultantId === consultantId,
  );

  useEffect(() => {
    if (consultant) {
      reset({
        name: consultant.name ?? "",
        bio: consultant.bio ?? "",
        phone: consultant.phone ?? "",
        specialties: (consultant.specialties ?? []).join(", "),
        statusId: consultant.status.statusId,
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
    await invalidateAfter.consultantMutation(queryClient, organizationId);
  };

  const onSubmit = async (values: ConsultantFormValues) => {
    try {
      await updateConsultant.mutateAsync({
        organizationId: organizationId ?? "",
        id: consultantId,
        data: {
          name: values.name,
          bio: values.bio?.trim() ?? "",
          phone: values.phone?.trim() ?? "",
          specialties: (values.specialties ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          statusId: values.statusId,
        },
      });
      await invalidateConsultants();
      onCompleted();
    } catch {
      // エラーは custom-fetch の toaster で表示される
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
    } catch {
      // エラーは custom-fetch の toaster で表示される
    }
  };

  if (isLoading || isLoadingStatuses) {
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
      <Field.Root invalid={!!errors.name}>
        <Field.Label>表示名</Field.Label>
        <Input id="name" type="text" {...register("name")} />
        {errors.name && (
          <Field.ErrorText>{errors.name.message}</Field.ErrorText>
        )}
      </Field.Root>
      <Field.Root>
        <Field.Label>自己紹介</Field.Label>
        <Textarea id="bio" {...register("bio")} rows={4} />
      </Field.Root>
      <Field.Root invalid={!!errors.phone}>
        <Field.Label>電話番号</Field.Label>
        <Input id="phone" type="tel" {...register("phone")} />
        {errors.phone && (
          <Field.ErrorText>{errors.phone.message}</Field.ErrorText>
        )}
      </Field.Root>
      <Field.Root>
        <Field.Label>専門分野（カンマ区切り）</Field.Label>
        <Input id="specialties" type="text" {...register("specialties")} />
      </Field.Root>
      <Field.Root required invalid={!!errors.statusId}>
        <Select.Root
          collection={statusCollection}
          value={statusId ? [statusId] : []}
          onValueChange={(details) =>
            setValue("statusId", details.value[0] ?? "", {
              shouldValidate: true,
            })
          }
        >
          <Select.Label>ステータス</Select.Label>
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="ステータスを選択" />
              <Select.Indicator />
            </Select.Trigger>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {statusCollection.items.map((item) => (
                <Select.Item key={item.value} item={item}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select.Root>
        {errors.statusId && (
          <Field.ErrorText>{errors.statusId.message}</Field.ErrorText>
        )}
      </Field.Root>
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
                <Dialog.Title>占い師の無効化</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Dialog.Description>
                  この占い師を無効にしますか？この操作は取り消せます。
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
