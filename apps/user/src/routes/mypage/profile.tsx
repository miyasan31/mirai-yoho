import { valibotResolver } from "@hookform/resolvers/valibot";
import { updateCustomerProfile } from "@mirai-yoho/api-client/api/customer/customer";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import {
  type ProfileFormValues,
  profileFormSchema,
} from "./-profile-form-schema";

interface ProfileSearch {
  returnTo?: string;
}

export const Route = createFileRoute("/mypage/profile")({
  validateSearch: (search: Record<string, unknown>): ProfileSearch => ({
    returnTo: typeof search.returnTo === "string" ? search.returnTo : undefined,
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const {
    user,
    profile,
    isSignedUp,
    isAnonymous,
    hasGoogleProvider,
    signupOrLink,
    linkGoogleAccount,
    refreshProfile,
  } = useCustomerAuth();
  const [submitError, setSubmitError] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState<string>("");
  const [linkError, setLinkError] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: valibotResolver(profileFormSchema),
    defaultValues: {
      displayName: profile?.displayName ?? "",
      primaryEmail: profile?.primaryEmail ?? "",
      birthDate: profile?.birthDate ?? "",
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    setSubmitError("");
    setSubmitSuccess("");
    try {
      if (!isSignedUp) {
        await signupOrLink({
          displayName: values.displayName,
          birthDate: values.birthDate,
          primaryEmail: values.primaryEmail || undefined,
        });
      } else {
        await updateCustomerProfile({
          displayName: values.displayName,
          primaryEmail: values.primaryEmail || undefined,
          birthDate: values.birthDate,
        });
        await refreshProfile();
      }
      setSubmitSuccess("プロフィールを保存しました");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "保存に失敗しました",
      );
    }
  };

  const onLinkGoogle = async () => {
    setLinkError("");
    try {
      const linkedUser = await linkGoogleAccount();
      const googleData = linkedUser.providerData.find(
        (p) => p.providerId === "google.com",
      );
      if (!googleData || !googleData.email || !googleData.uid) {
        throw new Error("Google アカウント情報を取得できませんでした");
      }
      await signupOrLink({
        displayName: profile?.displayName ?? "",
        birthDate: profile?.birthDate ?? "",
        providerUid: googleData.uid,
        primaryEmail: googleData.email,
      });
      await refreshProfile();
    } catch (error) {
      setLinkError(
        error instanceof Error ? error.message : "連携に失敗しました",
      );
    }
  };

  if (!user) {
    return null;
  }

  return (
    <styled.div display="flex" flexDir="column" gap="6">
      <Text as="h1" textStyle="2xl" fontWeight="bold">
        プロフィール
      </Text>

      <styled.form
        onSubmit={handleSubmit(onSubmit)}
        display="flex"
        flexDir="column"
        gap="4"
        maxW="480px"
      >
        <Field.Root invalid={!!errors.displayName}>
          <Field.Label>お名前</Field.Label>
          <Input id="displayName" {...register("displayName")} />
          {errors.displayName && (
            <Field.ErrorText>{errors.displayName.message}</Field.ErrorText>
          )}
        </Field.Root>

        <Field.Root invalid={!!errors.primaryEmail}>
          <Field.Label>メールアドレス（任意）</Field.Label>
          <Input
            id="primaryEmail"
            type="email"
            disabled={isAnonymous && !hasGoogleProvider}
            {...register("primaryEmail")}
          />
          {isAnonymous && !hasGoogleProvider && (
            <Field.HelperText>
              メールアドレスを設定するには Google アカウントの連携が必要です。
            </Field.HelperText>
          )}
          {errors.primaryEmail && (
            <Field.ErrorText>{errors.primaryEmail.message}</Field.ErrorText>
          )}
        </Field.Root>

        <Field.Root invalid={!!errors.birthDate}>
          <Field.Label>生年月日</Field.Label>
          <Input id="birthDate" type="date" {...register("birthDate")} />
          {errors.birthDate && (
            <Field.ErrorText>{errors.birthDate.message}</Field.ErrorText>
          )}
        </Field.Root>

        {submitError && <Text color="fg.error">{submitError}</Text>}
        {submitSuccess && <Text color="fg.success">{submitSuccess}</Text>}

        <Button type="submit" loading={isSubmitting}>
          {isSignedUp ? "更新する" : "登録する"}
        </Button>
      </styled.form>

      {isAnonymous && !hasGoogleProvider && isSignedUp && (
        <styled.section
          border="1px solid"
          borderColor="border"
          rounded="l3"
          p="4"
          display="flex"
          flexDir="column"
          gap="2"
        >
          <Text fontWeight="medium">Google アカウントと連携</Text>
          <Text textStyle="sm" color="fg.muted">
            連携すると別の端末からもログインしてご利用いただけます。
          </Text>
          {linkError && <Text color="fg.error">{linkError}</Text>}
          <Button variant="outline" onClick={onLinkGoogle}>
            Google で連携する
          </Button>
        </styled.section>
      )}
    </styled.div>
  );
}
