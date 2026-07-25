const APP_TITLE = "あなたのみらい予報 管理者コンソール";

export const pageHead = (pageTitle: string) => ({
  meta: [{ title: `${pageTitle} | ${APP_TITLE}` }],
});
