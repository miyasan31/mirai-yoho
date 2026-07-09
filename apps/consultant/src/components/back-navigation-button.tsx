import { Button, type ButtonProps } from "@mirai-yoho/ui/components/ui/button";
import { useNavigate, useRouter } from "@tanstack/react-router";

interface BackNavigationButtonProps extends Omit<ButtonProps, "onClick"> {
  fallbackHref?: string;
}

export function BackNavigationButton({
  fallbackHref = "/login",
  children = "前の画面に戻る",
  ...props
}: BackNavigationButtonProps) {
  const router = useRouter();
  const navigate = useNavigate();

  return (
    <Button
      variant="outline"
      onClick={() => {
        if (window.history.length > 1) {
          router.history.back();
          return;
        }
        void navigate({ href: fallbackHref });
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
