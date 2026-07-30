import { createFileRoute, Outlet } from "@tanstack/react-router";
import { pageHead } from "@/lib/head";
import ConsoleConsultantDetailPage from "@/pages/consultants/detail-page";

function ConsoleConsultantDetailRoute() {
  return (
    <>
      <ConsoleConsultantDetailPage />
      {/* 編集モーダル（/consultants/:id/edit）を詳細ページに重ねる */}
      <Outlet />
    </>
  );
}

export const Route = createFileRoute("/$organizationId/consultants/$id")({
  head: () => pageHead("占い師詳細"),
  component: ConsoleConsultantDetailRoute,
});
