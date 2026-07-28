import { EmptyState } from "@mirai-yoho/ui/components/empty-state";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Store } from "lucide-react";
import { styled } from "styled-system/jsx";
import { BOOKABLE_ORGANIZATIONS } from "@/config/bookable-organizations";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/mypage/organizations")({
  head: () => pageHead("店舗一覧"),
  component: MypageOrganizationsPage,
});

function MypageOrganizationsPage() {
  return (
    <styled.div display="flex" flexDir="column" gap="4">
      <styled.section>
        <Text as="h1" textStyle="2xl" fontWeight="bold">
          予約可能な店舗
        </Text>
        <Text color="fg.muted" textStyle="sm" mt="1">
          店舗を選ぶと、所属する占い師の一覧が表示されます
        </Text>
      </styled.section>

      {BOOKABLE_ORGANIZATIONS.length === 0 ? (
        <EmptyState
          icon={Store}
          message="現在予約可能な店舗はありません"
          hint="新しい店舗が公開されるとここに表示されます"
        />
      ) : (
        <styled.ul display="flex" flexDir="column" gap="2" listStyle="none">
          {BOOKABLE_ORGANIZATIONS.map((organization) => (
            <styled.li key={organization.organizationId}>
              <Link
                to="/$organizationId/consultants"
                params={{ organizationId: organization.organizationId }}
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
                      {organization.name}
                    </Text>
                    <Text textStyle="xs" color="fg.muted">
                      {organization.description}
                    </Text>
                  </styled.div>
                  <ChevronRight size={18} color="var(--colors-fg-muted)" />
                </styled.div>
              </Link>
            </styled.li>
          ))}
        </styled.ul>
      )}
    </styled.div>
  );
}
