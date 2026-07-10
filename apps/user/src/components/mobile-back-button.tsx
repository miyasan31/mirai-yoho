import { FloatingBackButton } from "@mirai-yoho/ui/components/floating-back-button";
import { useRouter, useRouterState } from "@tanstack/react-router";

/** 戻るボタンを表示しないパス（トップページ） */
const HIDDEN_PATHS = new Set<string>(["/"]);

/**
 * スマホ幅で左下に固定表示する戻るボタン（router 依存部分）。
 * トップページ、または戻り先の履歴が無い場合は非表示にする。
 */
export function MobileBackButton() {
  const router = useRouter();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const canGoBack = typeof window !== "undefined" && window.history.length > 1;
  const hidden = HIDDEN_PATHS.has(pathname) || !canGoBack;

  const handleBack = () => {
    if (window.history.length > 1) {
      router.history.back();
      return;
    }
    router.history.push("/");
  };

  return <FloatingBackButton onClick={handleBack} hidden={hidden} />;
}
