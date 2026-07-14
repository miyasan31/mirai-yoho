import { Resend } from "resend";
import type { IEmailService } from "@/application/shared/email-service";
import { envServer } from "@/config/env.server";

let resendCustomer: Resend | null = null;

function getResendCustomer(): Resend {
  if (!resendCustomer) {
    resendCustomer = new Resend(envServer.resendApiKey);
  }
  return resendCustomer;
}

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

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

  await getResendCustomer().emails.send({
    from: envServer.resendFromEmail,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });
}

export class ResendEmailService implements IEmailService {
  async sendBookingConfirmation(params: {
    customerEmail: string;
    customerName: string;
    consultantName: string;
    joinUrl: string;
    startsAt: Date;
    bookingId: string;
  }): Promise<void> {
    const subject = "【みらい予報】ご予約確認";
    const html = `
				<h2>ご予約が確認されました</h2>
				<p>${params.customerName} 様</p>
				<p>以下の内容でご予約を承りました。</p>
				<ul>
					<li><strong>相談員:</strong> ${params.consultantName}</li>
					<li><strong>日時:</strong> ${formatDatetime(params.startsAt)}</li>
					<li><strong>予約ID:</strong> ${params.bookingId}</li>
				</ul>
				<p><strong>Zoom URL:</strong> <a href="${params.joinUrl}">${params.joinUrl}</a></p>
				<p>開始時刻の24時間前までキャンセル可能です。</p>
			`;

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
    const subject = "【みらい予報】ご予約キャンセルのお知らせ";
    const html = `
				<h2>ご予約がキャンセルされました</h2>
				<p>${params.customerName} 様</p>
				<p>${cancelledByText}によりご予約がキャンセルされました。</p>
				<ul>
					<li><strong>相談員:</strong> ${params.consultantName}</li>
					<li><strong>予約ID:</strong> ${params.bookingId}</li>
				</ul>
			`;

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
    bookingId: string;
  }): Promise<void> {
    const subject = "【みらい予報】お支払い完了のお知らせ";
    const html = `
				<h2>お支払いが完了しました</h2>
				<p>${params.customerName} 様</p>
				<ul>
					<li><strong>金額:</strong> ¥${params.amountJPY.toLocaleString()}</li>
					<li><strong>予約ID:</strong> ${params.bookingId}</li>
				</ul>
			`;

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
    const subject = "【みらい予報】相談開始15分前のお知らせ";
    const html = `
				<h2>相談開始15分前のお知らせ</h2>
				<p>${params.customerName} 様</p>
				<p>ご予約の相談開始時刻が近づいています。</p>
				<ul>
					<li><strong>相談員:</strong> ${params.consultantName}</li>
					<li><strong>日時:</strong> ${formatDatetime(params.startsAt)}</li>
					<li><strong>予約ID:</strong> ${params.bookingId}</li>
				</ul>
				<p><strong>Zoom URL:</strong> <a href="${params.joinUrl}">${params.joinUrl}</a></p>
				<p>お時間になりましたら、上記のZoom URLからご参加ください。</p>
			`;

    await deliverEmail("consultation-reminder", {
      to: params.customerEmail,
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
      ? `${params.roleName}（相談員）`
      : params.roleName;

    const subject = "【みらい予報】アカウント招待のお知らせ";
    const html = `
				<h2>みらい予報へご招待します</h2>
				<p>あなたのアカウントが作成されました。</p>
				<ul>
					<li><strong>ロール:</strong> ${roleLine}</li>
				</ul>
				<p>以下のリンクからパスワードを設定してください。</p>
				<p><a href="${params.passwordResetLink}">パスワードを設定する</a></p>
			`;

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
    const subject = "【みらい予報】パスワードリセットのお知らせ";
    const html = `
				<h2>パスワードリセット</h2>
				<p>管理者よりパスワードリセットのリクエストがありました。</p>
				<p>以下のリンクから新しいパスワードを設定してください。</p>
				<p><a href="${params.passwordResetLink}">パスワードを再設定する</a></p>
			`;

    await deliverEmail("password-reset", {
      to: params.email,
      subject,
      html,
    });
  }
}
