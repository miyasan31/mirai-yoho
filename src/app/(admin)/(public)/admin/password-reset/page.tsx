"use client";

import Link from "next/link";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";

const SUCCESS_MESSAGE =
  "該当メールアドレスにパスワード再設定リンクを送信しました。メールをご確認ください。";

export default function AdminPasswordResetPage() {
  const { sendPasswordResetEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await sendPasswordResetEmail(email);
      setIsSubmitted(true);
    } catch (submitError) {
      const nextError =
        submitError instanceof Error
          ? submitError.message
          : "メール送信に失敗しました。時間をおいて再度お試しください。";
      setError(nextError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <styled.div
      maxW="400px"
      mx="auto"
      mt="20"
      p="6"
      shadow="md"
      rounded="l3"
      border="1px solid"
      borderColor="border"
    >
      <styled.div display="flex" flexDir="column" alignItems="center" mb="6">
        <Text as="h1" textStyle="2xl" fontWeight="bold" mt="3">
          管理者パスワード再設定
        </Text>
        <Text textStyle="sm" color="fg.muted" mt="2" textAlign="center">
          登録済みメールアドレスを入力してください
        </Text>
      </styled.div>

      <styled.form
        onSubmit={handleSubmit}
        display="flex"
        flexDir="column"
        gap="4"
      >
        <Field.Root>
          <Field.Label>メールアドレス</Field.Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field.Root>
        {error && <Text color="fg.error">{error}</Text>}
        {isSubmitted && <Text>{SUCCESS_MESSAGE}</Text>}
        <Button type="submit" loading={isSubmitting} loadingText="送信中...">
          再設定メールを送信
        </Button>
      </styled.form>

      <styled.div display="flex" justifyContent="center" mt="4">
        <Link href="/admin/login">
          <Text
            textStyle="sm"
            color="fg.muted"
            _hover={{ color: "fg.default" }}
          >
            管理者ログインに戻る
          </Text>
        </Link>
      </styled.div>
    </styled.div>
  );
}
