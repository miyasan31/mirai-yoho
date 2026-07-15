import { ErrorStatusPage } from "@mirai-yoho/ui/components/error-status-page";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Link } from "@tanstack/react-router";
import { SearchX } from "lucide-react";
import { BackNavigationButton } from "@/components/back-navigation-button";
import { useAuth } from "@/hooks/use-auth";

export default function NotFound() {
  const { currentOrganizationId } = useAuth();

  return (
    <ErrorStatusPage
      icon={SearchX}
      statusCode="404"
      title="ページが見つかりません"
      description="指定されたページは存在しないか、すでに移動された可能性があります。"
      hint="URL を確認して、もう一度アクセスしてください。"
      actions={
        currentOrganizationId ? (
          <>
            <BackNavigationButton
              fallbackHref={`/${currentOrganizationId}/home`}
            />
            <Button asChild>
              <Link
                to="/$organizationId/home"
                params={{ organizationId: currentOrganizationId }}
              >
                ホームへ戻る
              </Link>
            </Button>
          </>
        ) : (
          <>
            <BackNavigationButton fallbackHref="/login" />
            <Button asChild>
              <Link to="/login">ログイン画面へ</Link>
            </Button>
          </>
        )
      }
    />
  );
}
