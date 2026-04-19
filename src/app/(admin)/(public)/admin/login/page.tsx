"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";

export default function AdminLoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const result = await signIn(email, password);
      if (!result.currentOrganizationId) {
        throw new Error("No organization available");
      }
      if (result.currentRole !== "admin" && result.currentRole !== "operator") {
        throw new Error("No admin access");
      }
      router.push(`/${result.currentOrganizationId}/admin/dashboard`);
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
        <ShieldCheck size={40} color="var(--colors-color-palette-default)" />
        <Text as="h1" textStyle="2xl" fontWeight="bold" mt="3">
          管理者ログイン
        </Text>
        <Text textStyle="sm" color="fg.muted" mt="2" textAlign="center">
          管理者・オペレーター向けの管理画面にログインします。
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
        <Field.Root>
          <Field.Label>パスワード</Field.Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field.Root>
        {error && <Text color="fg.error">{error}</Text>}
        <Button type="submit">ログイン</Button>
      </styled.form>
      <styled.div display="flex" justifyContent="center" mt="3">
        <Link href="/admin/password-reset">
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
