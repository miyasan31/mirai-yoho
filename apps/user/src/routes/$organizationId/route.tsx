import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { CircleUser } from "lucide-react";
import { styled } from "styled-system/jsx";

export const Route = createFileRoute("/$organizationId")({
  component: OrganizationLayout,
});

function OrganizationLayout() {
  return (
    <>
      <styled.header
        position="sticky"
        top="0"
        zIndex="sticky"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap="3"
        px={{ base: "4", md: "6" }}
        py="3"
        bg="bg.default"
        borderBottomWidth="1"
        borderColor="border"
      >
        <Link to="/">
          <Text as="span" textStyle="md" fontWeight="bold">
            あなたのみらい予報
          </Text>
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link to="/mypage">
            <CircleUser size={16} />
            マイページ
          </Link>
        </Button>
      </styled.header>
      <Outlet />
    </>
  );
}
