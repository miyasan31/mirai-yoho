import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Text } from "@mirai-yoho/ui/components/ui/text";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, MessageCircle, Shield } from "lucide-react";
import { styled } from "styled-system/jsx";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/")({
  head: () => pageHead("トップ"),
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
      <styled.div textAlign="center" maxW="2xl" mb="8">
        <Text as="h1" textStyle="5xl" fontWeight="bold" mb="4">
          あなたのみらい予報
        </Text>
        <Text textStyle="lg" color="fg.muted" maxW="md" mx="auto">
          一般社団法人JKKが運営する、オンライン鑑定サービス
        </Text>
      </styled.div>

      <styled.div
        display="flex"
        flexDir={{ base: "column", sm: "row" }}
        gap="3"
        mb="12"
      >
        <Button asChild size="lg">
          <Link to="/register">会員登録して始める</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/mypage">ログイン</Link>
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
            占い師の空き枠から希望の日時を選んで、すぐに予約できます
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
