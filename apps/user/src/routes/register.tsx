import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Spinner } from "@mirai-yoho/ui/components/ui/spinner";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { toaster } from "@mirai-yoho/ui/components/ui/toast";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useEffect, useTransition } from "react";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import {
  clearPendingOrganizationId,
  readPendingOrganizationId,
} from "@/lib/pending-organization";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { user, isSignedUp, isLoading, signInAnonymously, signInWithGoogle } =
    useCustomerAuth();
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  // 既にサインイン済みの場合は状態に応じてリダイレクトする
  useEffect(() => {
    if (isLoading || !user) return;
    if (isSignedUp) {
      const pendingOrgId = readPendingOrganizationId();
      if (pendingOrgId) {
        clearPendingOrganizationId();
        navigate({
          to: "/$organizationId/consultants",
          params: { organizationId: pendingOrgId },
        });
        return;
      }
      navigate({ to: "/mypage" });
    } else {
      navigate({ to: "/mypage/profile", search: {} });
    }
  }, [isLoading, user, isSignedUp, navigate]);

  if (isLoading || user) {
    return (
      <styled.div
        display="flex"
        justifyContent="center"
        alignItems="center"
        minH="60vh"
      >
        <Spinner />
      </styled.div>
    );
  }

  const startGuest = () => {
    startTransition(async () => {
      try {
        await signInAnonymously();
      } catch (error) {
        toaster.create({
          type: "error",
          title:
            error instanceof Error ? error.message : "会員登録に失敗しました",
        });
      }
    });
  };

  const startGoogle = () => {
    startTransition(async () => {
      try {
        await signInWithGoogle();
      } catch (error) {
        toaster.create({
          type: "error",
          title:
            error instanceof Error ? error.message : "ログインに失敗しました",
        });
      }
    });
  };

  return (
    <styled.div
      maxW="lg"
      mx="auto"
      px={{ base: "4", md: "8" }}
      py="12"
      display="flex"
      flexDir="column"
      gap="6"
    >
      <styled.div display="flex" flexDir="column" gap="2">
        <styled.div display="flex" alignItems="center" gap="2">
          <UserPlus size={20} />
          <Text as="h1" textStyle="2xl" fontWeight="bold">
            会員登録
          </Text>
        </styled.div>
        <Text textStyle="sm" color="fg.muted">
          お名前と生年月日だけで、すぐにご利用を開始できます。 Google
          アカウントで登録すると、別の端末からもログインしてご利用いただけます。
        </Text>
      </styled.div>

      <styled.div display="flex" flexDir="column" gap="3">
        <Button onClick={startGuest} loading={isPending}>
          ゲストとして会員登録する
        </Button>
        <Button variant="outline" onClick={startGoogle} disabled={isPending}>
          Google アカウントで会員登録する
        </Button>
      </styled.div>

      <styled.div
        borderTop="1px solid"
        borderColor="border"
        pt="4"
        display="flex"
        flexDir="column"
        gap="2"
      >
        <Text textStyle="sm" color="fg.muted">
          既に Google アカウントで登録済みの方は
          <Link
            to="/mypage"
            style={{ textDecoration: "underline", marginLeft: "0.25rem" }}
          >
            マイページ
          </Link>
          からログインしてください。
        </Text>
        <Text textStyle="xs" color="fg.muted">
          会員登録により
          <Link
            to="/terms"
            style={{ textDecoration: "underline", marginLeft: "0.25rem" }}
          >
            利用規約
          </Link>
          および
          <Link
            to="/cancellation-policy"
            style={{ textDecoration: "underline", marginLeft: "0.25rem" }}
          >
            キャンセルポリシー
          </Link>
          に同意したものとみなされます。
        </Text>
      </styled.div>
    </styled.div>
  );
}
