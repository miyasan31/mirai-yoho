"use client";

import { UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { styled } from "styled-system/jsx";
import { Button } from "@/components/ui/button";
import * as Field from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";

export default function ConsultantLoginPage() {
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
      <styled.div display="flex" justifyContent="center" mt="4">
        <Link href="/admin/login">
          <Text
            textStyle="sm"
            color="fg.muted"
            _hover={{ color: "fg.default" }}
          >
            管理者ログインはこちら
          </Text>
        </Link>
      </styled.div>
    </styled.div>
  );
}
