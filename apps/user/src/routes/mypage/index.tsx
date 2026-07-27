import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Skeleton } from "@mirai-yoho/ui/components/ui/skeleton";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Store } from "lucide-react";
import { styled } from "styled-system/jsx";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import {
  useVisitedOrganizations,
  type VisitedOrganization,
} from "@/hooks/use-visited-organizations";
import { pageHead } from "@/lib/head";
import { ReagreementNoticeSection } from "@/pages/policies/reagreement-notice-section";

export const Route = createFileRoute("/mypage/")({
  head: () => pageHead("マイページ"),
  component: MypageDashboardPage,
});

function MypageDashboardPage() {
  const { profile, isSignedUp, isAnonymous, hasActiveZoomConnection } =
    useCustomerAuth();
  const { organizations: visitedOrganizations, isLoading: isBookingsLoading } =
    useVisitedOrganizations();

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

      <ReagreementNoticeSection organizations={visitedOrganizations} />

      <VisitedOrganizationsSection
        isLoading={isBookingsLoading}
        organizations={visitedOrganizations}
      />
    </styled.div>
  );
}

function VisitedOrganizationsSection({
  isLoading,
  organizations,
}: {
  isLoading: boolean;
  organizations: VisitedOrganization[];
}) {
  if (!isLoading && organizations.length === 0) {
    return null;
  }

  return (
    <styled.section display="flex" flexDir="column" gap="3">
      <styled.div display="flex" alignItems="baseline" gap="2">
        <Text as="h2" textStyle="lg" fontWeight="semibold">
          予約した店舗
        </Text>
        <Text textStyle="sm" color="fg.muted">
          続けて予約できます
        </Text>
      </styled.div>
      {isLoading ? (
        <styled.div display="flex" flexDir="column" gap="2">
          <Skeleton height="14" />
          <Skeleton height="14" />
        </styled.div>
      ) : (
        <styled.ul display="flex" flexDir="column" gap="2" listStyle="none">
          {organizations.map((org) => (
            <styled.li key={org.organizationId}>
              <Link
                to="/$organizationId/consultants"
                params={{ organizationId: org.organizationId }}
              >
                <styled.div
                  display="flex"
                  alignItems="center"
                  gap="3"
                  border="1px solid"
                  borderColor="border"
                  rounded="l2"
                  p="4"
                  shadow="sm"
                  transition="all"
                  transitionDuration="normal"
                  _hover={{ bg: "bg.muted", shadow: "md" }}
                >
                  <Store size={20} color="var(--colors-fg-muted)" />
                  <styled.div flex="1" minW="0">
                    <Text fontWeight="medium" truncate>
                      {org.organizationName ?? org.organizationId}
                    </Text>
                    <Text textStyle="xs" color="fg.muted">
                      占い師を選んで予約する
                    </Text>
                  </styled.div>
                  <ChevronRight size={18} color="var(--colors-fg-muted)" />
                </styled.div>
              </Link>
            </styled.li>
          ))}
        </styled.ul>
      )}
    </styled.section>
  );
}
