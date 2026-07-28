import { valibotResolver } from "@hookform/resolvers/valibot";
import { updateCustomerProfile } from "@mirai-yoho/api-client/api/customer/customer";
import { ApiResponseError } from "@mirai-yoho/api-client/custom-fetch";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import * as Field from "@mirai-yoho/ui/components/ui/field";
import { Input } from "@mirai-yoho/ui/components/ui/input";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import { pageHead } from "@/lib/head";
import {
  clearPendingOrganizationId,
  readPendingOrganizationId,
} from "@/lib/pending-organization";
import {
  type ProfileFormValues,
  profileFormSchema,
} from "./-profile-form-schema";

interface ProfileSearch {
  returnTo?: string;
}

export const Route = createFileRoute("/mypage/profile")({
  head: () => pageHead("プロフィール"),
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
  const router = useRouter();
  const { returnTo } = Route.useSearch();

  const googleProviderData = user?.providerData.find(
    (p) => p.providerId === "google.com",
  );

  const redirectAfterSignup = () => {
    if (returnTo) {
      router.history.push(returnTo);
      return;
    }
    const pendingOrgId = readPendingOrganizationId();
    if (pendingOrgId) {
      clearPendingOrganizationId();
      router.navigate({
        to: "/$organizationId/consultants",
        params: { organizationId: pendingOrgId },
      });
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: valibotResolver(profileFormSchema),
    defaultValues: {
      displayName:
        profile?.displayName ?? googleProviderData?.displayName ?? "",
      primaryEmail: profile?.primaryEmail ?? googleProviderData?.email ?? "",
      phoneNumber: profile?.phoneNumber ?? "",
      birthDate: profile?.birthDate ?? "",
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const wasSignup = !isSignedUp;
      if (wasSignup) {
        await signupOrLink({
          displayName: values.displayName,
          birthDate: values.birthDate,
          primaryEmail: values.primaryEmail,
          phoneNumber: values.phoneNumber,
          providerUid: googleProviderData?.uid ?? undefined,
        });
      } else {
        await updateCustomerProfile({
          displayName: values.displayName,
          primaryEmail: values.primaryEmail,
          phoneNumber: values.phoneNumber,
          birthDate: values.birthDate,
        });
        await refreshProfile();
      }
      toaster.create({ type: "success", title: "プロフィールを保存しました" });
      if (wasSignup) {
        redirectAfterSignup();
      }
    } catch (error) {
      // API エラーは custom-fetch の toaster で表示される
      if (!(error instanceof ApiResponseError)) {
        toaster.create({
          type: "error",
          title: error instanceof Error ? error.message : "保存に失敗しました",
        });
      }
    }
  };

  const onLinkGoogle = async () => {
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
      // API エラーは custom-fetch の toaster で表示される
      if (!(error instanceof ApiResponseError)) {
        toaster.create({
          type: "error",
          title: error instanceof Error ? error.message : "連携に失敗しました",
        });
      }
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
          <Field.Label>メールアドレス</Field.Label>
          <Input
            id="primaryEmail"
            type="email"
            // Google 連携済みの場合は Google アカウントのメールアドレスを正とする
            disabled={hasGoogleProvider}
            {...register("primaryEmail")}
          />
          <Field.HelperText>
            {hasGoogleProvider
              ? "連携中の Google アカウントのメールアドレスです。"
              : "Zoom 連携と各種ご連絡に使用します。"}
          </Field.HelperText>
          {errors.primaryEmail && (
            <Field.ErrorText>{errors.primaryEmail.message}</Field.ErrorText>
          )}
        </Field.Root>

        <Field.Root invalid={!!errors.phoneNumber}>
          <Field.Label>電話番号</Field.Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="090-1234-5678"
            {...register("phoneNumber")}
          />
          <Field.HelperText>
            予約時に自動で入力されます。（ハイフンあり・なし可）
          </Field.HelperText>
          {errors.phoneNumber && (
            <Field.ErrorText>{errors.phoneNumber.message}</Field.ErrorText>
          )}
        </Field.Root>

        <Field.Root invalid={!!errors.birthDate}>
          <Field.Label>生年月日</Field.Label>
          <Input id="birthDate" type="date" {...register("birthDate")} />
          <Field.HelperText>
            設定すると誕生月にはお得なクーポンが取得できます。
          </Field.HelperText>
          {errors.birthDate && (
            <Field.ErrorText>{errors.birthDate.message}</Field.ErrorText>
          )}
        </Field.Root>

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
          <Button variant="outline" onClick={onLinkGoogle}>
            Google で連携する
          </Button>
        </styled.section>
      )}

      {isSignedUp && (
        <styled.section
          borderTopWidth="1"
          borderColor="border"
          pt="4"
          display="flex"
          flexDir="column"
          alignItems="flex-start"
          gap="2"
        >
          <Text textStyle="sm" color="fg.muted">
            サービスのご利用をやめる場合は、退会の手続きができます。
          </Text>
          <Link to="/mypage/withdraw">
            <Text
              as="span"
              textStyle="sm"
              color="fg.muted"
              textDecoration="underline"
              _hover={{ color: "fg.default" }}
            >
              退会について
            </Text>
          </Link>
        </styled.section>
      )}
    </styled.div>
  );
}
