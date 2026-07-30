import { createFileRoute, Outlet } from "@tanstack/react-router";

// 一覧・詳細・編集モーダルをそれぞれ子ルートが描画するため、ここは素通しにする
export const Route = createFileRoute("/$organizationId/consultants")({
  component: Outlet,
});
