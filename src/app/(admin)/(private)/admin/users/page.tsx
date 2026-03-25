"use client";

import { useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import type { UpdateUserRoleBodyRole } from "@/generated/schemas";
import { useUpdateUserRole } from "@/hooks/use-admin-users";
import { useAuth } from "@/hooks/use-auth";

export default function AdminUsersPage() {
  const { role } = useAuth();
  const [uid, setUid] = useState("");
  const [selectedRole, setSelectedRole] =
    useState<UpdateUserRoleBodyRole>("consultant");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const updateUserRole = useUpdateUserRole();

  if (role !== "super_admin") {
    return <Text>権限がありません</Text>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      await updateUserRole.mutateAsync({
        uid,
        data: { role: selectedRole },
      });
      setMessage(`ユーザー ${uid} のロールを ${selectedRole} に設定しました`);
      setUid("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ロール更新に失敗しました");
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
        <Field.Root>
          <Field.Label>ロール</Field.Label>
          <styled.select
            id="role"
            value={selectedRole}
            onChange={(e) =>
              setSelectedRole(e.target.value as UpdateUserRoleBodyRole)
            }
            w="100%"
            p="2"
            border="1px solid"
            borderColor="border"
            rounded="l1"
          >
            <option value="consultant">consultant</option>
            <option value="operator">operator</option>
            <option value="super_admin">super_admin</option>
          </styled.select>
        </Field.Root>
        {error && <Text color="fg.error">{error}</Text>}
        {message && <Text color="fg.success">{message}</Text>}
        <Button type="submit" alignSelf="flex-start">
          ロール設定
        </Button>
      </styled.form>
    </styled.div>
  );
}
