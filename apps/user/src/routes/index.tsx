import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Calendar, MessageCircle, Shield } from "lucide-react";
import { styled } from "styled-system/jsx";
import { envClient } from "@/config/env.client";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <styled.div
      display="flex"
      flexDir="column"
      alignItems="center"
      justifyContent="center"
      minH="100dvh"
      px="8"
    >
      <styled.div textAlign="center" maxW="2xl" mb="12">
        <Text as="h1" textStyle="5xl" fontWeight="bold" mb="4">
          未来予報
        </Text>
        <Text textStyle="lg" color="fg.muted" mb="8" maxW="md" mx="auto">
          あなたの未来を一緒に考える、オンライン相談サービス
        </Text>
        <Button asChild size="lg">
          <a href={`${envClient.adminAppUrl}/admin/login`}>
            ログインする
            <ArrowRight size={18} />
          </a>
        </Button>
      </styled.div>

      <styled.div
        display="grid"
        gridTemplateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
        gap="6"
        maxW="3xl"
        w="full"
      >
        <styled.div
          p="6"
          rounded="l2"
          shadow="sm"
          border="1px solid"
          borderColor="border"
          transition="all"
          transitionDuration="normal"
          _hover={{ shadow: "md" }}
        >
          <Calendar
            size={24}
            color="var(--colors-color-palette-default)"
            style={{ marginBottom: "12px" }}
          />
          <Text fontWeight="semibold" mb="1">
            かんたん予約
          </Text>
          <Text textStyle="sm" color="fg.muted">
            相談員の空き枠から希望の日時を選んで、すぐに予約できます
          </Text>
        </styled.div>
        <styled.div
          p="6"
          rounded="l2"
          shadow="sm"
          border="1px solid"
          borderColor="border"
          transition="all"
          transitionDuration="normal"
          _hover={{ shadow: "md" }}
        >
          <MessageCircle
            size={24}
            color="var(--colors-color-palette-default)"
            style={{ marginBottom: "12px" }}
          />
          <Text fontWeight="semibold" mb="1">
            オンライン相談
          </Text>
          <Text textStyle="sm" color="fg.muted">
            Zoom を使って、どこからでも気軽にご相談いただけます
          </Text>
        </styled.div>
        <styled.div
          p="6"
          rounded="l2"
          shadow="sm"
          border="1px solid"
          borderColor="border"
          transition="all"
          transitionDuration="normal"
          _hover={{ shadow: "md" }}
        >
          <Shield
            size={24}
            color="var(--colors-color-palette-default)"
            style={{ marginBottom: "12px" }}
          />
          <Text fontWeight="semibold" mb="1">
            安心のお支払い
          </Text>
          <Text textStyle="sm" color="fg.muted">
            クレジットカードや PayPay で安全にお支払いいただけます
          </Text>
        </styled.div>
      </styled.div>
    </styled.div>
  );
}
