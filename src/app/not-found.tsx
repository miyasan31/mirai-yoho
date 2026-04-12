import { SearchX } from "lucide-react";
import Link from "next/link";
import { BackNavigationButton } from "@/components/back-navigation-button";
import { ErrorStatusPage } from "@/components/error-status-page";
import { Button } from "@/components/ui/button";

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
          <BackNavigationButton fallbackHref="/" />
          <Button asChild>
            <Link href="/">トップへ戻る</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/login">管理者ログインへ</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/consultant/login">相談員ログインへ</Link>
          </Button>
        </>
      }
    />
  );
}
