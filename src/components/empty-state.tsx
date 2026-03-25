import type { LucideIcon } from "lucide-react";
import { styled } from "styled-system/jsx";
import { Text } from "@/components/ui/text";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  hint?: string;
}

export function EmptyState({ icon: Icon, message, hint }: EmptyStateProps) {
  return (
    <styled.div
      display="flex"
      flexDir="column"
      alignItems="center"
      gap="2"
      py="12"
    >
      <Icon size={48} color="var(--colors-fg-subtle)" />
      <Text textStyle="md" fontWeight="medium" color="fg.muted">
        {message}
      </Text>
      {hint && (
        <Text textStyle="sm" color="fg.subtle">
          {hint}
        </Text>
      )}
    </styled.div>
  );
}
