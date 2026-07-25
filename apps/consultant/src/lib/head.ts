const APP_TITLE = "あなたのみらい予報 占い師コンソール";

export const pageHead = (pageTitle: string) => ({
  meta: [{ title: `${pageTitle} | ${APP_TITLE}` }],
});
