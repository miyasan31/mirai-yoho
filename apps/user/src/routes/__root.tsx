import { ErrorStatusPage } from "@mirai-yoho/ui/components/error-status-page";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Toaster } from "@mirai-yoho/ui/components/ui/toast";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { SearchX } from "lucide-react";
import { BackNavigationButton } from "@/components/back-navigation-button";
import { MobileBackButton } from "@/components/mobile-back-button";
import { useCapturePendingOrganizationId } from "@/hooks/use-capture-pending-organization";
import { pageHead } from "@/lib/head";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  useCapturePendingOrganizationId();
  return (
    <>
      <HeadContent />
      <Outlet />
      <MobileBackButton />
      <Toaster />
    </>
  );
}

function NotFound() {
  return (
    <>
      <title>{pageHead("ページが見つかりません").meta[0].title}</title>
      <ErrorStatusPage
        icon={SearchX}
        statusCode="404"
        title="ページが見つかりません"
        description="指定されたページは存在しないか、すでに移動された可能性があります。"
        hint="URL を確認して、もう一度アクセスしてください。"
        actions={
          <>
            <BackNavigationButton fallbackHref="/" />
            <Button asChild>
              <Link to="/">トップへ戻る</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/mypage">マイページへ</Link>
            </Button>
          </>
        }
      />
    </>
  );
}
