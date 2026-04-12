import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { styled } from "styled-system/jsx";
import { Text } from "@/components/ui/text";

interface ErrorStatusPageProps {
  icon: LucideIcon;
  statusCode: "401" | "403" | "404";
  title: string;
  description: string;
  hint?: string;
  actions: ReactNode;
}

export function ErrorStatusPage({
  icon: Icon,
  statusCode,
  title,
  description,
  hint,
  actions,
}: ErrorStatusPageProps) {
  return (
    <styled.main
      minH="100dvh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px="6"
      py="12"
    >
      <styled.section
        maxW="xl"
        w="full"
        border="1px solid"
        borderColor="border"
        rounded="l3"
        shadow="md"
        p={{ base: "6", md: "8" }}
      >
        <styled.div display="flex" alignItems="center" gap="3" mb="4">
          <styled.span
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            rounded="full"
            w="12"
            h="12"
            bg="bg.subtle"
            color="fg.muted"
          >
            <Icon size={24} />
          </styled.span>
          <styled.div>
            <Text textStyle="sm" color="fg.muted" fontWeight="bold">
              Error {statusCode}
            </Text>
            <Text as="h1" textStyle="2xl" fontWeight="bold">
              {title}
            </Text>
          </styled.div>
        </styled.div>

        <Text textStyle="md" color="fg.default">
          {description}
        </Text>
        {hint ? (
          <Text textStyle="sm" color="fg.muted" mt="2">
            {hint}
          </Text>
        ) : null}

        <styled.div
          mt="6"
          display="flex"
          flexWrap="wrap"
          gap="2"
          alignItems="center"
        >
          {actions}
        </styled.div>
      </styled.section>
    </styled.main>
  );
}
