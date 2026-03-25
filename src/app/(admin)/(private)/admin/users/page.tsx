"use client";

import { createListCollection } from "@ark-ui/react/select";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import * as Select from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { toaster } from "@/components/ui/toast";
import type { UpdateUserRoleBodyRole } from "@/generated/schemas";
import { useUpdateUserRole } from "@/hooks/use-admin-users";
import { useAuth } from "@/hooks/use-auth";

const roleCollection = createListCollection({
  items: [
    { label: "相談員", value: "consultant" },
    { label: "オペレーター", value: "operator" },
    { label: "スーパー管理者", value: "super_admin" },
  ],
});

export default function AdminUsersPage() {
  const { role } = useAuth();
  const [uid, setUid] = useState("");
  const [selectedRole, setSelectedRole] =
    useState<UpdateUserRoleBodyRole>("consultant");
  const updateUserRole = useUpdateUserRole();

  if (role !== "super_admin") {
    return <Text>権限がありません</Text>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUserRole.mutateAsync({
        uid,
        data: { role: selectedRole },
      });
      const roleLabel =
        roleCollection.items.find((r) => r.value === selectedRole)?.label ??
        selectedRole;
      toaster.success({
        title: "成功",
        description: `ユーザー ${uid} のロールを ${roleLabel} に設定しました`,
      });
      setUid("");
    } catch {
      // custom-fetch.ts がエラー Toast を自動表示
    }
  };

  return (
    <styled.div maxW="600px">
      <Text as="h1" textStyle="2xl" fontWeight="bold" mb="4">
        ユーザー管理
      </Text>
      <styled.form
        onSubmit={handleSubmit}
        display="flex"
        flexDir="column"
        gap="4"
      >
        <Field.Root>
          <Field.Label>ユーザーUID</Field.Label>
          <Input
            id="uid"
            type="text"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            required
          />
        </Field.Root>
        <Select.Root
          collection={roleCollection}
          value={[selectedRole]}
          onValueChange={(details) =>
            setSelectedRole(details.value[0] as UpdateUserRoleBodyRole)
          }
        >
          <Select.Label>ロール</Select.Label>
          <Select.Control>
            <Select.Trigger>
              <Select.ValueText placeholder="ロールを選択" />
              <Select.Indicator />
            </Select.Trigger>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {roleCollection.items.map((item) => (
                <Select.Item key={item.value} item={item}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator />
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Positioner>
        </Select.Root>
        <Button
          type="submit"
          alignSelf="flex-start"
          loading={updateUserRole.isPending}
          loadingText="設定中..."
        >
          ロール設定
        </Button>
      </styled.form>
    </styled.div>
  );
}
