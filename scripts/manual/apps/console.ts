import type { CaptureContext } from "../src/context.js";
import type { AppConfig } from "../src/types.js";

const OPEN_TAB_PANEL = '[role="tabpanel"][data-state="open"]';

/** Park UI の Dialog は unmountOnExit なので、開いている 1 つだけが DOM に存在する */
const OPEN_DIALOG = '[data-scope="dialog"][data-part="content"]';

const dialogField = (label: string) =>
  `${OPEN_DIALOG} [data-scope="field"][data-part="root"]:has(> label:text-is("${label}"))`;

/** トリガーを押してダイアログが開くまで待つ setup を作る */
const openDialog =
  (trigger: string) =>
  async ({ page }: CaptureContext): Promise<void> => {
    await page.locator(trigger).first().click();
    await page.waitForSelector(OPEN_DIALOG, {
      state: "visible",
      timeout: 5_000,
    });
  };

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
  serviceMap: {
    summary:
      "運営コンソールでの設定は、占い師コンソールと予約サイトの両方に波及します。占い師が何を作成できるか、予約者に何が見えるかは、ここでの設定が起点になります。各画面の「関連する動き」欄に、その操作がどこへ届くかを記載しています。",
    flows: [
      {
        path: "運営コンソール → 占い師コンソール",
        items: [
          "設定 - 料金の金額範囲が、占い師の料金プラン作成で許される税込金額を決めます。",
          "設定 - 営業時間が、占い師の予約枠管理カレンダーの表示範囲と追加できる時間帯を決めます。",
          "設定 - ステータスで整えた名称が、占い師のプロフィールに表示されます。",
          "占い師管理からの招待で、占い師コンソールを使えるアカウントが作られます。",
          "利用規約・キャンセルポリシーを公開すると、占い師に再同意が求められ、同意するまで予約枠を追加できなくなります。",
        ],
      },
      {
        path: "運営コンソール → 予約サイト",
        items: [
          "占い師管理で招待・編集した内容が、予約サイトの占い師一覧にそのまま掲載されます。",
          "クーポン管理で作成したクーポンを、予約者が自分で取得して予約に使います。",
          "利用規約・キャンセルポリシーの公開版が、予約サイトの規約ページと予約時の同意対象になります。",
          "予約管理での課金が、予約者への決済完了メールと予約の終了扱いにつながります。",
        ],
      },
    ],
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
          relations: [
            {
              target: "user",
              screen: "予約一覧",
              effect:
                "課金すると予約者に決済完了メールが届き、予約が終了扱いになります。",
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
          relations: [
            {
              target: "user",
              screen: "占い師一覧",
              effect:
                "招待が成立した占い師はすぐに掲載され、無効化すると掲載から外れます。",
            },
          ],
        },
        {
          id: "consultant-invite",
          title: "占い師招待",
          overview:
            "表示名とメールアドレスを入力して占い師を招待します。送信すると招待メールが届き、占い師コンソールを使い始められます。",
          route: "/{orgId}/consultants",
          requiresAuth: true,
          waitForSelector: 'button:has-text("新規追加")',
          setup: openDialog('button:has-text("新規追加")'),
          captureMode: "viewport",
          annotations: [
            {
              n: 1,
              selector: `${dialogField("表示名")} input`,
              title: "表示名",
              description:
                "予約サイトに掲載される占い師名の初期値になります。本人が後から変更できます。",
            },
            {
              n: 2,
              selector: `${dialogField("メールアドレス")} input`,
              title: "メールアドレス",
              description:
                "招待メールの宛先で、占い師コンソールのログイン ID になります。",
            },
            {
              n: 3,
              selector: `${OPEN_DIALOG} button[type="submit"]`,
              title: "招待送信",
              description:
                "招待メールを送信し、同時に占い師を一覧へ登録します。すでに同じメールで登録済みの場合は送信できません。",
            },
            {
              n: 4,
              selector: `${OPEN_DIALOG} button:has-text("キャンセル")`,
              title: "キャンセル",
              description: "招待せずにダイアログを閉じます。",
            },
          ],
          relations: [
            {
              target: "consultant",
              screen: "ログイン",
              effect:
                "招待メールから設定したパスワードで占い師コンソールにサインインできるようになります。",
            },
            {
              target: "user",
              screen: "占い師一覧",
              effect:
                "招待した時点で掲載されるため、プロフィール未入力のまま公開されないよう本人に入力を促します。",
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
          relations: [
            {
              target: "consultant",
              screen: "プロフィール",
              effect:
                "同じ項目を占い師本人も編集できるため、後から保存した内容が残ります。",
            },
            {
              target: "user",
              screen: "占い師一覧",
              effect:
                "表示名・自己紹介・専門分野・ステータスがカードの表示に反映されます。",
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
                "招待中・有効・無効のステータスによって実行できる操作が変わります。",
            },
            {
              n: 4,
              selector: "table tbody tr td:last-child",
              title: "操作アイコン",
              description:
                "左から表示名変更・ロール変更・招待メール再送・パスワードリセット・削除で、権限に応じて表示が変わります。",
            },
            {
              n: 5,
              selector: '[aria-label="現在ログイン中のアカウント"]',
              title: "自分のアカウント",
              description:
                "ログイン中のアカウントには「あなた」バッジが付き、自分自身は削除できません。",
            },
            {
              n: 6,
              selector: 'button[aria-label="次のページ"]',
              title: "ページ送り",
              description: "次のページのアカウントを表示します。",
            },
          ],
        },
        {
          id: "account-invite",
          title: "アカウント招待",
          overview:
            "運営コンソールを使う管理者・オペレーターを招待します。招待できるのは管理者ロールのアカウントだけです。",
          route: "/{orgId}/accounts",
          requiresAuth: true,
          waitForSelector: 'button:has-text("アカウント招待")',
          setup: openDialog('button:has-text("アカウント招待")'),
          captureMode: "viewport",
          annotations: [
            {
              n: 1,
              selector: `${dialogField("メールアドレス")} input`,
              title: "メールアドレス",
              description:
                "招待メールの宛先で、運営コンソールのログイン ID になります。",
            },
            {
              n: 2,
              selector: `${dialogField("表示名")} input`,
              title: "表示名",
              description: "アカウント一覧に表示される名前です。",
            },
            {
              n: 3,
              selector: `${OPEN_DIALOG} [data-scope="select"][data-part="trigger"]`,
              title: "ロール",
              description:
                "権限管理で用意したロールから選び、操作できる範囲を決めます。",
            },
            {
              n: 4,
              selector: `${OPEN_DIALOG} button[type="submit"]`,
              title: "招待メール送信",
              description:
                "招待メールとパスワード設定リンクを送信し、一覧に招待中として追加します。",
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
          id: "role-create",
          title: "ロール作成",
          overview:
            "運営コンソールの操作権限をまとめたロールを新しく作ります。ここで選んだ権限が、そのロールを割り当てたアカウントのサイドメニューと操作可否を決めます。",
          route: "/{orgId}/roles",
          requiresAuth: true,
          waitForSelector: 'button:has-text("ロール作成")',
          setup: openDialog('button:has-text("ロール作成")'),
          captureMode: "viewport",
          annotations: [
            {
              n: 1,
              selector: `${dialogField("ロールID")} input`,
              title: "ロール ID",
              description:
                "booking-manager のような半角英小文字とハイフンの識別子で、後から変更できません。",
            },
            {
              n: 2,
              selector: `${dialogField("ロール名")} input`,
              title: "ロール名",
              description: "アカウント管理の一覧に表示される日本語名です。",
            },
            {
              n: 3,
              selector: `${dialogField("説明")} input`,
              title: "説明",
              description: "どんな担当者向けのロールかを書き添えます。",
            },
            {
              n: 4,
              selector: `${OPEN_DIALOG} [data-scope="checkbox"][data-part="root"]`,
              title: "権限チェック",
              description:
                "ホーム・集計、予約・決済、顧客・占い師、予約枠・設定、アカウント・ロールの 5 グループから必要な権限を選びます。",
            },
            {
              n: 5,
              selector: `${OPEN_DIALOG} button[type="submit"]`,
              title: "作成",
              description:
                "ロールを作成し、アカウント管理のロール選択肢に追加します。",
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
          relations: [
            {
              target: "user",
              screen: "クーポン取得",
              effect:
                "有効なクーポンが取得可能一覧に並び、予約者が自分で受け取ります。",
            },
            {
              target: "user",
              screen: "保有クーポン",
              effect:
                "割引額や枚数を変更しても、すでに配布済みのクーポンには遡って反映されません。",
            },
          ],
        },
        {
          id: "coupon-create",
          title: "クーポン作成",
          overview:
            "初回登録特典または誕生月のクーポンを新しく作ります。作成した時点で予約者が取得できるようになります。",
          route: "/{orgId}/coupons",
          requiresAuth: true,
          waitForSelector: 'button:has-text("新規作成")',
          setup: openDialog('button:has-text("新規作成")'),
          captureMode: "viewport",
          annotations: [
            {
              n: 1,
              selector: `${dialogField("種別")} select`,
              title: "種別",
              description:
                "初回登録特典は 1 回限り、誕生月は誕生月の予約者だけが受け取れます。作成後は変更できません。",
            },
            {
              n: 2,
              selector: `${dialogField("名称")} input`,
              title: "名称",
              description: "予約者のクーポン一覧に表示される名前です。",
            },
            {
              n: 3,
              selector: `${dialogField("割引額（円）")} input`,
              title: "割引額",
              description:
                "予約 1 件あたりの割引額を税込金額から差し引きます。",
            },
            {
              n: 4,
              selector: `${dialogField("1 度の取得で配る枚数")} input`,
              title: "枚数",
              description:
                "1 回の受け取りで何枚配るかを決めます。予約 1 件に使えるのは 1 枚です。",
            },
            {
              n: 5,
              selector: `${dialogField("有効日数（受け取り日から）")} input`,
              title: "有効日数",
              description: "受け取った日から何日間使えるかを決めます。",
            },
            {
              n: 6,
              selector: `${OPEN_DIALOG} button[type="submit"]`,
              title: "作成",
              description: "クーポンを作成し、取得可能な状態で公開します。",
            },
          ],
          relations: [
            {
              target: "user",
              screen: "クーポン取得",
              effect:
                "作成した内容がそのまま取得画面のカードとして表示されます。",
            },
          ],
        },
        {
          id: "policies",
          title: "文書管理",
          overview:
            "規約類をユーザー向け・占い師向けに分けて版管理します。下書きの作成から公開までをこの画面で行います。",
          route: "/{orgId}/policies",
          requiresAuth: true,
          waitForSelector: '[role="tab"]',
          annotations: [
            {
              n: 1,
              selector: '[role="tab"]',
              title: "読者区分タブ",
              description:
                "ユーザー向けと占い師向けを切り替えます。区分を切り替えると、その下に文書タブが並びます。",
            },
            {
              n: 2,
              selector: `${OPEN_TAB_PANEL} [role="tab"]`,
              title: "文書タブ",
              description:
                "選んだ読者区分の中で編集対象の文書を切り替えます。ユーザー向けは利用規約・キャンセルポリシー・プライバシーポリシー、占い師向けは利用規約・プライバシーポリシーです。",
            },
            {
              n: 3,
              selector: `${OPEN_TAB_PANEL} button:has-text("新しい改版を作成")`,
              title: "新しい改版を作成",
              description:
                "現在の内容を引き継いだ下書きを作成します。作成しただけでは公開されません。",
            },
            {
              n: 4,
              selector: `${OPEN_TAB_PANEL} table thead tr`,
              title: "改版一覧",
              description:
                "版番号・タイトル・状態・効力発生日・公開日を表示します。",
            },
            {
              n: 5,
              selector: `${OPEN_TAB_PANEL} button:has-text("差分")`,
              title: "差分",
              description: "前の版との変更箇所を並べて確認します。",
            },
            {
              n: 6,
              selector: `${OPEN_TAB_PANEL} button:has-text("公開")`,
              title: "公開",
              description:
                "下書きを公開中に切り替え、既存の公開中の版をアーカイブします。",
            },
          ],
          relations: [
            {
              target: "consultant",
              screen: "ホーム",
              effect:
                "占い師向けの文書を公開すると再同意カードが出て、同意するまで占い師は予約枠を追加できなくなります。ユーザー向けの文書の公開では再同意を求めません。",
            },
            {
              target: "user",
              screen: "利用規約",
              effect:
                "ユーザー向け利用規約の効力発生日を迎えた版が規約ページの本文として表示されます。",
            },
            {
              target: "user",
              screen: "予約情報入力",
              effect: "予約時に同意を求める版が新しい公開版に切り替わります。",
            },
          ],
        },
        {
          id: "policies-cancellation-policy",
          title: "キャンセルポリシー（ユーザー向け）",
          overview:
            "ユーザー向けキャンセルポリシーの改版を管理します。利用規約と同じ手順で下書きを作り、公開すると予約時の同意対象になります。",
          route: "/{orgId}/policies?tab=user_cancellation_policy",
          requiresAuth: true,
          waitForSelector: OPEN_TAB_PANEL,
          annotations: [
            {
              n: 1,
              selector: `${OPEN_TAB_PANEL} [role="tab"][data-state="active"]`,
              title: "選択中のタブ",
              description:
                "キャンセルポリシーの改版だけを表示している状態です。",
            },
            {
              n: 2,
              selector: `${OPEN_TAB_PANEL} button:has-text("新しい改版を作成")`,
              title: "新しい改版を作成",
              description: "現在の内容を引き継いだ下書きを作成します。",
            },
            {
              n: 3,
              selector: `${OPEN_TAB_PANEL} table thead tr`,
              title: "改版一覧",
              description:
                "版番号・タイトル・状態・効力発生日・公開日を表示します。",
            },
          ],
          relations: [
            {
              target: "user",
              screen: "キャンセルポリシー",
              effect:
                "公開版がキャンセルポリシーのページと予約時の同意対象になります。",
            },
          ],
        },
        {
          id: "policies-privacy-policy",
          title: "プライバシーポリシー（ユーザー向け）",
          overview:
            "ユーザー向けプライバシーポリシーの改版を管理します。公開すると予約サイトのプライバシーポリシーページが差し替わります。",
          route: "/{orgId}/policies?tab=user_privacy_policy",
          requiresAuth: true,
          waitForSelector: OPEN_TAB_PANEL,
          annotations: [
            {
              n: 1,
              selector: `${OPEN_TAB_PANEL} [role="tab"][data-state="active"]`,
              title: "選択中のタブ",
              description:
                "プライバシーポリシーの改版だけを表示している状態です。",
            },
            {
              n: 2,
              selector: `${OPEN_TAB_PANEL} button:has-text("新しい改版を作成")`,
              title: "新しい改版を作成",
              description: "現在の内容を引き継いだ下書きを作成します。",
            },
            {
              n: 3,
              selector: `${OPEN_TAB_PANEL} table thead tr`,
              title: "改版一覧",
              description:
                "版番号・タイトル・状態・効力発生日・公開日を表示します。",
            },
          ],
          relations: [
            {
              target: "user",
              screen: "プライバシーポリシー",
              effect: "公開版がプライバシーポリシーのページに表示されます。",
            },
          ],
        },
        {
          id: "policies-consultant-terms",
          title: "利用規約（占い師向け）",
          overview:
            "占い師向け利用規約の改版を管理します。ユーザー向けとは別の文書として版管理し、公開すると占い師に再同意を求めます。",
          route: "/{orgId}/policies?tab=consultant_terms",
          requiresAuth: true,
          waitForSelector: OPEN_TAB_PANEL,
          annotations: [
            {
              n: 1,
              selector: `${OPEN_TAB_PANEL} [role="tab"][data-state="active"]`,
              title: "選択中のタブ",
              description:
                "占い師向け利用規約の改版だけを表示している状態です。",
            },
            {
              n: 2,
              selector: `${OPEN_TAB_PANEL} button:has-text("新しい改版を作成")`,
              title: "新しい改版を作成",
              description: "現在の内容を引き継いだ下書きを作成します。",
            },
            {
              n: 3,
              selector: `${OPEN_TAB_PANEL} table thead tr`,
              title: "改版一覧",
              description:
                "版番号・タイトル・状態・効力発生日・公開日を表示します。",
            },
          ],
          relations: [
            {
              target: "consultant",
              screen: "ホーム",
              effect:
                "公開すると再同意カードが出て、同意するまで占い師は予約枠を追加できなくなります。",
            },
            {
              target: "consultant",
              screen: "文書管理",
              effect: "公開版が占い師向け利用規約のタブに表示されます。",
            },
          ],
        },
        {
          id: "policies-consultant-privacy-policy",
          title: "プライバシーポリシー（占い師向け）",
          overview:
            "占い師向けプライバシーポリシーの改版を管理します。占い師本人の個人情報の取扱いを定める文書で、ユーザー向けとは別に版管理します。",
          route: "/{orgId}/policies?tab=consultant_privacy_policy",
          requiresAuth: true,
          waitForSelector: OPEN_TAB_PANEL,
          annotations: [
            {
              n: 1,
              selector: `${OPEN_TAB_PANEL} [role="tab"][data-state="active"]`,
              title: "選択中のタブ",
              description:
                "占い師向けプライバシーポリシーの改版だけを表示している状態です。",
            },
            {
              n: 2,
              selector: `${OPEN_TAB_PANEL} button:has-text("新しい改版を作成")`,
              title: "新しい改版を作成",
              description: "現在の内容を引き継いだ下書きを作成します。",
            },
            {
              n: 3,
              selector: `${OPEN_TAB_PANEL} table thead tr`,
              title: "改版一覧",
              description:
                "版番号・タイトル・状態・効力発生日・公開日を表示します。",
            },
          ],
          relations: [
            {
              target: "consultant",
              screen: "文書管理",
              effect:
                "公開版が占い師向けプライバシーポリシーのタブに表示されます。",
            },
          ],
        },
        {
          id: "policy-editor",
          title: "改版エディタ",
          overview:
            "改版の版番号・タイトル・本文を編集します。本文は Markdown で書き、プレビューで表示を確認してから保存します。",
          route: "/{orgId}/policies",
          requiresAuth: true,
          waitForSelector: `${OPEN_TAB_PANEL} button:has-text("新しい改版を作成")`,
          setup: openDialog(
            `${OPEN_TAB_PANEL} button:has-text("新しい改版を作成")`,
          ),
          captureMode: "viewport",
          annotations: [
            {
              n: 1,
              selector: `${dialogField("version")} input`,
              title: "version",
              description:
                "2026-08-01 のように版を識別する文字列で、同じ文書内で重複できません。",
            },
            {
              n: 2,
              selector: `${dialogField("title")} input`,
              title: "title",
              description: "改版一覧に表示される見出しです。",
            },
            {
              n: 3,
              selector: `${OPEN_DIALOG} textarea`,
              title: "本文",
              description: "Markdown で規約の本文を記述します。",
            },
            {
              n: 4,
              selector: `${OPEN_DIALOG} button:has-text("プレビュー")`,
              title: "プレビュー",
              description:
                "Markdown を整形した状態で確認します。編集に戻ると続きを書けます。",
            },
            {
              n: 5,
              selector: `${OPEN_DIALOG} button[type="submit"]`,
              title: "保存",
              description:
                "下書きとして保存します。保存しただけでは公開されません。",
            },
          ],
        },
        {
          id: "policy-publish",
          title: "改版の公開",
          overview:
            "下書きを公開に切り替えます。効力発生日時を指定でき、既存の公開中の版は自動でアーカイブされます。",
          route: "/{orgId}/policies",
          requiresAuth: true,
          waitForSelector: `${OPEN_TAB_PANEL} button:has-text("公開")`,
          setup: openDialog(`${OPEN_TAB_PANEL} button:has-text("公開")`),
          captureMode: "viewport",
          annotations: [
            {
              n: 1,
              selector: `${dialogField("効力発生日時")} input`,
              title: "効力発生日時",
              description:
                "この日時を過ぎると新しい版が適用されます。既定は翌日の 9 時です。",
            },
            {
              n: 2,
              selector: `${OPEN_DIALOG} button:has-text("公開")`,
              title: "公開する",
              description:
                "公開を確定し、これまでの公開中の版をアーカイブに移します。",
            },
            {
              n: 3,
              selector: `${OPEN_DIALOG} button:has-text("キャンセル")`,
              title: "キャンセル",
              description: "公開せずにダイアログを閉じます。",
            },
          ],
          relations: [
            {
              target: "consultant",
              screen: "予約枠管理",
              effect:
                "占い師向けの文書を公開した場合、占い師が再同意するまで新しい予約枠を追加できない状態になります。",
            },
            {
              target: "user",
              screen: "予約情報入力",
              effect:
                "ユーザー向け利用規約・キャンセルポリシーを公開した場合、効力発生日以降の予約は新しい版への同意を求められるようになります。",
            },
          ],
        },
        {
          id: "policy-diff",
          title: "改版の差分",
          overview:
            "選んだ版との変更箇所を行単位で比較します。公開前に何が変わるかを確認する画面です。",
          route: "/{orgId}/policies",
          requiresAuth: true,
          waitForSelector: `${OPEN_TAB_PANEL} button:has-text("差分")`,
          setup: openDialog(`${OPEN_TAB_PANEL} button:has-text("差分")`),
          captureMode: "viewport",
          annotations: [
            {
              n: 1,
              selector: `${dialogField("比較元（version）")} select`,
              title: "比較元",
              description:
                "比較したい版を選びます。なしを選ぶと全文が新規追加として表示されます。",
            },
            {
              n: 2,
              selector: `${OPEN_DIALOG} button:has-text("閉じる")`,
              title: "閉じる",
              description: "差分ビューを閉じて改版一覧に戻ります。",
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
          relations: [
            {
              target: "consultant",
              screen: "予約枠管理",
              effect:
                "カレンダーの表示範囲が営業時間に合わせて変わり、営業時間外には予約枠を追加できなくなります。",
            },
            {
              target: "user",
              screen: "開始時刻選択",
              effect:
                "営業時間から外れた既存の枠は、予約できる開始時刻として表示されなくなります。",
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
          relations: [
            {
              target: "consultant",
              screen: "プロフィール",
              effect:
                "占い師本人のプロフィールに表示されるステータス名が変わります。",
            },
            {
              target: "user",
              screen: "占い師一覧",
              effect: "占い師カードに表示されるステータス名が変わります。",
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
          relations: [
            {
              target: "consultant",
              screen: "料金プラン",
              effect:
                "範囲外の金額ではプランを作成できず、範囲から外れた既存プランには範囲外バッジが付きます。",
            },
            {
              target: "user",
              screen: "料金プラン選択",
              effect: "範囲外になったプランは選択肢に表示されなくなります。",
            },
          ],
        },
      ],
    },
  ],
};

export default config;
