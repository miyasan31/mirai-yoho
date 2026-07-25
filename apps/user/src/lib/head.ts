const APP_TITLE = "あなたのみらい予報 予約サイト";

export const pageHead = (pageTitle: string) => ({
  meta: [{ title: `${pageTitle} | ${APP_TITLE}` }],
});
