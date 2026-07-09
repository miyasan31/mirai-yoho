import { valibotResolver } from "@hookform/resolvers/valibot";
import { useAuth } from "@mirai-yoho/console-core/hooks/use-auth";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import {
  type PasswordResetFormValues,
  passwordResetFormSchema,
} from "./password-reset-form-schema";

export default function ConsultantPasswordResetPage() {
  const { sendPasswordResetEmail } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetFormValues>({
    resolver: valibotResolver(passwordResetFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: PasswordResetFormValues) => {
    try {
      await sendPasswordResetEmail(values.email);
      toaster.create({
        type: "success",
        title:
          "該当メールアドレスにパスワード再設定リンクを送信しました。メールをご確認ください。",
      });
    } catch (submitError) {
      toaster.create({
        type: "error",
        title:
          submitError instanceof Error
            ? submitError.message
            : "メール送信に失敗しました。時間をおいて再度お試しください。",
      });
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
          相談員パスワード再設定
        </Text>
        <Text textStyle="sm" color="fg.muted" mt="2" textAlign="center">
          相談員アカウントの再設定メールを送信します。
        </Text>
        <Text textStyle="sm" color="fg.muted" textAlign="center">
          登録済みメールアドレスを入力してください。
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
        <Button type="submit" loading={isSubmitting} loadingText="送信中...">
          再設定メールを送信
        </Button>
      </styled.form>

      <styled.div display="flex" justifyContent="center" mt="4">
        <Link to="/login">
          <Text
            textStyle="sm"
            color="fg.muted"
            _hover={{ color: "fg.default" }}
          >
            相談員ログインに戻る
          </Text>
        </Link>
      </styled.div>
    </styled.div>
  );
}
