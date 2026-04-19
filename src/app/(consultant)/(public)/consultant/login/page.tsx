"use client";

import { valibotResolver } from "@hookform/resolvers/valibot";
import { UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";
import { type LoginFormValues, loginFormSchema } from "./login-form-schema";

export default function ConsultantLoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: valibotResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setError("");
    try {
      const result = await signIn(values.email, values.password);
      if (
        !result.currentOrganizationId ||
        result.currentRole !== "consultant"
      ) {
        throw new Error("No consultant access");
      }
      router.push(`/${result.currentOrganizationId}/consultant/bookings`);
    } catch {
      setError("ログインに失敗しました");
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
        <UserCircle size={40} color="var(--colors-color-palette-default)" />
        <Text as="h1" textStyle="2xl" fontWeight="bold" mt="3">
          相談員ログイン
        </Text>
        <Text textStyle="sm" color="fg.muted" mt="2" textAlign="center">
          相談員向けメニューにログインして予約対応やスケジュール管理を行います。
        </Text>
      </styled.div>
      <styled.form
        onSubmit={handleSubmit(onSubmit)}
        display="flex"
        flexDir="column"
        gap="4"
      >
        <Field.Root invalid={!!errors.email}>
          <Field.Label>メールアドレス</Field.Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <Field.ErrorText>{errors.email.message}</Field.ErrorText>
          )}
        </Field.Root>
        <Field.Root invalid={!!errors.password}>
          <Field.Label>パスワード</Field.Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && (
            <Field.ErrorText>{errors.password.message}</Field.ErrorText>
          )}
        </Field.Root>
        {error && <Text color="fg.error">{error}</Text>}
        <Button type="submit">ログイン</Button>
      </styled.form>
      <styled.div display="flex" justifyContent="center" mt="3">
        <Link href="/consultant/password-reset">
          <Text
            textStyle="sm"
            color="fg.muted"
            _hover={{ color: "fg.default" }}
          >
            パスワードをお忘れですか？
          </Text>
        </Link>
      </styled.div>
    </styled.div>
  );
}
