import type { CaptureContext } from "../src/context.js";
import type { AppConfig } from "../src/types.js";

/** 予約フォームに流し込むダミー顧客情報。個人情報を PDF に載せないための固定値。 */
const DUMMY_CUSTOMER = {
  name: process.env.MANUAL_BOOKING_NAME ?? "予報 太郎",
  email: process.env.MANUAL_BOOKING_EMAIL ?? "manual-preview@example.com",
  phone: process.env.MANUAL_BOOKING_PHONE ?? "090-1234-5678",
  birthDate: process.env.MANUAL_BOOKING_BIRTH_DATE ?? "1990-01-01",
} as const;

/** 予約完了・キャンセル画面を撮るためのダミー予約 ID。実予約が取れなかった場合のフォールバック。 */
const SAMPLE_BOOKING_ID = "sample-booking-id";

/** Park UI の Dialog は unmountOnExit なので、開いている 1 つだけが DOM に存在する */
const OPEN_DIALOG = '[data-scope="dialog"][data-part="content"]';

function isProdBaseUrl(baseUrl: string): boolean {
  return /^https:\/\/user\.miraiyohou\.com/.test(baseUrl);
}

/**
 * ダミー予約を作ってよいか判定する。
 * 予約作成は Zoom ミーティング生成と確認メール送信を伴う実操作なので、
 * 本番だけは MANUAL_CREATE_BOOKING=1 の明示指定を必須にする。
 */
function canCreateBooking(baseUrl: string): boolean {
  const flag = process.env.MANUAL_CREATE_BOOKING;
  if (flag === "0") return false;
  if (isProdBaseUrl(baseUrl)) return flag === "1";
  return true;
}

async function firstAttribute(
  { page }: Pick<CaptureContext, "page">,
  selector: string,
  attribute: string,
  timeoutMs = 10_000,
): Promise<string | null> {
  try {
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: "attached", timeout: timeoutMs });
    return await locator.getAttribute(attribute);
  } catch {
    return null;
  }
}

