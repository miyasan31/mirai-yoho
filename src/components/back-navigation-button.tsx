"use client";

import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";

interface BackNavigationButtonProps extends Omit<ButtonProps, "onClick"> {
  fallbackHref?: string;
}

export function BackNavigationButton({
  fallbackHref = "/",
  children = "前の画面に戻る",
  ...props
}: BackNavigationButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
