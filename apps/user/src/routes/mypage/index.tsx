import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute, Link } from "@tanstack/react-router";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";

export const Route = createFileRoute("/mypage/")({
  component: MypageDashboardPage,
});

function MypageDashboardPage() {
  const { profile, isSignedUp, isAnonymous, hasActiveZoomConnection } =
    useCustomerAuth();

  if (!isSignedUp) {
    return (
      <styled.div
        border="1px solid"
        borderColor="border"
        rounded="l3"
        p="6"
        display="flex"
        flexDir="column"
        gap="3"
      >
        <Text as="h1" textStyle="xl" fontWeight="bold">
          ようこそ
        </Text>
        <Text color="fg.muted">
          会員情報の登録を完了するとマイページをご利用いただけます。
        </Text>
        <Link to="/mypage/profile">
          <Button>会員情報を登録する</Button>
        </Link>
      </styled.div>
    );
  }

  return (
    <styled.div display="flex" flexDir="column" gap="4">
      <styled.section>
        <Text as="h1" textStyle="2xl" fontWeight="bold">
          {profile?.displayName} さん
        </Text>
        <Text color="fg.muted" textStyle="sm" mt="1">
          マイページへようこそ
        </Text>
      </styled.section>

      {!hasActiveZoomConnection && (
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
          <Text fontWeight="medium">Zoom 連携が必要です</Text>
          <Text textStyle="sm" color="fg.muted">
            ご予約には Zoom アカウントの連携が必要です。
          </Text>
          <Link to="/mypage/zoom">
            <Button size="sm">Zoom を連携する</Button>
          </Link>
        </styled.section>
      )}

      {isAnonymous && (
        <styled.section
          border="1px solid"
          borderColor="border"
          rounded="l3"
          p="4"
          display="flex"
          flexDir="column"
          gap="2"
        >
          <Text fontWeight="medium">Google アカウントと連携しませんか？</Text>
          <Text textStyle="sm" color="fg.muted">
            連携すると、別の端末からもログインしてご利用いただけます。
          </Text>
          <Link to="/mypage/profile">
            <Button size="sm" variant="outline">
              プロフィールへ
            </Button>
          </Link>
        </styled.section>
      )}
    </styled.div>
  );
}
