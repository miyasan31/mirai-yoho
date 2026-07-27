import type { AppConfig } from "../src/types.js";

const config: AppConfig = {
  appId: "consultant",
  appName: "みらい予報 占い師コンソール",
  audience: "占い師",
  defaultEnv: "local",
  environments: {
    local: {
      baseUrl: process.env.CONSULTANT_BASE_URL ?? "http://localhost:3030",
    },
    dev: {
      baseUrl: "https://dev.consultant.miraiyohou.com",
      defaultOrgId: process.env.CONSULTANT_DEV_ORG_ID,
    },
    prod: {
      baseUrl: "https://consultant.miraiyohou.com",
      defaultOrgId: process.env.CONSULTANT_PROD_ORG_ID,
    },
  },
  loginPath: "/login",
  postLoginUrlPattern: /\/[^/]+\/home(\?.*)?$/,
  extractOrganizationId: (url: string) => {
    try {
      const parsed = new URL(url);
      const match = parsed.pathname.match(/^\/([^/]+)\/home/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch {
      return null;
    }
  },
  resolveDynamicParams: async ({ page, baseUrl, params }) => {
    const orgId = params.orgId;
    if (!orgId) return {};
    await page.goto(`${baseUrl}/${encodeURIComponent(orgId)}/bookings`, {
      waitUntil: "domcontentloaded",
    });
    try {
      await page.waitForSelector('a[href*="/bookings/"][href*="/memo"]', {
        timeout: 5_000,
      });
    } catch {
      return {};
    }
    const href = await page
      .locator('a[href*="/bookings/"][href*="/memo"]')
      .first()
      .getAttribute("href");
    if (!href) return {};
    const match = href.match(/\/bookings\/([^/]+)\/memo/);
    return match ? { bookingId: decodeURIComponent(match[1]) } : {};
  },
  sections: [
    {
      id: "auth",
      title: "サインイン",
      pages: [
        {
          id: "login",
          title: "ログイン",
          overview:
            "占い師アカウントで管理画面にログインする画面です。メールアドレスとパスワードを入力してサインインしてください。",
          route: "/login",
          waitForSelector: 'input[type="email"]',
          annotations: [
            {
              n: 1,
              selector: 'input[type="email"]',
              title: "メールアドレス",
              description: "登録済みのメールアドレスを入力します。",
            },
            {
              n: 2,
              selector: 'input[type="password"]',
              title: "パスワード",
              description:
                "初期パスワードから未変更の場合は、事前にパスワード再設定を行ってください。",
            },
            {
              n: 3,
              selector: 'button[type="submit"]',
              title: "ログインボタン",
              description:
                "ログイン成功後は担当組織のホーム画面へ自動遷移します。",
            },
            {
              n: 4,
              selector: 'a[href*="password-reset"]',
              title: "パスワード再設定リンク",
              description:
                "パスワードを忘れた場合はこのリンクから再設定メールを送信できます。",
            },
          ],
        },
        {
          id: "password-reset",
          title: "パスワード再設定",
          overview:
            "登録済みメールアドレス宛にパスワード再設定リンクを送信します。届いたメールから新しいパスワードを設定してください。",
          route: "/password-reset",
          waitForSelector: 'input[type="email"]',
          annotations: [
            {
              n: 1,
              selector: 'input[type="email"]',
              title: "メールアドレス",
              description:
                "占い師アカウントで登録済みのメールアドレスを入力します。",
            },
            {
              n: 2,
              selector: 'button[type="submit"]',
              title: "再設定メール送信",
              description:
                "送信後、受信メール内のリンクから新しいパスワードを登録できます。",
            },
          ],
        },
      ],
    },
    {
      id: "daily",
      title: "日々の運用",
      pages: [
        {
          id: "home",
          title: "ホーム",
          overview:
            "ログイン直後に表示されるダッシュボードです。次の予約と今日の担当状況を一目で確認できます。",
          route: "/{orgId}/home",
          requiresAuth: true,
          waitForSelector: "h1",
          annotations: [
            {
              n: 1,
              selector: "text=次の予約",
              title: "次の予約カード",
              description:
                "次に対応すべき予約が表示されます。Zoom参加や鑑定メモ編集をワンクリックで開けます。",
            },
            {
              n: 2,
              selector: "text=クイックアクション",
              title: "クイックアクション",
              description:
                "予約一覧・予約枠・プロフィールへのショートカット。よく使う画面へ最短で移動できます。",
            },
            {
              n: 3,
              selector: "text=今日の予約一覧",
              title: "今日の予約一覧",
              description:
                "今日担当する予約の一覧です。ステータス・顧客名・参加操作をまとめて確認できます。",
            },
            {
              n: 4,
              selector: "text=今日の担当件数",
              title: "サマリーカード",
              description:
                "今日の担当件数・残件数・完了件数・メモ未入力件数を数値で確認できます。",
            },
          ],
        },
        {
          id: "bookings",
          title: "予約一覧",
          overview:
            "担当中の予約を一覧で確認・検索・並べ替えできます。顧客情報は行のホバーで表示されます。",
          route: "/{orgId}/bookings",
          requiresAuth: true,
          waitForSelector: "h1",
          annotations: [
            {
              n: 1,
              selector: 'input[type="search"], input[placeholder*="検索"]',
              title: "検索・フィルター",
              description:
                "顧客名や予約 ID で絞り込めます。並べ替えやページサイズも変更できます。",
            },
            {
              n: 2,
              selector: "table thead tr",
              title: "テーブルヘッダ",
              description:
                "日時・ステータス・顧客・料金プランなど、対応に必要な情報をまとめて表示します。",
            },
            {
              n: 3,
              selector: 'a[href*="/memo"]',
              title: "鑑定メモ編集",
              description:
                "鉛筆アイコンから鑑定メモ編集画面へ遷移します。当日対応の記録を残せます。",
            },
            {
              n: 4,
              selector: 'a[target="_blank"]',
              title: "Zoom 参加リンク",
              description:
                "予約時間が近づくと Zoom への参加ボタンが有効になります。",
            },
          ],
        },
        {
          id: "memo",
          title: "鑑定メモ編集",
          overview:
            "予約ごとに鑑定内容をメモとして残せます。顧客名・生年月日・鑑定日・自由記述を保存できます。",
          route: "/{orgId}/bookings/{bookingId}/memo",
          requires: ["orgId", "bookingId"],
          waitForSelector: "form",
          annotations: [
            {
              n: 1,
              selector: 'a[href*="/bookings"]',
              title: "予約一覧に戻る",
              description: "編集を中断して予約一覧に戻ります。",
            },
            {
              n: 2,
              selector: 'input[id*="customerName"]',
              title: "顧客名",
              description: "鑑定メモ上での顧客表示名を入力します。",
            },
            {
              n: 3,
              selector: 'input[type="date"]',
              title: "日付欄",
              description: "生年月日・鑑定日を選択します。",
            },
            {
              n: 4,
              selector: "textarea",
              title: "自由メモ",
              description:
                "鑑定内容の要点や次回申し送り事項などを自由に記述できます。",
            },
            {
              n: 5,
              selector: 'button[type="submit"]',
              title: "保存",
              description:
                "変更内容を保存します。保存後は予約一覧にも反映されます。",
            },
          ],
        },
      ],
    },
    {
      id: "management",
      title: "設定・管理",
      pages: [
        {
          id: "slots",
          title: "予約枠管理",
          overview:
            "カレンダー上で予約可能な枠を作成・削除できます。既存の予約と空き枠が色分けで表示されます。",
          route: "/{orgId}/slots",
          requiresAuth: true,
          waitForSelector: ".rbc-calendar",
          annotations: [
            {
              n: 1,
              selector: ".rbc-toolbar",
              title: "カレンダーツールバー",
              description:
                "月・週・日ビューの切り替え、前後ナビゲーション、今日ジャンプができます。",
            },
            {
              n: 2,
              selector: ".rbc-time-content, .rbc-month-view",
              title: "カレンダー本体",
              description:
                "ドラッグで新しい予約枠を追加、既存の予約枠クリックで削除ダイアログを開けます。",
            },
            {
              n: 3,
              selector: ".rbc-event",
              title: "予約 / 予約枠イベント",
              description:
                "確定済みの予約、開放中の空き枠、バッファが色分けされて表示されます。",
            },
          ],
        },
        {
          id: "price-plans",
          title: "料金プラン",
          overview:
            "顧客に提示する料金プラン（時間・金額）を作成・編集・アーカイブできます。",
          route: "/{orgId}/price-plans",
          requiresAuth: true,
          waitForSelector: "h1",
          annotations: [
            {
              n: 1,
              selector: 'form input[id*="name"]',
              title: "プラン名",
              description:
                "顧客に表示されるプラン名を入力します（例: 30 分鑑定）。",
            },
            {
              n: 2,
              selector: 'form input[type="number"]',
              title: "金額（JPY）",
              description: "税込金額を入力します。プラン一覧に反映されます。",
            },
            {
              n: 3,
              selector: 'form select, form button[role="combobox"]',
              title: "所要時間",
              description:
                "対応可能な所要時間（30 / 60 / 90 分等）を選択します。",
            },
            {
              n: 4,
              selector: 'form button[type="submit"]',
              title: "追加ボタン",
              description: "プランを作成します。作成後は一覧下に追加されます。",
            },
            {
              n: 5,
              selector: "table tbody tr:first-child",
              title: "プラン一覧行",
              description:
                "プラン名の編集、アーカイブ、復元ができます。アーカイブ後は顧客側に表示されません。",
            },
          ],
        },
        {
          id: "profile",
          title: "プロフィール",
          overview:
            "占い師プロフィール（表示名・自己紹介・電話番号・専門分野・アイコン）を編集します。",
          route: "/{orgId}/profile",
          requiresAuth: true,
          waitForSelector: "form",
          annotations: [
            {
              n: 1,
              selector: 'input[type="file"]',
              title: "アバター画像",
              description:
                "1:1 の正方形画像（JPEG / PNG / WebP、最大 5MB）をアップロードできます。",
            },
            {
              n: 2,
              selector: 'input[id*="name"]',
              title: "表示名",
              description: "顧客側の予約フローで表示される占い師名です。",
            },
            {
              n: 3,
              selector: 'textarea[id*="bio"]',
              title: "自己紹介",
              description: "占い師の紹介文。顧客が選ぶ際の判断材料になります。",
            },
            {
              n: 4,
              selector: 'input[id*="specialties"]',
              title: "専門分野",
              description: "得意な鑑定分野をカンマ区切りで入力します。",
            },
            {
              n: 5,
              selector: 'button[type="submit"]',
              title: "保存",
              description: "変更内容を保存します。反映は数秒以内に完了します。",
            },
          ],
        },
      ],
    },
  ],
};

export default config;
