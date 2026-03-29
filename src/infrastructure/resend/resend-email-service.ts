import { Resend } from "resend";
import type { IEmailService } from "@/application/shared/email-service";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL as string;

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

export class ResendEmailService implements IEmailService {
  async sendBookingConfirmation(params: {
    clientEmail: string;
    clientName: string;
    consultantName: string;
    zoomUrl: string;
    startDatetime: Date;
    bookingId: string;
  }): Promise<void> {
    await resend.emails.send({
      from: fromEmail,
      to: params.clientEmail,
      subject: "【未来予報】ご予約確認",
      html: `
				<h2>ご予約が確認されました</h2>
				<p>${params.clientName} 様</p>
				<p>以下の内容でご予約を承りました。</p>
				<ul>
					<li><strong>相談員:</strong> ${params.consultantName}</li>
					<li><strong>日時:</strong> ${formatDatetime(params.startDatetime)}</li>
					<li><strong>予約ID:</strong> ${params.bookingId}</li>
				</ul>
				<p><strong>Zoom URL:</strong> <a href="${params.zoomUrl}">${params.zoomUrl}</a></p>
				<p>開始時刻の24時間前までキャンセル可能です。</p>
			`,
    });
  }

  async sendBookingCancellation(params: {
    clientEmail: string;
    clientName: string;
    consultantName: string;
    bookingId: string;
    cancelledBy: "client" | "admin";
  }): Promise<void> {
    const cancelledByText =
      params.cancelledBy === "client" ? "お客様" : "管理者";
    await resend.emails.send({
      from: fromEmail,
      to: params.clientEmail,
      subject: "【未来予報】ご予約キャンセルのお知らせ",
      html: `
				<h2>ご予約がキャンセルされました</h2>
				<p>${params.clientName} 様</p>
				<p>${cancelledByText}によりご予約がキャンセルされました。</p>
				<ul>
					<li><strong>相談員:</strong> ${params.consultantName}</li>
					<li><strong>予約ID:</strong> ${params.bookingId}</li>
				</ul>
			`,
    });
  }

  async sendPaymentReceipt(params: {
    clientEmail: string;
    clientName: string;
    amountJPY: number;
    bookingId: string;
  }): Promise<void> {
    await resend.emails.send({
      from: fromEmail,
      to: params.clientEmail,
      subject: "【未来予報】お支払い完了のお知らせ",
      html: `
				<h2>お支払いが完了しました</h2>
				<p>${params.clientName} 様</p>
				<ul>
					<li><strong>金額:</strong> ¥${params.amountJPY.toLocaleString()}</li>
					<li><strong>予約ID:</strong> ${params.bookingId}</li>
				</ul>
			`,
    });
  }

  async sendInvitation(params: {
    email: string;
    role: string;
    passwordResetLink: string;
  }): Promise<void> {
    const roleLabels: Record<string, string> = {
      super_admin: "スーパー管理者",
      operator: "オペレーター",
      consultant: "相談員",
    };
    const roleLabel = roleLabels[params.role] ?? params.role;

    await resend.emails.send({
      from: fromEmail,
      to: params.email,
      subject: "【未来予報】アカウント招待のお知らせ",
      html: `
				<h2>未来予報へご招待します</h2>
				<p>あなたのアカウントが作成されました。</p>
				<ul>
					<li><strong>ロール:</strong> ${roleLabel}</li>
				</ul>
				<p>以下のリンクからパスワードを設定してください。</p>
				<p><a href="${params.passwordResetLink}">パスワードを設定する</a></p>
			`,
    });
  }

  async sendPasswordReset(params: {
    email: string;
    passwordResetLink: string;
  }): Promise<void> {
    await resend.emails.send({
      from: fromEmail,
      to: params.email,
      subject: "【未来予報】パスワードリセットのお知らせ",
      html: `
				<h2>パ���ワードリセット</h2>
				<p>管理者よりパスワードリセットのリクエストがありました。</p>
				<p>以下のリンクから新しいパスワードを設定してください。</p>
				<p><a href="${params.passwordResetLink}">パスワードを再設定する</a></p>
			`,
    });
  }
}
