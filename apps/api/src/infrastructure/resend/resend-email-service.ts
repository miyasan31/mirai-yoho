import { Resend } from "resend";
import type { IEmailService } from "@/application/shared/email-service";
import { envServer } from "@/config/env.server";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(envServer.resendApiKey);
  }
  return resendClient;
}

type EmailPayload = {
  /** 複数宛先は Resend の to 配列として送る */
  to: string | string[];
  subject: string;
  html: string;
};

const EMAIL_FOOTER = `
			<hr />
			<p style="font-size: 12px; color: #666;">
				本メールは「あなたのみらい予報」（運営: 一般社団法人JKK）よりお送りしています。<br />
				本メールにお心当たりがない場合は破棄してください。
			</p>
		`;

function withFooter(bodyHtml: string): string {
  return `${bodyHtml}${EMAIL_FOOTER}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDatetime(date: Date): string {
  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function deliverEmail(
  emailType: string,
  payload: EmailPayload,
): Promise<void> {
  const emailDeliveryMode = envServer.emailDeliveryMode;

  if (emailDeliveryMode === "log") {
    console.info("[email:log]", {
      emailType,
      from: envServer.resendFromEmail,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    return;
  }

  // Resend SDK は API エラーを例外ではなく戻り値で返すため、明示的に検査しないと
  // 配信失敗が無言で握り潰される
  const { error } = await getResendClient().emails.send({
    from: envServer.resendFromEmail,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });

  if (error) {
    console.error("[email:failed]", {
      emailType,
      to: payload.to,
      subject: payload.subject,
      error,
    });
  }
}

export class ResendEmailService implements IEmailService {
  async sendBookingConfirmation(params: {
    customerEmail: string;
    customerName: string;
    consultantName: string;
    joinUrl: string;
    startsAt: Date;
    bookingId: string;
    cancelUrl: string;
  }): Promise<void> {
    const subject = "【あなたのみらい予報】ご予約確認";
    const html = withFooter(`
				<h2>ご予約が確認されました</h2>
				<p>${params.customerName} 様</p>
				<p>以下の内容でご予約を承りました。</p>
				<ul>
					<li><strong>占い師:</strong> ${params.consultantName}</li>
					<li><strong>日時:</strong> ${formatDatetime(params.startsAt)}</li>
					<li><strong>予約ID:</strong> ${params.bookingId}</li>
				</ul>
				<p><strong>Zoom URL:</strong> <a href="${params.joinUrl}">${params.joinUrl}</a></p>
				<p>開始時刻の24時間前までキャンセル可能です。</p>
				<p><a href="${params.cancelUrl}">この予約をキャンセルする</a></p>
			`);

    await deliverEmail("booking-confirmation", {
      to: params.customerEmail,
      subject,
      html,
    });
  }

  async sendBookingCancellation(params: {
    customerEmail: string;
    customerName: string;
    consultantName: string;
    bookingId: string;
    cancelledBy: "customer" | "admin";
  }): Promise<void> {
    const cancelledByText =
      params.cancelledBy === "customer" ? "お客様" : "管理者";
    const subject = "【あなたのみらい予報】ご予約キャンセルのお知らせ";
    const html = withFooter(`
				<h2>ご予約がキャンセルされました</h2>
				<p>${params.customerName} 様</p>
				<p>${cancelledByText}によりご予約がキャンセルされました。</p>
				<ul>
					<li><strong>占い師:</strong> ${params.consultantName}</li>
					<li><strong>予約ID:</strong> ${params.bookingId}</li>
				</ul>
			`);

    await deliverEmail("booking-cancellation", {
      to: params.customerEmail,
      subject,
      html,
    });
  }

  async sendPaymentReceipt(params: {
    customerEmail: string;
    customerName: string;
    amountJPY: number;
    taxAmountJPY: number;
    taxRate: number;
    totalJPY: number;
    bookingId: string;
    chargedAt: Date;
  }): Promise<void> {
    const subject = "【あなたのみらい予報】お支払い完了のお知らせ（領収書）";
    // 適格請求書等保存方式（インボイス制度）で必要な記載事項:
    // 発行者の氏名・登録番号 / 取引年月日 / 取引内容 / 税率ごとの対価の額と適用税率 /
    // 税率ごとの消費税額 / 交付を受ける者の氏名
    const registrationNumber = envServer.invoiceRegistrationNumber;
    const taxRatePercent = Math.round(params.taxRate * 1000) / 10;
    const html = withFooter(`
				<h2>お支払いが完了しました</h2>
				<p>${params.customerName} 様</p>
				<p>下記のとおり領収いたしました。本メールは適格請求書（インボイス）を兼ねます。</p>
				<ul>
					<li><strong>取引年月日:</strong> ${formatDate(params.chargedAt)}</li>
					<li><strong>取引内容:</strong> オンライン鑑定（予約ID: ${params.bookingId}）</li>
					<li><strong>税抜金額:</strong> ¥${params.amountJPY.toLocaleString()}</li>
					<li><strong>消費税額（${taxRatePercent}%対象）:</strong> ¥${params.taxAmountJPY.toLocaleString()}</li>
					<li><strong>お支払金額（税込）:</strong> ¥${params.totalJPY.toLocaleString()}</li>
				</ul>
				<p>
					発行者: 一般社団法人JKK<br />
					${
            registrationNumber
              ? `登録番号: ${registrationNumber}`
              : "登録番号: （未設定）"
          }
				</p>
			`);

    await deliverEmail("payment-receipt", {
      to: params.customerEmail,
      subject,
      html,
    });
  }

  async sendConsultationReminder(params: {
    customerEmail: string;
    customerName: string;
    consultantName: string;
    joinUrl: string;
    startsAt: Date;
    bookingId: string;
  }): Promise<void> {
    const subject = "【あなたのみらい予報】相談開始15分前のお知らせ";
    const html = withFooter(`
				<h2>相談開始15分前のお知らせ</h2>
				<p>${params.customerName} 様</p>
				<p>ご予約の相談開始時刻が近づいています。</p>
				<ul>
					<li><strong>占い師:</strong> ${params.consultantName}</li>
					<li><strong>日時:</strong> ${formatDatetime(params.startsAt)}</li>
					<li><strong>予約ID:</strong> ${params.bookingId}</li>
				</ul>
				<p><strong>Zoom URL:</strong> <a href="${params.joinUrl}">${params.joinUrl}</a></p>
				<p>お時間になりましたら、上記のZoom URLからご参加ください。</p>
			`);

    await deliverEmail("consultation-reminder", {
      to: params.customerEmail,
      subject,
      html,
    });
  }

  async sendConsultantBookingNotice(params: {
    consultantEmail: string;
    consultantName: string;
    customerName: string;
    joinUrl: string;
    startsAt: Date;
    bookingId: string;
  }): Promise<void> {
    const subject = "【あなたのみらい予報】新しいご予約が入りました";
    const html = withFooter(`
				<h2>新しいご予約が入りました</h2>
				<p>${params.consultantName} 様</p>
				<ul>
					<li><strong>日時:</strong> ${formatDatetime(params.startsAt)}</li>
					<li><strong>お客様:</strong> ${params.customerName} 様</li>
					<li><strong>予約ID:</strong> ${params.bookingId}</li>
				</ul>
				<p><strong>Zoom URL:</strong> <a href="${params.joinUrl}">${params.joinUrl}</a></p>
			`);

    await deliverEmail("consultant-booking-notice", {
      to: params.consultantEmail,
      subject,
      html,
    });
  }

  async sendConsultantCancellationNotice(params: {
    consultantEmail: string;
    consultantName: string;
    customerName: string;
    startsAt: Date;
    bookingId: string;
    cancelledBy: "customer" | "admin";
  }): Promise<void> {
    const cancelledByText =
      params.cancelledBy === "customer" ? "お客様" : "管理者";
    const subject = "【あなたのみらい予報】ご予約がキャンセルされました";
    const html = withFooter(`
				<h2>担当予約がキャンセルされました</h2>
				<p>${params.consultantName} 様</p>
				<p>${cancelledByText}により、下記のご予約がキャンセルされました。</p>
				<ul>
					<li><strong>日時:</strong> ${formatDatetime(params.startsAt)}</li>
					<li><strong>お客様:</strong> ${params.customerName} 様</li>
					<li><strong>予約ID:</strong> ${params.bookingId}</li>
				</ul>
			`);

    await deliverEmail("consultant-cancellation-notice", {
      to: params.consultantEmail,
      subject,
      html,
    });
  }

  async sendBatchChargeReport(params: {
    adminEmails: string[];
    organizationId: string;
    startedAt: Date;
    chargedCount: number;
    completedCount: number;
    errors: Array<{ bookingId: string; error: string }>;
    consoleBookingsUrl: string;
  }): Promise<void> {
    if (params.adminEmails.length === 0) {
      return;
    }

    const hasErrors = params.errors.length > 0;
    const subject = hasErrors
      ? "【あなたのみらい予報】課金バッチが完了しました（エラーあり）"
      : "【あなたのみらい予報】課金バッチが完了しました";
    const errorList = hasErrors
      ? `<p><strong>エラー詳細:</strong></p><ul>${params.errors
          .map((e) => `<li>${e.bookingId}: ${e.error}</li>`)
          .join("")}</ul>`
      : "";
    const html = withFooter(`
				<h2>課金バッチが完了しました</h2>
				<ul>
					<li><strong>組織:</strong> ${params.organizationId}</li>
					<li><strong>実行日時:</strong> ${formatDatetime(params.startedAt)}</li>
					<li><strong>課金件数:</strong> ${params.chargedCount}</li>
					<li><strong>完了件数:</strong> ${params.completedCount}</li>
					<li><strong>エラー件数:</strong> ${params.errors.length}</li>
				</ul>
				${errorList}
				<p><a href="${params.consoleBookingsUrl}">予約一覧を開く</a></p>
			`);

    await deliverEmail("batch-charge-report", {
      to: params.adminEmails,
      subject,
      html,
    });
  }

  async sendInvitation(params: {
    email: string;
    roleName: string;
    isConsultant: boolean;
    passwordResetLink: string;
  }): Promise<void> {
    const roleLine = params.isConsultant
      ? `${params.roleName}（占い師）`
      : params.roleName;

    const subject = "【あなたのみらい予報】アカウント招待のお知らせ";
    const html = withFooter(`
				<h2>あなたのみらい予報へご招待します</h2>
				<p>あなたのアカウントが作成されました。</p>
				<ul>
					<li><strong>ロール:</strong> ${roleLine}</li>
				</ul>
				<p>以下のリンクからパスワードを設定してください。</p>
				<p><a href="${params.passwordResetLink}">パスワードを設定する</a></p>
			`);

    await deliverEmail("invitation", {
      to: params.email,
      subject,
      html,
    });
  }

  async sendPasswordReset(params: {
    email: string;
    passwordResetLink: string;
  }): Promise<void> {
    const subject = "【あなたのみらい予報】パスワードリセットのお知らせ";
    const html = withFooter(`
				<h2>パスワードリセット</h2>
				<p>管理者よりパスワードリセットのリクエストがありました。</p>
				<p>以下のリンクから新しいパスワードを設定してください。</p>
				<p><a href="${params.passwordResetLink}">パスワードを再設定する</a></p>
			`);

    await deliverEmail("password-reset", {
      to: params.email,
      subject,
      html,
    });
  }
}
