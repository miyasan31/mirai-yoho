import { ErrorStatusPage } from "@mirai-yoho/ui/components/error-status-page";
import { Button } from "@mirai-yoho/ui/components/ui/button";
import { Link } from "@tanstack/react-router";
import { SearchX } from "lucide-react";
import { BackNavigationButton } from "@/components/back-navigation-button";

export default function NotFound() {
  return (
    <ErrorStatusPage
      icon={SearchX}
      statusCode="404"
      title="ページが見つかりません"
      description="指定されたページは存在しないか、すでに移動された可能性があります。"
      hint="URL を確認して、もう一度アクセスしてください。"
      actions={
        <>
          <BackNavigationButton fallbackHref="/login" />
          <Button asChild>
            <Link to="/login">トップへ戻る</Link>
          </Button>
        </>
      }
    />
  );
}
