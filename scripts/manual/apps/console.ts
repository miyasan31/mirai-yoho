import type { AppConfig } from "../src/types.js";

const OPEN_TAB_PANEL = '[role="tabpanel"][data-state="open"]';

const config: AppConfig = {
  appId: "console",
  appName: "みらい予報 運営コンソール",
  audience: "運営担当者",
  defaultEnv: "local",
  environments: {
    local: {
      baseUrl: process.env.CONSOLE_BASE_URL ?? "http://localhost:3020",
    },
    dev: {
      baseUrl: "https://dev.console.miraiyohou.com",
      defaultOrgId: process.env.CONSOLE_DEV_ORG_ID,
    },
    prod: {
      baseUrl: "https://console.miraiyohou.com",
      defaultOrgId: process.env.CONSOLE_PROD_ORG_ID,
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
    await page.goto(`${baseUrl}/${encodeURIComponent(orgId)}/consultants`, {
      waitUntil: "domcontentloaded",
    });
    try {
      await page.waitForSelector('table a[href*="/consultants/"]', {
        timeout: 5_000,
      });
    } catch {
      return {};
    }
    const href = await page
      .locator('table a[href*="/consultants/"]')
      .first()
      .getAttribute("href");
    if (!href) return {};
    const match = href.match(/\/consultants\/([^/?#]+)$/);
    return match ? { consultantId: decodeURIComponent(match[1]) } : {};
  },
  sections: [
    {
      id: "auth",
      title: "サインイン",
      pages: [
        {
          id: "login",
          title: "管理者ログイン",
          overview:
            "管理者・オペレーターアカウントで運営コンソールにサインインする画面です。ログイン後は担当組織のホーム画面へ遷移します。",
          route: "/login",
          waitForSelector: "#email",
          annotations: [
            {
              n: 1,
              selector: "#email",
              title: "メールアドレス",
              description: "招待メールを受け取ったアドレスを入力します。",
            },
            {
              n: 2,
              selector: "#password",
              title: "パスワード",
              description:
                "初回は招待メールから設定したパスワードを入力します。",
            },
            {
              n: 3,
              selector: 'button[type="submit"]',
              title: "ログインボタン",
              description:
                "認証に成功すると担当組織のホーム画面へ自動遷移します。",
            },
            {
              n: 4,
              selector: 'a[href="/password-reset"]',
              title: "パスワード再設定リンク",
              description:
                "パスワードが分からない場合はこのリンクから再設定できます。",
            },
          ],
        },
        {
          id: "password-reset",
          title: "パスワード再設定",
          overview:
            "登録済みメールアドレス宛にパスワード再設定リンクを送信します。届いたメールから新しいパスワードを設定します。",
          route: "/password-reset",
          waitForSelector: "#email",
          annotations: [
            {
              n: 1,
              selector: "#email",
              title: "メールアドレス",
              description:
                "運営コンソールに登録済みのメールアドレスを入力します。",
            },
            {
              n: 2,
              selector: 'button[type="submit"]',
              title: "再設定メール送信",
              description:
                "送信後、受信メール内のリンクから新しいパスワードを登録できます。",
            },
            {
              n: 3,
              selector: 'a[href="/login"]',
              title: "ログインに戻る",
              description: "再設定を行わずログイン画面へ戻ります。",
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
            "ログイン直後に表示される画面です。本日対応が必要な件数と、直近の予約・決済をまとめて確認できます。",
          route: "/{orgId}/home",
          requiresAuth: true,
          waitForSelector: 'h2:has-text("直近開始予約")',
          annotations: [
            {
              n: 1,
              selector: 'aside button[aria-haspopup="menu"]',
              title: "組織スイッチャー",
              description: "担当組織の切り替えとログアウトをここから行います。",
            },
            {
              n: 2,
              selector: "nav",
              title: "サイドメニュー",
              description:
                "権限に応じた管理画面へ移動します。権限のない項目は表示されません。",
            },
            {
              n: 3,
              selector: "text=未対応予約",
              title: "本日対応 ToDo",
              description:
                "未対応予約・本決済待ち・メモ未入力の件数を確認し、該当画面へ移動できます。",
            },
            {
              n: 4,
              selector: 'h2:has-text("直近開始予約")',
              title: "直近開始予約",
              description: "まもなく開始する予約を最大 5 件表示します。",
            },
            {
              n: 5,
              selector: 'h2:has-text("要対応決済")',
              title: "要対応決済",
              description: "本決済待ちの予約を最大 5 件表示します。",
            },
          ],
        },
        {
          id: "dashboard",
          title: "ダッシュボード",
          overview:
            "予約数・売上・顧客数などの実績値と、予約ステータスごとの件数を確認できます。",
          route: "/{orgId}/dashboard",
          requiresAuth: true,
          waitForSelector: 'h2:has-text("予約ステータス")',
          annotations: [
            {
              n: 1,
              selector: "text=予約数",
              title: "予約数",
              description: "組織全体の累計予約件数を表示します。",
            },
            {
              n: 2,
              selector: "text=売上",
              title: "売上",
              description: "決済済み金額の合計を円単位で表示します。",
            },
            {
              n: 3,
              selector: "text=占い師数",
              title: "顧客数・占い師数",
              description:
                "登録済みの顧客と稼働中の占い師の人数を確認できます。",
            },
            {
              n: 4,
              selector: 'h2:has-text("予約ステータス")',
              title: "予約ステータス",
              description:
                "保留中・確定・完了・キャンセルの件数を内訳として表示します。",
            },
          ],
        },
        {
          id: "bookings",
          title: "予約管理",
          overview:
            "予約の日時・ステータス・担当占い師を一覧で確認し、必要に応じて手動課金を実行できます。",
          route: "/{orgId}/bookings",
          requiresAuth: true,
          waitForSelector: "table",
          annotations: [
            {
              n: 1,
              selector: "table thead tr",
              title: "一覧の項目",
              description:
                "日時・ステータス・顧客・占い師・入室確認をまとめて表示します。",
            },
            {
              n: 2,
              selector: "table tbody tr",
              title: "予約行",
              description:
                "顧客名や占い師名にカーソルを合わせると連絡先やプロフィールを確認できます。",
            },
            {
              n: 3,
              selector: 'button:has-text("課金")',
              title: "課金ボタン",
              description:
                "確定済み予約に対して手動で決済を実行します。条件を満たさない場合は理由がツールチップに表示されます。",
            },
            {
              n: 4,
              selector: '[data-scope="select"][data-part="trigger"]',
              title: "表示件数・並び順",
              description: "1 ページの表示件数と並び順を切り替えます。",
            },
            {
              n: 5,
              selector: 'button[aria-label="次のページ"]',
              title: "ページ送り",
              description: "次のページの予約を表示します。",
            },
          ],
        },
        {
          id: "payments",
          title: "決済管理",
          overview:
            "決済の金額とステータスを一覧で確認できます。後払いか即時決済か、手動課金か自動課金かも判別できます。",
          route: "/{orgId}/payments",
          requiresAuth: true,
          waitForSelector: "table",
          annotations: [
            {
              n: 1,
              selector: "table thead tr",
              title: "一覧の項目",
              description:
                "予約 ID・金額・税額・合計・ステータス・決済タイミング・課金実行を表示します。",
            },
            {
              n: 2,
              selector: "table tbody tr",
              title: "決済行",
              description:
                "決済済・返金済・失敗などのステータスを行ごとに確認できます。",
            },
            {
              n: 3,
              selector: '[data-scope="select"][data-part="trigger"]',
              title: "表示件数・並び順",
              description: "1 ページの表示件数と並び順を切り替えます。",
            },
            {
              n: 4,
              selector: 'button[aria-label="次のページ"]',
              title: "ページ送り",
              description: "次のページの決済履歴を表示します。",
            },
          ],
        },
        {
          id: "customers",
          title: "顧客管理",
          overview:
            "利用者の名前・メール・電話番号・メモを一覧で参照できます。この画面での編集はできません。",
          route: "/{orgId}/customers",
          requiresAuth: true,
          waitForSelector: "table",
          annotations: [
            {
              n: 1,
              selector: "table thead tr",
              title: "一覧の項目",
              description: "名前・メール・電話・メモを表示します。",
            },
            {
              n: 2,
              selector: "table tbody tr",
              title: "顧客行",
              description:
                "問い合わせ対応時の連絡先確認に利用します。未登録の項目はハイフンで表示されます。",
            },
            {
              n: 3,
              selector: 'button[aria-label="次のページ"]',
              title: "ページ送り",
              description: "次のページの顧客を表示します。",
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
          id: "consultants",
          title: "占い師管理",
          overview:
            "占い師の招待と稼働状況の確認を行います。行の編集アイコンからプロフィール編集へ移動できます。",
          route: "/{orgId}/consultants",
          requiresAuth: true,
          waitForSelector: "table",
          annotations: [
            {
              n: 1,
              selector: 'button:has-text("新規追加")',
              title: "新規追加",
              description:
                "表示名とメールアドレスを入力して占い師に招待メールを送信します。",
            },
            {
              n: 2,
              selector: "table thead tr",
              title: "一覧の項目",
              description:
                "名前・連絡先・専門分野・ステータス・有効無効を表示します。",
            },
            {
              n: 3,
              selector: "table tbody tr",
              title: "占い師行",
              description:
                "無効化した占い師は「無効」バッジが付き、予約導線に表示されなくなります。",
            },
            {
              n: 4,
              selector: 'table a[href*="/consultants/"]',
              title: "編集アイコン",
              description: "占い師編集画面を開きます。",
            },
          ],
        },
        {
          id: "consultant-edit",
          title: "占い師編集",
          overview:
            "占い師の表示名・自己紹介・専門分野・ステータスを更新します。稼働を止める場合は無効化します。",
          route: "/{orgId}/consultants/{consultantId}",
          requires: ["orgId", "consultantId"],
          waitForSelector: "#name",
          annotations: [
            {
              n: 1,
              selector: "#name",
              title: "表示名",
              description: "予約サイトに表示される占い師名です。",
            },
            {
              n: 2,
              selector: "#bio",
              title: "自己紹介",
              description:
                "予約者が占い師を選ぶ際の判断材料になる紹介文を記述します。",
            },
            {
              n: 3,
              selector: "#specialties",
              title: "専門分野",
              description: "得意な鑑定分野をカンマ区切りで入力します。",
            },
            {
              n: 4,
              selector: 'button[type="submit"]',
              title: "保存",
              description: "変更内容を保存し、予約サイトにも反映します。",
            },
            {
              n: 5,
              selector: 'button:has-text("無効化")',
              title: "無効化",
              description:
                "稼働を停止します。確認ダイアログで実行後も再度有効化できます。",
            },
          ],
        },
        {
          id: "accounts",
          title: "アカウント管理",
          overview:
            "管理者・オペレーターの招待とアカウント管理を行います。表示名変更やロール変更、招待メール再送も可能です。",
          route: "/{orgId}/accounts",
          requiresAuth: true,
          waitForSelector: "table",
          annotations: [
            {
              n: 1,
              selector: 'button:has-text("アカウント招待")',
              title: "アカウント招待",
              description:
                "メールアドレス・表示名・ロールを指定して招待メールを送信します。",
            },
            {
              n: 2,
              selector: "table thead tr",
              title: "一覧の項目",
              description:
                "メール・表示名・ロール・ステータスと操作アイコンを表示します。",
            },
            {
              n: 3,
              selector: "table tbody tr",
              title: "アカウント行",
              description:
                "操作アイコンから表示名変更・ロール変更・招待メール再送・パスワードリセット・削除を行います。",
            },
            {
              n: 4,
              selector: '[aria-label="現在ログイン中のアカウント"]',
              title: "自分のアカウント",
              description:
                "ログイン中のアカウントには「あなた」バッジが付きます。",
            },
          ],
        },
        {
          id: "roles",
          title: "権限管理",
          overview:
            "ロールごとに管理画面の操作権限を設定します。デフォルトロールは編集も削除もできません。",
          route: "/{orgId}/roles",
          requiresAuth: true,
          waitForSelector: 'h1:has-text("権限管理")',
          annotations: [
            {
              n: 1,
              selector: 'button:has-text("ロール作成")',
              title: "ロール作成",
              description:
                "ロール ID・ロール名・説明を入力し、権限をチェックボックスで選択します。",
            },
            {
              n: 2,
              selector: "table thead tr",
              title: "一覧の項目",
              description: "ロール名・説明・権限数・割当人数を表示します。",
            },
            {
              n: 3,
              selector: "table tbody tr",
              title: "ロール行",
              description:
                "割当人数が 0 のカスタムロールのみ編集と削除ができます。",
            },
            {
              n: 4,
              selector: "text=デフォルトロール",
              title: "デフォルトロール",
              description:
                "組織初期化時に作成される標準ロールで、変更できません。",
            },
          ],
        },
        {
          id: "coupons",
          title: "クーポン管理",
          overview:
            "初回登録特典と誕生月クーポンのマスターを管理します。顧客はマイページから自分で取得します。",
          route: "/{orgId}/coupons",
          requiresAuth: true,
          waitForSelector: 'h1:has-text("クーポン管理")',
          annotations: [
            {
              n: 1,
              selector: 'button:has-text("新規作成")',
              title: "新規作成",
              description:
                "種別・名称・割引額・配布枚数・有効日数を指定してクーポンを作成します。",
            },
            {
              n: 2,
              selector: "table thead tr",
              title: "一覧の項目",
              description:
                "種別・名称・割引額・枚数・有効日数・状態を表示します。",
            },
            {
              n: 3,
              selector: "table tbody tr",
              title: "クーポン行",
              description:
                "操作アイコンから編集と無効化を行います。無効化しても配布済みクーポンは残ります。",
            },
          ],
        },
        {
          id: "policies",
          title: "利用規約・キャンセルポリシー",
          overview:
            "利用規約・キャンセルポリシー・プライバシーポリシーを版管理します。下書きの作成から公開までをこの画面で行います。",
          route: "/{orgId}/policies",
          requiresAuth: true,
          waitForSelector: '[role="tab"]',
          annotations: [
            {
              n: 1,
              selector: '[role="tab"]',
              title: "文書タブ",
              description: "編集対象の文書を切り替えます。",
            },
            {
              n: 2,
              selector: `${OPEN_TAB_PANEL} button:has-text("新しい改版を作成")`,
              title: "新しい改版を作成",
              description:
                "現在の内容を引き継いだ下書きを作成します。作成しただけでは公開されません。",
            },
            {
              n: 3,
              selector: `${OPEN_TAB_PANEL} table thead tr`,
              title: "改版一覧",
              description:
                "版番号・タイトル・状態・効力発生日・公開日を表示します。",
            },
            {
              n: 4,
              selector: `${OPEN_TAB_PANEL} button:has-text("差分")`,
              title: "差分",
              description: "前の版との変更箇所を並べて確認します。",
            },
            {
              n: 5,
              selector: `${OPEN_TAB_PANEL} button:has-text("公開")`,
              title: "公開",
              description:
                "下書きを公開中に切り替え、予約サイトへ即時反映します。",
            },
          ],
        },
        {
          id: "settings-business-hours",
          title: "設定 - 営業時間",
          overview:
            "曜日ごとの営業時間と、休業日や時間変更などの単日例外を設定します。予約可能な時間帯の基準になります。",
          route: "/{orgId}/settings?tab=business-hours",
          requiresAuth: true,
          waitForSelector: 'input[name="weekly.0.startTime"]',
          annotations: [
            {
              n: 1,
              selector: '[role="tab"]',
              title: "設定タブ",
              description: "営業時間・ステータス・料金の設定を切り替えます。",
            },
            {
              n: 2,
              selector: 'input[name="weekly.0.startTime"]',
              title: "曜日ごとの営業時間",
              description:
                "曜日単位で営業有無と開始・終了時刻を 30 分刻みで設定します。",
            },
            {
              n: 3,
              selector: "text=祝日を通常営業として扱う",
              title: "祝日の扱い",
              description: "オフにすると祝日は自動的に休業として扱われます。",
            },
            {
              n: 4,
              selector: 'button:has-text("例外日を追加")',
              title: "単日例外",
              description:
                "特定日だけ休業や時間変更を設定します。新規は一週間先以降の日付のみ指定できます。",
            },
            {
              n: 5,
              selector: `${OPEN_TAB_PANEL} button[type="submit"]`,
              title: "保存",
              description: "営業時間設定を保存し、予約枠の判定に反映します。",
            },
          ],
        },
        {
          id: "settings-consultant-statuses",
          title: "設定 - ステータス",
          overview:
            "占い師に設定できるステータスの一覧と並び順を管理します。上にあるステータスほど重要度が高く表示されます。",
          route: "/{orgId}/settings?tab=consultant-statuses",
          requiresAuth: true,
          waitForSelector: 'input[aria-label="ステータス名 1"]',
          annotations: [
            {
              n: 1,
              selector: 'input[aria-label="ステータス名 1"]',
              title: "ステータス名",
              description: "占い師管理画面や予約サイトに表示される名称です。",
            },
            {
              n: 2,
              selector: 'button:has-text("上へ")',
              title: "並び替え",
              description: "上へ・下へで表示順を入れ替えます。",
            },
            {
              n: 3,
              selector: 'button:has-text("ステータスを追加")',
              title: "ステータス追加",
              description: "最大 5 件までステータスを追加できます。",
            },
            {
              n: 4,
              selector: `${OPEN_TAB_PANEL} button[type="submit"]`,
              title: "保存",
              description: "ステータス設定を保存します。",
            },
          ],
        },
        {
          id: "settings-price",
          title: "設定 - 料金",
          overview:
            "占い師が作成できる料金プランの税込金額範囲を設定します。範囲外の金額はプラン作成時に弾かれます。",
          route: "/{orgId}/settings?tab=price",
          requiresAuth: true,
          waitForSelector: 'input[name="maxTotalJPY"]',
          annotations: [
            {
              n: 1,
              selector: 'input[name="maxTotalJPY"]',
              title: "上限",
              description: "料金プランに設定できる税込金額の上限です。",
            },
            {
              n: 2,
              selector: 'input[name="minTotalJPY"]',
              title: "下限",
              description: "料金プランに設定できる税込金額の下限です。",
            },
            {
              n: 3,
              selector: `${OPEN_TAB_PANEL} button[type="submit"]`,
              title: "保存",
              description: "料金設定を保存し、以降のプラン作成に適用します。",
            },
          ],
        },
      ],
    },
  ],
};

export default config;
