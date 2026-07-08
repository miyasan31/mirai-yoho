import { valibotResolver } from "@hookform/resolvers/valibot";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { useAuth } from "@/hooks/use-auth";
import { ADMIN_NAV_PERMISSIONS } from "../nav-items";
import { type LoginFormValues, loginFormSchema } from "./login-form-schema";

export default function AdminLoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
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
    try {
      const result = await signIn(values.email, values.password);
      if (!result.currentOrganizationId) {
        throw new Error("No organization available");
      }
      const hasAdminAccess = result.currentPermissions.some((permission) =>
        ADMIN_NAV_PERMISSIONS.includes(permission),
      );
      if (!hasAdminAccess) {
        throw new Error("No admin access");
      }
      void navigate({
        to: "/$organizationId/admin/home",
        params: { organizationId: result.currentOrganizationId },
      });
    } catch {
      toaster.create({ type: "error", title: "ログインに失敗しました" });
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
        <Button type="submit">ログイン</Button>
      </styled.form>
      <styled.div display="flex" justifyContent="center" mt="3">
        <Link to="/admin/password-reset">
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
