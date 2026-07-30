export interface BookableOrganization {
  organizationId: string;
  name: string;
  description: string;
}

// 予約可能な店舗のハードコード一覧。
// 組織を一覧取得する API は存在しないため、掲載する店舗はここで管理する。
// 店舗を追加・削除・改称するときはこの配列を編集する。
export const BOOKABLE_ORGANIZATIONS: readonly BookableOrganization[] = [
  {
    organizationId: "miraiyohou",
    name: "みらい予報",
    description: "占い師を選んで予約する",
  },
];
