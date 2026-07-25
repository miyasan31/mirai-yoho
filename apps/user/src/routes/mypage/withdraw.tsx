import { withdrawCustomer } from "@mirai-yoho/api-client/api/customer/customer";
import { ApiResponseError } from "@mirai-yoho/api-client/custom-fetch";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/mypage/withdraw")({
  head: () => pageHead("退会"),
  component: WithdrawPage,
});

function WithdrawPage() {
  const { profile, signOut } = useCustomerAuth();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  const targetText = profile?.primaryEmail ?? profile?.displayName ?? "";

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!confirmation || confirmation !== targetText) {
      toaster.create({
        type: "error",
        title: profile?.primaryEmail
          ? "確認のためメールアドレスを正しく入力してください"
          : "確認のためお名前を正しく入力してください",
      });
      return;
    }
    startTransition(async () => {
      try {
        await withdrawCustomer();
        await signOut();
        navigate({ to: "/" });
      } catch (e) {
        // API エラーは custom-fetch の toaster で表示される
        if (!(e instanceof ApiResponseError)) {
          toaster.create({
            type: "error",
            title: e instanceof Error ? e.message : "退会に失敗しました",
          });
        }
      }
    });
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
        <Field.Root>
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
        </Field.Root>
        <Button
          type="submit"
          colorPalette="red"
          disabled={isPending || !targetText}
          loading={isPending}
          loadingText="処理中..."
        >
          退会する（取り消せません）
        </Button>
      </styled.form>
    </styled.div>
  );
}
