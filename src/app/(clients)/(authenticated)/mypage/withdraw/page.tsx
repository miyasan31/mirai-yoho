"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

export default function WithdrawPage() {
  const { token, profile, signOut, refreshProfile } = useCustomerAuth();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const targetText = profile?.primaryEmail ?? profile?.displayName ?? "";

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!confirmation || confirmation !== targetText) {
      setError(
        profile?.primaryEmail
          ? "確認のためメールアドレスを正しく入力してください"
          : "確認のためお名前を正しく入力してください",
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/customer/me", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(payload.message ?? "退会に失敗しました");
      }
      await refreshProfile();
      await signOut();
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "退会に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <styled.div display="flex" flexDir="column" gap="4" maxW="lg">
      <Text as="h1" textStyle="2xl" fontWeight="bold">
        退会する
      </Text>
      <styled.section
        border="1px solid"
        borderColor="border"
        rounded="l3"
        p="4"
        bg="bg.muted"
        display="flex"
        flexDir="column"
        gap="2"
      >
        <Text fontWeight="medium">退会するとどうなりますか？</Text>
        <styled.ul pl="5" display="flex" flexDir="column" gap="1">
          <styled.li textStyle="sm" color="fg.muted">
            ・過去の予約履歴は閲覧できなくなります
          </styled.li>
          <styled.li textStyle="sm" color="fg.muted">
            ・同じメールアドレスでの再登録はできません
          </styled.li>
          <styled.li textStyle="sm" color="fg.muted">
            ・受け取り済みのクーポンは無効になります
          </styled.li>
          <styled.li textStyle="sm" color="fg.muted">
            ・連携中の Zoom 連携も解除されます
          </styled.li>
        </styled.ul>
      </styled.section>

      <styled.form onSubmit={onSubmit} display="flex" flexDir="column" gap="4">
        <Field.Root invalid={!!error}>
          <Field.Label>
            {profile?.primaryEmail
              ? `確認のためメールアドレス（${profile.primaryEmail}）を入力してください`
              : "確認のためお名前を入力してください"}
          </Field.Label>
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={targetText}
          />
          {error && <Field.ErrorText>{error}</Field.ErrorText>}
        </Field.Root>
        <Button
          type="submit"
          colorPalette="red"
          disabled={busy || !targetText}
          loading={busy}
          loadingText="処理中..."
        >
          退会する（取り消せません）
        </Button>
      </styled.form>
    </styled.div>
  );
}
