import { Button, type ButtonProps } from "@mirai-yoho/ui/components/ui/button";
import { useRouter } from "@tanstack/react-router";

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
          router.history.back();
          return;
        }
        router.history.push(fallbackHref);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