/** 占い師一覧から先頭の占い師 ID を取り出す。 */
async function resolveConsultantId(
  ctx: CaptureContext,
  orgPath: string,
): Promise<string | undefined> {
  await ctx.page.goto(`${ctx.baseUrl}/${orgPath}/consultants`, {
    waitUntil: "domcontentloaded",
  });
  const href = await firstAttribute(
    ctx,
    'a[href*="/consultants/"][href$="/plans"]',
    "href",
  );
  const match = href?.match(/\/consultants\/([^/]+)\/plans/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

/** 料金プラン画面を操作して selectionId / durationMinutes を確定させる。 */
async function resolvePlanSelection(
  ctx: CaptureContext,
  orgPath: string,
  consultantId: string,
): Promise<{ selectionId?: string; durationMinutes?: string }> {
  await ctx.page.goto(
    `${ctx.baseUrl}/${orgPath}/consultants/${encodeURIComponent(consultantId)}/plans`,
    { waitUntil: "domcontentloaded" },
  );
  try {
    await ctx.page
      .locator('[data-scope="radio-group"][data-part="item"]')
      .first()
      .click({ timeout: 10_000 });
    await ctx.page
      .locator('button:has-text("予約枠の選択へ進む")')
      .click({ timeout: 10_000 });
    await ctx.page.waitForURL(/\/slots\?/, { timeout: 10_000 });
  } catch {
    return {};
  }
  const search = new URL(ctx.page.url()).searchParams;
  return {
    selectionId: search.get("selectionId") ?? undefined,
    durationMinutes: search.get("durationMinutes") ?? undefined,
  };
}

/** 開始時刻一覧の先頭リンクから startsAt を取り出す。 */
async function resolveStartsAt(
  ctx: CaptureContext,
): Promise<string | undefined> {
  const href = await firstAttribute(ctx, 'a[href*="/booking?"]', "href");
  if (!href) return undefined;
  const search = new URL(href, ctx.baseUrl).searchParams;
  return search.get("startsAt") ?? undefined;
}

/**
 * 予約フォームを実際に送信してダミー予約を 1 件作り、
 * お支払い画面の bookingId / bookingActionToken を取得する。
 */
async function createDummyBooking(
  ctx: CaptureContext,
  bookingUrl: string,
): Promise<{ bookingId?: string; bookingActionToken?: string }> {
  const { page } = ctx;
  await page.goto(bookingUrl, { waitUntil: "domcontentloaded" });

  try {
    await page.waitForSelector('input[name="customerName"]', {
      timeout: 15_000,
    });
  } catch {
    console.warn(
      "  ダミー予約をスキップ: 予約フォームに到達できません（会員情報登録と Zoom 連携が必要です）",
    );
    return {};
  }

  await page.fill('input[name="customerName"]', DUMMY_CUSTOMER.name);
  await page.fill('input[name="customerEmail"]', DUMMY_CUSTOMER.email);
  await page.fill('input[name="customerPhone"]', DUMMY_CUSTOMER.phone);
  await page.fill('input[name="customerBirthDate"]', DUMMY_CUSTOMER.birthDate);

  try {
    await page
      .locator('[data-scope="checkbox"][data-part="root"]')
      .last()
      .click({ timeout: 5_000 });
    await page.locator('button[type="submit"]').click({ timeout: 5_000 });
    await page.waitForURL(/\/booking\/payment\?/, { timeout: 30_000 });
  } catch {
    console.warn("  ダミー予約をスキップ: 予約作成に失敗しました");
    return {};
  }

  const search = new URL(page.url()).searchParams;
  return {
    bookingId: search.get("bookingId") ?? undefined,
    bookingActionToken: search.get("bookingActionToken") ?? undefined,
  };
}

const config: AppConfig = {
  appId: "user",
  appName: "みらい予報 予約サイト",
  audience: "予約者",
  defaultEnv: "local",
  environments: {
    local: {
      baseUrl: process.env.USER_BASE_URL ?? "http://localhost:3010",
      defaultOrgId: process.env.USER_LOCAL_ORG_ID,
    },
    dev: {
      baseUrl: "https://dev.user.miraiyohou.com",
      defaultOrgId: process.env.USER_DEV_ORG_ID,
    },
    prod: {
      baseUrl: "https://user.miraiyohou.com",
      defaultOrgId: process.env.USER_PROD_ORG_ID,
    },
  },
  // 予約サイトに専用のログイン画面はない。会員登録画面から Google ログインし、
  // マイページへ遷移したことでログイン完了を検知する。
  loginPath: "/register",
  postLoginUrlPattern: /\/mypage(\/[^?]*)?(\?.*)?$/,
  resolveDynamicParams: async (ctx) => {
    const orgId = ctx.params.orgId;
    if (!orgId) {
      console.warn(
        "  orgId が未設定のため動的パラメタを解決できません（MANUAL_ORG_ID を指定してください）",
      );
      return {};
    }
    const orgPath = encodeURIComponent(orgId);
    const resolved: Record<string, string | undefined> = {
      bookingId: SAMPLE_BOOKING_ID,
      cancelToken: `${SAMPLE_BOOKING_ID}.manual-preview`,
    };

    const consultantId = await resolveConsultantId(ctx, orgPath);
    if (!consultantId) return resolved;
    resolved.consultantId = consultantId;

    const { selectionId, durationMinutes } = await resolvePlanSelection(
      ctx,
      orgPath,
      consultantId,
    );
    if (!selectionId || !durationMinutes) return resolved;
    resolved.selectionId = selectionId;
    resolved.durationMinutes = durationMinutes;

    const startsAt = await resolveStartsAt(ctx);
    if (!startsAt) return resolved;
    resolved.startsAt = startsAt;

    if (!canCreateBooking(ctx.baseUrl)) {
      console.warn(
        "  ダミー予約をスキップ: 本番環境では MANUAL_CREATE_BOOKING=1 が必要です",
      );
      return resolved;
    }

    const bookingUrl =
      `${ctx.baseUrl}/${orgPath}/booking` +
      `?consultantId=${encodeURIComponent(consultantId)}` +
      `&startsAt=${encodeURIComponent(startsAt)}` +
      `&selectionId=${encodeURIComponent(selectionId)}` +
      `&durationMinutes=${encodeURIComponent(durationMinutes)}`;
    const { bookingId, bookingActionToken } = await createDummyBooking(
      ctx,
      bookingUrl,
    );
    if (bookingId) {
      resolved.bookingId = bookingId;
      resolved.cancelToken = `${bookingId}.manual-preview`;
    }
    if (bookingActionToken) resolved.bookingActionToken = bookingActionToken;

    return resolved;
  },
  sections: [
    {
      id: "start",
      title: "はじめに",
      pages: [
        {
          id: "top",
          title: "トップ",
          overview:
            "サービスの入口となる画面です。会員登録して予約を始めるか、登録済みの場合はマイページへ進みます。",
          route: "/",
          waitForSelector: 'h1:has-text("あなたのみらい予報")',
          annotations: [
            {
              n: 1,
              selector: 'a[href="/register"]',
              title: "会員登録して始める",
              description: "会員登録画面へ移動し、予約に必要な登録を行います。",
            },
            {
              n: 2,
              selector: 'a[href="/mypage"]',
              title: "ログイン",
              description:
                "登録済みの Google アカウントでマイページにログインします。",
            },
          ],
        },
        {
          id: "register",
          title: "会員登録",
          overview:
            "予約に必要な会員登録を行う画面です。ゲスト登録と Google アカウント登録のどちらかを選びます。",
          route: "/register",
          waitForSelector: 'h1:has-text("会員登録")',
          annotations: [
            {
              n: 1,
              selector: 'button:has-text("ゲストとして会員登録する")',
              title: "ゲスト登録",
              description:
                "お名前と生年月日だけで登録し、その端末から予約できるようになります。",
            },
            {
              n: 2,
              selector: 'button:has-text("Google アカウントで会員登録する")',
              title: "Google 登録",
              description:
                "Google アカウントで登録し、別の端末からもログインできるようにします。",
            },
            {
              n: 3,
              selector: 'a[href="/mypage"]',
              title: "ログインリンク",
              description: "登録済みの場合はマイページへ移動します。",
            },
          ],
        },
      ],
    },
    {
      id: "booking",
      title: "予約する",
      pages: [
        {
          id: "consultants",
          title: "占い師一覧",
          overview:
            "予約できる占い師を一覧で確認する画面です。プロフィールと専門分野を見て相談相手を選びます。",
          route: "/{orgId}/consultants",
          requires: ["orgId"],
          waitForSelector: 'h1:has-text("占い師一覧")',
          annotations: [
            {
              n: 1,
              selector: "h2",
              title: "占い師名",
              description: "占い師の表示名と現在のステータスを確認できます。",
            },
            {
              n: 2,
              selector: 'a[href$="/plans"]',
              title: "プランを選択",
              description: "選んだ占い師の料金プラン画面へ移動します。",
            },
            {
              n: 3,
              selector: 'a[href="/mypage"]',
              title: "マイページ",
              description: "予約履歴やクーポンを確認する画面へ移動します。",
            },
          ],
        },
        {
          id: "plans",
          title: "料金プラン選択",
          overview:
            "占い師ごとの相談時間と料金を選ぶ画面です。選んだプランがそのまま予約内容になります。",
          route: "/{orgId}/consultants/{consultantId}/plans",
          requires: ["orgId", "consultantId"],
          waitForSelector: 'h1:has-text("料金プランを選択")',
          annotations: [
            {
              n: 1,
              selector: '[data-scope="radio-group"][data-part="item"]',
              title: "プラン",
              description:
                "相談時間と税込金額を確認してプランを 1 つ選びます。",
            },
            {
              n: 2,
              selector: 'button:has-text("予約枠の選択へ進む")',
              title: "予約枠の選択へ進む",
              description: "選んだプランで予約できる開始時刻の一覧へ進みます。",
            },
            {
              n: 3,
              selector: 'a[href$="/consultants"]',
              title: "占い師一覧に戻る",
              description: "別の占い師を選び直す場合に一覧へ戻ります。",
            },
          ],
        },
        {
          id: "slots",
          title: "開始時刻選択",
          overview:
            "選んだプランで予約できる開始時刻を日付ごとに表示する画面です。希望の枠を選ぶと予約情報の入力に進みます。",
          route:
            "/{orgId}/consultants/{consultantId}/slots?selectionId={selectionId}&durationMinutes={durationMinutes}",
          requires: ["orgId", "consultantId", "selectionId", "durationMinutes"],
          waitForSelector: 'h1:has-text("開始時刻を選択")',
          annotations: [
            {
              n: 1,
              selector: "text=選択中のプラン",
              title: "選択中のプラン",
              description: "前の画面で選んだプラン名と料金を確認できます。",
            },
            {
              n: 2,
              selector: "h2",
              title: "日付見出し",
              description: "予約枠を日付ごとにまとめて表示します。",
            },
            {
              n: 3,
              selector: 'a[href*="/booking?"]',
              title: "予約枠",
              description: "選んだ開始時刻で予約情報の入力へ進みます。",
            },
          ],
        },
        {
          id: "booking-form",
          title: "予約情報入力",
          overview:
            "予約者の連絡先と相談内容を入力し、規約に同意して予約を確定する画面です。クーポンもここで適用します。",
          route:
            "/{orgId}/booking?consultantId={consultantId}&startsAt={startsAt}&selectionId={selectionId}&durationMinutes={durationMinutes}",
          requires: [
            "orgId",
            "consultantId",
            "startsAt",
            "selectionId",
            "durationMinutes",
          ],
          waitForSelector: 'h1:has-text("予約情報入力")',
          annotations: [
            {
              n: 1,
              selector: 'input[name="customerName"]',
              title: "予約者情報",
              description:
                "お名前・メールアドレス・電話番号・生年月日を入力します。",
            },
            {
              n: 2,
              selector: 'textarea[name="consultantContent"]',
              title: "ご相談内容",
              description:
                "事前に相談したい内容を伝えると、より充実した相談になります。",
            },
            {
              n: 3,
              selector: 'a[href$="/coupons"]',
              title: "クーポン",
              description:
                "保有クーポンを 1 枚まで適用し、支払金額から割り引きます。",
            },
            {
              n: 4,
              selector: "text=お支払い金額",
              title: "お支払い金額",
              description: "クーポン適用後の請求予定額を表示します。",
            },
            {
              n: 5,
              selector: 'button[type="submit"]',
              title: "予約を確定",
              description:
                "利用規約とキャンセルポリシーに同意したうえで予約を作成し、お支払い画面へ進みます。",
            },
          ],
        },
        {
          id: "payment",
          title: "お支払い",
          overview:
            "予約に対する支払い方法を登録する画面です。クレジットカードは相談実施後に確定し、PayPay は予約時に支払いが完了します。",
          route:
            "/{orgId}/booking/payment?bookingId={bookingId}&bookingActionToken={bookingActionToken}",
          requires: ["orgId", "bookingId", "bookingActionToken"],
          waitForSelector: 'h1:has-text("お支払い")',
          annotations: [
            {
              n: 1,
              selector: "text=クレジットカード",
              title: "クレジットカード",
              description:
                "カード情報を登録し、相談実施後に支払いを確定します。",
            },
            {
              n: 2,
              selector: "text=PayPay",
              title: "PayPay",
              description: "予約確定と同時に支払いが完了します。",
            },
            {
              n: 3,
              selector: 'button[type="submit"]',
              title: "登録ボタン",
              description:
                "入力した支払い情報を確定し、予約完了画面へ進みます。",
            },
          ],
        },
        {
          id: "booking-complete",
          title: "予約完了",
          overview:
            "予約と支払い方法の登録が完了したことを知らせる画面です。予約 ID と Zoom の参加 URL を確認できます。",
          route: "/{orgId}/booking/complete?bookingId={bookingId}&mode=setup",
          requires: ["orgId", "bookingId"],
          waitForSelector: "h1",
          annotations: [
            {
              n: 1,
              selector: "text=予約ID",
              title: "予約 ID",
              description: "問い合わせの際に伝える予約の識別子です。",
            },
            {
              n: 2,
              selector: 'a[href="/mypage/bookings"]',
              title: "予約一覧へ",
              description: "マイページの予約一覧で予約内容を確認できます。",
            },
          ],
        },
        {
          id: "booking-cancel",
          title: "予約キャンセル",
          overview:
            "予約確認メールのキャンセルリンクから開く画面です。確認ダイアログで実行するとキャンセルが確定します。",
          route: "/{orgId}/booking/cancel?token={cancelToken}",
          requires: ["orgId", "cancelToken"],
          waitForSelector: 'h1:has-text("予約キャンセル")',
          annotations: [
            {
              n: 1,
              selector: 'h1:has-text("予約キャンセル")',
              title: "キャンセル確認",
              description:
                "メールのリンクから開いた予約が対象になります。この操作は取り消せません。",
            },
            {
              n: 2,
              selector: "button",
              title: "キャンセル実行",
              description:
                "確認ダイアログで承認するとキャンセルが確定し、確認メールが届きます。",
            },
          ],
        },
      ],
    },
    {
      id: "mypage",
      title: "マイページ",
      pages: [
        {
          id: "mypage-home",
          title: "マイページ",
          overview:
            "ログイン後のホーム画面です。Zoom 連携などの未完了の準備と、過去に予約した店舗を確認できます。",
          route: "/mypage",
          requiresAuth: true,
          waitForSelector: "h1",
          annotations: [
            {
              n: 1,
              selector: "nav",
              title: "サイドメニュー",
              description:
                "プロフィール・予約一覧・Zoom 連携・クーポンへ移動します。",
            },
            {
              n: 2,
              selector: "text=Zoom 連携が必要です",
              title: "Zoom 連携の案内",
              description:
                "連携が未完了の場合に表示され、ここから連携画面へ移動します。",
            },
            {
              n: 3,
              selector: 'h2:has-text("予約した店舗")',
              title: "予約した店舗",
              description: "過去に利用した店舗から続けて予約できます。",
            },
            {
              n: 4,
              selector: 'button:has-text("ログアウト")',
              title: "ログアウト",
              description: "サインアウトしてトップ画面へ戻ります。",
            },
          ],
        },
        {
          id: "mypage-profile",
          title: "プロフィール",
          overview:
            "会員情報を登録・変更する画面です。ここで登録した内容が予約フォームの初期値になります。",
          route: "/mypage/profile",
          requiresAuth: true,
          waitForSelector: 'h1:has-text("プロフィール")',
          annotations: [
            {
              n: 1,
              selector: "#displayName",
              title: "お名前",
              description: "予約時に占い師へ伝わる表示名です。",
            },
            {
              n: 2,
              selector: "#phoneNumber",
              title: "電話番号",
              description: "登録すると予約フォームに自動で入力されます。",
            },
            {
              n: 3,
              selector: "#birthDate",
              title: "生年月日",
              description:
                "未成年かどうかの判定に使われ、鑑定内容の参考にもなります。",
            },
            {
              n: 4,
              selector: 'button[type="submit"]',
              title: "保存",
              description: "入力した会員情報を保存します。",
            },
            {
              n: 5,
              selector: 'a[href*="/mypage/withdraw"]',
              title: "退会について",
              description:
                "サービスの利用をやめる場合の手続き画面へ移動します。",
            },
          ],
        },
        {
          id: "mypage-bookings",
          title: "予約一覧",
          overview:
            "自分の予約を一覧で確認する画面です。Zoom への入室とキャンセルもここから行います。",
          route: "/mypage/bookings",
          requiresAuth: true,
          waitForSelector: 'h1:has-text("予約一覧")',
          annotations: [
            {
              n: 1,
              selector: "h2",
              title: "予約グループ",
              description: "今後の予約と過去の予約に分けて表示します。",
            },
            {
              n: 2,
              selector: 'a:has-text("Zoom")',
              title: "Zoom に入室",
              description: "開始時刻が近づくと押せるようになります。",
            },
            {
              n: 3,
              selector: 'button:has-text("キャンセル")',
              title: "キャンセル",
              description: "キャンセルポリシーの範囲内で予約を取り消します。",
            },
            {
              n: 4,
              selector: "text=クーポン",
              title: "クーポン割引",
              description:
                "クーポンを使った予約では、割引額とお支払い金額を並べて表示します。",
            },
          ],
        },
        {
          id: "mypage-booking-cancel",
          title: "キャンセルの確認",
          overview:
            "予約一覧のキャンセルボタンを押すと表示される確認画面です。実行すると取り消せません。",
          route: "/mypage/bookings",
          requiresAuth: true,
          waitForSelector: 'button:has-text("キャンセル")',
          setup: async ({ page }) => {
            await page.locator('button:has-text("キャンセル")').first().click();
            await page.waitForSelector(OPEN_DIALOG, {
              state: "visible",
              timeout: 5_000,
            });
          },
          captureMode: "viewport",
          annotations: [
            {
              n: 1,
              selector: `${OPEN_DIALOG} button:has-text("キャンセルする")`,
              title: "キャンセルする",
              description:
                "予約を取り消し、確認メールを送ります。取り消した予約は元に戻せません。",
            },
            {
              n: 2,
              selector: `${OPEN_DIALOG} button:has-text("戻る")`,
              title: "戻る",
              description: "キャンセルせずに予約一覧へ戻ります。",
            },
          ],
        },
        {
          id: "mypage-zoom",
          title: "Zoom 連携",
          overview:
            "予約に必須の Zoom アカウント連携を行う画面です。連携が完了すると予約フォームに進めるようになります。",
          route: "/mypage/zoom",
          requiresAuth: true,
          waitForSelector: 'h1:has-text("Zoom 連携")',
          annotations: [
            {
              n: 1,
              selector: "button",
              title: "Zoom を連携する",
              description:
                "Zoom の認証画面へ移動し、許可すると連携が完了します。",
            },
          ],
        },
        {
          id: "mypage-coupons",
          title: "保有クーポン",
          overview:
            "取得済みのクーポンを確認する画面です。利用可能なものと使用済み・期限切れのものを分けて表示します。",
          route: "/mypage/coupons",
          requiresAuth: true,
          waitForSelector: 'h1:has-text("クーポン")',
          annotations: [
            {
              n: 1,
              selector: "h2",
              title: "クーポン区分",
              description: "利用可能なクーポンと利用できないものを分けます。",
            },
            {
              n: 2,
              selector: "text=有効期限",
              title: "有効期限",
              description: "期限を過ぎたクーポンは予約時に選べなくなります。",
            },
          ],
        },
        {
          id: "org-coupons",
          title: "クーポン取得",
          overview:
            "店舗が配布しているクーポンを受け取る画面です。受け取ったクーポンは予約フォームで選べるようになります。",
          route: "/{orgId}/coupons",
          requires: ["orgId"],
          requiresAuth: true,
          waitForSelector: "h1",
          annotations: [
            {
              n: 1,
              selector: "h1",
              title: "取得可能なクーポン",
              description: "現在受け取れるクーポンの一覧を表示します。",
            },
            {
              n: 2,
              selector: "button",
              title: "取得ボタン",
              description: "クーポンを受け取り、保有クーポンに追加します。",
            },
          ],
        },
      ],
    },
    {
      id: "policies",
      title: "規約・退会",
      pages: [
        {
          id: "terms",
          title: "利用規約",
          overview:
            "店舗が公開している利用規約を表示する画面です。予約時の同意チェックからも開けます。",
          route: "/{orgId}/terms",
          requires: ["orgId"],
          waitForSelector: "h1",
          annotations: [
            {
              n: 1,
              selector: "h1",
              title: "規約タイトル",
              description: "公開中の版のタイトルを表示します。",
            },
            {
              n: 2,
              selector: "text=version",
              title: "版と効力発生日",
              description:
                "現在適用されている版番号と効力発生日を確認できます。",
            },
          ],
        },
        {
          id: "cancellation-policy",
          title: "キャンセルポリシー",
          overview:
            "キャンセル時の取り扱いを定めた文書を表示する画面です。予約前に必ず確認します。",
          route: "/{orgId}/cancellation-policy",
          requires: ["orgId"],
          waitForSelector: "h1",
          annotations: [
            {
              n: 1,
              selector: "h1",
              title: "ポリシータイトル",
              description: "公開中の版のタイトルを表示します。",
            },
          ],
        },
        {
          id: "privacy",
          title: "プライバシーポリシー",
          overview:
            "個人情報の取り扱いを定めた文書を表示する画面です。会員登録前に確認できます。",
          route: "/{orgId}/privacy",
          requires: ["orgId"],
          waitForSelector: "h1",
          annotations: [
            {
              n: 1,
              selector: "h1",
              title: "ポリシータイトル",
              description: "公開中の版のタイトルを表示します。",
            },
          ],
        },
        {
          id: "withdraw",
          title: "退会",
          overview:
            "会員登録を取り消す画面です。プロフィールの「退会について」から移動します。実行すると会員情報が削除され、元に戻せません。",
          route: "/mypage/withdraw",
          requiresAuth: true,
          waitForSelector: 'h1:has-text("退会する")',
          annotations: [
            {
              n: 1,
              selector: "input",
              title: "確認入力",
              description:
                "指定された文字列を入力すると退会ボタンが押せるようになります。",
            },
            {
              n: 2,
              selector: "button",
              title: "退会",
              description: "会員情報を削除します。取り消しはできません。",
            },
          ],
        },
      ],
    },
  ],
};

export default config;
