import type { CaptureContext } from "../src/context.js";
import type { AppConfig } from "../src/types.js";

/** Park UI の Dialog は unmountOnExit なので、開いている 1 つだけが DOM に存在する */
const OPEN_DIALOG = '[data-scope="dialog"][data-part="content"]';

/** 先頭に一致した要素の href を返す。無ければ null */
async function firstHref(
  page: CaptureContext["page"],
  selector: string,
): Promise<string | null> {
  const locator = page.locator(selector).first();
  if ((await locator.count()) === 0) return null;
  return await locator.getAttribute("href");
}

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
    const resolved: Record<string, string | undefined> = {};
    const memoHref = await firstHref(
      page,
      'a[href*="/bookings/"][href*="/memo"]',
    );
    const memoMatch = memoHref?.match(/\/bookings\/([^/]+)\/memo/);
    if (memoMatch) resolved.bookingId = decodeURIComponent(memoMatch[1]);

    // 鑑定書リンクは鑑定終了後の予約にしか出ないので、メモとは別の予約 ID になり得る
    const reportHref = await firstHref(
      page,
      'a[href*="/bookings/"][href*="/appraisal-report"]',
    );
    const reportMatch = reportHref?.match(
      /\/bookings\/([^/]+)\/appraisal-report/,
    );
    if (reportMatch) {
      resolved.appraisalBookingId = decodeURIComponent(reportMatch[1]);
    }
    return resolved;
  },
  serviceMap: {
    summary:
      "占い師コンソールで整えた内容は、そのまま予約サイトに公開されます。予約可能な時間帯、選べる料金プラン、掲載されるプロフィール、鑑定後に届く鑑定書は、いずれもここでの操作が起点です。各画面の「関連する動き」欄に、その操作が予約サイトのどこに出るかを記載しています。",
    flows: [
      {
        path: "占い師コンソール → 予約サイト",
        items: [
          "予約枠管理で追加した枠が、予約サイトで選べる開始時刻になります。削除すると選べなくなります。",
          "料金プランで作成したプランが、予約サイトの料金プラン選択に並びます。アーカイブすると消えます。",
          "プロフィールの表示名・自己紹介・専門分野・アイコンが、占い師一覧のカードに反映されます。",
          "鑑定書を発行すると、予約者のマイページの鑑定書一覧に並び、本文を読めるようになります。",
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
            {
              n: 5,
              selector: "text=組織ポリシーが更新されました",
              title: "ポリシー更新の案内",
              description:
                "規約が改版されると表示され、同意するまで新しい予約枠を追加できません。",
            },
          ],
        },
        {
          id: "reagreement",
          title: "ポリシーの再同意",
          overview:
            "規約が改版されたときに、最新版の本文を確認して同意します。同意するまで新しい予約枠を追加できません。",
          route: "/{orgId}/home",
          requiresAuth: true,
          waitForSelector: 'button:has-text("内容を確認して同意")',
          setup: openDialog('button:has-text("内容を確認して同意")'),
          captureMode: "viewport",
          annotations: [
            {
              n: 1,
              selector: '[data-scope="dialog"][data-part="title"]',
              title: "対象の文書と版",
              description:
                "同意を求められている文書名と版番号を表示します。前回同意した版も併記されます。",
            },
            {
              n: 2,
              selector: `${OPEN_DIALOG} button:has-text("同意する")`,
              title: "同意する",
              description:
                "最新版に同意し、予約枠の追加を再び行えるようにします。",
            },
            {
              n: 3,
              selector: `${OPEN_DIALOG} button:has-text("あとで")`,
              title: "あとで",
              description: "同意せずに閉じます。案内はホームに残り続けます。",
            },
          ],
        },
        {
          id: "bookings",
          title: "予約一覧",
          overview:
            "担当中の予約を一覧で確認できます。顧客名にカーソルを合わせると連絡先が表示され、鑑定メモと鑑定書の編集にもここから移動します。",
          route: "/{orgId}/bookings",
          requiresAuth: true,
          waitForSelector: "h1",
          annotations: [
            {
              n: 1,
              selector: "table thead tr",
              title: "テーブルヘッダ",
              description:
                "日時・ステータス・顧客・料金プランなど、対応に必要な情報をまとめて表示します。",
            },
            {
              n: 2,
              selector: 'a[target="_blank"]',
              title: "Zoom 参加リンク",
              description:
                "予約時間が近づくと Zoom への参加ボタンが有効になります。",
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
              selector: '[data-scope="select"][data-part="trigger"]',
              title: "表示件数・並び順",
              description:
                "画面下部のバーで 1 ページの表示件数と並び順を切り替えます。右側のページ送りで前後のページを表示できます。",
            },
            {
              n: 5,
              selector: 'button:has-text("入室確認")',
              title: "入室確認",
              description:
                "開始 15 分前から押せます。押しておくと入室済みとして記録され、遅刻の確認対象から外れます。",
            },
            {
              n: 6,
              selector: 'a[href*="/appraisal-report"]',
              title: "鑑定書",
              description:
                "鑑定の終了時刻を過ぎるとアイコンが有効になり、鑑定書の作成画面へ移動します。",
            },
          ],
          relations: [
            {
              target: "user",
              screen: "鑑定書",
              effect:
                "ここで発行した鑑定書だけが、予約者のマイページに表示されます。",
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
        {
          id: "appraisal-report",
          title: "鑑定書",
          overview:
            "鑑定テーマ・現状・鑑定結果・開運アクション・総括をまとめ、予約者に発行する画面です。下書きのうちは何度でも書き直せます。",
          route: "/{orgId}/bookings/{appraisalBookingId}/appraisal-report",
          requires: ["orgId", "appraisalBookingId"],
          waitForSelector: "form",
          annotations: [
            {
              n: 1,
              selector: "#title",
              title: "タイトル",
              description:
                "予約者の鑑定書一覧に見出しとして並ぶ文言を入力します。",
            },
            {
              n: 2,
              selector: "#appraisalDate",
              title: "お名前・生年月日・鑑定日",
              description:
                "鑑定書の冒頭に載る項目で、鑑定メモに入力済みの内容を初期値として引き継ぎます。",
            },
            {
              n: 3,
              selector: "#theme",
              title: "本文の各項目",
              description:
                "鑑定テーマ・現状・鑑定結果・開運アクション・総括を順に記述します。",
            },
            {
              n: 4,
              selector: 'button[type="submit"]',
              title: "下書きを保存",
              description:
                "内容を下書きとして保存します。予約者にはまだ表示されません。",
            },
            {
              n: 5,
              selector: 'button:has-text("発行する")',
              title: "発行する",
              description:
                "確認のうえ発行すると予約者に公開され、以降は内容を編集できなくなります。",
            },
          ],
          relations: [
            {
              target: "user",
              screen: "鑑定書",
              effect:
                "発行した鑑定書がマイページの一覧に加わり、本文をいつでも読み返せるようになります。",
            },
          ],
        },
        {
          id: "appraisal-report-publish",
          title: "鑑定書の発行",
          overview:
            "鑑定書を発行する前の確認画面です。発行後は取り消しも編集もできないため、内容を確かめてから実行します。",
          route: "/{orgId}/bookings/{appraisalBookingId}/appraisal-report",
          requires: ["orgId", "appraisalBookingId"],
          waitForSelector: 'button:has-text("発行する")',
          setup: openDialog('button:has-text("発行する")'),
          captureMode: "viewport",
          annotations: [
            {
              n: 1,
              selector: `${OPEN_DIALOG} button:has-text("発行する")`,
              title: "発行する",
              description:
                "画面の入力内容をそのまま確定し、予約者に公開します。",
            },
            {
              n: 2,
              selector: `${OPEN_DIALOG} button:has-text("戻る")`,
              title: "戻る",
              description: "発行せずに編集画面へ戻ります。",
            },
          ],
          relations: [
            {
              target: "user",
              screen: "鑑定書",
              effect:
                "発行した時点でマイページに表示されるため、公開前の内容は下書きのまま保存します。",
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
                "確定済みの予約、開放中の空き枠、準備時間が色分けされて表示されます。",
            },
          ],
          relations: [
            {
              target: "user",
              screen: "開始時刻選択",
              effect:
                "追加した枠が、そのまま予約できる開始時刻として並びます。削除すると選べなくなります。",
            },
          ],
        },
        {
          id: "slot-delete",
          title: "予約枠の削除",
          overview:
            "カレンダー上の空き枠をクリックすると削除の確認が出ます。削除した時間帯はその場で予約を受け付けなくなります。",
          route: "/{orgId}/slots",
          requiresAuth: true,
          waitForSelector: ".rbc-event",
          setup: openDialog(".rbc-event"),
          captureMode: "viewport",
          annotations: [
            {
              n: 1,
              selector: `${OPEN_DIALOG} button:has-text("削除")`,
              title: "削除",
              description:
                "枠を削除します。すでに予約が入っている時間帯の枠は削除できません。",
            },
            {
              n: 2,
              selector: `${OPEN_DIALOG} button:has-text("キャンセル")`,
              title: "キャンセル",
              description: "削除せずに閉じます。",
            },
          ],
          relations: [
            {
              target: "user",
              screen: "開始時刻選択",
              effect:
                "削除した時間帯は、予約できる開始時刻の一覧から即座に消えます。",
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
              selector:
                'form [data-scope="field"][data-part="root"]:has(> label:text-is("プラン名")) input',
              title: "プラン名",
              description:
                "顧客に表示されるプラン名を入力します（例: 30 分鑑定）。",
            },
            {
              n: 2,
              selector:
                'form [data-scope="field"][data-part="root"]:has(> label:text-is("税込金額")) input',
              title: "税込金額",
              description:
                "税込金額を数値で入力します。画面上部の設定範囲内の金額のみ有効です。",
            },
            {
              n: 3,
              selector: 'form select, form button[role="combobox"]',
              title: "相談時間",
              description:
                "対応可能な相談時間（30 / 60 / 90 分等）を選択します。",
            },
            {
              n: 4,
              selector: 'form button[type="submit"]',
              title: "作成ボタン",
              description: "プランを作成します。作成後は一覧下に追加されます。",
            },
            {
              n: 5,
              selector: "table tbody tr:first-child",
              title: "プラン一覧行",
              description:
                "プラン名の編集、アーカイブ、復元ができます。アーカイブ後は顧客側に表示されません。",
            },
            {
              n: 6,
              selector: "text=現在の設定範囲",
              title: "設定範囲の表示",
              description:
                "作成できる税込金額の上限と下限で、この範囲は運営側が決めています。",
            },
          ],
          relations: [
            {
              target: "user",
              screen: "料金プラン選択",
              effect:
                "作成したプランが選択肢に並び、アーカイブすると表示されなくなります。",
            },
            {
              target: "user",
              screen: "開始時刻選択",
              effect:
                "選ばれたプランの相談時間だけ連続して空いている枠が、開始時刻の候補になります。",
            },
            {
              target: "user",
              screen: "料金プラン選択",
              effect:
                "プラン名を変えると別のプランとして扱われるため、選択中だった予約者は選び直しになります。",
            },
          ],
        },
        {
          id: "settlement-statement",
          title: "精算書発行",
          overview:
            "対象月の借受金からシステム利用料と事務所利用料を差し引いた精算書を作り、PDF として保存する画面です。保存した PDF は各自で運営へメール送信します。",
          route: "/{orgId}/settlement-statement",
          requiresAuth: true,
          waitForSelector: "h1",
          annotations: [
            {
              n: 1,
              selector: '[data-scope="select"][data-part="trigger"]',
              title: "対象月",
              description:
                "直近 12 ヶ月から対象月を選びます。既定は締めの済んだ先月です。",
            },
            {
              n: 2,
              selector: 'input[aria-label="発行者名"]',
              title: "発行者名",
              description:
                "精算書に発行者として印字する名前で、初期値は登録済みの氏名です。",
            },
            {
              n: 3,
              selector: 'input[aria-label="住所"]',
              title: "住所",
              description: "精算書に印字する住所を入力します。",
            },
            {
              n: 4,
              selector: '[data-scope="checkbox"][data-part="root"]',
              title: "事務所を住所として利用する",
              description:
                "自宅住所を出さずに済む代わりに、月 500 円の事務所利用料が控除されます。",
            },
            {
              n: 5,
              selector: 'button:has-text("PDFとして保存")',
              title: "PDF として保存",
              description:
                "印刷ダイアログを開きます。送信先で「PDFに保存」を選ぶと精算書が保存されます。",
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
              selector: '[data-scope="file-upload"][data-part="dropzone"]',
              title: "アバター画像",
              description:
                "ドラッグ&ドロップまたは「画像を選択」から、1:1 の正方形画像（JPEG / PNG / WebP、最大 5MB）をアップロードできます。",
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
          relations: [
            {
              target: "user",
              screen: "占い師一覧",
              effect:
                "表示名・自己紹介・専門分野・アイコンが、そのままカードの内容になります。",
            },
          ],
        },
        {
          id: "policies",
          title: "文書管理",
          overview:
            "この組織で現在有効な占い師向けの利用規約とプライバシーポリシーを閲覧します。改版はこの画面からは行いません。",
          route: "/{orgId}/policies",
          requiresAuth: true,
          waitForSelector: '[role="tab"]',
          annotations: [
            {
              n: 1,
              selector: '[role="tab"]',
              title: "文書タブ",
              description:
                "占い師向け利用規約と占い師向けプライバシーポリシーを切り替えます。ユーザー向けの規約類は予約サイト側に掲載されます。",
            },
            {
              n: 2,
              selector: '[role="tabpanel"][data-state="open"]',
              title: "本文",
              description:
                "現在有効な版の本文と効力発生日を表示します。まだ公開版がない場合はその旨が表示されます。",
            },
          ],
        },
      ],
    },
  ],
};

export default config;
