"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { EmptyState } from "@/components/empty-state";
import { ListControls } from "@/components/list-controls";
import { ActiveStatusBadge } from "@/components/status-badge";
import { TableSkeleton } from "@/components/table-skeleton";
import { Button } from "@/components/ui/button";
import * as Dialog from "@/components/ui/dialog";
import * as Field from "@/components/ui/field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import * as Table from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { toaster } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { getGetAdminConsultantsQueryKey } from "@/generated/api/admin/admin";
import { useAdminConsultants } from "@/hooks/use-admin-consultants";
import { useInviteUser } from "@/hooks/use-admin-users";
import { useAuth } from "@/hooks/use-auth";
import { useListQueryParams } from "@/hooks/use-list-query-params";
import { useOrganizationRouting } from "@/hooks/use-organization-routing";
import {
  type ConsultantInviteFormValues,
  consultantInviteFormSchema,
} from "./consultant-invite-form-schema";

export default function AdminConsultantsPage() {
  const { buildPath, organizationId } = useOrganizationRouting();
  const { role } = useAuth();
  const { page, pageSize, sortBy, setPage, setPageSize, setSortBy } =
    useListQueryParams();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminConsultants({
    page,
    pageSize,
    sortBy,
    sortOrder: "desc",
  });
  const inviteUser = useInviteUser();

  const [inviteOpen, setInviteOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConsultantInviteFormValues>({
    resolver: valibotResolver(consultantInviteFormSchema),
    defaultValues: {
      displayName: "",
      email: "",
      phone: "",
    },
  });

  const consultants = data?.data?.consultants ?? [];
  const pagination = data?.data?.pagination ?? {
    page,
    pageSize,
    total: consultants.length,
    totalPages: 1,
  };
  const isAdmin = role === "admin";

  const onInviteConsultant = async (values: ConsultantInviteFormValues) => {
    if (!organizationId) {
      return;
    }
    try {
      await inviteUser.mutateAsync({
        organizationId,
        data: {
          email: values.email,
          displayName: values.displayName,
          phone: values.phone,
          role: "consultant",
        },
      });
      toaster.success({
        title: "成功",
        description: `${values.email} に招待メールを送信しました`,
      });
      reset();
      setInviteOpen(false);
      await queryClient.invalidateQueries({
        queryKey: getGetAdminConsultantsQueryKey(organizationId),
      });
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  if (isLoading) {
    return (
      <styled.div>
        <styled.div
          display="flex"
          justifyContent="space-between"
          alignItems="flex-start"
          mb="4"
        >
          <styled.div>
            <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
              相談員管理
            </Text>
            <Text textStyle="sm" color="fg.muted">
              相談員の招待・稼働状況の確認・プロフィール編集導線を管理する画面です。
            </Text>
          </styled.div>
        </styled.div>
        <TableSkeleton columns={5} rows={5} />
      </styled.div>
    );
  }

  return (
    <styled.div>
      <styled.div
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        mb="4"
      >
        <styled.div>
          <Text as="h1" textStyle="2xl" fontWeight="bold" mb="1">
            相談員管理
          </Text>
          <Text textStyle="sm" color="fg.muted">
            相談員の招待・稼働状況の確認・プロフィール編集導線を管理する画面です。
          </Text>
        </styled.div>
        {isAdmin && (
          <Dialog.Root
            open={inviteOpen}
            onOpenChange={(details) => {
              setInviteOpen(details.open);
              if (!details.open) {
                reset();
              }
            }}
          >
            <Dialog.Trigger asChild>
              <Button>
                <UserPlus size={16} />
                新規追加
              </Button>
            </Dialog.Trigger>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content asChild>
                <styled.form onSubmit={handleSubmit(onInviteConsultant)}>
                  <Dialog.Header>
                    <Dialog.Title>相談員招待</Dialog.Title>
                    <Dialog.Description>
                      相談員として招待するメールアドレスと表示名を入力してください
                    </Dialog.Description>
                  </Dialog.Header>
                  <Dialog.Body display="flex" flexDir="column" gap="4">
                    <Field.Root invalid={!!errors.displayName}>
                      <Field.Label>表示名</Field.Label>
                      <Input {...register("displayName")} />
                      {errors.displayName && (
                        <Field.ErrorText>
                          {errors.displayName.message}
                        </Field.ErrorText>
                      )}
                    </Field.Root>
                    <Field.Root invalid={!!errors.email}>
                      <Field.Label>メールアドレス</Field.Label>
                      <Input type="email" {...register("email")} />
                      {errors.email && (
                        <Field.ErrorText>
                          {errors.email.message}
                        </Field.ErrorText>
                      )}
                    </Field.Root>
                    <Field.Root invalid={!!errors.phone}>
                      <Field.Label>電話番号</Field.Label>
                      <Input type="tel" {...register("phone")} />
                      {errors.phone && (
                        <Field.ErrorText>
                          {errors.phone.message}
                        </Field.ErrorText>
                      )}
                    </Field.Root>
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Dialog.CloseTrigger asChild>
                      <Button variant="outline">キャンセル</Button>
                    </Dialog.CloseTrigger>
                    <Button
                      type="submit"
                      loading={inviteUser.isPending}
                      loadingText="送信中..."
                    >
                      招待メール送信
                    </Button>
                  </Dialog.Footer>
                </styled.form>
              </Dialog.Content>
            </Dialog.Positioner>
          </Dialog.Root>
        )}
      </styled.div>
      {consultants.length === 0 ? (
        <EmptyState
          icon={Users}
          message="相談員はいません"
          hint={
            isAdmin
              ? "新規追加ボタンから相談員を登録できます"
              : "管理者に相談員追加を依頼してください"
          }
        />
      ) : (
        <>
          <Table.Root>
            <Table.Head>
              <Table.Row>
                <Table.Header>名前</Table.Header>
                <Table.Header>メールアドレス</Table.Header>
                <Table.Header>電話番号</Table.Header>
                <Table.Header>専門分野</Table.Header>
                <Table.Header>ステータス</Table.Header>
                <Table.Header>操作</Table.Header>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {consultants.map((c) => (
                <Table.Row key={c.consultantId}>
                  <Table.Cell>{c.displayName}</Table.Cell>
                  <Table.Cell>{c.email}</Table.Cell>
                  <Table.Cell>{c.phone || "-"}</Table.Cell>
                  <Table.Cell>{c.specialties.join(", ")}</Table.Cell>
                  <Table.Cell>
                    <ActiveStatusBadge isActive={c.isActive} />
                  </Table.Cell>
                  <Table.Cell>
                    <Tooltip content="編集">
                      <IconButton variant="subtle" size="sm" asChild>
                        <Link
                          href={buildPath(
                            `/admin/consultants/${c.consultantId}`,
                          )}
                        >
                          <Pencil size={16} />
                        </Link>
                      </IconButton>
                    </Tooltip>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          <ListControls
            page={pagination.page}
            pageSize={pagination.pageSize}
            sortBy={sortBy}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortByChange={setSortBy}
          />
        </>
      )}
    </styled.div>
  );
}
